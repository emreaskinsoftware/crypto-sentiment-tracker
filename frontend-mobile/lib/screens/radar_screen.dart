import 'dart:async';
import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/crypto_card.dart';
import '../widgets/pen_trace.dart';
import '../widgets/paper.dart';
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

class _LampLabel extends StatelessWidget {
  const _LampLabel();
  @override
  Widget build(BuildContext context) => Text('KAYITTA',
      style: AppType.label(size: 9, weight: FontWeight.w600,
          color: AppColors.inkSoft, tracking: 0.2));
}

class _ReadoutDivider extends StatelessWidget {
  const _ReadoutDivider();
  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 40, color: AppColors.borderSubtle);
}

class _Readout extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _Readout({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label.toUpperCase(),
                style: AppType.label(size: 8, weight: FontWeight.w600,
                    color: AppColors.inkSoft, tracking: 0.18)),
            const SizedBox(height: 3),
            Text(value,
                style: AppType.data(size: 17, weight: FontWeight.w500, color: color)),
          ]),
        ),
      );
}

// ── Screen ────────────────────────────────────────────────────────────────────
class RadarScreen extends StatefulWidget {
  const RadarScreen({super.key});
  @override
  State<RadarScreen> createState() => _RadarScreenState();
}

class _RadarScreenState extends State<RadarScreen> {
  List<CryptoAsset>  _assets = [];
  List<SentimentLog> _logs   = [];

  // Şerit kaydı — taşıyıcı kanalın iki kanallı izi
  List<TracePoint> _trace = [];
  String _traceSymbol = '';
  String _traceName = '';
  String _traceWindow = '24h';
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
    // Cooldown yazma pipeline'ını sınırlar; _load() yalnızca GET yapar, bu
    // yüzden sadece devam eden bir yenileme sırasında atlanır. (Aksi hâlde
    // 15 dakikalık cooldown tüm fiyat güncellemelerini dondururdu.)
    _autoRefreshTimer = Timer.periodic(_autoRefreshInterval, (_) {
      if (_kind != _RefreshKind.running) _load();
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

      await _loadTrace(updated);
    } catch (_) {
      if (!mounted) return;
      setState(() { _error = 'Bağlantı hatası'; _loading = false; });
    }
  }

