import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// ─────────────────────────────────────────────────────────────────────────
/// KAYIT CİHAZI — chart recorder
/// Uygulama 15 dakikada bir sinyal kaydediyor; arayüz de bir kayıt cihazı:
/// milimetrik kağıt, mürekkep izleri, canlı çizen kalem.
/// Web arayüzüyle aynı paleti ve aynı üç yazı rolünü kullanır.
/// ─────────────────────────────────────────────────────────────────────────
class AppColors {
  // Kağıt — gerçek EKG kağıdı gibi soluk somon-beyaz
  static const paper     = Color(0xFFF7EFE9);
  static const paperDeep = Color(0xFFEFE3DA);
  static const paperEdge = Color(0xFFE6D6CA);

  // Basılı ızgara
  static const grid     = Color(0xFFE4B49E);
  static const gridFine = Color(0xFFF1D6C8);

  // Mürekkep
  static const ink      = Color(0xFF241E19);
  static const inkSoft  = Color(0xFF7A6B5F);
  static const inkFaint = Color(0xFFA99887);

  // Kalemler — cihazın iki kanalı
  static const trace    = Color(0xFFB32B22); // duygu
  static const traceAlt = Color(0xFF1F5673); // fiyat

  // ── Geriye dönük adlar ────────────────────────────────────────────────
  // Ekranlar kademeli taşındığı için eski isimler yeni palete bağlandı.
  static const primary       = traceAlt;
  static const primaryDark   = ink;
  static const danger        = trace;
  static const warning       = inkSoft;
  static const bgLight       = paper;
  static const bgDark        = paperDeep;
  static const surfaceLight  = paper;
  static const surfaceCard   = paper;
  static const textPrimary   = ink;
  static const textSecondary = inkSoft;
  static const pastelGreen   = paperDeep;
  static const pastelRed     = paperDeep;
  static const pastelYellow  = paperDeep;
  static const pastelBlue    = paperDeep;
  static const borderSubtle  = Color(0x1F241E19); // ink @ 12%
}

/// Üç yazı rolü: cihaz etiketi, sayısal okuma, dünyanın sözü.
class AppType {
  /// Cihaz etiketleri — versal, açık harf aralığı.
  static TextStyle label({
    double size = 11,
    FontWeight weight = FontWeight.w600,
    Color color = AppColors.ink,
    double tracking = 0.16,
  }) =>
      GoogleFonts.archivo(
        fontSize: size,
        fontWeight: weight,
        color: color,
        letterSpacing: size * tracking,
        height: 1.15,
      );

  /// Tüm sayısal okuma — tabular rakamlar.
  static TextStyle data({
    double size = 12,
    FontWeight weight = FontWeight.w400,
    Color color = AppColors.ink,
  }) =>
      GoogleFonts.ibmPlexMono(
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: 1.3,
      );

  /// Yalnızca haber metni — makinenin etiketi ile dünyanın sözü ayrı seslerde.
  static TextStyle prose({
    double size = 15,
    FontWeight weight = FontWeight.w400,
    Color color = AppColors.ink,
  }) =>
      GoogleFonts.newsreader(
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: 1.35,
      );
}

class AppTheme {
  static ThemeData get recorderTheme {
    final base = ThemeData(brightness: Brightness.light);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.traceAlt,
        brightness: Brightness.light,
        primary: AppColors.ink,
        error: AppColors.trace,
        surface: AppColors.paper,
      ),
      scaffoldBackgroundColor: AppColors.paper,
      textTheme: GoogleFonts.archivoTextTheme(base.textTheme).apply(
        bodyColor: AppColors.ink,
        displayColor: AppColors.ink,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.paperDeep,
        foregroundColor: AppColors.ink,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: AppType.label(size: 13, weight: FontWeight.w700),
      ),
      // Kayıt cihazında yuvarlak köşe ve gölge yok — hairline çerçeve var.
      cardTheme: const CardThemeData(
        color: AppColors.paper,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
          side: BorderSide(color: AppColors.borderSubtle),
        ),
      ),
      dividerColor: AppColors.borderSubtle,
      dividerTheme: const DividerThemeData(
        color: AppColors.borderSubtle,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.paper,
        border: const OutlineInputBorder(
          borderRadius: BorderRadius.zero,
          borderSide: BorderSide(color: AppColors.borderSubtle),
        ),
        enabledBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.zero,
          borderSide: BorderSide(color: AppColors.borderSubtle),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.zero,
          borderSide: BorderSide(color: AppColors.trace, width: 1.5),
        ),
        labelStyle: AppType.label(size: 10, color: AppColors.inkSoft),
        hintStyle: AppType.data(size: 12, color: AppColors.inkFaint),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.ink,
          foregroundColor: AppColors.paper,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          elevation: 0,
          textStyle: AppType.label(size: 11, color: AppColors.paper),
        ),
      ),
    );
  }

  // Eski çağrı noktaları için
  static ThemeData get darkTheme => recorderTheme;
  static ThemeData get lightTheme => recorderTheme;
}
