import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../theme/app_theme.dart';
import 'sentiment_badge.dart';

/// Varlık defterinde bir satır. Renkli avatar çipi yok — kanal numarası,
/// mono sembol ve hairline ayraç var.
///
/// Not: eskiden burada bir mini grafik vardı; verisi `_generateSparkline`
/// tarafından uyduruluyordu. Kayıt cihazı arayüzünde sahte iz göstermek
/// kabul edilemez olduğu için kaldırıldı.
class CryptoCard extends StatelessWidget {
  final CryptoAsset asset;
  final VoidCallback? onTap;
  final int? channel;

  const CryptoCard({super.key, required this.asset, this.onTap, this.channel});

  String _formatPrice(double p) =>
      p >= 1 ? '\$${p.toStringAsFixed(2)}' : '\$${p.toStringAsFixed(4)}';

  @override
  Widget build(BuildContext context) {
    final isUp = asset.change24h >= 0;
    final changeColor = isUp ? AppColors.traceAlt : AppColors.trace;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
        ),
        child: Row(children: [
          if (channel != null) ...[
            SizedBox(
              width: 18,
              child: Text(channel!.toString().padLeft(2, '0'),
                  style: AppType.data(size: 10, color: AppColors.inkFaint)),
            ),
            const SizedBox(width: 6),
          ],
          Expanded(
            flex: 4,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(asset.symbol,
                    style: AppType.data(size: 13, weight: FontWeight.w500)),
                if (asset.name.isNotEmpty && asset.name != asset.symbol) ...[
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(asset.name,
                        style: AppType.label(size: 11, weight: FontWeight.w400,
                            color: AppColors.inkSoft, tracking: 0),
                        overflow: TextOverflow.ellipsis),
                  ),
                ],
              ]),
              const SizedBox(height: 4),
              SentimentBadge(score: asset.sentimentScore),
            ]),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(_formatPrice(asset.price),
                style: AppType.data(size: 13, weight: FontWeight.w500)),
            const SizedBox(height: 4),
            Text('${isUp ? '+' : ''}${asset.change24h.toStringAsFixed(2)}%',
                style: AppType.data(size: 12, color: changeColor)),
          ]),
        ]),
      ),
    );
  }
}
