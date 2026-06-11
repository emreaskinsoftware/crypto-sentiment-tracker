import 'dart:async';
import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/crypto_card.dart';
import 'crypto_detail_screen.dart';

// ── Pipeline stage ────────────────────────────────────────────────────────────
enum _Stage { prices, news, finbert, saving }

extension _StageX on _Stage {
  String get label {
    switch (this) {
      case _Stage.prices:  return 'Fiyatlar';
      case _Stage.news:    return 'Haberler';
      case _Stage.finbert: return 'FinBERT';
      case _Stage.saving:  return 'Kayıt';
    }
  }
  String get description {
    switch (this) {
      case _Stage.prices:  return "Binance'den canlı fiyatlar çekiliyor…";
      case _Stage.news:    return "RSS ve Reddit'ten haberler toplanıyor…";
      case _Stage.finbert: return 'FinBERT ile NLP analizi yapılıyor…';
      case _Stage.saving:  return 'Veriler veritabanına kaydediliyor…';
    }
  }
  IconData get icon {
    switch (this) {
      case _Stage.prices:  return Icons.bolt_rounded;
      case _Stage.news:    return Icons.rss_feed_rounded;
      case _Stage.finbert: return Icons.psychology_rounded;
      case _Stage.saving:  return Icons.storage_rounded;
    }
  }
}

_Stage _stageFromElapsed(int s) {
  if (s < 12) return _Stage.prices;
  if (s < 30) return _Stage.news;
  if (s < 55) return _Stage.finbert;
  return _Stage.saving;
}

// ── Refresh kinds ─────────────────────────────────────────────────────────────
enum _RefreshKind { idle, running, cooldown, done, error, unauthenticated }

// ── Screen ────────────────────────────────────────────────────────────────────
class RadarScreen extends StatefulWidget {
  const RadarScreen({super.key});
  @override
  State<RadarScreen> createState() => _RadarScreenState();
}

class _RadarScreenState extends State<RadarScreen> {
  List<CryptoAsset>  _assets = [];
  List<SentimentLog> _logs   = [];
  bool   _loading = true;
  String? _error;

  // Pipeline refresh state
  _RefreshKind _kind    = _RefreshKind.idle;
  int          _elapsed = 0;
  int          _cooldownRemaining = 0;
  _Stage       _stage   = _Stage.prices;
  String       _errorMsg = '';

  Timer? _elapsedTimer;
  Timer? _pollTimer;
  Timer? _cooldownTimer;
  Timer? _doneTimer;
  Timer? _autoRefreshTimer;

  static const _autoRefreshInterval = Duration(seconds: 30);

  @override
  void initState() {
    super.initState();
    _load();
    _autoRefreshTimer = Timer.periodic(_autoRefreshInterval, (_) {
      if (_kind == _RefreshKind.idle || _kind == _RefreshKind.done) {
        _load();
      }
    });
  }

  @override
  void dispose() {
    _elapsedTimer?.cancel();
    _pollTimer?.cancel();
    _cooldownTimer?.cancel();
    _doneTimer?.cancel();
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  // ── Data load ──────────────────────────────────────────────────────────────
  Future<void> _load() async {
    if (_kind != _RefreshKind.running) {
      setState(() { _loading = _assets.isEmpty; _error = null; });
    }
    try {
      final results = await Future.wait([
        ApiService.fetchAssetsWithSentiment(),
        ApiService.fetchRecentLogs(),
        ApiService.fetchLivePrices(),
      ]);
      if (!mounted) return;

      final assets = results[0] as List<CryptoAsset>;
      final livePrices = results[2] as Map<String, Map<String, double>>;

      // Canlı fiyatları DB fiyatlarının üzerine yaz
      final updated = assets.map((a) {
        final live = livePrices[a.symbol];
        if (live == null) return a;
        return CryptoAsset(
          id: a.id,
          symbol: a.symbol,
          name: a.name,
          price: live['price']!,
          change24h: live['change_24h']!,
          volume24h: a.volume24h,
          marketCap: a.marketCap,
          sentimentScore: a.sentimentScore,
          sentimentLabel: a.sentimentLabel,
          sparkline: a.sparkline,
          isWatchlisted: a.isWatchlisted,
          symbolColor: a.symbolColor,
        );
      }).toList();

      setState(() {
        _assets  = updated;
        _logs    = results[1] as List<SentimentLog>;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() { _error = 'Bağlantı hatası'; _loading = false; });
    }
  }

  // ── Pipeline trigger ────────────────────────────────────────────────────────
  Future<void> _triggerRefresh() async {
    if (_kind == _RefreshKind.running || _kind == _RefreshKind.cooldown) return;

    final token = AuthService.instance.token;
    if (token == null) {
      setState(() => _kind = _RefreshKind.unauthenticated);
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) setState(() => _kind = _RefreshKind.idle);
      });
      return;
    }

