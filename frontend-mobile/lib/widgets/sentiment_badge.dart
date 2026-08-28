import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Rozet değil, ölçek. Duygu −1…+1 aralığında bir konumdur; etiket yerine
/// konumu göstermek hem daha doğru hem de cihazın diline uygun.
/// Ölçüm yoksa uydurma "nötr" göstermez, açıkça söyler.
class SentimentBadge extends StatelessWidget {
  final double? score;
  final double width;

  const SentimentBadge({super.key, required this.score, this.width = 44});

  @override
  Widget build(BuildContext context) {
    final s = score;
    if (s == null) {
      return Text('ölçülmedi',
          style: AppType.data(size: 10, color: AppColors.inkFaint));
    }

    final v = s.clamp(-1.0, 1.0);
    final color = v >= 0.3
        ? AppColors.traceAlt
        : v <= -0.3
            ? AppColors.trace
            : AppColors.inkFaint;

    final half = v.abs() / 2; // 0…0.5 — sıfırdan skora
    final barWidth = width * half;
    final left = v >= 0 ? width / 2 : width / 2 - barWidth;

    return Row(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(
        width: width,
        height: 14,
        child: Stack(children: [
          // Ölçek çerçevesi
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.ink.withValues(alpha: 0.2)),
              color: AppColors.paper,
            ),
          ),
          // Nötr ekseni
          Positioned(
            left: width / 2 - 0.5,
            top: 0,
            bottom: 0,
            child: Container(width: 1, color: AppColors.ink.withValues(alpha: 0.25)),
          ),
          // Sıfırdan skora uzanan çubuk
          Positioned(
            left: left,
            top: 5.5,
            child: Container(width: barWidth, height: 3, color: color),
          ),
        ]),
      ),
      const SizedBox(width: 6),
      Text('${v > 0 ? '+' : ''}${v.toStringAsFixed(2)}',
          style: AppType.data(size: 11, color: color)),
    ]);
  }
}
