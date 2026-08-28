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
  List<SentimentLog> _logs            = [];
  List<FlSpot>       _priceSpots      = [];
  List<FlSpot>       _sentimentSpots  = [];
  double _sentimentScore = 0;
  String _sentimentLabel = 'Neutral';
  bool   _loading        = true;
  bool   _chartLoading   = false;
  double _minY = 0, _maxY = 0;
  String _timeframe = '7d';

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    final assetId = int.tryParse(widget.asset.id) ?? 0;
    final results = await Future.wait([
      ApiService.fetchSentimentLogs(assetId, limit: 8),
      ApiService.fetchChartData(widget.asset.symbol, timeframe: _timeframe),
      ApiService.fetchSentimentSummary(widget.asset.symbol),
    ]);
    _applyChart(results[1] as Map<String, dynamic>?);
    final sentiment = results[2] as Map<String, dynamic>?;
    if (!mounted) return;
    setState(() {
      _logs = results[0] as List<SentimentLog>;
      _sentimentScore = (sentiment?['current_score'] as num?)?.toDouble() ?? 0;
      _sentimentLabel = sentiment?['status'] as String? ?? 'Neutral';
      _loading = false;
    });
  }

  Future<void> _loadChart(String tf) async {
    setState(() { _timeframe = tf; _chartLoading = true; });
    final chart = await ApiService.fetchChartData(widget.asset.symbol, timeframe: tf);
    if (!mounted) return;
    _applyChart(chart);
    setState(() => _chartLoading = false);
  }

  void _applyChart(Map<String, dynamic>? chart) {
    List<FlSpot> priceSpots     = [];
    List<FlSpot> sentimentSpots = [];
    if (chart != null && chart['data'] != null) {
      final data = chart['data'] as List<dynamic>;
      for (int i = 0; i < data.length; i++) {
        final point = data[i] as Map<String, dynamic>;
        priceSpots.add(FlSpot(i.toDouble(), (point['price'] as num).toDouble()));
        if (point['sentiment_score'] != null) {
          sentimentSpots.add(FlSpot(i.toDouble(), (point['sentiment_score'] as num).toDouble()));
        }
      }
    }
    final minY = priceSpots.isEmpty ? 0.0 : priceSpots.map((s) => s.y).reduce((a, b) => a < b ? a : b);
    final maxY = priceSpots.isEmpty ? 0.0 : priceSpots.map((s) => s.y).reduce((a, b) => a > b ? a : b);
    final pad  = (maxY - minY) * 0.1;
    _priceSpots     = priceSpots;
    _sentimentSpots = sentimentSpots;
    _minY = minY - pad;
    _maxY = maxY + pad;
  }

  String _fmt(double price) => price >= 1 ? '\$${price.toStringAsFixed(2)}' : '\$${price.toStringAsFixed(4)}';

  @override
  Widget build(BuildContext context) {
    final asset = widget.asset;
    final isUp  = asset.change24h >= 0;
    final changeColor = isUp ? AppColors.primary : AppColors.danger;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceLight,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(color: asset.symbolColor, borderRadius: BorderRadius.zero),
            alignment: Alignment.center,
            child: Text(asset.symbol.length > 3 ? asset.symbol.substring(0, 3) : asset.symbol,
                style: const TextStyle(color: AppColors.paper, fontSize: 10, fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(asset.name,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            Text(asset.symbol,
                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ]),
        ]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: _loadAll,
              color: AppColors.primary,
              backgroundColor: AppColors.surfaceCard,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // ── Fiyat + Grafik ────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceCard,
                      borderRadius: BorderRadius.zero,
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Güncel Fiyat',
                              style: TextStyle(fontSize: 10, color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                          const SizedBox(height: 4),
                          Text(_fmt(asset.price),
                              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900,
                                  color: AppColors.textPrimary)),
                        ])),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: changeColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.zero,
                            border: Border.all(color: changeColor.withValues(alpha: 0.2)),
                          ),
                          child: Text(
                            '${isUp ? '+' : ''}${asset.change24h.toStringAsFixed(2)}%',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: changeColor),
                          ),
                        ),
                      ]),
                      const SizedBox(height: 14),

                      // Timeframe selector
                      Row(children: [
                        ...['24h', '7d', '30d'].map((tf) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: GestureDetector(
                            onTap: () => _loadChart(tf),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: _timeframe == tf
                                    ? AppColors.primary.withValues(alpha: 0.15)
                                    : AppColors.gridFine.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.zero,
                                border: Border.all(
                                  color: _timeframe == tf
                                      ? AppColors.primary.withValues(alpha: 0.3)
                                      : AppColors.gridFine.withValues(alpha: 0.5),
                                ),
                              ),
                              child: Text(tf,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: _timeframe == tf ? AppColors.primary : AppColors.textSecondary,
                                  )),
                            ),
                          ),
                        )),
                        if (_chartLoading)
                          const SizedBox(width: 14, height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                      ]),
                      const SizedBox(height: 14),

                      // Chart
                      if (_priceSpots.length > 1)
                        SizedBox(
                          height: 140,
                          child: LineChart(LineChartData(
                            gridData: FlGridData(
                              show: true,
                              horizontalInterval: (_maxY - _minY) / 4,
                              drawVerticalLine: false,
                              getDrawingHorizontalLine: (_) => FlLine(
                                color: AppColors.gridFine.withValues(alpha: 0.5), strokeWidth: 1),
                            ),
                            titlesData: const FlTitlesData(show: false),
                            borderData: FlBorderData(show: false),
                            minY: _minY, maxY: _maxY,
                            lineBarsData: [
                              LineChartBarData(
                                spots: _priceSpots,
                                isCurved: true,
                                color: changeColor,
                                barWidth: 2,
                                dotData: const FlDotData(show: false),
                                belowBarData: BarAreaData(
                                  show: true,
                                  gradient: LinearGradient(
                                    colors: [
                                      changeColor.withValues(alpha: 0.15),
                                      changeColor.withValues(alpha: 0.0),
                                    ],
                                    begin: Alignment.topCenter, end: Alignment.bottomCenter,
                                  ),
                                ),
                              ),
                            ],
                          )),
                        )
                      else
                        Container(
                          height: 80,
                          alignment: Alignment.center,
                          child: Text(
                            _chartLoading ? 'Yükleniyor…' : 'Bu zaman dilimi için yeterli veri yok',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ),

                      // ── Sentiment Trend ──────────────────────────────────
                      if (_sentimentSpots.length > 1) ...[
                        const SizedBox(height: 16),
                        Container(height: 1, color: AppColors.gridFine.withValues(alpha: 0.5)),
                        const SizedBox(height: 12),
                        Row(children: [
                          const Icon(Icons.show_chart, size: 13, color: AppColors.textSecondary),
                          const SizedBox(width: 5),
                          const Text('Sentiment Trend',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary, letterSpacing: 0.4)),
                          const Spacer(),
                          Text(
                            '${_sentimentScore >= 0 ? '+' : ''}${_sentimentScore.toStringAsFixed(3)}  $_sentimentLabel',
                            style: TextStyle(
                              fontSize: 10, fontWeight: FontWeight.w700,
                              color: _sentimentScore >= 0.3 ? AppColors.primary
                                  : _sentimentScore <= -0.3 ? AppColors.danger
                                  : AppColors.warning,
                            ),
                          ),
                        ]),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 90,
                          child: LineChart(LineChartData(
                            minY: -1, maxY: 1,
                            clipData: const FlClipData.all(),
                            gridData: FlGridData(
                              show: true,
                              drawVerticalLine: false,
                              horizontalInterval: 0.5,
                              getDrawingHorizontalLine: (v) => FlLine(
                                color: v == 0
                                    ? AppColors.borderSubtle
                                    : AppColors.gridFine.withValues(alpha: 0.5),
                                strokeWidth: v == 0 ? 1 : 0.8,
                                dashArray: v == 0 ? [4, 3] : null,
                              ),
                            ),
                            titlesData: FlTitlesData(
                              leftTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  interval: 1,
                                  reservedSize: 28,
                                  getTitlesWidget: (v, _) {
                                    if (v != -1 && v != 0 && v != 1) return const SizedBox.shrink();
                                    return Text(v > 0 ? '+${v.toInt()}' : '${v.toInt()}',
                                        style: const TextStyle(fontSize: 9, color: AppColors.textSecondary));
                                  },
                                ),
                              ),
                              bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            ),
                            borderData: FlBorderData(show: false),
                            lineBarsData: [
                              LineChartBarData(
                                spots: _sentimentSpots,
                                isCurved: true,
                                color: const Color(0xFF94A3B8),
                                barWidth: 1.5,
                                dotData: const FlDotData(show: false),
                                belowBarData: BarAreaData(
                                  show: true,
                                  cutOffY: 0,
                                  applyCutOffY: true,
                                  gradient: LinearGradient(
                                    colors: [
                                      AppColors.primary.withValues(alpha: 0.18),
                                      AppColors.primary.withValues(alpha: 0.0),
                                    ],
                                    begin: Alignment.topCenter, end: Alignment.bottomCenter,
                                  ),
                                ),
                                aboveBarData: BarAreaData(
                                  show: true,
                                  cutOffY: 0,
                                  applyCutOffY: true,
                                  gradient: LinearGradient(
                                    colors: [
                                      AppColors.danger.withValues(alpha: 0.0),
                                      AppColors.danger.withValues(alpha: 0.18),
                                    ],
                                    begin: Alignment.topCenter, end: Alignment.bottomCenter,
                                  ),
                                ),
                              ),
                            ],
                          )),
                        ),
                      ],
                    ]),
                  ),
                  const SizedBox(height: 12),

                  // ── İstatistikler ─────────────────────────────────────────
                  Row(children: [
                    Expanded(child: _StatCard(
                        label: 'Sentiment', sub: _sentimentLabel,
                        value: '${_sentimentScore >= 0 ? '+' : ''}${_sentimentScore.toStringAsFixed(2)}',
                        color: _sentimentScore >= 0.3 ? AppColors.primary
                            : _sentimentScore <= -0.3 ? AppColors.danger : AppColors.warning)),
                    const SizedBox(width: 10),
                    Expanded(child: _StatCard(
                        label: 'Volume 24h', value: _compact(asset.volume24h),
                        sub: 'USD', color: const Color(0xFF3B82F6))),
                    const SizedBox(width: 10),
                    Expanded(child: _StatCard(
                        label: 'Market Cap', value: _compact(asset.marketCap),
                        sub: 'USD', color: AppColors.warning)),
                  ]),
                  const SizedBox(height: 16),

                  // ── Haberler ──────────────────────────────────────────────
                  if (_logs.isNotEmpty) ...[
                    const Text('Son Haberler & Analiz',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                    const SizedBox(height: 10),
                    ..._logs.map((log) => _NewsCard(log: log)),
                  ],
                ],
              ),
            ),
    );
  }

  String _compact(double n) {
    if (n >= 1e12) return '\$${(n / 1e12).toStringAsFixed(1)}T';
    if (n >= 1e9)  return '\$${(n / 1e9).toStringAsFixed(1)}B';
    if (n >= 1e6)  return '\$${(n / 1e6).toStringAsFixed(1)}M';
    return '\$${n.toStringAsFixed(0)}';
  }
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
class _StatCard extends StatelessWidget {
  final String label, value, sub;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.sub, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.surfaceCard,
      borderRadius: BorderRadius.zero,
      border: Border.all(color: AppColors.borderSubtle),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color)),
      Text(sub, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
    ]),
  );
}

// ── News Card ─────────────────────────────────────────────────────────────────
class _NewsCard extends StatelessWidget {
  final SentimentLog log;
  const _NewsCard({required this.log});

  @override
  Widget build(BuildContext context) {
    final isPos = log.score >= 0.3;
    final isNeg = log.score <= -0.3;
    final color = isPos ? AppColors.primary : isNeg ? AppColors.danger : AppColors.warning;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.zero,
        border: Border(left: BorderSide(color: color, width: 3)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.zero),
          alignment: Alignment.center,
          child: Text('${log.score >= 0 ? '+' : ''}${log.score.toStringAsFixed(1)}',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(log.headline, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary, height: 1.4)),
          const SizedBox(height: 4),
          Text('${log.source} · ${_fmt(log.timestamp)}',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ])),
      ]),
    );
  }

  String _fmt(DateTime dt) {
    const m = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return '${m[dt.month - 1]} ${dt.day}';
  }
}
