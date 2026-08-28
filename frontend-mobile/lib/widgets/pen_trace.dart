import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'paper.dart';

/// Şeritteki tek örnek: bir zaman damgası, ölçülmüşse duygu, ve fiyat.
class TracePoint {
  final DateTime t;
  final double? sentiment;
  final double price;
  const TracePoint({required this.t, required this.sentiment, required this.price});
}

/// İMZA — iki kanallı şerit kaydı.
/// Duygu (kalem kırmızısı) ve fiyat (mürekkep mavisi) aynı zaman ekseninde;
/// açılışta kalem soldan sağa çizer, kalem ucu son örnekte yanıp söner.
class PenTrace extends StatefulWidget {
  final String symbol;
  final String name;
  final List<TracePoint> points;
  final String window; // '24h' | '7d'

  const PenTrace({
    super.key,
    required this.symbol,
    required this.name,
    required this.points,
    required this.window,
  });

  @override
  State<PenTrace> createState() => _PenTraceState();
}

class _PenTraceState extends State<PenTrace> with TickerProviderStateMixin {
  late final AnimationController _draw = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );
  late final AnimationController _blink = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 1),
  );

  @override
  void initState() {
    super.initState();
    _draw.forward();
    _blink.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant PenTrace old) {
    super.didUpdateWidget(old);
    // Yeni örnek geldiğinde kalem şeridi baştan çizer.
    if (old.points.length != widget.points.length) {
      _draw.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _draw.dispose();
    _blink.dispose();
    super.dispose();
  }

  String _stamp(DateTime d) {
    final hh = d.hour.toString().padLeft(2, '0');
    final mm = d.minute.toString().padLeft(2, '0');
    if (widget.window == '24h') return '$hh:$mm';
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return '${d.day.toString().padLeft(2, '0')} ${months[d.month - 1]} $hh:$mm';
  }

  String _price(double v) => v >= 1
      ? '\$${v.toStringAsFixed(2)}'
      : '\$${v.toStringAsFixed(4)}';

  @override
  Widget build(BuildContext context) {
    final pts = widget.points;
    final scored = pts.where((p) => p.sentiment != null).toList();
    final hasSentiment = scored.length >= 2;
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;

    final title = widget.name.isNotEmpty && widget.name != widget.symbol
        ? '${widget.symbol} · ${widget.name}'
        : widget.symbol;
    final windowLabel = widget.window == '7d' ? 'son 7 gün' : 'son 24 saat';

    return PaperPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PanelHeader(title: 'Şerit kaydı', note: '$title · $windowLabel'),

          if (pts.length < 2)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 36),
              child: Text(
                'Henüz yeterli örnek kaydedilmedi. İlk çevrim tamamlanınca '
                'şerit buradan akmaya başlar.',
                textAlign: TextAlign.center,
                style: AppType.data(size: 11, color: AppColors.inkSoft),
              ),
            )
          else ...[
            // Kanal göstergesi
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(children: [
                _key(AppColors.trace, hasSentiment ? 'duygu' : 'duygu (ölçüm yok)'),
                const SizedBox(width: 14),
                _key(AppColors.traceAlt, 'fiyat'),
              ]),
            ),
            SizedBox(
              height: 150,
              child: AnimatedBuilder(
                animation: Listenable.merge([_draw, _blink]),
                builder: (_, __) => CustomPaint(
                  painter: _TracePainter(
                    points: pts,
                    progress: reduce ? 1.0 : _draw.value,
                    penOpacity: reduce ? 1.0 : (_blink.value < 0.5 ? 1.0 : 0.2),
                  ),
                  size: Size.infinite,
                ),
              ),
            ),
            // Okuma bandı
            Container(
              padding: const EdgeInsets.fromLTRB(12, 9, 12, 10),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _readout(
                    'Duygu',
                    scored.isEmpty
                        ? '—'
                        : '${scored.last.sentiment! > 0 ? '+' : ''}'
                            '${scored.last.sentiment!.toStringAsFixed(2)}',
                    AppColors.trace,
                  ),
                  const SizedBox(width: 24),
                  _readout('Fiyat', _price(pts.last.price), AppColors.traceAlt),
                  const Spacer(),
                  Text('${_stamp(pts.first.t)} → ${_stamp(pts.last.t)}',
                      style: AppType.data(size: 9, color: AppColors.inkFaint)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _key(Color c, String label) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 14, height: 2, color: c),
        const SizedBox(width: 5),
        Text(label, style: AppType.data(size: 9, color: AppColors.inkSoft)),
      ]);

  Widget _readout(String label, String value, Color color) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label.toUpperCase(),
              style: AppType.label(size: 8, weight: FontWeight.w600,
                  color: AppColors.inkSoft, tracking: 0.18)),
          const SizedBox(height: 2),
          Text(value,
              style: AppType.data(size: 19, weight: FontWeight.w500, color: color)),
        ],
      );
}