  /// Taşıyıcı kanalın şeridini çeker.
  /// market_cap Binance public API'de her zaman 0 geldiği için sıralama
  /// ölçütü hacim; BTC varsa referans kanal olarak öncelikli.
  Future<void> _loadTrace(List<CryptoAsset> assets) async {
    if (assets.isEmpty) return;
    final lead = assets.firstWhere((a) => a.symbol == 'BTC',
        orElse: () => ([...assets]
              ..sort((a, b) => b.volume24h.compareTo(a.volume24h)))
            .first);

    int scoredIn(Map<String, dynamic>? c) =>
        ((c?['data'] as List?) ?? [])
            .where((p) => (p as Map)['sentiment_score'] != null)
            .length;

    var window = '24h';
    var chart = await ApiService.fetchChartData(lead.symbol, timeframe: '24h');
    // 24 saatte yeterli örnek yoksa pencereyi 7 güne aç — cihaz seyrek
    // çalıştığında şerit iki noktalık düz bir çizgiye düşmesin.
    if (scoredIn(chart) < 6) {
      final wider =
          await ApiService.fetchChartData(lead.symbol, timeframe: '7d');
      if (scoredIn(wider) > scoredIn(chart)) {
        chart = wider;
        window = '7d';
      }
    }
    if (!mounted) return;

    final raw = (chart?['data'] as List?) ?? [];
    setState(() {
      _traceSymbol = lead.symbol;
      _traceName = lead.name;
      _traceWindow = window;
      _trace = raw.map((e) {
        final m = e as Map<String, dynamic>;
        return TracePoint(
          t: DateTime.parse(m['timestamp'] as String),
          sentiment: (m['sentiment_score'] as num?)?.toDouble(),
          price: (m['price'] as num).toDouble(),
        );
      }).toList();
    });
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
        backgroundColor: Colors.transparent,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_error != null && _assets.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.transparent,
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

    // Ölçülmemiş kanallar ortalamaya 0 olarak girerse ortalama sıfıra
    // çekilir; yalnızca gerçekten ölçülenler hesaba katılır.
    final measured = _assets.where((a) => a.sentimentScore != null).toList();
    final avg = measured.isEmpty
        ? 0.0
        : measured.fold<double>(0, (s, a) => s + a.sentimentScore!) /
            measured.length;
    final bullish = measured.where((a) => a.sentimentScore! >= 0.3).length;
    final bearish = measured.where((a) => a.sentimentScore! <= -0.3).length;

    final sorted = [..._assets]..sort((a, b) => b.change24h.abs().compareTo(a.change24h.abs()));
    final gainers = sorted.where((a) => a.change24h > 0).take(3).toList();
    final losers  = sorted.where((a) => a.change24h < 0).take(3).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(children: [
        RefreshIndicator(
          onRefresh: _triggerRefresh,
          color: AppColors.primary,
          backgroundColor: AppColors.surfaceCard,
          child: CustomScrollView(slivers: [
            // Header
            SliverToBoxAdapter(child: _buildHeader(context, avg, bullish, bearish)),

            // İMZA — iki kanallı şerit kaydı
            if (_traceSymbol.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: PenTrace(
                    symbol: _traceSymbol,
                    name: _traceName,
                    points: _trace,
                    window: _traceWindow,
                  ),
                ),
              ),

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
                child: PaperPanel(
                  child: PanelHeader(
                      title: 'Varlık defteri',
                      note: "${_assets.length} kanal · fiyat 30sn'de bir"),
                ),
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
              const SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
                sliver: SliverToBoxAdapter(
                  child: PaperPanel(
                    child: PanelHeader(
                        title: 'Kayıt defteri', note: 'FinBERT okuması'),
                  ),
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
        color: AppColors.paperDeep,
        border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
      ),
      padding: EdgeInsets.fromLTRB(16, MediaQuery.of(ctx).padding.top + 14, 16, 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                RecordingLamp(),
                SizedBox(width: 6),
                _LampLabel(),
              ]),
              const SizedBox(height: 8),
              Text('KAYIT ŞERİDİ',
                  style: AppType.label(size: 22, weight: FontWeight.w700, tracking: 0.06)),
              const SizedBox(height: 6),
              Text('Haber duygusu ve fiyat, aynı zaman ekseninde.',
                  style: AppType.data(size: 11, color: AppColors.inkSoft)),
            ]),
          ),
          const SizedBox(width: 10),
          _RefreshButton(kind: _kind, cooldown: _cooldownRemaining, onTap: _triggerRefresh),
        ]),
        const SizedBox(height: 14),
        // Okuma bandı — kart değil, hairline ile ayrılmış üç okuma
        Container(
          decoration: BoxDecoration(border: Border.all(color: AppColors.borderSubtle)),
          child: Row(children: [
            _Readout(
              label: 'Ortalama duygu',
              value: '${avg >= 0 ? '+' : ''}${avg.toStringAsFixed(2)}',
              color: avg >= 0.3
                  ? AppColors.traceAlt
                  : avg <= -0.3
                      ? AppColors.trace
                      : AppColors.ink,
            ),
            const _ReadoutDivider(),
            _Readout(
                label: 'Pozitif kanal',
                value: '$bullish/${_assets.length}',
                color: AppColors.ink),
            const _ReadoutDivider(),
            _Readout(
                label: 'Negatif kanal',
                value: '$bearish/${_assets.length}',
                color: AppColors.ink),
          ]),
        ),
      ]),
    );
  }

  // ── Overlay panel ───────────────────────────────────────────────────────────
  Widget _buildOverlay() {
    if (_kind == _RefreshKind.done) return _DonePanel();

    if (_kind == _RefreshKind.unauthenticated) {
      return const _StatusBanner(
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
  const _RefreshButton(
      {required this.kind, required this.cooldown, required this.onTap});

  @override
  Widget build(BuildContext context) {
    // Eylem adı akış boyunca aynı kalır: al → alınıyor → alındı
    final (String label, bool enabled) = switch (kind) {
      _RefreshKind.idle => ('Yeni örnek al', true),
      _RefreshKind.running => ('Örnek alınıyor', false),
      _RefreshKind.cooldown => (
          cooldown ~/ 60 > 0
              ? 'Sonraki ${cooldown ~/ 60}dk ${cooldown % 60}sn'
              : 'Sonraki ${cooldown % 60}sn',
          false
        ),
      _RefreshKind.done => ('Örnek alındı', false),
      _RefreshKind.unauthenticated => ('Giriş gerekli', false),
      _RefreshKind.error => ('Alınamadı', false),
    };

    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: enabled ? AppColors.ink : AppColors.paper,
          border: Border.all(
              color: enabled ? AppColors.ink : AppColors.borderSubtle),
          // Basılı kontrol hissi: kalem kırmızısı gölge
          boxShadow: enabled
              ? const [BoxShadow(color: AppColors.trace, offset: Offset(3, 3))]
              : null,
        ),
        child: Text(
          label.toUpperCase(),
          style: AppType.label(
            size: 10,
            weight: FontWeight.w600,
            color: enabled ? AppColors.paper : AppColors.inkSoft,
            tracking: 0.16,
          ),
        ),
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
      PaperPanel(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const PanelHeader(title: 'Uç değerler', note: 'son 24 saat'),
          IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Expanded(
                  child: _MoverColumn(
                      title: 'Yükselen', color: AppColors.traceAlt, assets: gainers)),
              Container(width: 1, color: AppColors.borderSubtle),
              Expanded(
                  child: _MoverColumn(
                      title: 'Düşen', color: AppColors.trace, assets: losers)),
            ]),
          ),
        ]),
      ),
    ]);
  }
}

