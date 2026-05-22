import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand
  static const primary     = Color(0xFF10B981);
  static const primaryDark = Color(0xFF059669);
  static const danger      = Color(0xFFEF4444);
  static const warning     = Color(0xFFF59E0B);

  // Dark terminal backgrounds
  static const bgLight      = Color(0xFF080D0A);
  static const bgDark       = Color(0xFF040704);
  static const surfaceLight = Color(0xFF0C1510);
  static const surfaceCard  = Color(0xFF0F1B13);

  // Text
  static const textPrimary   = Color(0xFFD4EDE1);
  static const textSecondary = Color(0xFF527A65);

  // Tinted overlays
  static const pastelGreen  = Color(0x1210B981); // primary @ 7%
  static const pastelRed    = Color(0x12EF4444); // danger  @ 7%
  static const pastelYellow = Color(0x12F59E0B); // warning @ 7%
  static const pastelBlue   = Color(0x123B82F6); // blue    @ 7%

  // Borders
  static const borderSubtle = Color(0x1A10B981); // primary @ 10%
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.dark,
        primary: AppColors.primary,
        error: AppColors.danger,
        surface: AppColors.surfaceLight,
      ),
      scaffoldBackgroundColor: AppColors.bgLight,
      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        ThemeData(brightness: Brightness.dark).textTheme,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceLight,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderSubtle),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceLight,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      dividerColor: AppColors.borderSubtle,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        hintStyle: const TextStyle(color: AppColors.textSecondary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
      ),
    );
  }

  // Keep for backwards compat — redirects to dark
  static ThemeData get lightTheme => darkTheme;
}
