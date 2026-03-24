import 'dart:ui';

class CryptoAsset {
  final String id;
  final String symbol;
  final String name;
  final double price;
  final double change24h;
  final double volume24h;
  final double marketCap;
  final double sentimentScore;
  final String sentimentLabel;
  final List<double> sparkline;
  final bool isWatchlisted;
  final Color symbolColor;

  const CryptoAsset({
    required this.id,
    required this.symbol,
    required this.name,
    required this.price,
    required this.change24h,
    required this.volume24h,
    required this.marketCap,
    required this.sentimentScore,
    required this.sentimentLabel,
    required this.sparkline,
    required this.isWatchlisted,
    required this.symbolColor,
  });
}

class SentimentLog {
  final String id;
  final String assetId;
  final double score;
  final String source;
  final String headline;
  final DateTime timestamp;

  const SentimentLog({
    required this.id,
    required this.assetId,
    required this.score,
    required this.source,
    required this.headline,
    required this.timestamp,
  });
}
