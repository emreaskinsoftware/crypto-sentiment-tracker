import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/crypto_card.dart';
import 'crypto_detail_screen.dart';

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
    } catch (_) {
      setState(() { _error = 'Bağlantı hatası'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(backgroundColor: AppColors.bgLight,
          body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    if (_error != null) {
      return Scaffold(backgroundColor: AppColors.bgLight, body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.wifi_off_rounded, size: 56, color: AppColors.textSecondary),
        const SizedBox(height: 14),
        const Text('Bağlantı kurulamadı', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        const SizedBox(height: 6),
        Text('Backend\'in çalıştığından emin ol', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 20),
        ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Tekrar Dene'),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))),
      ])));
    }

    final avgSentiment = _assets.isEmpty ? 0.0
        : _assets.fold<double>(0, (s, a) => s + a.sentimentScore) / _assets.length;
    final bullishCount = _assets.where((a) => a.sentimentScore >= 0.3).length;
    final bearishCount = _assets.where((a) => a.sentimentScore <= -0.3).length;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: RefreshIndicator(
        onRefresh: _load, color: AppColors.primary,
        child: CustomScrollView(slivers: [
          // ── Header ───────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
              ),
              padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 16, 20, 20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Günaydın! 👋', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
                    const SizedBox(height: 4),
                    Text('Kripto sentiment radarın', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                  ])),
                  GestureDetector(
                    onTap: _load,
                    child: Container(width: 40, height: 40,
                        decoration: BoxDecoration(color: AppColors.pastelGreen, borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2))),
                        child: const Icon(Icons.refresh_rounded, color: AppColors.primary, size: 20)),
                  ),
                ]),
                const SizedBox(height: 16),

                // Stat chips
                Row(children: [
                  _HeaderChip(label: 'Ort. Sentiment',
                      value: '${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toStringAsFixed(2)}',
                      color: avgSentiment >= 0.15 ? AppColors.primary : avgSentiment <= -0.15 ? AppColors.danger : AppColors.warning,
                      icon: Icons.psychology_outlined),
                  const SizedBox(width: 10),
                  _HeaderChip(label: 'Yükseliş', value: '$bullishCount/${_assets.length}',
                      color: AppColors.primary, icon: Icons.trending_up_rounded),
                  const SizedBox(width: 10),
                  _HeaderChip(label: 'Düşüş', value: '$bearishCount/${_assets.length}',
                      color: AppColors.danger, icon: Icons.trending_down_rounded),
                ]),
              ]),
            ),
          ),

          // ── Varlık Listesi ────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            sliver: SliverToBoxAdapter(
              child: Row(children: [
                const Text('Piyasalar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                const Spacer(),
                Text('${_assets.length} varlık', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ]),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => CryptoCard(
                  asset: _assets[i],
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                      builder: (_) => CryptoDetailScreen(asset: _assets[i]))),
                ),
                childCount: _assets.length,
              ),
            ),
          ),

          // ── Sentiment Feed ────────────────────────────────────────────────
          if (_logs.isNotEmpty) ...[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              sliver: SliverToBoxAdapter(
                child: Row(children: [
                  const Text('Son Haberler', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  const Spacer(),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.pastelGreen, borderRadius: BorderRadius.circular(8)),
                      child: const Text('FinBERT AI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary))),
                ]),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
              sliver: SliverList(delegate: SliverChildBuilderDelegate(
                (_, i) => _SentimentTile(log: _logs[i]),
                childCount: _logs.length,
              )),
            ),
          ],

          const SliverToBoxAdapter(child: SizedBox(height: 20)),
        ]),
      ),
    );
  }
}

class _HeaderChip extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _HeaderChip({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.8), fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color)),
      ]),
    ),
  );
}

class _SentimentTile extends StatelessWidget {
  final SentimentLog log;
  const _SentimentTile({required this.log});

  @override
  Widget build(BuildContext context) {
    final isPos = log.score >= 0.3;
    final isNeg = log.score <= -0.3;
    final color = isPos ? AppColors.primary : isNeg ? AppColors.danger : AppColors.warning;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 3)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 38, height: 38,
          decoration: BoxDecoration(
            color: isPos ? AppColors.pastelGreen : isNeg ? AppColors.pastelRed : AppColors.pastelYellow,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text('${log.score >= 0 ? '+' : ''}${log.score.toStringAsFixed(1)}',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: color)),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(log.headline, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary, height: 1.4)),
          const SizedBox(height: 5),
          Text('${log.source} · ${_fmt(log.timestamp)}',
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ])),
      ]),
    );
  }

  String _fmt(DateTime dt) {
    const m = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return '${m[dt.month-1]} ${dt.day}';
  }
}
