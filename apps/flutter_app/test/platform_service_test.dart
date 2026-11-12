import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/services/platform_service.dart';

void main() {
  group('PlatformService Tests', () {
    test('Platform detection flags are consistent', () {
      // In a test runner on Windows:
      expect(PlatformService.isDesktop, isTrue);
      expect(PlatformService.isMobile, isFalse);
      expect(PlatformService.isAndroid, isFalse);
      expect(PlatformService.isIOS, isFalse);
    });

    test('getDefaultDownloadDirectory returns non-empty path', () async {
      final dir = await PlatformService.getDefaultDownloadDirectory();
      expect(dir, isNotEmpty);
    });
  });
}