    final resp = await ApiService.triggerPipeline(token);
    final status = resp['status'] as String? ?? 'error';

    if (status == 'cooldown') {
      final remaining = (resp['cooldown_remaining_seconds'] as num?)?.toInt() ?? 900;
      _startCooldown(remaining);
      return;
    }

    if (status == 'error') {
      setState(() { _kind = _RefreshKind.error; _errorMsg = resp['message'] ?? 'Hata oluştu'; });
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) setState(() => _kind = _RefreshKind.idle);
      });
      return;
    }

    // started or already_running
    _startRunning();
  }

  void _startRunning() {
    _elapsedTimer?.cancel();
    _pollTimer?.cancel();
    setState(() { _kind = _RefreshKind.running; _elapsed = 0; _stage = _Stage.prices; });

    // Elapsed ticker — drives simulated stage progress
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() { _elapsed++; _stage = _stageFromElapsed(_elapsed); });
    });

    // Poll backend every 5s
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (t) async {
      final s = await ApiService.getPipelineStatus();
      final running = s['running'] as bool? ?? false;
      if (!running && mounted) {
        t.cancel();
        _elapsedTimer?.cancel();
        await _load();
        if (!mounted) return;
        setState(() => _kind = _RefreshKind.done);
        _doneTimer = Timer(const Duration(seconds: 3), () {
          if (mounted) setState(() => _kind = _RefreshKind.idle);
        });
      }
    });
  }

  void _startCooldown(int seconds) {
    _cooldownTimer?.cancel();
    setState(() { _kind = _RefreshKind.cooldown; _cooldownRemaining = seconds; });
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() {
        _cooldownRemaining--;
        if (_cooldownRemaining <= 0) {
          t.cancel();
          _kind = _RefreshKind.idle;
        }
      });
    });
  }

  double get _progress {
    const dur = [12, 18, 25, 10];
    final total = dur.fold(0, (a, b) => a + b);
    final idx = _Stage.values.indexOf(_stage);
    final done = dur.sublist(0, idx).fold(0, (a, b) => a + b);
    final within = (_elapsed - done).clamp(0, dur[idx]);
    return ((done + within) / total).clamp(0.0, 0.99);
  }

  // ── Build ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_loading && _assets.isEmpty) {
      return const Scaffold(
        backgroundColor: AppColors.bgLight,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_error != null && _assets.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.bgLight,
        body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.wifi_off_rounded, size: 56, color: AppColors.textSecondary),
          const SizedBox(height: 14),
          const Text('Bağlantı kurulamadı',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          const Text("Backend'in çalıştığından emin ol",
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 20),
          ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Tekrar Dene')),
        ])),
      );
    }

    final avg = _assets.isEmpty
        ? 0.0
        : _assets.fold<double>(0, (s, a) => s + a.sentimentScore) / _assets.length;
    final bullish = _assets.where((a) => a.sentimentScore >= 0.3).length;
    final bearish = _assets.where((a) => a.sentimentScore <= -0.3).length;

    final sorted = [..._assets]..sort((a, b) => b.change24h.abs().compareTo(a.change24h.abs()));
    final gainers = sorted.where((a) => a.change24h > 0).take(3).toList();
    final losers  = sorted.where((a) => a.change24h < 0).take(3).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: Stack(children: [
        RefreshIndicator(
          onRefresh: _triggerRefresh,
          color: AppColors.primary,
          backgroundColor: AppColors.surfaceCard,
          child: CustomScrollView(slivers: [
            // Header
            SliverToBoxAdapter(child: _buildHeader(context, avg, bullish, bearish)),

            // Top Movers
            if (gainers.isNotEmpty || losers.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(child: _TopMovers(gainers: gainers, losers: losers)),
              ),

            // Asset list header
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              sliver: SliverToBoxAdapter(
                child: Row(children: [
                  const Text('Piyasalar',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  const Spacer(),
                  Text('${_assets.length} varlık',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ]),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => CryptoCard(
                    asset: _assets[i],
                    onTap: () => Navigator.push(ctx,
                        MaterialPageRoute(builder: (_) => CryptoDetailScreen(asset: _assets[i]))),
                  ),
                  childCount: _assets.length,
                ),
              ),
            ),

            // Sentiment feed
            if (_logs.isNotEmpty) ...[
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                sliver: SliverToBoxAdapter(
                  child: Row(children: [
                    const Text('Son Haberler',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.pastelGreen,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: const Text('FinBERT AI',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary)),
                    ),
                  ]),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => _SentimentTile(log: _logs[i]),
                    childCount: _logs.length,
                  ),
                ),
              ),
            ],
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ]),
        ),

        // Pipeline progress / status overlay
        if (_kind != _RefreshKind.idle)
          Positioned(
            bottom: 16, left: 16, right: 16,
            child: _buildOverlay(),
          ),
      ]),
    );
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  Widget _buildHeader(BuildContext ctx, double avg, int bullish, int bearish) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceLight,
        border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
      ),
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(ctx).padding.top + 16, 20, 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(width: 7, height: 7,
                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              const Text('LIVE DASHBOARD',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                      color: AppColors.primary, letterSpacing: 1.5)),
            ]),
            const SizedBox(height: 4),
            const Text('Market Overview',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
            const SizedBox(height: 2),
            const Text('Gerçek zamanlı kripto sentiment radarı',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          ])),
          _RefreshButton(kind: _kind, cooldown: _cooldownRemaining, onTap: _triggerRefresh),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          _HeaderChip(label: 'Avg Sentiment',
              value: '${avg >= 0 ? '+' : ''}${avg.toStringAsFixed(2)}',
              color: avg >= 0.15 ? AppColors.primary : avg <= -0.15 ? AppColors.danger : AppColors.warning,
              icon: Icons.psychology_rounded),
          const SizedBox(width: 8),
          _HeaderChip(label: 'Yükseliş', value: '$bullish/${_assets.length}',
              color: AppColors.primary, icon: Icons.trending_up_rounded),
          const SizedBox(width: 8),
          _HeaderChip(label: 'Düşüş', value: '$bearish/${_assets.length}',
              color: AppColors.danger, icon: Icons.trending_down_rounded),
        ]),
      ]),
    );
  }

  // ── Overlay panel ───────────────────────────────────────────────────────────
  Widget _buildOverlay() {
    if (_kind == _RefreshKind.done) return _DonePanel();

    if (_kind == _RefreshKind.unauthenticated) {
      return _StatusBanner(
        color: AppColors.warning,
        icon: Icons.lock_outline_rounded,
        title: 'Giriş Gerekli',
        subtitle: "Pipeline tetiklemek için Ayarlar'dan giriş yapın.",
      );
    }
    if (_kind == _RefreshKind.error) {
      return _StatusBanner(
        color: AppColors.danger,
        icon: Icons.error_outline_rounded,
        title: 'Hata',
        subtitle: _errorMsg,
      );
    }
    if (_kind == _RefreshKind.cooldown) {
      final m = _cooldownRemaining ~/ 60;
      final s = _cooldownRemaining % 60;
      final label = m > 0 ? '${m}dk ${s}sn' : '${s}sn';
      return _StatusBanner(
        color: AppColors.warning,
        icon: Icons.timer_outlined,
        title: 'Bekleme süresi: $label',
        subtitle: '15 dakikada bir yenileyebilirsiniz.',
      );
    }

    // running
    return _PipelinePanel(progress: _progress, stage: _stage, elapsed: _elapsed);
  }
}

