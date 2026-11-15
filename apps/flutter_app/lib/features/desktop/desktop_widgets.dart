import 'package:flutter/material.dart';
import 'package:desktop_drop/desktop_drop.dart';
import '../../core/theme/app_theme.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key});
  @override
  Widget build(BuildContext context) => Container(
      width: 42,
      height: 42,
      decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient:
              LinearGradient(colors: [AppTheme.brand, Color(0xFF4E31DC)])),
      child: const Padding(
          padding: EdgeInsets.all(9),
          child: CustomPaint(painter: _FilmMarkPainter())));
}

class _FilmMarkPainter extends CustomPainter {
  const _FilmMarkPainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 24, size.height / 24);
    final stroke = Paint()
      ..color = Colors.white
      ..strokeWidth = 1.7
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(
        RRect.fromRectAndRadius(
            const Rect.fromLTWH(2, 3, 20, 18), const Radius.circular(3)),
        stroke);
    final lines = Path()
      ..moveTo(6, 3)
      ..lineTo(6, 21)
      ..moveTo(18, 3)
      ..lineTo(18, 21)
      ..moveTo(2, 8)
      ..lineTo(6, 8)
      ..moveTo(2, 16)
      ..lineTo(6, 16)
      ..moveTo(18, 8)
      ..lineTo(22, 8)
      ..moveTo(18, 16)
      ..lineTo(22, 16);
    canvas.drawPath(lines, stroke..strokeWidth = 1.5);
    canvas.drawPath(
        Path()
          ..moveTo(10, 8)
          ..lineTo(16, 12)
          ..lineTo(10, 16)
          ..close(),
        Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _FilmMarkPainter oldDelegate) => false;
}

class StudioCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  const StudioCard(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(22)});
  @override
  Widget build(BuildContext context) =>
      Card(child: Padding(padding: padding, child: child));
}

class StudioDropZone extends StatefulWidget {
  final String title, description;
  final bool enabled;
  final VoidCallback onPick;
  final ValueChanged<List<String>> onDrop;
  const StudioDropZone(
      {super.key,
      required this.title,
      required this.description,
      required this.onPick,
      required this.onDrop,
      this.enabled = true});
  @override
  State<StudioDropZone> createState() => _StudioDropZoneState();
}

class _StudioDropZoneState extends State<StudioDropZone> {
  bool hover = false;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return DropTarget(
        enable: widget.enabled,
        onDragEntered: (_) => setState(() => hover = true),
        onDragExited: (_) => setState(() => hover = false),
        onDragDone: (event) {
          setState(() => hover = false);
          widget.onDrop(event.files.map((f) => f.path).toList());
        },
        child: Semantics(
            button: true,
            label: widget.title,
            child: InkWell(
                onTap: widget.enabled ? widget.onPick : null,
                borderRadius: BorderRadius.circular(24),
                child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.all(28),
                    constraints: const BoxConstraints(minHeight: 180),
                    decoration: BoxDecoration(
                        color: hover
                            ? colors.primaryContainer
                            : colors.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                            color: hover
                                ? colors.primary
                                : colors.outlineVariant)),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                  color: colors.primaryContainer,
                                  shape: BoxShape.circle),
                              child: Icon(Icons.file_upload_outlined,
                                  size: 32, color: colors.primary)),
                          const SizedBox(height: 18),
                          Text(widget.title,
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 8),
                          Text(widget.description,
                              textAlign: TextAlign.center,
                              style: TextStyle(color: colors.onSurfaceVariant)),
                        ])))));
  }
}

class StudioSelect extends StatelessWidget {
  final String label, value;
  final List<String> values;
  final ValueChanged<String>? onChanged;
  const StudioSelect(
      {super.key,
      required this.label,
      required this.value,
      required this.values,
      this.onChanged});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
          initialValue: value,
          isExpanded: true,
          decoration: InputDecoration(labelText: label),
          items: values
              .map((v) => DropdownMenuItem(
                  value: v, child: Text(v, overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: onChanged == null
              ? null
              : (v) {
                  if (v != null) onChanged!(v);
                }));
}

class StudioSlider extends StatelessWidget {
  final String label;
  final double value, min, max;
  final ValueChanged<double>? onChanged;
  final String? suffix;
  const StudioSlider(
      {super.key,
      required this.label,
      required this.value,
      this.min = 0,
      this.max = 100,
      this.onChanged,
      this.suffix});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label)),
          Text(suffix ?? value.toStringAsFixed(1),
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w600))
        ]),
        Slider(
            value: value.clamp(min, max),
            min: min,
            max: max > min ? max : min + 1,
            onChanged: onChanged),
      ]);
}

class StudioNotice extends StatelessWidget {
  final String message;
  final bool error;
  const StudioNotice(this.message, {super.key, this.error = false});
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final color = error ? colors.error : colors.tertiary;
    return Container(
        width: double.infinity,
        margin: const EdgeInsets.symmetric(vertical: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: color.withValues(alpha: .1),
            border: Border.all(color: color.withValues(alpha: .3)),
            borderRadius: BorderRadius.circular(18)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(error ? Icons.error_outline : Icons.check_circle_outline,
              color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
              child: SelectableText(message, style: TextStyle(color: color)))
        ]));
  }
}

String timeLabel(double seconds) {
  final value = seconds.isFinite ? seconds.clamp(0, 1000000) : 0;
  return '${(value ~/ 60).toString().padLeft(2, '0')}:${(value % 60).toStringAsFixed(2).padLeft(5, '0')}';
}

String bytesLabel(num? bytes) => bytes == null
    ? 'Unavailable'
    : bytes >= 1048576
        ? '${(bytes / 1048576).toStringAsFixed(1)} MB'
        : '${(bytes / 1024).toStringAsFixed(1)} KB';

class StudioPanels extends StatelessWidget {
  final Widget main, settings;
  const StudioPanels({super.key, required this.main, required this.settings});
  @override
  Widget build(BuildContext context) => LayoutBuilder(
      builder: (context, constraints) => constraints.maxWidth >= 920
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: main),
              const SizedBox(width: 22),
              SizedBox(width: 340, child: settings)
            ])
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [main, const SizedBox(height: 20), settings]));
}
