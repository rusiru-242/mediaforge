package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Consumer;

@Service
public class MediaConversionServiceImpl implements MediaConversionService {

    private static final Logger log = LoggerFactory.getLogger(MediaConversionServiceImpl.class);

    private final VideoConversionService videoConversionService;
    private final AudioConversionService audioConversionService;
    private final ImageConversionService imageConversionService;

    public MediaConversionServiceImpl(VideoConversionService videoConversionService,
                                      AudioConversionService audioConversionService,
                                      ImageConversionService imageConversionService) {
        this.videoConversionService = videoConversionService;
        this.audioConversionService = audioConversionService;
        this.imageConversionService = imageConversionService;
    }

    @Override
    public boolean isFormatSupported(String targetFormat) {
        if (targetFormat == null) return false;
        String clean = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");
        return videoConversionService.supportsFormat(clean) ||
                audioConversionService.supportsFormat(clean) ||
                imageConversionService.supportsFormat(clean);
    }

    @Override
    public ConversionResult convert(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception {
        if (targetFormat == null || targetFormat.isBlank()) {
            throw new IllegalArgumentException("Target format cannot be empty");
        }

        String format = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");

        if (audioConversionService.supportsFormat(format)) {
            log.info("Routing job {} to AudioConversionService (target format: {})", jobId, format);
            return audioConversionService.convertAudio(jobId, inputFile, outputFile, format, options, progressConsumer);
        } else if (videoConversionService.supportsFormat(format)) {
            log.info("Routing job {} to VideoConversionService (target format: {})", jobId, format);
            return videoConversionService.convertVideo(jobId, inputFile, outputFile, format, options, progressConsumer);
        } else if (imageConversionService.supportsFormat(format)) {
            log.info("Routing job {} to ImageConversionService (target format: {})", jobId, format);
            return imageConversionService.convertImage(jobId, inputFile, outputFile, format, options, progressConsumer);
        } else {
            throw new IllegalArgumentException("Unsupported media conversion format: " + targetFormat);
        }
    }
}