// ── Refresh Button ─────────────────────────────────────────────────────────────
class _RefreshButton extends StatelessWidget {
  final _RefreshKind kind;
  final int cooldown;
  final VoidCallback onTap;
  const _RefreshButton({required this.kind, required this.cooldown, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final bool disabled = kind == _RefreshKind.running || kind == _RefreshKind.cooldown;

    Color bg, border, textColor;
    Widget icon;
    String label;

    switch (kind) {
      case _RefreshKind.running:
        bg = const Color(0xFF1E3A4A); border = Colors.blue.withValues(alpha: 0.3);
        textColor = Colors.blue;
        icon = const SizedBox(width: 14, height: 14,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue));
        label = 'Analiz…';
      case _RefreshKind.cooldown:
        final m = cooldown ~/ 60; final s = cooldown % 60;
        bg = AppColors.warning.withValues(alpha: 0.1); border = AppColors.warning.withValues(alpha: 0.3);
        textColor = AppColors.warning;
        icon = Icon(Icons.timer_outlined, color: AppColors.warning, size: 16);
        label = m > 0 ? '${m}dk ${s}sn' : '${s}sn';
      case _RefreshKind.done:
        bg = AppColors.primary.withValues(alpha: 0.1); border = AppColors.primary.withValues(alpha: 0.3);
        textColor = AppColors.primary;
        icon = Icon(Icons.check_circle_outline_rounded, color: AppColors.primary, size: 16);
        label = 'Güncellendi';
      case _RefreshKind.unauthenticated:
        bg = Colors.white.withValues(alpha: 0.05); border = Colors.white.withValues(alpha: 0.1);
        textColor = AppColors.textSecondary;
        icon = Icon(Icons.lock_outline_rounded, color: AppColors.textSecondary, size: 16);
        label = 'Giriş Gerekli';
      case _RefreshKind.error:
        bg = AppColors.danger.withValues(alpha: 0.1); border = AppColors.danger.withValues(alpha: 0.3);
        textColor = AppColors.danger;
        icon = Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 16);
        label = 'Hata';
      case _RefreshKind.idle:
        bg = AppColors.primary.withValues(alpha: 0.1); border = AppColors.primary.withValues(alpha: 0.3);
        textColor = AppColors.primary;
        icon = Icon(Icons.refresh_rounded, color: AppColors.primary, size: 16);
        label = 'Yenile';
    }

    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          icon,
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: textColor)),
        ]),
      ),
    );
  }
}

