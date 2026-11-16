import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/services/backend_api.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_downloader.dart';

void main() {
  for (final entry in {
    'YouTube': 'https://youtu.be/owned',
    'Facebook': 'https://www.facebook.com/watch/?v=owned',
    'Instagram': 'https://www.instagram.com/reel/owned/'
  }.entries) {
    for (final dark in [false, true]) {
      testWidgets(
          'Analyze locks and shows shared preview: ${entry.key} dark=$dark',
          (tester) async {
        SharedPreferences.setMockInitialValues(
            {'mobileOnlineService': 'https://api.example/api/v1'});
        tester.view.physicalSize = const Size(360, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var requests = 0;
        await tester.pumpWidget(MaterialApp(
            theme: ThemeData(
                brightness: dark ? Brightness.dark : Brightness.light),
            home: Scaffold(
                body: MobileDownloader(
                    engine: NativeMediaEngine(),
                    apiFactory: (base) => BackendApi(
                        baseUrl: base,
                        client: MockClient((request) async {
                          requests++;
                          return http.Response(
                              jsonEncode({
                                'success': true,
                                'title': 'Owned fixture ${entry.key}',
                                'thumbnail': 'https://images.example/thumb.jpg',
                                'duration': 125,
                                'availableFormats': [
                                  {'format': 'mp4', 'quality': '720p'}
                                ]
                              }),
                              200);
                        }))))));
        await tester.enterText(find.byType(TextField), entry.value);
        await tester.pump();
        await tester.tap(find.widgetWithText(FilledButton, 'Analyze'));
        await tester.pumpAndSettle();
        expect(requests, 1);
        expect(
            tester
                .widget<FilledButton>(
                    find.widgetWithText(FilledButton, 'Analyze'))
                .onPressed,
            isNull);
        await tester.scrollUntilVisible(find.byType(MobileMediaPreview), 150,
            scrollable: find.byType(Scrollable).first);
        await tester.pumpAndSettle();
        expect(find.text('Owned fixture ${entry.key}'), findsOneWidget);
        expect(find.text('Duration: 2:05'), findsOneWidget);
        expect(tester.widget<Image>(find.byType(Image)).image,
            isA<NetworkImage>());
        expect(
            (tester.widget<Image>(find.byType(Image)).image as NetworkImage)
                .url,
            'https://images.example/thumb.jpg');
        // Changing the source invalidates the preview and permits a new analysis.
        await tester.scrollUntilVisible(find.byType(TextField), -150,
            scrollable: find.byType(Scrollable).first);
        await tester.enterText(find.byType(TextField), '${entry.value}changed');
        await tester.pumpAndSettle();
        expect(find.byType(MobileMediaPreview), findsNothing);
        expect(
            tester
                .widget<FilledButton>(
                    find.widgetWithText(FilledButton, 'Analyze'))
                .onPressed,
            isNotNull);
        await tester.tap(find.widgetWithText(FilledButton, 'Analyze'));
        await tester.pumpAndSettle();
        expect(requests, 2);
        await tester.tap(find.widgetWithText(TextButton, 'Clear'));
        await tester.pumpAndSettle();
        expect(find.byType(MobileMediaPreview), findsNothing);
        expect(
            tester.widget<TextField>(find.byType(TextField)).controller!.text,
            isEmpty);
        expect(tester.takeException(), isNull);
      });
    }
  }
  testWidgets('Missing or unsafe thumbnail has an honest fallback',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
            body: MobileMediaPreview(metadata: {
      'title': 'Actual title',
      'thumbnail': 'file:///private/image.png',
      'duration': 0
    }, platform: 'YouTube'))));
    expect(find.text('Thumbnail unavailable'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    expect(find.textContaining('Duration:'), findsNothing);
  });
  testWidgets('Failed analysis remains retryable and does not show preview',
      (tester) async {
    SharedPreferences.setMockInitialValues(
        {'mobileOnlineService': 'https://api.example/api/v1'});
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileDownloader(
                engine: NativeMediaEngine(),
                apiFactory: (base) => BackendApi(
                    baseUrl: base,
                    client: MockClient((_) async => http.Response(
                        '{"success":false,"message":"Source unavailable"}',
                        200)))))));
    await tester.enterText(find.byType(TextField), 'https://youtu.be/owned');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Analyze'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Source unavailable'), findsOneWidget);
    expect(find.byType(MobileMediaPreview), findsNothing);
    expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Analyze'))
            .onPressed,
        isNotNull);
  });
}
