import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/validators.dart';

/// Uygulamanın her yerinden kullanılabilen giriş/kayıt formu.
/// onSuccess çağrılınca AuthService.instance üzerinden token paylaşılmış olur.
class AuthForm extends StatefulWidget {
  final VoidCallback? onSuccess;
  final bool showTitle;

  const AuthForm({super.key, this.onSuccess, this.showTitle = true});

  @override
  State<AuthForm> createState() => _AuthFormState();
}

class _AuthFormState extends State<AuthForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();

  bool _isRegister = false;
  bool _loading = false;
  bool _obscurePass = true;
  bool _obscureConfirm = true;
  String? _serverError;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _serverError = null);
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _loading = true);

    if (_isRegister) {
      final error = await ApiService.register(
          _emailCtrl.text.trim(), _passCtrl.text, _nameCtrl.text.trim());
      if (!mounted) return;
      if (error == null) {
        // Kayıt başarılı → otomatik giriş yap. _loading burada kapatılmaz;
        // aksi hâlde buton otomatik giriş sürerken tekrar aktifleşir ve
        // ikinci bir kayıt isteği gönderilebilir.
        final tokens = await ApiService.login(
            _emailCtrl.text.trim(), _passCtrl.text);
        if (!mounted) return;
        setState(() => _loading = false);
        if (!tokens.containsKey('error')) {
          AuthService.instance.setAuth(
              tokens['access_token']!, tokens['refresh_token']!, _emailCtrl.text.trim());
          widget.onSuccess?.call();
        } else {
          // Hesap açıldı ama otomatik giriş başarısız — kullanıcıya gerçek
          // nedeni göster, yoksa hatayı fark etmeden tekrar deniyor.
          // Not: metin bilerek 'oluşturuldu' içermez — banner o kelimeyi
          // başarı (yeşil) olarak renklendiriyor, bu ise bir hata.
          setState(() {
            _serverError = 'Hesap açıldı, giriş yapılamadı: ${tokens['error']}';
            _isRegister = false;
          });
        }
      } else {
        setState(() {
          _loading = false;
          _serverError = error;
        });
      }
    } else {
      final tokens = await ApiService.login(
          _emailCtrl.text.trim(), _passCtrl.text);
      if (!mounted) return;
      setState(() => _loading = false);
      if (!tokens.containsKey('error')) {
        AuthService.instance.setAuth(
            tokens['access_token']!, tokens['refresh_token']!, _emailCtrl.text.trim());
        widget.onSuccess?.call();
      } else {
        setState(() => _serverError = tokens['error']);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (widget.showTitle) ...[
          Text(_isRegister ? 'Hesap Oluştur' : 'Giriş Yap',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text(_isRegister ? 'Ücretsiz hesap oluşturun' : 'Hesabınıza giriş yapın',
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 20),
        ],

        // Mode toggle
        Container(
          decoration: const BoxDecoration(color: AppColors.bgLight, borderRadius: BorderRadius.zero),
          padding: const EdgeInsets.all(4),
          child: Row(children: [
            _TabBtn('Giriş Yap', !_isRegister, () => setState(() { _isRegister = false; _serverError = null; })),
            _TabBtn('Kayıt Ol', _isRegister, () => setState(() { _isRegister = true; _serverError = null; })),
          ]),
        ),
        const SizedBox(height: 16),

        // Sunucu hatası
        if (_serverError != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _serverError!.contains('oluşturuldu') ? AppColors.pastelGreen : AppColors.pastelRed,
              borderRadius: BorderRadius.zero,
            ),
            child: Row(children: [
              Icon(_serverError!.contains('oluşturuldu') ? Icons.check_circle_outline : Icons.error_outline,
                  size: 16,
                  color: _serverError!.contains('oluşturuldu') ? AppColors.primary : AppColors.danger),
              const SizedBox(width: 8),
              Expanded(child: Text(_serverError!,
                  style: TextStyle(fontSize: 13,
                      color: _serverError!.contains('oluşturuldu') ? AppColors.primary : AppColors.danger))),
            ]),
          ),

        // Ad Soyad (yalnızca kayıt)
        if (_isRegister) ...[
          _Field(
            controller: _nameCtrl,
            label: 'Ad Soyad',
            icon: Icons.person_outline,
            validator: Validators.fullName,
            hint: 'Örn: Ahmet Yılmaz',
          ),
          const SizedBox(height: 12),
        ],

        // E-posta
        _Field(
          controller: _emailCtrl,
          label: 'E-posta',
          icon: Icons.email_outlined,
          keyboard: TextInputType.emailAddress,
          hint: 'ornek@mail.com',
          validator: Validators.email,
        ),
        const SizedBox(height: 12),

        // Şifre
        _PasswordField(
          controller: _passCtrl,
          label: 'Şifre',
          hint: _isRegister ? 'En az 8 karakter' : '••••••••',
          obscure: _obscurePass,
          onToggle: () => setState(() => _obscurePass = !_obscurePass),
          // Login'de sadece boş mu kontrolü; kayıtta güç kuralları
          validator: _isRegister
              ? Validators.password
              : (v) => (v == null || v.isEmpty) ? 'Şifre zorunludur.' : null,
        ),

        // Şifre tekrar (yalnızca kayıt)
        if (_isRegister) ...[
          const SizedBox(height: 12),
          _PasswordField(
            controller: _confirmCtrl,
            label: 'Şifreyi Tekrarla',
            hint: '••••••••',
            obscure: _obscureConfirm,
            onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
            validator: (v) => Validators.confirmPassword(v, _passCtrl.text),
          ),

          // Şifre gereksinimleri ipucu
          const SizedBox(height: 8),
          const Wrap(spacing: 6, runSpacing: 4, children: [
            _Hint('8+ karakter'),
            _Hint('Büyük harf'),
            _Hint('Küçük harf'),
            _Hint('Rakam'),
          ]),
        ],

        const SizedBox(height: 20),

        // Gönder butonu
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.ink,
              foregroundColor: AppColors.paper,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              elevation: 0,
            ),
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: AppColors.paper, strokeWidth: 2))
                : Text(_isRegister ? 'Hesap Oluştur' : 'Giriş Yap',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          ),
        ),
      ]),
    );
  }
}

