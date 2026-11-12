# MediaForge Testing & Verification Guide

## 1. Test Automation Philosophy
MediaForge maintains 100% passing automated test suites across all three core modules:
- **Backend**: Spring Boot Unit & Integration tests (`mvn test`).
- **Web**: Next.js & React 19 unit & component tests (`vitest run`).
- **Flutter**: Flutter desktop & mobile widget and unit tests (`flutter test`).

---

## 2. Test Execution Commands

### Backend Verification
From the repository root or `backend/` directory:
```bash
cd backend
.\mvnw.cmd test
```
*Key test classes:*
- `ConversionOptionsPresetTest`: Verifies preset normalization for video, audio, and image modes.
- `ConversionControllerIntegrationTest`: Verifies REST API job submission and progress polling.
- `UrlSecurityValidatorTest`: Verifies SSRF/loopback attack prevention.
- `DownloadControllerIntegrationTest`: Verifies media download stream endpoints.

### Web Verification
From `web/` directory:
```bash
cd web
npm run test
npm run build
```
*Key test suites:*
- `src/test/presets.test.ts`: Verifies format detection and compatible format resolution.
- `src/test/apiClient.test.ts`: Verifies backend API communication and serialization.
- `src/test/ConverterPages.test.tsx`: Verifies Video, Audio, Image, and Batch converter pages.
- `src/test/DownloadProgress.test.tsx`: Verifies speed, byte counter, and ETA rendering.

### Flutter Verification
From `apps/flutter_app/` directory:
```bash
cd apps/flutter_app
flutter analyze
flutter test
```
*Key test suites:*
- `test/app_config_test.dart`: Verifies quality presets, compatible format mapping, and unique collision-free naming.
- `test/conversion_service_test.dart`: Verifies FFmpeg argument construction.
- `test/ffmpeg_service_test.dart`: Verifies FFmpeg progress line parsing.
- `test/mobile_shell_test.dart`: Verifies responsive adaptive shell on mobile/desktop screens.
- `test/widget_test.dart`: Verifies desktop smoke test.

---

## 3. End-to-End Cross-Platform Verification Checklist
- [x] Backend compilation and 81/81 tests passing.
- [x] Web client compilation, typechecking, production build, and 47/47 tests passing.
- [x] Flutter analysis with 0 warnings and 24/24 tests passing.
- [x] Ephemeral storage verification (zero database dependencies).
- [x] Collision avoidance verified for output files.
