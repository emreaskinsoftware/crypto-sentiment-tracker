import 'dart:math';
import 'dart:ui';
import 'crypto_asset.dart';

List<double> _generateSparkline(double base, double trend) {
  final random = Random(base.toInt());
  final data = <double>[];
  double value = base;
  for (int i = 0; i < 24; i++) {
    value += (random.nextDouble() - 0.5 + trend * 0.1) * base * 0.02;
    data.add((value * 100).roundToDouble() / 100);
  }
  return data;
}

final List<CryptoAsset> mockAssets = [
  CryptoAsset(
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 67432.18,
    change24h: 2.34,
    volume24h: 28500000000,
    marketCap: 1325000000000,
    sentimentScore: 0.72,
    sentimentLabel: 'Positive',
    sparkline: _generateSparkline(67000, 1),
    isWatchlisted: true,
    symbolColor: const Color(0xFFF7931A),
  ),
  CryptoAsset(
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3521.45,
    change24h: -1.12,
    volume24h: 15200000000,
    marketCap: 423000000000,
    sentimentScore: 0.45,
    sentimentLabel: 'Neutral',
    sparkline: _generateSparkline(3500, -0.5),
    isWatchlisted: true,
    symbolColor: const Color(0xFF627EEA),
  ),
  CryptoAsset(
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    price: 142.87,
    change24h: 5.67,
    volume24h: 3800000000,
    marketCap: 62000000000,
    sentimentScore: 0.85,
    sentimentLabel: 'Positive',
    sparkline: _generateSparkline(140, 2),
    isWatchlisted: false,
    symbolColor: const Color(0xFF9945FF),
  ),
  CryptoAsset(
    id: 'cardano',
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.458,
    change24h: -3.21,
    volume24h: 520000000,
    marketCap: 16200000000,
    sentimentScore: -0.35,
    sentimentLabel: 'Negative',
    sparkline: _generateSparkline(0.46, -1),
    isWatchlisted: false,
    symbolColor: const Color(0xFF3468D1),
  ),
  CryptoAsset(
    id: 'ripple',
    symbol: 'XRP',
    name: 'Ripple',
    price: 0.527,
    change24h: 1.89,
    volume24h: 1200000000,
    marketCap: 28500000000,
    sentimentScore: 0.58,
    sentimentLabel: 'Positive',
    sparkline: _generateSparkline(0.52, 0.8),
    isWatchlisted: true,
    symbolColor: const Color(0xFF334155),
  ),
  CryptoAsset(
    id: 'dogecoin',
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.0832,
    change24h: -0.45,
    volume24h: 680000000,
    marketCap: 11800000000,
    sentimentScore: 0.12,
    sentimentLabel: 'Neutral',
    sparkline: _generateSparkline(0.083, -0.2),
    isWatchlisted: false,
    symbolColor: const Color(0xFFCBA236),
  ),
];

final List<SentimentLog> mockSentimentLogs = [
  SentimentLog(
    id: '1',
    assetId: 'bitcoin',
    score: 0.82,
    source: 'CoinDesk',
    headline: 'Bitcoin ETF inflows reach record highs as institutional demand surges',
    timestamp: DateTime(2024, 3, 15, 14, 30),
  ),
  SentimentLog(
    id: '2',
    assetId: 'bitcoin',
    score: 0.65,
    source: 'Reddit',
    headline: 'BTC breaking resistance levels, community bullish',
    timestamp: DateTime(2024, 3, 15, 13, 0),
  ),
  SentimentLog(
    id: '3',
    assetId: 'ethereum',
    score: 0.45,
    source: 'The Block',
    headline: 'Ethereum Layer 2 solutions see record TVL growth',
    timestamp: DateTime(2024, 3, 15, 10, 30),
  ),
  SentimentLog(
    id: '4',
    assetId: 'solana',
    score: 0.91,
    source: 'CoinTelegraph',
    headline: 'Solana ecosystem explodes with new DeFi protocols',
    timestamp: DateTime(2024, 3, 15, 12, 0),
  ),
  SentimentLog(
    id: '5',
    assetId: 'cardano',
    score: -0.45,
    source: 'CryptoSlate',
    headline: 'Cardano faces criticism over slow development',
    timestamp: DateTime(2024, 3, 15, 8, 0),
  ),
];
