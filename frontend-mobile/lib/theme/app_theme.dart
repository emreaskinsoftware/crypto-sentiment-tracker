import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const primary = Color(0xFF10B981);
  static const primaryDark = Color(0xFF059669);
  static const danger = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const bgLight = Color(0xFFF6F8F7);
  static const surfaceLight = Color(0xFFFFFFFF);
  static const textPrimary = Color(0xFF102219);
  static const textSecondary = Color(0xFF4A705E);
  static const pastelGreen = Color(0xFFE6F9F0);
  static const pastelRed = Color(0xFFFEF2F2);
  static const pastelYellow = Color(0xFFFFFBEB);
  static const pastelBlue = Color(0xFFEFF5FD);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        error: AppColors.danger,
        surface: AppColors.surfaceLight,
      ),
      scaffoldBackgroundColor: AppColors.bgLight,
      textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceLight,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.05)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceLight,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }
}
