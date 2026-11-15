import 'package:flutter/material.dart';

Rect clampCrop(Rect rect) {
  final w = rect.width.clamp(.03, 1.0);
  final h = rect.height.clamp(.03, 1.0);
  return Rect.fromLTWH(
      rect.left.clamp(0, 1 - w), rect.top.clamp(0, 1 - h), w, h);
}

/// All coordinates are relative to the displayed source, not letterbox padding.
class CropSurface extends StatelessWidget {
  final Widget child;
  final double aspect;
  final Rect crop;
  final ValueChanged<Rect>? onChanged;
  const CropSurface(
      {super.key,
      required this.child,
      required this.aspect,
      required this.crop,
      this.onChanged});
  @override
  Widget build(BuildContext context) => AspectRatio(
      aspectRatio: aspect > 0 ? aspect : 16 / 9,
      child: LayoutBuilder(builder: (context, box) {
        final rect = Rect.fromLTWH(
            crop.left * box.maxWidth,
            crop.top * box.maxHeight,
            crop.width * box.maxWidth,
            crop.height * box.maxHeight);
        return Stack(fit: StackFit.expand, children: [
          child,
          if (onChanged != null) ...[
            IgnorePointer(
                child: CustomPaint(
                    painter: _CropPainter(
                        rect, Theme.of(context).colorScheme.primary))),
            Positioned.fromRect(
                rect: rect,
                child: MouseRegion(
                    cursor: SystemMouseCursors.move,
                    child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onPanUpdate: (d) => onChanged!(clampCrop(crop.shift(
                            Offset(d.delta.dx / box.maxWidth,
                                d.delta.dy / box.maxHeight)))),
                        child: const SizedBox.expand()))),
            for (final alignment in [
              Alignment.topLeft,
              Alignment.topCenter,
              Alignment.topRight,
              Alignment.centerLeft,
              Alignment.centerRight,
              Alignment.bottomLeft,
              Alignment.bottomCenter,
              Alignment.bottomRight
            ])
              Positioned(
                  left: rect.left + rect.width * (alignment.x + 1) / 2 - 10,
                  top: rect.top + rect.height * (alignment.y + 1) / 2 - 10,
                  child: Semantics(
                      label: 'Resize crop',
                      child: MouseRegion(
                          cursor: SystemMouseCursors.resizeUpLeftDownRight,
                          child: GestureDetector(
                              onPanUpdate: (d) {
                                final dx = d.delta.dx / box.maxWidth,
                                    dy = d.delta.dy / box.maxHeight;
                                final l = alignment.x < 0
                                    ? (crop.left + dx)
                                        .clamp(0.0, crop.right - .03)
                                    : crop.left;
                                final r = alignment.x > 0
                                    ? (crop.right + dx)
                                        .clamp(crop.left + .03, 1.0)
                                    : crop.right;
                                final t = alignment.y < 0
                                    ? (crop.top + dy)
                                        .clamp(0.0, crop.bottom - .03)
                                    : crop.top;
                                final b = alignment.y > 0
                                    ? (crop.bottom + dy)
                                        .clamp(crop.top + .03, 1.0)
                                    : crop.bottom;
                                onChanged!(
                                    clampCrop(Rect.fromLTRB(l, t, r, b)));
                              },
                              child: Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                      color: Colors.white,
                                      border: Border.all(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          width: 2),
                                      borderRadius:
                                          BorderRadius.circular(5))))))),
          ],
        ]);
      }));
}

class _CropPainter extends CustomPainter {
  final Rect rect;
  final Color color;
  _CropPainter(this.rect, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final mask = Path()
      ..addRect(Offset.zero & size)
      ..addRect(rect)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(mask, Paint()..color = Colors.black.withValues(alpha: .5));
    canvas.drawRect(
        rect,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2);
    final line = Paint()
      ..color = Colors.white.withValues(alpha: .4)
      ..strokeWidth = 1;
    for (var i = 1; i <= 2; i++) {
      canvas.drawLine(Offset(rect.left + rect.width * i / 3, rect.top),
          Offset(rect.left + rect.width * i / 3, rect.bottom), line);
      canvas.drawLine(Offset(rect.left, rect.top + rect.height * i / 3),
          Offset(rect.right, rect.top + rect.height * i / 3), line);
    }
  }

  @override
  bool shouldRepaint(covariant _CropPainter old) =>
      old.rect != rect || old.color != color;
}
