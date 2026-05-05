import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/crypto_card.dart';
import '../widgets/sentiment_badge.dart';

class RadarScreen extends StatefulWidget {
  const RadarScreen({super.key});

  @override
  State<RadarScreen> createState() => _RadarScreenState();
}

class _RadarScreenState extends State<RadarScreen> {
  List<CryptoAsset> _assets = [];
  List<SentimentLog> _logs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        ApiService.fetchAssetsWithSentiment(),
        ApiService.fetchRecentLogs(),
      ]);
      setState(() {
        _assets = results[0] as List<CryptoAsset>;
        _logs = results[1] as List<SentimentLog>;
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = 'API bağlantısı kurulamadı'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off, size: 48, color: AppColors.textSecondary),
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
      );
    }

    final avgSentiment = _assets.isEmpty
        ? 0.0
        : _assets.fold<double>(0, (s, a) => s + a.sentimentScore) / _assets.length;
    final positiveCount = _assets.where((a) => a.sentimentScore >= 0.3).length;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Good Morning!',
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Here is your crypto radar for today.',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: _load,
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.refresh,
                                  color: AppColors.primary, size: 22),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Stats row
                      Row(
                        children: [
                          _StatChip(
                            label: 'Avg Sentiment',
                            value: avgSentiment > 0
                                ? '+${avgSentiment.toStringAsFixed(2)}'
                                : avgSentiment.toStringAsFixed(2),
                            color: avgSentiment >= 0
                                ? AppColors.primary
                                : AppColors.danger,
                          ),
                          const SizedBox(width: 10),
                          _StatChip(
                            label: 'Bullish',
                            value: '$positiveCount/${_assets.length}',
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Assets list
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, i) => CryptoCard(asset: _assets[i]),
                    childCount: _assets.length,
                  ),
                ),
              ),

              // Sentiment Feed
              if (_logs.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                    child: Text(
                      'Latest Sentiment Signals',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => _SentimentLogTile(log: _logs[i]),
                      childCount: _logs.length,
                    ),
                  ),
                ),
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 20)),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text(value,
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }
}

class _SentimentLogTile extends StatelessWidget {
  final SentimentLog log;
  const _SentimentLogTile({required this.log});

  @override
  Widget build(BuildContext context) {
    final isPositive = log.score >= 0.3;
    final isNegative = log.score <= -0.3;
    final bgColor = isPositive
        ? AppColors.pastelGreen
        : isNegative
            ? AppColors.pastelRed
            : AppColors.pastelYellow;
    final scoreColor = isPositive
        ? AppColors.primary
        : isNegative
            ? AppColors.danger
            : AppColors.warning;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: Text(
              '${log.score > 0 ? '+' : ''}${log.score.toStringAsFixed(1)}',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: scoreColor),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(log.headline,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text(
                  '${log.source} · ${_formatDate(log.timestamp)}',
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${months[dt.month - 1]} ${dt.day}';
  }
}