class _MoverColumn extends StatelessWidget {
  final String title;
  final Color color;
  final List<CryptoAsset> assets;
  const _MoverColumn(
      {required this.title, required this.color, required this.assets});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(10, 8, 10, 6),
        child: Text(title.toUpperCase(),
            style: AppType.label(
                size: 9, weight: FontWeight.w600,
                color: AppColors.inkSoft, tracking: 0.18)),
      ),
      if (assets.isEmpty)
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
          child: Text('bu yönde hareket yok',
              style: AppType.data(size: 10, color: AppColors.inkFaint)),
        )
      else
        ...assets.map((a) => Container(
              padding: const EdgeInsets.fromLTRB(10, 6, 10, 6),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: Row(children: [
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(a.symbol,
                            style: AppType.data(
                                size: 12, weight: FontWeight.w500)),
                        Text(
                            '\$${a.price >= 1 ? a.price.toStringAsFixed(2) : a.price.toStringAsFixed(4)}',
                            style: AppType.data(
                                size: 9, color: AppColors.inkFaint)),
                      ]),
                ),
                Text(
                    '${a.change24h >= 0 ? '+' : ''}${a.change24h.toStringAsFixed(2)}%',
                    style: AppType.data(size: 11, color: color)),
              ]),
            )),
    ]);
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
        borderRadius: BorderRadius.zero,
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.08), blurRadius: 24)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 28, height: 28,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.zero),
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
          borderRadius: BorderRadius.zero,
          child: LinearProgressIndicator(value: progress, minHeight: 4,
              backgroundColor: AppColors.gridFine.withValues(alpha: 0.5),
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
                        : AppColors.gridFine.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.zero,
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
      borderRadius: BorderRadius.zero,
      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.12), blurRadius: 24)],
    ),
    child: Column(children: [
      Row(children: [
        Container(width: 36, height: 36,
            decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.zero),
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
      const ClipRRect(
        borderRadius: BorderRadius.zero,
        child: LinearProgressIndicator(value: 1.0, minHeight: 4,
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
      borderRadius: BorderRadius.zero,
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
        borderRadius: BorderRadius.zero,
        border: Border(left: BorderSide(color: color, width: 3)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 38, height: 38,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.zero),
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
