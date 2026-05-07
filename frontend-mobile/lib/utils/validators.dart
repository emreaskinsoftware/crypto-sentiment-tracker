/// Form validasyon kuralları — hem Settings hem de login sheet'lerde kullanılır.
class Validators {
  Validators._();

  /// E-posta formatı: kullanıcı@alan.uzantı
  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) return 'E-posta zorunludur.';
    final v = value.trim();
    final regex = RegExp(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$');
    if (!regex.hasMatch(v)) return 'Geçerli bir e-posta adresi girin.';
    return null;
  }

  /// Ad Soyad: sadece harf ve boşluk, 2-60 karakter, rakam/sembol yok
  static String? fullName(String? value) {
    if (value == null || value.trim().isEmpty) return 'Ad Soyad zorunludur.';
    final v = value.trim();
    if (v.length < 2) return 'Ad Soyad en az 2 karakter olmalıdır.';
    if (v.length > 60) return 'Ad Soyad en fazla 60 karakter olabilir.';
    if (RegExp(r'[0-9]').hasMatch(v)) return 'Ad Soyad rakam içeremez.';
    if (!RegExp(r"^[a-zA-ZğüşıöçÇÖŞİÜĞ\s'\-]+$").hasMatch(v)) {
      return 'Ad Soyad yalnızca harf içerebilir.';
    }
    return null;
  }

  /// Şifre: en az 8 karakter, büyük harf, küçük harf, rakam
  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Şifre zorunludur.';
    if (value.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
    if (!RegExp(r'[A-Z]').hasMatch(value)) return 'En az bir büyük harf gerekli.';
    if (!RegExp(r'[a-z]').hasMatch(value)) return 'En az bir küçük harf gerekli.';
    if (!RegExp(r'[0-9]').hasMatch(value)) return 'En az bir rakam gerekli.';
    return null;
  }

  /// Şifre tekrarı: birinci şifreyle eşleşmeli
  static String? confirmPassword(String? value, String original) {
    if (value == null || value.isEmpty) return 'Şifreyi tekrar girin.';
    if (value != original) return 'Şifreler eşleşmiyor.';
    return null;
  }
}
