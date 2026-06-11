import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/auth_form.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  List<Map<String, dynamic>> _assets = [];
  bool _loading = true;
  final _auth = AuthService.instance;
  Timer? _pollTimer;

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
    _load(); // Giriş/çıkış olunca alarm listesini yenile
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final assets = await ApiService.fetchRawAssets();
    setState(() => _assets = assets);
    if (_auth.isLoggedIn) {
      final alerts = await ApiService.fetchAlerts(_auth.token!);
      setState(() {
        _alerts = alerts;
        _loading = false;
      });
    } else {
      setState(() => _loading = false);
    }
  }

  String _assetName(int assetId) {
    final a = _assets.firstWhere((a) => a['id'] == assetId, orElse: () => {});
    return a.isEmpty ? '#$assetId' : '${a['name']} (${a['symbol']})';
  }

  String _conditionLabel(String type, double threshold) {
    switch (type) {
      case 'sentiment_below':
        return 'Sentiment < $threshold';
      case 'sentiment_above':
        return 'Sentiment > $threshold';
      case 'price_below':
        return 'Fiyat < \$${threshold.toStringAsFixed(0)}';
      case 'price_above':
        return 'Fiyat > \$${threshold.toStringAsFixed(0)}';
      default:
        return '$type $threshold';
    }
  }

  void _showLoginSheet() {
    showAuthSheet(context, onSuccess: () {
      setState(() {});
      _load();
    });
  }

  void _showCreateAlertSheet() {
    String selectedSymbol =
        _assets.isNotEmpty ? _assets[0]['symbol'] as String : 'BTC';
    String condition = 'sentiment_below';
    final threshCtrl = TextEditingController(text: '-0.5');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
          builder: (ctx, setS) => Padding(
                padding: EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 24,
                    bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Yeni Alarm',
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 16),
                      // Varlık
                      DropdownButtonFormField<String>(
                        initialValue: selectedSymbol,
                        decoration: const InputDecoration(
                            labelText: 'Kripto Varlık',
                            border: OutlineInputBorder()),
                        items: _assets
                            .map((a) => DropdownMenuItem(
                                value: a['symbol'] as String,
                                child: Text('${a['name']} (${a['symbol']})')))
                            .toList(),
                        onChanged: (v) => setS(() => selectedSymbol = v!),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: condition,
                        decoration: const InputDecoration(
                            labelText: 'Koşul', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(
                              value: 'sentiment_below',
                              child: Text('Sentiment altına düşerse')),
                          DropdownMenuItem(
                              value: 'sentiment_above',
                              child: Text('Sentiment üzerine çıkarsa')),
                          DropdownMenuItem(
                              value: 'price_below',
                              child: Text('Fiyat altına düşerse')),
                          DropdownMenuItem(
                              value: 'price_above',
                              child: Text('Fiyat üzerine çıkarsa')),
                        ],
                        onChanged: (v) => setS(() => condition = v!),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                          controller: threshCtrl,
                          decoration: const InputDecoration(
                              labelText: 'Eşik Değeri',
                              border: OutlineInputBorder()),
                          keyboardType: TextInputType.number),
                      const SizedBox(height: 16),
                      SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12))),
                            onPressed: () async {
                              final t = double.tryParse(threshCtrl.text);
                              if (t == null) return;
                              final ok = await ApiService.createAlert(
                                  _auth.token!, selectedSymbol, condition, t);
                              if (ok && ctx.mounted) {
                                Navigator.pop(ctx);
                                _load();
                              }
                            },
                            child: const Text('Alarm Oluştur',
                                style: TextStyle(fontWeight: FontWeight.w700)),
                          )),
                    ]),
              )),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Alarmlar',
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary)),
                if (_auth.isLoggedIn)
                  GestureDetector(
                    onTap: _showCreateAlertSheet,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(12)),
                      child:
                          const Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.add, color: Colors.white, size: 18),
                        SizedBox(width: 4),
                        Text('Yeni',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w700)),
                      ]),
                    ),
                  ),
              ]),
              const SizedBox(height: 4),
              const Text('Fiyat ve duygu alarmlarınızı yönetin',
                  style:
                      TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 20),
              if (_loading)
                const Center(child: CircularProgressIndicator())
              else if (!_auth.isLoggedIn)
                _LoginPrompt(onLogin: _showLoginSheet)
              else if (_alerts.isEmpty)
                Container(
                  padding: const EdgeInsets.all(40),
                  decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: Colors.black.withValues(alpha: 0.05))),
                  child: Column(children: [
                    Icon(Icons.notifications_none,
                        size: 48,
                        color: AppColors.textSecondary.withValues(alpha: 0.3)),
                    const SizedBox(height: 12),
                    const Text('Henüz alarm yok',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary)),
                    const SizedBox(height: 6),
                    const Text('Yukarıdaki "Yeni" butonuna bas',
                        style: TextStyle(
                            fontSize: 13, color: AppColors.textSecondary)),
                  ]),
                )
              else
                ..._alerts.map((alert) => _AlertCard(
                      alert: alert,
                      assetName: _assetName(alert['asset_id'] as int),
                      conditionText: _conditionLabel(
                          alert['condition_type'] as String,
                          (alert['threshold'] as num).toDouble()),
                      onToggle: () async {
                        await ApiService.patchAlert(_auth.token!, alert['id'] as int,
                            {'is_active': !(alert['is_active'] as bool)});
                        _load();
                      },
                      onDelete: () async {
                        await ApiService.deleteAlert(
                            _auth.token!, alert['id'] as int);
                        _load();
                      },
                    )),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginPrompt extends StatelessWidget {
  final VoidCallback onLogin;
  const _LoginPrompt({required this.onLogin});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withValues(alpha: 0.05))),
        child: Column(children: [
          Icon(Icons.lock_outline,
              size: 48, color: AppColors.textSecondary.withValues(alpha: 0.3)),
          const SizedBox(height: 12),
          const Text('Giriş gerekli',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          const Text('Alarmları yönetmek için giriş yapın',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onLogin,
            icon: const Icon(Icons.login, size: 18),
            label: const Text('Giriş Yap'),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12))),
          ),
        ]),
      );
}

class _AlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  final String assetName, conditionText;
  final VoidCallback onToggle, onDelete;
  const _AlertCard(
      {required this.alert,
      required this.assetName,
      required this.conditionText,
      required this.onToggle,
      required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final isActive = alert['is_active'] as bool;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.black.withValues(alpha: 0.05))),
      child: Row(children: [
        Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
                color: AppColors.pastelBlue,
                borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: const Icon(Icons.notifications_outlined,
                color: Color(0xFF3B82F6), size: 20)),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(assetName,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Text(conditionText,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.textSecondary)),
        ])),
        Switch(
            value: isActive,
            onChanged: (_) => onToggle(),
            activeThumbColor: AppColors.primary),
        IconButton(
            icon: const Icon(Icons.delete_outline, size: 20),
            color: AppColors.danger,
            onPressed: onDelete),
      ]),
    );
  }
}
