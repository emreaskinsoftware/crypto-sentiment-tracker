import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SentimentBadge extends StatelessWidget {
  final double score;
  const SentimentBadge({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final isPositive = score >= 0.3;
    final isNegative = score <= -0.3;
    final label = isPositive ? 'Positive' : isNegative ? 'Negative' : 'Neutral';
    final color = isPositive ? AppColors.primary : isNegative ? AppColors.danger : AppColors.warning;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        '$label (${score > 0 ? '+' : ''}${score.toStringAsFixed(2)})',
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700),
      ),
    );
  }
}
