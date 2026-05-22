import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../theme/app_theme.dart';
import 'sentiment_badge.dart';
import 'mini_sparkline.dart';

class CryptoCard extends StatelessWidget {
  final CryptoAsset asset;
  final VoidCallback? onTap;

  const CryptoCard({super.key, required this.asset, this.onTap});

  String _formatPrice(double price) =>
      price >= 1 ? '\$${price.toStringAsFixed(2)}' : '\$${price.toStringAsFixed(4)}';

  @override
  Widget build(BuildContext context) {
    final isUp = asset.change24h >= 0;
    final changeColor = isUp ? AppColors.primary : AppColors.danger;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(children: [
          Container(
            width: 46, height: 46,
            decoration: BoxDecoration(
              color: asset.symbolColor,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: asset.symbolColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 3))],
            ),
            alignment: Alignment.center,
            child: Text(
              asset.symbol.length > 3 ? asset.symbol.substring(0, 3) : asset.symbol,
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 3,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(asset.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              SentimentBadge(score: asset.sentimentScore),
            ]),
          ),
          SizedBox(width: 56, height: 32, child: MiniSparkline(data: asset.sparkline, color: changeColor)),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(_formatPrice(asset.price),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: isUp ? AppColors.primary.withValues(alpha: 0.1) : AppColors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('${isUp ? '+' : ''}${asset.change24h.toStringAsFixed(2)}%',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: changeColor)),
            ),
          ]),
        ]),
      ),
    );
  }
}
