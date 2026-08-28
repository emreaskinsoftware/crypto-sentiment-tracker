import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Milimetrik kayıt kağıdı: 8px ince, 40px kalın ızgara.
/// Web'deki .paper-grid ile aynı ölçüler.
class PaperBackground extends StatelessWidget {
  final Widget child;
  const PaperBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.paper,
      child: CustomPaint(
        painter: _GridPainter(),
        child: child,
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  static const _fine = 8.0;
  static const _major = 40.0;

  @override
  void paint(Canvas canvas, Size size) {
    final fine = Paint()
      ..color = AppColors.gridFine
      ..strokeWidth = 1;
    final major = Paint()
      ..color = AppColors.grid
      ..strokeWidth = 1;

    for (double x = 0; x <= size.width; x += _fine) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), fine);
    }
    for (double y = 0; y <= size.height; y += _fine) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), fine);
    }
    for (double x = 0; x <= size.width; x += _major) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), major);
    }
    for (double y = 0; y <= size.height; y += _major) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), major);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Sürekli form kağıdın delikli kenarı — kağıdın cihazdan çıktığı yer.
class SprocketEdge extends StatelessWidget {
  const SprocketEdge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 14,
      decoration: const BoxDecoration(
        color: AppColors.paperDeep,
        border: Border(right: BorderSide(color: AppColors.paperEdge)),
      ),
      child: CustomPaint(painter: _SprocketPainter()),
    );
  }
}

class _SprocketPainter extends CustomPainter {
  static const _pitch = 32.0;

  @override
  void paint(Canvas canvas, Size size) {
    final hole = Paint()..color = AppColors.paperEdge;
    for (double y = 12; y < size.height; y += _pitch) {
      canvas.drawCircle(Offset(size.width / 2, y), 2.5, hole);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Kağıt üzerindeki hairline çerçeveli panel. Yuvarlak köşe, gölge yok.
class PaperPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  const PaperPanel({super.key, required this.child, this.padding, this.margin});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.paper.withValues(alpha: 0.85),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: child,
    );
  }
}

/// Panel künyesi — cihaz üzerindeki serigrafi etiket.
class PanelHeader extends StatelessWidget {
  final String title;
  final String? note;
  final Widget? trailing;

  const PanelHeader({super.key, required this.title, this.note, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(title.toUpperCase(),
              style: AppType.label(size: 10, weight: FontWeight.w700, tracking: 0.2)),
          if (note != null) ...[
            const SizedBox(width: 10),
            Expanded(
              child: Text(note!,
                  style: AppType.data(size: 10, color: AppColors.inkSoft),
                  overflow: TextOverflow.ellipsis),
            ),
          ] else
            const Spacer(),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Kayıt lambası — cihazın çalıştığını söyleyen tek hareket.
class RecordingLamp extends StatefulWidget {
  final Color color;
  const RecordingLamp({super.key, this.color = AppColors.trace});

  @override
  State<RecordingLamp> createState() => _RecordingLampState();
}

class _RecordingLampState extends State<RecordingLamp>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Hareket azaltma tercihine saygı: sabit yanar.
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (reduce) {
      return Container(width: 6, height: 6, color: widget.color);
    }
    return FadeTransition(
      opacity: Tween(begin: 1.0, end: 0.3).animate(_c),
      child: Container(width: 6, height: 6, color: widget.color),
    );
  }
}
