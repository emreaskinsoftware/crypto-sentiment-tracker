import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/auth_form.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _auth = AuthService.instance;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Settings',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text('Hesap ve uygulama ayarları',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
            const SizedBox(height: 24),

            // Hesap Bölümü
            _SectionCard(
              icon: Icons.person_outline,
              iconColor: AppColors.primary,
              title: 'Hesap',
              child: _auth.isLoggedIn ? _LoggedInView(onLogout: () => setState(() {})) : _LoginView(onSuccess: () => setState(() {})),
            ),
            const SizedBox(height: 16),

            // Bildirimler
            _SectionCard(
              icon: Icons.notifications_outlined,
              iconColor: const Color(0xFF3B82F6),
              title: 'Bildirimler',
              child: Text(
                _auth.isLoggedIn
                    ? 'Giriş yaptınız. Alarmlar tetiklendiğinde e-posta ve push bildirim alırsınız.'
                    : 'Bildirimleri etkinleştirmek için giriş yapın.',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
              ),
            ),
            const SizedBox(height: 16),

            // Güvenlik
            _SectionCard(
              icon: Icons.shield_outlined,
              iconColor: AppColors.warning,
              title: 'Güvenlik',
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Şifreler bcrypt ile güvenli şekilde saklanır.',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                const SizedBox(height: 4),
                Text('JWT tokenler 60 dakikada sona erer.',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              ]),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _LoggedInView extends StatelessWidget {
  final VoidCallback onLogout;
  const _LoggedInView({required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final auth = AuthService.instance;
    return Column(children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.pastelGreen,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
        ),
        child: Row(children: [
          const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 22),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Giriş yapıldı', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
            Text(auth.email ?? '', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ])),
        ]),
      ),
      const SizedBox(height: 12),
      SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: () { auth.logout(); onLogout(); },
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Çıkış Yap'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.danger,
            side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
    ]);
  }
}

class _LoginView extends StatelessWidget {
  final VoidCallback onSuccess;
  const _LoginView({required this.onSuccess});

  @override
  Widget build(BuildContext context) => AuthForm(showTitle: false, onSuccess: onSuccess);
}

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final Widget child;
  const _SectionCard({required this.icon, required this.iconColor, required this.title, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(18),
      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 3))],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          width: 34, height: 34,
          decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
          alignment: Alignment.center,
          child: Icon(icon, color: iconColor, size: 18),
        ),
        const SizedBox(width: 10),
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
      ]),
      const SizedBox(height: 16),
      child,
    ]),
  );
}