class _TracePainter extends CustomPainter {
  final List<TracePoint> points;
  final double progress;
  final double penOpacity;

  static const _padT = 14.0;
  static const _padB = 14.0;

  _TracePainter({
    required this.points,
    required this.progress,
    required this.penOpacity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;

    final h = size.height - _padT - _padB;
    final step = size.width / (points.length - 1);

    // Duygu ekseni her zaman −1…+1: sıfır çizgisi sabit kalsın.
    double sy(double v) => _padT + (1 - (v + 1) / 2) * h;

    final prices = points.map((p) => p.price).toList();
    final pMin = prices.reduce((a, b) => a < b ? a : b);
    final pMax = prices.reduce((a, b) => a > b ? a : b);
    final pSpan = (pMax - pMin) == 0 ? 1.0 : pMax - pMin;
    double py(double v) => _padT + (1 - (v - pMin) / pSpan) * h;

    // Nötr ekseni — kesikli
    final zeroY = sy(0);
    final dash = Paint()
      ..color = AppColors.ink.withValues(alpha: 0.3)
      ..strokeWidth = 1;
    for (double x = 0; x < size.width; x += 6) {
      canvas.drawLine(Offset(x, zeroY), Offset(x + 2.5, zeroY), dash);
    }

    // Kanal 2 — fiyat
    final pricePath = Path();
    for (var i = 0; i < points.length; i++) {
      final o = Offset(i * step, py(points[i].price));
      i == 0 ? pricePath.moveTo(o.dx, o.dy) : pricePath.lineTo(o.dx, o.dy);
    }
    _drawPartial(canvas, pricePath, AppColors.traceAlt, 1.4);

    // Kanal 1 — duygu (yalnızca ölçülmüş noktalar)
    Offset? penAt;
    final scored = <Offset>[];
    for (var i = 0; i < points.length; i++) {
      final s = points[i].sentiment;
      if (s != null) scored.add(Offset(i * step, sy(s)));
    }
    if (scored.length >= 2) {
      final sPath = Path()..moveTo(scored.first.dx, scored.first.dy);
      for (final o in scored.skip(1)) {
        sPath.lineTo(o.dx, o.dy);
      }
      _drawPartial(canvas, sPath, AppColors.trace, 2.0);
      penAt = scored.last;
    }

    // Kalem ucu — çizim bittiğinde belirir
    if (penAt != null && progress > 0.98) {
      final guide = Paint()
        ..color = AppColors.trace.withValues(alpha: 0.35 * penOpacity)
        ..strokeWidth = 1;
      canvas.drawLine(
          Offset(penAt.dx, _padT - 3), Offset(penAt.dx, size.height - _padB + 3), guide);
      canvas.drawCircle(penAt, 3,
          Paint()..color = AppColors.trace.withValues(alpha: penOpacity));
    }
  }

  /// Kalem izini `progress` oranında çizer — cihaz yazarken.
  void _drawPartial(Canvas canvas, Path path, Color color, double width) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = width
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    if (progress >= 1.0) {
      canvas.drawPath(path, paint);
      return;
    }
    for (final metric in path.computeMetrics()) {
      canvas.drawPath(
        metric.extractPath(0, metric.length * progress.clamp(0.0, 1.0)),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _TracePainter old) =>
      old.progress != progress ||
      old.penOpacity != penOpacity ||
      old.points != points;
}
