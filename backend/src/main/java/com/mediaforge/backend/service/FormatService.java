package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.response.FormatListResponse;

import java.util.List;
import java.util.Map;

public interface FormatService {
    Map<String, List<String>> getAllFormats();
    FormatListResponse getVideoFormats();
    FormatListResponse getAudioFormats();
    FormatListResponse getImageFormats();
}

