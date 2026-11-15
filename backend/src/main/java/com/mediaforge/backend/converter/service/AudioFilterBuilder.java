package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class AudioFilterBuilder {
    private AudioFilterBuilder() {}
    static List<String> build(ConversionOptions options, double effectiveDuration) {
        List<String> filters = new ArrayList<>();
        if (options == null) return filters;

        // 1. Volume adjustment
        if (options.getVolume() != null && options.getVolume() >= 0.0 && Math.abs(options.getVolume() - 1.0) > 0.01) {
            filters.add(String.format(Locale.ROOT, "volume=%.2f", options.getVolume()));
        }

        // 2. Silence removal
        if (Boolean.TRUE.equals(options.getRemoveSilence())) {
            filters.add("silenceremove=start_periods=1:stop_periods=1:stop_duration=1:stop_threshold=-50dB");
        }

        // Apply only fixed, named effects; never accept raw FFmpeg filters from requests.
        boolean hasActiveEffect = false;
        for (String effect : List.of("reverb", "echo", "bass", "treble", "warmth")) {
            if (!options.getAudioEffects().contains(effect)) continue;
            double strength = Math.max(0, Math.min(100, options.getAudioEffectLevels().getOrDefault(effect, 100))) / 100.0;
            if (strength == 0) continue;
            hasActiveEffect = true;
            filters.add(switch (effect) {
                case "reverb" -> String.format(Locale.ROOT, "aecho=%.4f:%.4f:40|70|100:%.4f|%.4f|%.4f",
                        1 - .2 * strength, 1 - .12 * strength, .25 * strength, .18 * strength, .12 * strength);
                case "echo" -> String.format(Locale.ROOT, "aecho=%.4f:%.4f:180:%.4f", 1 - .2 * strength, 1 - .1 * strength, .3 * strength);
                case "bass" -> String.format(Locale.ROOT, "bass=g=%.3f:f=200", 6 * strength);
                case "treble" -> String.format(Locale.ROOT, "treble=g=%.3f:f=3000", 5 * strength);
                default -> String.format(Locale.ROOT, "lowpass=f=%.1f", 20000 - 15000 * strength);
            });
        }
        if (hasActiveEffect) filters.add(String.format(Locale.ROOT, "atrim=duration=%.3f,asetpts=PTS-STARTPTS", effectiveDuration));

        // 3. Fade in
        if (options.getFadeInDuration() != null && options.getFadeInDuration() > 0.0) {
            filters.add(String.format(Locale.ROOT, "afade=t=in:ss=0:d=%.2f:curve=qsin", Math.min(effectiveDuration, options.getFadeInDuration())));
        }

        // 4. Fade out
        if (options.getFadeOutDuration() != null && options.getFadeOutDuration() > 0.0) {
            double fadeStart = Math.max(0.0, effectiveDuration - options.getFadeOutDuration());
            filters.add(String.format(Locale.ROOT, "afade=t=out:st=%.2f:d=%.2f:curve=qsin", fadeStart, Math.min(effectiveDuration, options.getFadeOutDuration())));
        }

        return filters;
    }

}
