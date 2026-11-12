package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;

import java.io.File;
import java.util.UUID;
import java.util.function.Consumer;

public interface AudioConversionService {

    /**
     * Converts audio or extracts audio track from video into requested audio format.
     */
    ConversionResult convertAudio(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception;

    /**
     * Checks if audio conversion to target format is supported.
     */
    boolean supportsFormat(String targetFormat);
}
