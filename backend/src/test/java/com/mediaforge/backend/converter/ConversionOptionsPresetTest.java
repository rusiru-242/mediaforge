package com.mediaforge.backend.converter;

import com.mediaforge.backend.converter.model.ConversionOptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConversionOptionsPresetTest {

    @Test
    @DisplayName("High preset sets 1080p resolution and high video/audio bitrates")
    void testHighPreset() {
        ConversionOptions options = new ConversionOptions();
        options.setQualityPreset("high");
        options.normalizePresets();

        assertThat(options.getTargetResolution()).isEqualTo("1080p");
        assertThat(options.getVideoBitrate()).isEqualTo("2500k");
        assertThat(options.getAudioBitrate()).isEqualTo(256);
        assertThat(options.getImageQuality()).isEqualTo(90);
    }

    @Test
    @DisplayName("Balanced preset sets 720p resolution and balanced bitrates")
    void testBalancedPreset() {
        ConversionOptions options = new ConversionOptions();
        options.setQualityPreset("balanced");
        options.normalizePresets();

        assertThat(options.getTargetResolution()).isEqualTo("720p");
        assertThat(options.getVideoBitrate()).isEqualTo("1200k");
        assertThat(options.getAudioBitrate()).isEqualTo(192);
        assertThat(options.getImageQuality()).isEqualTo(75);
    }

    @Test
    @DisplayName("Small preset sets 480p resolution and compact bitrates")
    void testSmallPreset() {
        ConversionOptions options = new ConversionOptions();
        options.setQualityPreset("small");
        options.normalizePresets();

        assertThat(options.getTargetResolution()).isEqualTo("480p");
        assertThat(options.getVideoBitrate()).isEqualTo("600k");
        assertThat(options.getAudioBitrate()).isEqualTo(128);
        assertThat(options.getImageQuality()).isEqualTo(50);
    }

    @Test
    @DisplayName("Custom preset or explicit options are preserved")
    void testCustomOptionPreservation() {
        ConversionOptions options = new ConversionOptions();
        options.setQualityPreset("high");
        options.setTargetResolution("4k"); // explicitly overridden by user
        options.normalizePresets();

        assertThat(options.getTargetResolution()).isEqualTo("4k");
        assertThat(options.getVideoBitrate()).isEqualTo("2500k");
    }
}
