import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../theme/app_theme.dart';
import 'sentiment_badge.dart';
import 'mini_sparkline.dart';

class CryptoCard extends StatelessWidget {
  final CryptoAsset asset;
  final VoidCallback? onTap;

  const CryptoCard({super.key, required this.asset, this.onTap});

  String _formatPrice(double price) {
    if (price >= 1) {
      return '\$${price.toStringAsFixed(2)}';
    }
    return '\$${price.toStringAsFixed(4)}';
  }

  @override
  Widget build(BuildContext context) {
    final isUp = asset.change24h >= 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        ),
        child: Row(
          children: [
            // Symbol icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: asset.symbolColor,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Text(
                asset.symbol.length > 3
                    ? asset.symbol.substring(0, 3)
                    : asset.symbol,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Name & symbol
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    asset.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  SentimentBadge(score: asset.sentimentScore),
                ],
              ),
            ),

            // Sparkline
            SizedBox(
              width: 60,
              height: 30,
              child: MiniSparkline(
                data: asset.sparkline,
                color: isUp ? AppColors.primary : AppColors.danger,
              ),
            ),
            const SizedBox(width: 12),

            // Price & change
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatPrice(asset.price),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${isUp ? '+' : ''}${asset.change24h.toStringAsFixed(2)}%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isUp ? AppColors.primary : AppColors.danger,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
