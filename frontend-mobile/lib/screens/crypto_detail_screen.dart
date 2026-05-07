import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class CryptoDetailScreen extends StatefulWidget {
  final CryptoAsset asset;
  const CryptoDetailScreen({super.key, required this.asset});

  @override
  State<CryptoDetailScreen> createState() => _CryptoDetailScreenState();
}

class _CryptoDetailScreenState extends State<CryptoDetailScreen> {
  List<SentimentLog> _logs = [];
  List<FlSpot> _priceSpots = [];
  double _sentimentScore = 0;
  String _sentimentLabel = 'Neutral';
  bool _loading = true;
  double _minY = 0, _maxY = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final assetId = int.tryParse(widget.asset.id) ?? 0;
    final results = await Future.wait([
      ApiService.fetchSentimentLogs(assetId, limit: 8),
      ApiService.fetchChartData(widget.asset.symbol),
      ApiService.fetchSentimentSummary(widget.asset.symbol),
    ]);

    final logs = results[0] as List<SentimentLog>;
    final chart = results[1] as Map<String, dynamic>?;
    final sentiment = results[2] as Map<String, dynamic>?;

    List<FlSpot> spots = [];
    if (chart != null && chart['data'] != null) {
      final data = chart['data'] as List<dynamic>;
      for (int i = 0; i < data.length; i++) {
        final price = (data[i]['price'] as num).toDouble();
        spots.add(FlSpot(i.toDouble(), price));
      }
    }

    double minY = spots.isEmpty
        ? 0
        : spots.map((s) => s.y).reduce((a, b) => a < b ? a : b);
    double maxY = spots.isEmpty
        ? 0
        : spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    final padding = (maxY - minY) * 0.1;

    setState(() {
      _logs = logs;
      _priceSpots = spots;
      _minY = minY - padding;
      _maxY = maxY + padding;
      _sentimentScore = (sentiment?['current_score'] as num?)?.toDouble() ?? 0;
      _sentimentLabel = sentiment?['status'] as String? ?? 'Neutral';
      _loading = false;
    });
  }

  String _formatPrice(double price) => price >= 1
      ? '\$${price.toStringAsFixed(2)}'
      : '\$${price.toStringAsFixed(4)}';

  @override
  Widget build(BuildContext context) {
    final asset = widget.asset;
    final isUp = asset.change24h >= 0;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceLight,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new,
              size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                  color: asset.symbolColor,
                  borderRadius: BorderRadius.circular(8)),
              alignment: Alignment.center,
              child: Text(
                  asset.symbol.length > 3
                      ? asset.symbol.substring(0, 3)
                      : asset.symbol,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w800)),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(asset.name,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary)),
                Text(asset.symbol,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Fiyat kartı
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: Colors.black.withValues(alpha: 0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Current Price',
                            style: TextStyle(
                                fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(_formatPrice(asset.price),
                                style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.textPrimary)),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isUp
                                    ? AppColors.pastelGreen
                                    : AppColors.pastelRed,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${isUp ? '+' : ''}${asset.change24h.toStringAsFixed(2)}%',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isUp
                                        ? AppColors.primary
                                        : AppColors.danger),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        // Grafik
                        if (_priceSpots.length > 1)
                          SizedBox(
                            height: 120,
                            child: LineChart(LineChartData(
                              gridData: const FlGridData(show: false),
                              titlesData: const FlTitlesData(show: false),
                              borderData: FlBorderData(show: false),
                              minY: _minY,
                              maxY: _maxY,
                              lineBarsData: [
                                LineChartBarData(
                                  spots: _priceSpots,
                                  isCurved: true,
                                  color: isUp
                                      ? AppColors.primary
                                      : AppColors.danger,
                                  barWidth: 2,
                                  dotData: const FlDotData(show: false),
                                  belowBarData: BarAreaData(
                                    show: true,
                                    color: (isUp
                                            ? AppColors.primary
                                            : AppColors.danger)
                                        .withValues(alpha: 0.1),
                                  ),
                                ),
                              ],
                            )),
                          )
                        else
                          const SizedBox(
                              height: 80,
                              child: Center(
                                child: Text('Grafik verisi yükleniyor...',
                                    style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12)),
                              )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // İstatistikler
                  Row(
                    children: [
                      Expanded(
                          child: _StatCard(
                              label: 'Sentiment',
                              value:
                                  '${_sentimentScore >= 0 ? '+' : ''}${_sentimentScore.toStringAsFixed(2)}',
                              sub: _sentimentLabel,
                              color: _sentimentScore >= 0.3
                                  ? AppColors.primary
                                  : _sentimentScore <= -0.3
                                      ? AppColors.danger
                                      : AppColors.warning)),
                      const SizedBox(width: 10),
                      Expanded(
                          child: _StatCard(
                              label: 'Volume 24h',
                              value: _compactNumber(asset.volume24h),
                              sub: 'USD',
                              color: const Color(0xFF3B82F6))),
                      const SizedBox(width: 10),
                      Expanded(
                          child: _StatCard(
                              label: 'Market Cap',
                              value: _compactNumber(asset.marketCap),
                              sub: 'USD',
                              color: AppColors.warning)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Haberler
                  if (_logs.isNotEmpty) ...[
                    const Text('Recent News & Analysis',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary)),
                    const SizedBox(height: 10),
                    ..._logs.map((log) => _NewsCard(log: log)),
                  ],
                ],
              ),
            ),
    );
  }

  String _compactNumber(double n) {
    if (n >= 1e12) return '\$${(n / 1e12).toStringAsFixed(1)}T';
    if (n >= 1e9) return '\$${(n / 1e9).toStringAsFixed(1)}B';
    if (n >= 1e6) return '\$${(n / 1e6).toStringAsFixed(1)}M';
    return '\$${n.toStringAsFixed(0)}';
  }
}

class _StatCard extends StatelessWidget {
  final String label, value, sub;
  final Color color;
  const _StatCard(
      {required this.label,
      required this.value,
      required this.sub,
      required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w800, color: color)),
          Text(sub,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary)),
        ]),
      );
}

class _NewsCard extends StatelessWidget {
  final SentimentLog log;
  const _NewsCard({required this.log});

  @override
  Widget build(BuildContext context) {
    final isPos = log.score >= 0.3;
    final isNeg = log.score <= -0.3;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isPos
                ? AppColors.pastelGreen
                : isNeg
                    ? AppColors.pastelRed
                    : AppColors.pastelYellow,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text(
              '${log.score >= 0 ? '+' : ''}${log.score.toStringAsFixed(1)}',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isPos
                      ? AppColors.primary
                      : isNeg
                          ? AppColors.danger
                          : AppColors.warning)),
        ),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(log.headline,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text('${log.source} · ${_fmt(log.timestamp)}',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary)),
        ])),
      ]),
    );
  }

  String _fmt(DateTime dt) {
    const m = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${m[dt.month - 1]} ${dt.day}';
  }
}
