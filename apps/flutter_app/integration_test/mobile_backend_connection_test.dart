import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mediaforge_desktop/core/config/mobile_online_config.dart';
import 'package:mediaforge_desktop/core/services/backend_api.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
      'Android Dart client reaches real host API and preserves offline engine',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
            body: Text('MediaForge backend connection verification'))));
    await tester.runAsync(() async {
      final base = MobileOnlineConfig.resolve();
      expect(base, MobileOnlineConfig.emulatorApiBase);
      final api = BackendApi(baseUrl: base);
      final engine = NativeMediaEngine();
      try {
        final health = await api.request('/health');
        expect(health['status'], 'UP');
        expect(health['service'], 'mediaforge-backend');
        final formats = await api.request('/conversions/formats');
        expect(formats['videoFormats'], contains('mp4'));
        await expectLater(
            api.request('/downloads/metadata', method: 'POST', body: {}),
            throwsA(isA<BackendException>()
                .having((e) => e.status, 'HTTP status', 400)));
        // Public URL validation must reject internal destinations; do not bypass SSRF.
        await expectLater(
            api.request('/downloads/metadata',
                method: 'POST', body: {'url': 'http://127.0.0.1/private.mp4'}),
            throwsA(isA<BackendException>()
                .having((e) => e.status, 'HTTP status', 400)));
        final root = BackendApi(baseUrl: 'http://10.0.2.2:8081');
        try {
          await expectLater(
              root.request('/'),
              throwsA(isA<BackendException>()
                  .having((e) => e.status, 'root HTTP status', 404)));
        } finally {
          root.close();
        }
        final caps = await engine.capabilities();
        expect(caps.formats.values.any((f) => f.isNotEmpty), true);
        debugPrint(
            'BACKEND_CONNECTION_VERIFIED: emulator API health=200 formats=200 invalid metadata=400 SSRF=400 root=404 offline engine available');
      } finally {
        api.close();
        await engine.dispose();
      }
    });
  });
}
