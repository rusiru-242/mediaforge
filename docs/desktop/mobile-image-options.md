# Mobile Image Editor

The web Image Editor source is the UI reference. Mobile now presents WEBP/AVIF/JPG/PNG format pills (plus any additional formats reported by its engine), photo presets Original/Vivid/Vivid Warm/Vivid Cool/Dramatic/Mono, brightness/contrast/saturation/warmth sliders, reset, horizontal/vertical flips, left/right rotation, existing draggable crop corners and aspect presets/custom crop, zoom and 100/67/50 percent scaling. PNG is lossless; its irrelevant lossy quality slider is disabled.

Android exports JPG, PNG and WebP locally. AVIF stays visibly disabled because Android Bitmap compression in this implementation has no AVIF encoder. Color adjustments use the same 20-element color matrix in Flutter preview and Android Canvas export. EXIF orientation is normalized before crop; crop precedes rotate/flip and scale. Transparent PNG pixels retain alpha.

The shared imageEditing capability prevents iOS and other unimplemented adapters from silently accepting these additional edits. Existing iOS crop/rotation/formats remain available. The Next.js website and Spring Boot are not changed for this feature.

Tests cover model validation, both mobile themes at 360px, actual native PNG filter output pixels (including grayscale and flipped transparency), and crop/rotation/flip/scale dimensions in JPG/PNG/WebP. Native verification results and APK details are recorded in mobile-image-verification.json after execution.
