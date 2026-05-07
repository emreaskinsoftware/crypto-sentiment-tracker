import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _auth = AuthService.instance;

  bool _isRegisterMode = false;
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _loading = false;
  String? _message;
  bool _messageIsError = false;

  void _showMsg(String msg, {bool error = false}) {
    setState(() {
      _message = msg;
      _messageIsError = error;
    });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _message = null);
    });
  }

  Future<void> _handleSubmit() async {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text;
    if (email.isEmpty || pass.isEmpty) {
      _showMsg('Email ve şifre gerekli.', error: true);
      return;
    }

    setState(() => _loading = true);

    if (_isRegisterMode) {
      final name = _nameCtrl.text.trim();
      if (name.isEmpty) {
        _showMsg('İsim gerekli.', error: true);
        setState(() => _loading = false);
        return;
      }
      final ok = await ApiService.register(email, pass, name);
      setState(() => _loading = false);
      if (ok) {
        _showMsg('Hesap oluşturuldu! Giriş yapabilirsiniz.');
        setState(() => _isRegisterMode = false);
      } else {
        _showMsg('Kayıt başarısız. Email zaten kullanılıyor olabilir.',
            error: true);
      }
    } else {
      final token = await ApiService.login(email, pass);
      setState(() => _loading = false);
      if (token != null) {
        _auth.setAuth(token, email);
        setState(() {});
        _showMsg('Giriş başarılı!');
        _emailCtrl.clear();
        _passCtrl.clear();
      } else {
        _showMsg('Hatalı email veya şifre.', error: true);
      }
    }
  }

  void _logout() {
    _auth.logout();
    setState(() {});
    _showMsg('Çıkış yapıldı.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Settings',
                style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            const Text('Hesap ve bildirim ayarları',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
            const SizedBox(height: 24),

            // Mesaj
            if (_message != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _messageIsError
                      ? AppColors.pastelRed
                      : AppColors.pastelGreen,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(_message!,
                    style: TextStyle(
                        fontSize: 13,
                        color: _messageIsError
                            ? AppColors.danger
                            : AppColors.primary,
                        fontWeight: FontWeight.w600)),
              ),

            // Hesap bölümü
            _SectionCard(
              icon: Icons.person_outline,
              iconColor: AppColors.primary,
              title: 'Hesap',
              children: [
                if (_auth.isLoggedIn) ...[
                  // Giriş yapıldı
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                        color: AppColors.pastelGreen,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.2))),
                    child: Row(children: [
                      const Icon(Icons.check_circle,
                          color: AppColors.primary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            const Text('Giriş yapıldı',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary)),
                            Text(_auth.email ?? '',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary)),
                          ])),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _logout,
                        icon: const Icon(Icons.logout, size: 18),
                        label: const Text('Çıkış Yap'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.danger,
                          side: BorderSide(
                              color: AppColors.danger.withValues(alpha: 0.4)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      )),
                ] else ...[
                  // Giriş/Kayıt toggle
                  Row(children: [
                    Expanded(
                        child: _TabButton(
                      label: 'Giriş Yap',
                      isSelected: !_isRegisterMode,
                      onTap: () => setState(() => _isRegisterMode = false),
                    )),
                    const SizedBox(width: 8),
                    Expanded(
                        child: _TabButton(
                      label: 'Kayıt Ol',
                      isSelected: _isRegisterMode,
                      onTap: () => setState(() => _isRegisterMode = true),
                    )),
                  ]),
                  const SizedBox(height: 14),

                  if (_isRegisterMode) ...[
                    _InputField(
                        controller: _nameCtrl,
                        label: 'Ad Soyad',
                        icon: Icons.person_outline),
                    const SizedBox(height: 10),
                  ],
                  _InputField(
                      controller: _emailCtrl,
                      label: 'Email',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 10),
                  _InputField(
                      controller: _passCtrl,
                      label: 'Şifre',
                      icon: Icons.lock_outline,
                      obscure: true),
                  const SizedBox(height: 14),
                  SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _loading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 2))
                            : Text(
                                _isRegisterMode ? 'Hesap Oluştur' : 'Giriş Yap',
                                style: const TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w700)),
                      )),
                ],
              ],
            ),
            const SizedBox(height: 16),

            // Bildirimler
            _SectionCard(
              icon: Icons.notifications_outlined,
              iconColor: const Color(0xFF3B82F6),
              title: 'Bildirimler',
              children: [
                Text(
                  _auth.isLoggedIn
                      ? 'Giriş yaptınız. Alarmlar aktif olduğunda e-posta ve push bildirim alırsınız.'
                      : 'Bildirim almak için giriş yapın.',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Güvenlik
            const _SectionCard(
              icon: Icons.shield_outlined,
              iconColor: AppColors.warning,
              title: 'Güvenlik',
              children: [
                Text(
                  'Şifreler bcrypt ile hashlenerek saklanır. JWT tokenler 60 dakikada sona erer.',
                  style:
                      TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  const _TabButton(
      {required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.bgLight,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : AppColors.textSecondary)),
        ),
      );
}

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscure;
  final TextInputType keyboardType;
  const _InputField(
      {required this.controller,
      required this.label,
      required this.icon,
      this.obscure = false,
      this.keyboardType = TextInputType.text});

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 18),
          filled: true,
          fillColor: AppColors.bgLight,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  const BorderSide(color: AppColors.primary, width: 1.5)),
        ),
      );
}

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<Widget> children;
  const _SectionCard(
      {required this.icon,
      required this.iconColor,
      required this.title,
      required this.children});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8)),
                alignment: Alignment.center,
                child: Icon(icon, color: iconColor, size: 17)),
            const SizedBox(width: 10),
            Text(title,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary)),
          ]),
          const SizedBox(height: 14),
          ...children,
        ]),
      );
}
