import 'dart:async';
import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/auth_form.dart';
import '../widgets/crypto_card.dart';
import 'crypto_detail_screen.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> {
  List<CryptoAsset> _watchlist = [];
  bool _loading = true;
  Timer? _pollTimer;
  final _auth = AuthService.instance;

  @override
  void initState() {
    super.initState();
    _auth.addListener(_onAuthChanged);
    _load();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (_auth.isLoggedIn) _load();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    _load(); // Giriş/çıkış olunca listeyi yenile
  }

  Future<void> _load() async {
    // Spinner sadece ilk yüklemede — arka plandaki 10 sn'lik poll ekranı
    // her turda spinner'a çevirmesin.
    setState(() => _loading = _watchlist.isEmpty);
    if (_auth.isLoggedIn) {
      final data = await ApiService.fetchWatchlist();
      if (!mounted) return;
      setState(() {
        _watchlist = data;
        _loading = false;
      });
    } else {
      if (!mounted) return;
      setState(() {
        _watchlist = [];
        _loading = false;
      });
    }
  }

  Future<void> _remove(String symbol) async {
    if (!_auth.isLoggedIn) return;
    await ApiService.removeFromWatchlist(_auth.token!, symbol);
    setState(() => _watchlist.removeWhere((a) => a.symbol == symbol));
  }

  void _showAddAssetSheet() async {
    final rawAssets = await ApiService.fetchRawAssets();
    final watchlistedSymbols = _watchlist.map((a) => a.symbol).toSet();
    final available = rawAssets
        .where((a) => !watchlistedSymbols.contains(a['symbol']))
        .toList();

    if (!mounted) return;

    final customCtrl = TextEditingController();
    String? customError;
    bool customLoading = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.7,
          maxChildSize: 0.92,
          builder: (ctx, scroll) => Container(
            decoration: const BoxDecoration(
              color: AppColors.paper,
              borderRadius: BorderRadius.zero,
            ),
            child: Column(children: [
              // Handle
              const SizedBox(height: 12),
              Center(child: Container(width: 36, height: 4,
                  decoration: const BoxDecoration(color: AppColors.inkFaint, borderRadius: BorderRadius.zero))),
              const SizedBox(height: 16),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Watchlist\'e Ekle',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ),
              ),
              const SizedBox(height: 16),

              // Özel sembol girişi
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.gridFine.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.zero,
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Herhangi bir Binance sembolü ekle',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(
                        child: TextField(
                          controller: customCtrl,
                          textCapitalization: TextCapitalization.characters,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary, letterSpacing: 1.5),
                          decoration: InputDecoration(
                            hintText: 'LINK, ARB, INJ…',
                            hintStyle: TextStyle(fontWeight: FontWeight.w400, letterSpacing: 0,
                                color: AppColors.textSecondary.withValues(alpha: 0.6), fontSize: 13),
                            isDense: true,
                            filled: true,
                            fillColor: AppColors.gridFine.withValues(alpha: 0.5),
                            border: const OutlineInputBorder(borderRadius: BorderRadius.zero,
                                borderSide: BorderSide(color: AppColors.borderSubtle)),
                            enabledBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero,
                                borderSide: BorderSide(color: AppColors.borderSubtle)),
                            focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero,
                                borderSide: BorderSide(color: AppColors.primary)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                          onSubmitted: (_) async {
                            final sym = customCtrl.text.trim().toUpperCase();
                            if (sym.isEmpty) return;
                            setSheet(() { customLoading = true; customError = null; });
                            try {
                              await ApiService.addToWatchlist(_auth.token!, sym);
                              if (ctx.mounted) { Navigator.pop(ctx); _load(); }
                            } catch (e) {
                              setSheet(() { customLoading = false;
                                customError = e.toString().replaceFirst('Exception: ', ''); });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: customLoading ? null : () async {
                          final sym = customCtrl.text.trim().toUpperCase();
                          if (sym.isEmpty) return;
                          setSheet(() { customLoading = true; customError = null; });
                          try {
                            await ApiService.addToWatchlist(_auth.token!, sym);
                            if (ctx.mounted) { Navigator.pop(ctx); _load(); }
                          } catch (e) {
                            setSheet(() { customLoading = false;
                              customError = e.toString().replaceFirst('Exception: ', ''); });
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.zero,
                          ),
                          child: customLoading
                              ? const SizedBox(width: 16, height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.paper))
                              : const Icon(Icons.add_rounded, color: AppColors.paper, size: 18),
                        ),
                      ),
                    ]),
                    if (customError != null) ...[
                      const SizedBox(height: 8),
                      Row(children: [
                        const Icon(Icons.error_outline_rounded, size: 13, color: AppColors.danger),
                        const SizedBox(width: 5),
                        Expanded(child: Text(customError!,
                            style: const TextStyle(fontSize: 11, color: AppColors.danger))),
                      ]),
                    ],
                  ]),
                ),
              ),

              const SizedBox(height: 16),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Piyasa Listesi',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                ),
              ),
              const SizedBox(height: 8),

              // Curated liste
              Expanded(
                child: available.isEmpty
                    ? const Center(child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Text('Tüm piyasa varlıkları eklendi.',
                            style: TextStyle(color: AppColors.textSecondary))))
                    : ListView.builder(
                        controller: scroll,
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                        itemCount: available.length,
                        itemBuilder: (_, i) {
                          final a = available[i];
                          final sym = a['symbol'] as String;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.gridFine.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.zero,
                              border: Border.all(color: AppColors.gridFine.withValues(alpha: 0.5)),
                            ),
                            child: Row(children: [
                              Container(
                                width: 36, height: 36,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.zero,
                                ),
                                alignment: Alignment.center,
                                child: Text(sym.length > 3 ? sym.substring(0, 3) : sym,
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.primary)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(a['name'] as String,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                Text('\$${(a['current_price'] as num).toStringAsFixed(2)}',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              ])),
                              GestureDetector(
                                onTap: () async {
                                  try {
                                    await ApiService.addToWatchlist(_auth.token!, sym);
                                    if (ctx.mounted) { Navigator.pop(ctx); _load(); }
                                  } catch (e) {
                                    if (ctx.mounted) {
                                      ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
                                        content: Text(e.toString().replaceFirst('Exception: ', '')),
                                        backgroundColor: AppColors.danger,
                                      ));
                                    }
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: const BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.zero,
                                  ),
                                  child: const Text('Ekle',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.paper)),
                                ),
                              ),
                            ]),
                          );
                        },
                      ),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  void _showLoginSheet() {
    showAuthSheet(context, onSuccess: () {
      setState(() {});
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // Yalnızca ölçülmüş kanallar ortalamaya girer.
    final measured =
        _watchlist.where((a) => a.sentimentScore != null).toList();
    final avgSentiment = measured.isEmpty
        ? 0.0
        : measured.fold<double>(0, (s, a) => s + a.sentimentScore!) /
            measured.length;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('TAKİP LİSTESİ',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary)),
                  GestureDetector(
                    onTap:
                        !_auth.isLoggedIn ? _showLoginSheet : _showAddAssetSheet,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: const BoxDecoration(
                        color: AppColors.ink,
                        boxShadow: [
                          BoxShadow(color: AppColors.trace, offset: Offset(3, 3))
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(!_auth.isLoggedIn ? Icons.login : Icons.add,
                              color: AppColors.paper, size: 18),
                          const SizedBox(width: 4),
                          Text(
                              (!_auth.isLoggedIn ? 'Giriş yap' : 'Kanal ekle')
                                  .toUpperCase(),
                              style: AppType.label(
                                  size: 10,
                                  weight: FontWeight.w600,
                                  color: AppColors.paper,
                                  tracking: 0.16)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text('İzlemek istediğiniz kanallar',
                  style:
                      TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 20),

              // Summary card
              if (_auth.isLoggedIn)
                Container(
                  padding: const EdgeInsets.all(18),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.pastelGreen,
                    borderRadius: BorderRadius.zero,
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.1)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.star,
                          color: AppColors.warning, size: 22),
                      const SizedBox(width: 10),
                      Text('${_watchlist.length} assets tracked',
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary)),
                      const Spacer(),
                      Text(
                        'Avg: ${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toStringAsFixed(2)}',
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                ),

              // Not logged in
              if (!_auth.isLoggedIn)
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.zero,
                    border:
                        Border.all(color: AppColors.ink.withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.lock_outline,
                          size: 48,
                          color:
                              AppColors.textSecondary.withValues(alpha: 0.3)),
                      const SizedBox(height: 12),
                      const Text('GİRİŞ GEREKLİ',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 2.4,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 6),
                      const Text('Takip listenizi yönetmek için giriş yapın',
                          style: TextStyle(
                              fontSize: 13, color: AppColors.textSecondary)),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _showLoginSheet,
                        icon: const Icon(Icons.login, size: 18),
                        label: const Text('Giriş yap'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.ink,
                          foregroundColor: AppColors.paper,
                          shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.zero),
                        ),
                      ),
                    ],
                  ),
                )
              // Watchlist items
              else if (_watchlist.isEmpty)
                Container(
                  padding: const EdgeInsets.all(40),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.zero,
                    border:
                        Border.all(color: AppColors.ink.withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.star_border,
                          size: 48,
                          color:
                              AppColors.textSecondary.withValues(alpha: 0.3)),
                      const SizedBox(height: 12),
                      const Text('No assets in watchlist',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 2.4,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                )
              else
                ..._watchlist.map((asset) => Dismissible(
                      key: Key(asset.symbol),
                      direction: DismissDirection.endToStart,
                      onDismissed: (_) => _remove(asset.symbol),
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        color: AppColors.danger,
                        child: const Icon(Icons.delete, color: AppColors.paper),
                      ),
                      child: CryptoCard(
                        asset: asset,
                        onTap: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => CryptoDetailScreen(asset: asset),
                        )),
                      ),
                    )),
            ],
          ),
        ),
      ),
    );
  }
}
