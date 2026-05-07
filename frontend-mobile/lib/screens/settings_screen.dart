import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/auth_form.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthService.instance,
      builder: (context, _) {
        final auth = AuthService.instance;
        return Scaffold(
          backgroundColor: AppColors.bgLight,
          body: CustomScrollView(
            slivers: [
              // ── App Bar ───────────────────────────────────────────────────
              SliverAppBar(
                expandedHeight: 120,
                pinned: true,
                backgroundColor: AppColors.primary,
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.primary, AppColors.primaryDark],
                      ),
                    ),
                    child: SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            const Text('Ayarlar',
                                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)),
                            const SizedBox(height: 4),
                            Text(
                              auth.isLoggedIn ? auth.email ?? '' : 'Hesabınıza giriş yapın',
                              style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.8)),
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                // Giriş yapıldıysa avatar göster
                actions: auth.isLoggedIn
                    ? [
                        Padding(
                          padding: const EdgeInsets.only(right: 16),
                          child: CircleAvatar(
                            backgroundColor: Colors.white.withValues(alpha: 0.2),
                            child: Text(
                              (auth.email ?? 'U')[0].toUpperCase(),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                      ]
                    : null,
              ),

              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    // ── Hesap Bölümü ────────────────────────────────────────
                    if (auth.isLoggedIn)
                      _LoggedInCard(auth: auth)
                    else
                      _LoginCard(),
                    const SizedBox(height: 14),

                    // ── Güvenlik ────────────────────────────────────────────
                    _InfoCard(
                      icon: Icons.shield_rounded,
                      color: const Color(0xFF8B5CF6),
                      title: 'Güvenlik',
                      items: const [
                        'Şifreler bcrypt ile güvenli şekilde şifrelenir',
                        'JWT token 60 dakikada otomatik sona erer',
                        'Tüm API istekleri HTTPS üzerinden iletilir',
                      ],
                    ),
                    const SizedBox(height: 14),

                    // ── Bildirimler ─────────────────────────────────────────
                    _InfoCard(
                      icon: Icons.notifications_rounded,
                      color: const Color(0xFF3B82F6),
                      title: 'Bildirimler',
                      items: [
                        if (auth.isLoggedIn)
                          'E-posta alarmları aktif — ${auth.email}'
                        else
                          'Alarm bildirimleri için giriş yapın',
                        'Push bildirimleri için Firebase gereklidir',
                      ],
                    ),
                    const SizedBox(height: 14),

                    // ── Uygulama Hakkında ───────────────────────────────────
                    _InfoCard(
                      icon: Icons.info_rounded,
                      color: AppColors.textSecondary,
                      title: 'Uygulama Hakkında',
                      items: const [
                        'CryptoSentiment Tracker v1.0',
                        'FinBERT NLP ile gerçek zamanlı duygu analizi',
                        'Binance API • RSS Haber Akışı • Reddit',
                      ],
                    ),
                    const SizedBox(height: 24),
                  ]),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LoggedInCard extends StatelessWidget {
  final AuthService auth;
  const _LoggedInCard({required this.auth});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(children: [
        // Profil bilgisi
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: Text(
                (auth.email ?? 'U')[0].toUpperCase(),
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Giriş yapıldı', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(auth.email ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary), overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.pastelGreen, borderRadius: BorderRadius.circular(6)),
                child: const Text('Aktif', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primary)),
              ),
            ])),
          ]),
        ),

        const Divider(height: 1, color: Color(0xFFF3F4F6)),

        // Çıkış yap
        InkWell(
          onTap: () => auth.logout(),
          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            child: Row(children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: AppColors.pastelRed, borderRadius: BorderRadius.circular(10)),
                alignment: Alignment.center,
                child: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
              ),
              const SizedBox(width: 12),
              const Text('Çıkış Yap', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.danger)),
              const Spacer(),
              const Icon(Icons.chevron_right_rounded, color: AppColors.danger, size: 20),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _LoginCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: AppColors.pastelGreen, borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: const Icon(Icons.person_rounded, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('Hesap', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        ]),
        const SizedBox(height: 16),
        AuthForm(
          showTitle: false,
          onSuccess: () {}, // ChangeNotifier otomatik günceller
        ),
      ]),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final List<String> items;

  const _InfoCard({required this.icon, required this.color, required this.title, required this.items});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(20),
      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          alignment: Alignment.center,
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 10),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
      ]),
      const SizedBox(height: 14),
      ...items.map((item) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            margin: const EdgeInsets.only(top: 5),
            width: 5, height: 5,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(item, style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4))),
        ]),
      )),
    ]),
  );
}
