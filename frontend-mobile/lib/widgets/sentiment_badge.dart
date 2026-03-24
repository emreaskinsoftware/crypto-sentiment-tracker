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
    final bgColor = isPositive
        ? AppColors.pastelGreen
        : isNegative
            ? AppColors.pastelRed
            : AppColors.pastelYellow;
    final textColor = isPositive
        ? AppColors.primary
        : isNegative
            ? AppColors.danger
            : AppColors.warning;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '$label (${score > 0 ? '+' : ''}${score.toStringAsFixed(2)})',
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
