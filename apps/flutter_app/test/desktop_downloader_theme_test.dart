import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_downloader.dart';

void main() {
  for (final dark in [false, true]) {
    testWidgets('Downloader platform colors and detected selection, dark=$dark',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
          theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
          home: const Scaffold(
              body: SingleChildScrollView(child: DesktopDownloader()))));
      expect(find.widgetWithText(ChoiceChip, 'TikTok'), findsNothing);
      expect(find.widgetWithText(ChoiceChip, 'X / Twitter'), findsNothing);
      expect(find.widgetWithText(ChoiceChip, 'Direct Media URL'), findsNothing);
      Color accent() =>
          Theme.of(tester.element(find.widgetWithText(FilledButton, 'Analyze')))
              .colorScheme
              .primary;
      expect(accent(), const Color(0xFFDC2626));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Facebook'));
      await tester.pump();
      expect(accent(), const Color(0xFF1865E6));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Instagram'));
      await tester.pump();
      expect(accent(), const Color(0xFFC13584));
      await tester.enterText(find.byType(TextField), 'https://youtu.be/owned');
      await tester.pump();
      expect(accent(), const Color(0xFFDC2626));
      expect(
          tester
              .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'YouTube'))
              .selected,
          true);
      expect(
          tester
              .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Instagram'))
              .onSelected,
          isNull);
      await tester.tap(find.widgetWithText(TextButton, 'Clear'));
      await tester.pump();
      expect(
          tester
              .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Instagram'))
              .onSelected,
          isNotNull);
      await tester.enterText(
          find.byType(TextField), 'https://tiktok.com/@owned/video/1');
      await tester.pump();
      expect(find.text('Use a YouTube, Facebook or Instagram link.'),
          findsOneWidget);
      expect(accent(), const Color(0xFFDC2626));
    });
  }
}
