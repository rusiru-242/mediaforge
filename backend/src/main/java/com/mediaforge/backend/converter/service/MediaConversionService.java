package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;

import java.io.File;
import java.util.UUID;
import java.util.function.Consumer;

public interface MediaConversionService {

    /**
     * Routes and executes media conversion to the appropriate video, audio, or image engine.
     */
    ConversionResult convert(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception;

    /**
     * Determines whether target format is supported by any conversion engine.
     */
    boolean isFormatSupported(String targetFormat);
}
