import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/config/mobile_online_config.dart';
import 'package:mediaforge_desktop/core/config/app_config.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/services/backend_api.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_downloader.dart';

void main() {
  test(
      'Android debug default uses emulator API, desktop and releases stay unchanged',
      () {
    expect(
        MobileOnlineConfig.resolve(
            definedBase: '',
            development: true,
            platform: TargetPlatform.android),
        MobileOnlineConfig.emulatorApiBase);
    expect(AppConfig.backendBaseUrl, 'http://localhost:8081/api/v1');
    for (final platform in [TargetPlatform.windows, TargetPlatform.iOS]) {
      expect(
          () => MobileOnlineConfig.resolve(
              definedBase: '', platform: platform, development: true),
          throwsStateError);
    }
    expect(
        () => MobileOnlineConfig.resolve(
            definedBase: '',
            development: false,
            platform: TargetPlatform.android),
        throwsStateError);
  });
  test(
      'Explicit HTTPS configuration wins and emulator exception is narrowly restricted',
      () {
    expect(
        MobileOnlineConfig.resolve(
            definedBase: 'https://api.example/api/v1/',
            savedBase: 'https://saved.example/api/v1',
            development: false),
        'https://api.example/api/v1');
    expect(
        MobileOnlineConfig.resolve(
            definedBase: '',
            savedBase: 'https://saved.example/api/v1',
            development: false),
        'https://saved.example/api/v1');
    for (final value in [
      'http://example.com/api/v1',
      'http://localhost:8081/api/v1',
      'http://10.0.2.2:9000/api/v1',
      'http://10.0.2.2:8081',
      'http://user@10.0.2.2:8081/api/v1',
      'https://example.com/api/v1?key=secret'
    ]) {
      expect(
          () => MobileOnlineConfig.resolve(
              definedBase: value,
              development: true,
              platform: TargetPlatform.android),
          throwsStateError);
    }
    expect(
        () => MobileOnlineConfig.resolve(
            definedBase: MobileOnlineConfig.emulatorApiBase,
            development: false,
            platform: TargetPlatform.android),
        throwsStateError);
  });
  testWidgets(
      'Android Analyze calls actual metadata API base and shows backend formats',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    final requests = <http.Request>[];
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileDownloader(
                engine: NativeMediaEngine(),
                apiFactory: (base) => BackendApi(
                    baseUrl: base,
                    client: MockClient((request) async {
                      requests.add(request);
                      return http.Response(
                          jsonEncode({
                            'success': true,
                            'title': 'Fixture metadata',
                            'availableFormats': [
                              {
                                'format': 'mp4',
                                'quality': '720p',
                                'resolution': '720p'
                              }
                            ]
                          }),
                          200,
                          headers: {'content-type': 'application/json'});
                    }))))));
    await tester.enterText(find.byType(TextField), 'https://youtu.be/owned');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Analyze'));
    await tester.pumpAndSettle();
    expect(requests, isNotEmpty,
        reason: tester
            .widgetList<Text>(find.byType(Text))
            .map((t) => t.data)
            .join(' | '));
    expect(requests.single.url.toString(),
        'http://10.0.2.2:8081/api/v1/downloads/metadata');
    expect(jsonDecode(requests.single.body), {'url': 'https://youtu.be/owned'});
    expect(find.text('Fixture metadata'), findsOneWidget);
    expect(find.text('mp4 - 720p'), findsOneWidget);
    expect(find.textContaining('not configured'), findsNothing);
    debugDefaultTargetPlatformOverride = null;
    expect(tester.takeException(), isNull);
  });
}
