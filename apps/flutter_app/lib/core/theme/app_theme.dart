import 'package:flutter/material.dart';

class AppTheme {
  static const Color _primaryColor = Color(0xFF6C63FF);
  static const Color _secondaryColor = Color(0xFF7C3AED);
  static const Color _surfaceLight = Color(0xFFF8F9FA);
  static const Color _surfaceDark = Color(0xFF1A1B1E);
  static const Color _cardLight = Color(0xFFFFFFFF);
  static const Color _cardDark = Color(0xFF25262B);
  static const Color _sidebarDark = Color(0xFF141517);
  static const Color _sidebarLight = Color(0xFFFFFFFF);

  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _primaryColor,
          secondary: _secondaryColor,
          brightness: Brightness.light,
          surface: _surfaceLight,
        ),
        scaffoldBackgroundColor: _surfaceLight,
        cardTheme: const CardThemeData(
          color: _cardLight,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: Color(0xFFE5E7EB)),
          ),
        ),
        navigationRailTheme: const NavigationRailThemeData(
          backgroundColor: _sidebarLight,
          selectedIconTheme: IconThemeData(color: _primaryColor),
          selectedLabelTextStyle: TextStyle(color: _primaryColor, fontWeight: FontWeight.w600),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: _primaryColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: _primaryColor, width: 2),
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: _sidebarLight,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      );

  static ThemeData get darkTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _primaryColor,
          secondary: _secondaryColor,
          brightness: Brightness.dark,
          surface: _surfaceDark,
        ),
        scaffoldBackgroundColor: _surfaceDark,
        cardTheme: const CardThemeData(
          color: _cardDark,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: Color(0xFF2C2D33)),
          ),
        ),
        navigationRailTheme: NavigationRailThemeData(
          backgroundColor: _sidebarDark,
          selectedIconTheme: const IconThemeData(color: _primaryColor),
          unselectedIconTheme: const IconThemeData(color: Color(0xFF909296)),
          selectedLabelTextStyle: const TextStyle(color: _primaryColor, fontWeight: FontWeight.w600),
          unselectedLabelTextStyle: const TextStyle(color: Color(0xFF909296)),
          indicatorColor: _primaryColor.withValues(alpha: 0.15),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: _primaryColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF2C2D33)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF2C2D33)),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: _primaryColor, width: 2),
          ),
          filled: true,
          fillColor: _cardDark,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: _sidebarDark,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      );
}