// ── Top Movers ────────────────────────────────────────────────────────────────
class _TopMovers extends StatelessWidget {
  final List<CryptoAsset> gainers, losers;
  const _TopMovers({required this.gainers, required this.losers});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [
        Text('Top Movers',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        Spacer(),
        Text('24s', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ]),
      const SizedBox(height: 10),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: _MoverColumn(title: 'Yükseliş', color: AppColors.primary,
            icon: Icons.trending_up_rounded, assets: gainers)),
        const SizedBox(width: 10),
        Expanded(child: _MoverColumn(title: 'Düşüş', color: AppColors.danger,
            icon: Icons.trending_down_rounded, assets: losers)),
      ]),
    ]);
  }
}

class _MoverColumn extends StatelessWidget {
  final String title;
  final Color color;
  final IconData icon;
  final List<CryptoAsset> assets;
  const _MoverColumn({required this.title, required this.color, required this.icon, required this.assets});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 24, height: 24,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(7)),
              child: Icon(icon, color: color, size: 14)),
          const SizedBox(width: 6),
          Text(title, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
        ]),
        const SizedBox(height: 8),
        ...assets.map((a) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            Container(width: 28, height: 28,
                decoration: BoxDecoration(color: a.symbolColor, borderRadius: BorderRadius.circular(8)),
                alignment: Alignment.center,
                child: Text(a.symbol.length > 3 ? a.symbol.substring(0, 3) : a.symbol,
                    style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900))),
            const SizedBox(width: 7),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(a.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                  overflow: TextOverflow.ellipsis),
              Text('\$${a.price >= 1 ? a.price.toStringAsFixed(2) : a.price.toStringAsFixed(4)}',
                  style: const TextStyle(fontSize: 9, color: AppColors.textSecondary)),
            ])),
            Text('${a.change24h >= 0 ? '+' : ''}${a.change24h.toStringAsFixed(2)}%',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color)),
          ]),
        )),
      ]),
    );
  }
}

