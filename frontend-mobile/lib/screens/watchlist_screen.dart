import 'package:flutter/material.dart';
import '../models/crypto_asset.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/crypto_card.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> {
  List<CryptoAsset> _watchlist = [];
  bool _loading = true;

  // Basit token storage — gerçek uygulamada shared_preferences kullanılır
  static String? _token;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    if (_token != null) {
      final data = await ApiService.fetchWatchlist(_token!);
      setState(() { _watchlist = data; _loading = false; });
    } else {
      setState(() { _watchlist = []; _loading = false; });
    }
  }

  Future<void> _remove(String symbol) async {
    if (_token == null) return;
    await ApiService.removeFromWatchlist(_token!, symbol);
    setState(() => _watchlist.removeWhere((a) => a.symbol == symbol));
  }

  void _showLoginSheet() {
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Log In',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            const SizedBox(height: 16),
            TextField(
              controller: emailCtrl,
              decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passCtrl,
              decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  final token = await ApiService.login(emailCtrl.text, passCtrl.text);
                  if (token != null) {
                    _token = token;
                    if (ctx.mounted) Navigator.pop(ctx);
                    _load();
                  } else {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(content: Text('Login failed')));
                    }
                  }
                },
                child: const Text('Log In',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final avgSentiment = _watchlist.isEmpty
        ? 0.0
        : _watchlist.fold<double>(0, (s, a) => s + a.sentimentScore) / _watchlist.length;

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
                    onTap: _token == null ? _showLoginSheet : null,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_token == null ? Icons.login : Icons.add,
                              color: Colors.white, size: 18),
                          const SizedBox(width: 4),
                          Text(_token == null ? 'Login' : 'Add',
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
              Text('Track your favorite cryptocurrencies',
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 20),

              // Summary card
              if (_token != null)
                Container(
                  padding: const EdgeInsets.all(18),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.pastelGreen,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.1)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.star, color: AppColors.warning, size: 22),
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
              if (_token == null)
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.lock_outline,
                          size: 48,
                          color: AppColors.textSecondary.withValues(alpha: 0.3)),
                      const SizedBox(height: 12),
                      const Text('Login required',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 6),
                      Text('Log in to manage your watchlist',
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
                    border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.star_border,
                          size: 48,
                          color: AppColors.textSecondary.withValues(alpha: 0.3)),
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
