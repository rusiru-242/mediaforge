package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.MediaProbeResult;

import java.io.File;

public interface MediaProbeService {

    /**
     * Inspects media file using FFprobe and returns comprehensive audio/video/format metadata.
     */
    MediaProbeResult probe(File file);

    /**
     * Checks if FFprobe binary is available and executable.
     */
    boolean isAvailable();
}