class _TabBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _TabBtn(this.label, this.active, this.onTap);

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 9),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: active ? AppColors.ink : AppColors.paper,
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Text(
              label.toUpperCase(),
              style: AppType.label(
                size: 10,
                weight: FontWeight.w600,
                color: active ? AppColors.paper : AppColors.inkSoft,
                tracking: 0.16,
              ),
            ),
          ),
        ),
      );
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final IconData icon;
  final TextInputType keyboard;
  final String? Function(String?) validator;

  const _Field({
    required this.controller, required this.label, required this.icon,
    required this.validator, required this.hint,
    this.keyboard = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    keyboardType: keyboard,
    validator: validator,
    autovalidateMode: AutovalidateMode.onUserInteraction,
    decoration: InputDecoration(
      labelText: label, hintText: hint,
      prefixIcon: Icon(icon, size: 18, color: AppColors.textSecondary),
      filled: true, fillColor: AppColors.bgLight,
      border: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide.none),
      enabledBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide.none),
      focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
      errorBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.danger, width: 1.5)),
      focusedErrorBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.danger, width: 1.5)),
    ),
  );
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final bool obscure;
  final VoidCallback onToggle;
  final String? Function(String?) validator;

  const _PasswordField({
    required this.controller, required this.label, required this.hint,
    required this.obscure, required this.onToggle, required this.validator,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    obscureText: obscure,
    validator: validator,
    autovalidateMode: AutovalidateMode.onUserInteraction,
    decoration: InputDecoration(
      labelText: label, hintText: hint,
      prefixIcon: const Icon(Icons.lock_outline, size: 18, color: AppColors.textSecondary),
      suffixIcon: IconButton(
        icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18, color: AppColors.textSecondary),
        onPressed: onToggle,
      ),
      filled: true, fillColor: AppColors.bgLight,
      border: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide.none),
      enabledBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide.none),
      focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
      errorBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.danger, width: 1.5)),
      focusedErrorBorder: const OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide(color: AppColors.danger, width: 1.5)),
    ),
  );
}

class _Hint extends StatelessWidget {
  final String text;
  const _Hint(this.text);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: const BoxDecoration(color: AppColors.pastelGreen, borderRadius: BorderRadius.zero),
    child: Text(text, style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w600)),
  );
}

/// Herhangi bir yerden bottom sheet olarak açmak için yardımcı fonksiyon.
void showAuthSheet(BuildContext context, {VoidCallback? onSuccess}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.zero,
      ),
      padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 20),
            decoration: const BoxDecoration(color: AppColors.borderSubtle, borderRadius: BorderRadius.zero)),
        AuthForm(
          showTitle: true,
          onSuccess: () {
            Navigator.pop(ctx);
            onSuccess?.call();
          },
        ),
      ]),
    ),
  );
}
