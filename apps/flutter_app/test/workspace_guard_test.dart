import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_editor.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_batch.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_editor.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_batch.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';

void main() {
  test('Desktop editors protect imported media until workspace is cleared', () {
    final state = DesktopEditorState();
    expect(state.needsGuard, isFalse);
    state.path = 'clip.mp4';
    expect(state.needsGuard, isTrue);
    state.path = null;
    expect(state.needsGuard, isFalse);
  });
  test('Mobile editors protect imported media even after saving', () {
    final state = MobileEditorState();
    expect(state.hasWork, isFalse);
    state.path = 'clip.wav';
    state.saved = true;
    expect(state.hasWork, isTrue);
    state.path = null;
    expect(state.hasWork, isFalse);
  });
  test('Desktop batch protects queued files before processing', () {
    final state = DesktopBatchState();
    expect(state.needsGuard, isFalse);
    state.items.add(BatchItem('photo.png', 'image'));
    expect(state.needsGuard, isTrue);
    state.items.clear();
    expect(state.needsGuard, isFalse);
  });
  test('Mobile batch protects queued files before processing', () {
    final state = MobileBatchState();
    expect(state.hasWork, isFalse);
    state.items.add(MobileBatchItem('photo.png', MediaKind.image, 'png', 100));
    expect(state.hasWork, isTrue);
    state.items.clear();
    expect(state.hasWork, isFalse);
  });
}