// ── Pipeline Panel ────────────────────────────────────────────────────────────
class _PipelinePanel extends StatelessWidget {
  final double progress;
  final _Stage stage;
  final int elapsed;
  const _PipelinePanel({required this.progress, required this.stage, required this.elapsed});

  @override
  Widget build(BuildContext context) {
    final activeIdx = _Stage.values.indexOf(stage);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.08), blurRadius: 24)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 28, height: 28,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8)),
              child: const Center(child: SizedBox(width: 14, height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)))),
          const SizedBox(width: 10),
          const Expanded(child: Text('Pipeline Çalışıyor',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary))),
          Text('${(progress * 100).round()}%',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary)),
        ]),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(value: progress, minHeight: 4,
              backgroundColor: Colors.white.withValues(alpha: 0.05),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary)),
        ),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: _Stage.values.map((s) {
            final idx     = _Stage.values.indexOf(s);
            final isDone  = idx < activeIdx;
            final isActive= idx == activeIdx;
            final color   = (isDone || isActive) ? AppColors.primary : AppColors.textSecondary;
            return Column(children: [
              Container(width: 32, height: 32,
                  decoration: BoxDecoration(
                    color: isDone || isActive
                        ? AppColors.primary.withValues(alpha: isActive ? 0.25 : 0.15)
                        : Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(9),
                    border: isActive ? Border.all(color: AppColors.primary.withValues(alpha: 0.4)) : null,
                  ),
                  child: Icon(isDone ? Icons.check_circle_rounded : s.icon, color: color, size: 16)),
              const SizedBox(height: 4),
              Text(s.label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: color)),
            ]);
          }).toList(),
        ),
        const SizedBox(height: 8),
        Text(stage.description, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            textAlign: TextAlign.center),
      ]),
    );
  }
}

// ── Done Panel ────────────────────────────────────────────────────────────────
class _DonePanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surfaceCard,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.12), blurRadius: 24)],
    ),
    child: Column(children: [
      Row(children: [
        Container(width: 36, height: 36,
            decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.celebration_rounded, color: AppColors.primary, size: 18)),
        const SizedBox(width: 10),
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Veriler güncellendi!',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          Text('Tüm fiyatlar ve haberler yenilendi',
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ])),
        const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20),
      ]),
      const SizedBox(height: 10),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: const LinearProgressIndicator(value: 1.0, minHeight: 4,
            backgroundColor: Colors.transparent,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary)),
      ),
    ]),
  );
}

// ── Status Banner (cooldown / error / unauth) ─────────────────────────────────
class _StatusBanner extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String title, subtitle;
  const _StatusBanner({required this.color, required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: BoxDecoration(
      color: AppColors.surfaceCard,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: color.withValues(alpha: 0.25)),
    ),
    child: Row(children: [
      Icon(icon, color: color, size: 20),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
        Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ])),
    ]),
  );
}

// ── Header Chip ───────────────────────────────────────────────────────────────
class _HeaderChip extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _HeaderChip({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 11, color: color.withValues(alpha: 0.8)),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.8), fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color)),
      ]),
    ),
  );
}

// ── Sentiment Tile ────────────────────────────────────────────────────────────
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
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 3)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 38, height: 38,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: Text('${log.score >= 0 ? '+' : ''}${log.score.toStringAsFixed(1)}',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: color))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(log.headline, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary, height: 1.4)),
          const SizedBox(height: 5),
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
