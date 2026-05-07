import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/auth_form.dart';
import '../widgets/crypto_card.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> {
  List<CryptoAsset> _watchlist = [];
  bool _loading = true;

  final _auth = AuthService.instance;

  @override
  void initState() {
    super.initState();
    _auth.addListener(_onAuthChanged);
    _load();
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    _load(); // Giriş/çıkış olunca listeyi yenile
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    if (_auth.isLoggedIn) {
      final data = await ApiService.fetchWatchlist(_auth.token!);
      setState(() {
        _watchlist = data;
        _loading = false;
      });
    } else {
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (ctx, scroll) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            const Text('Varlık Ekle',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            if (available.isEmpty)
              const Padding(
                  padding: EdgeInsets.all(20),
                  child: Text('Tüm varlıklar eklenmiş.'))
            else
              Expanded(
                  child: ListView.builder(
                controller: scroll,
                itemCount: available.length,
                itemBuilder: (_, i) {
                  final a = available[i];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                      child: Text(a['symbol'] as String,
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary)),
                    ),
                    title: Text(a['name'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(
                        '\$${(a['current_price'] as num).toStringAsFixed(2)}'),
                    trailing: ElevatedButton(
                      onPressed: () async {
                        final ok = await ApiService.addToWatchlist(
                            _auth.token!, a['symbol'] as String);
                        if (ok) {
                          Navigator.pop(ctx);
                          _load();
                        }
                      },
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10))),
                      child: const Text('Ekle', style: TextStyle(fontSize: 13)),
                    ),
                  );
                },
              )),
          ]),
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

    final avgSentiment = _watchlist.isEmpty
        ? 0.0
        : _watchlist.fold<double>(0, (s, a) => s + a.sentimentScore) /
            _watchlist.length;

    return Scaffold(
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
                  const Text('Watchlist',
                      style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary)),
                  GestureDetector(
                    onTap:
                        !_auth.isLoggedIn ? _showLoginSheet : _showAddAssetSheet,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(!_auth.isLoggedIn ? Icons.login : Icons.add,
                              color: Colors.white, size: 18),
                          const SizedBox(width: 4),
                          Text(!_auth.isLoggedIn ? 'Login' : 'Add',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text('Track your favorite cryptocurrencies',
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
                    borderRadius: BorderRadius.circular(16),
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
                    borderRadius: BorderRadius.circular(16),
                    border:
                        Border.all(color: Colors.black.withValues(alpha: 0.05)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.lock_outline,
                          size: 48,
                          color:
                              AppColors.textSecondary.withValues(alpha: 0.3)),
                      const SizedBox(height: 12),
                      const Text('Login required',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 6),
                      const Text('Log in to manage your watchlist',
                          style: TextStyle(
                              fontSize: 13, color: AppColors.textSecondary)),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _showLoginSheet,
                        icon: const Icon(Icons.login, size: 18),
                        label: const Text('Log In'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
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
                    borderRadius: BorderRadius.circular(16),
                    border:
                        Border.all(color: Colors.black.withValues(alpha: 0.05)),
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
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
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
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      child: CryptoCard(asset: asset),
                    )),
            ],
          ),
        ),
      ),
    );
  }
}
