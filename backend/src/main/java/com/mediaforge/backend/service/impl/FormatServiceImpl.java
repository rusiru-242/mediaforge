package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.dto.response.FormatListResponse;
import com.mediaforge.backend.service.FormatService;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FormatServiceImpl implements FormatService {

    private static final List<String> VIDEO_FORMATS = List.of(
            "mp4", "webm", "mkv", "avi", "mov", "flv", "wmv", "gif"
    );

    private static final List<String> AUDIO_FORMATS = List.of(
            "mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"
    );

    private static final List<String> IMAGE_FORMATS = List.of(
            "jpg", "png", "webp", "gif", "bmp", "tiff", "svg"
    );

    @Override
    public Map<String, List<String>> getAllFormats() {
        Map<String, List<String>> all = new LinkedHashMap<>();
        all.put("video", VIDEO_FORMATS);
        all.put("audio", AUDIO_FORMATS);
        all.put("image", IMAGE_FORMATS);
        return all;
    }

    @Override
    public FormatListResponse getVideoFormats() {
        return new FormatListResponse("video", VIDEO_FORMATS);
    }

    @Override
    public FormatListResponse getAudioFormats() {
        return new FormatListResponse("audio", AUDIO_FORMATS);
    }

    @Override
    public FormatListResponse getImageFormats() {
        return new FormatListResponse("image", IMAGE_FORMATS);
    }
}

