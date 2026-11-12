package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;

import java.io.File;
import java.util.UUID;
import java.util.function.Consumer;

public interface VideoConversionService {

    /**
     * Converts an input video file according to the target container, resolution, codecs, and bitrate options.
     */
    ConversionResult convertVideo(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception;

    /**
     * Checks if video conversion to the requested format is supported.
     */
    boolean supportsFormat(String targetFormat);
}
