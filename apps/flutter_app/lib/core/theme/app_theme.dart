import 'package:flutter/material.dart';

/// Shared with the website's palette. Fonts are bundled for offline desktop use.
class AppTheme {
  static const brand = Color(0xFF6750F5);
  static const headingFont = 'PlusJakartaSans';
  static const bodyFont = 'Inter';
  static ThemeData get lightTheme => _build(Brightness.light);
  static ThemeData get darkTheme => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final surface = dark ? const Color(0xFF0F172A) : Colors.white;
    final background = dark ? const Color(0xFF020617) : const Color(0xFFF8F9FF);
    final low = dark ? const Color(0xFF1E293B) : const Color(0xFFEFF4FF);
    final text = dark ? const Color(0xFFF1F5F9) : const Color(0xFF0B1C30);
    final muted = dark ? const Color(0xFFCBD5E1) : const Color(0xFF474555);
    final border = dark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final primary = dark ? const Color(0xFFC4B5FD) : const Color(0xFF4E31DC);
    final scheme =
        ColorScheme.fromSeed(seedColor: brand, brightness: brightness).copyWith(
      primary: primary,
      onPrimary: dark ? const Color(0xFF170065) : Colors.white,
      primaryContainer:
          dark ? const Color(0xFF312E61) : const Color(0xFFE4DFFF),
      onPrimaryContainer:
          dark ? const Color(0xFFE4DFFF) : const Color(0xFF3F19CE),
      secondary: dark ? const Color(0xFFA5B4FC) : const Color(0xFF0057C2),
      tertiary: dark ? const Color(0xFF6EE7B7) : const Color(0xFF007E35),
      surface: surface,
      onSurface: text,
      onSurfaceVariant: muted,
      surfaceContainerLowest: surface,
      surfaceContainerLow: low,
      surfaceContainer: low,
      surfaceContainerHigh: low,
      outline: dark ? const Color(0xFF64748B) : const Color(0xFF787587),
      outlineVariant: border,
    );
    final base = ThemeData(
        useMaterial3: true,
        brightness: brightness,
        colorScheme: scheme,
        fontFamily: headingFont);
    final pill =
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(999));
    final fieldBorder = OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: border));
    final buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: brand,
      foregroundColor: Colors.white,
      elevation: 0,
      disabledBackgroundColor: brand.withValues(alpha: dark ? .35 : .4),
      disabledForegroundColor: dark ? const Color(0xFFCBD5E1) : Colors.white,
      shape: pill,
      minimumSize: const Size(0, 46),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      textStyle: const TextStyle(
          fontFamily: headingFont, fontWeight: FontWeight.w600, fontSize: 13),
    );
    return base.copyWith(
      scaffoldBackgroundColor: background,
      textTheme: base.textTheme.copyWith(
        headlineLarge: base.textTheme.headlineLarge
            ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -1.2),
        headlineMedium: base.textTheme.headlineMedium
            ?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.8),
        headlineSmall: base.textTheme.headlineSmall
            ?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -.5),
        titleLarge:
            base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        titleMedium:
            base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        labelSmall: base.textTheme.labelSmall
            ?.copyWith(fontFamily: bodyFont, color: muted),
      ),
      cardTheme: CardThemeData(
          color: surface,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: border))),
      elevatedButtonTheme: ElevatedButtonThemeData(style: buttonStyle),
      filledButtonTheme: FilledButtonThemeData(style: buttonStyle),
      outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
              foregroundColor: primary,
              side: BorderSide(color: border),
              shape: pill,
              minimumSize: const Size(0, 44),
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 12))),
      textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(shape: pill, foregroundColor: primary)),
      inputDecorationTheme: InputDecorationTheme(
          border: fieldBorder,
          enabledBorder: fieldBorder,
          focusedBorder: fieldBorder.copyWith(
              borderSide: const BorderSide(color: brand, width: 2)),
          filled: true,
          fillColor: low,
          hintStyle: TextStyle(color: muted),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 18, vertical: 16)),
      appBarTheme: AppBarTheme(
          backgroundColor: surface,
          foregroundColor: text,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
          titleTextStyle: TextStyle(
              fontFamily: headingFont,
              fontSize: 21,
              fontWeight: FontWeight.w700,
              color: text)),
      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
      navigationBarTheme: NavigationBarThemeData(
          backgroundColor: surface, indicatorColor: scheme.primaryContainer),
      navigationRailTheme: NavigationRailThemeData(
          backgroundColor: surface,
          indicatorColor: low,
          selectedIconTheme: IconThemeData(color: primary),
          unselectedIconTheme: IconThemeData(color: muted),
          selectedLabelTextStyle: TextStyle(
              fontFamily: headingFont,
              color: primary,
              fontWeight: FontWeight.w600),
          unselectedLabelTextStyle:
              TextStyle(fontFamily: headingFont, color: muted)),
      chipTheme: base.chipTheme.copyWith(
          backgroundColor: low,
          selectedColor: scheme.primaryContainer,
          side: BorderSide.none,
          shape: pill,
          labelStyle:
              TextStyle(fontFamily: headingFont, color: text, fontSize: 12)),
      sliderTheme: base.sliderTheme.copyWith(
          activeTrackColor: brand,
          thumbColor: brand,
          inactiveTrackColor: border),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: brand),
      tooltipTheme: TooltipThemeData(
          decoration: BoxDecoration(
              color: text, borderRadius: BorderRadius.circular(10)),
          textStyle:
              TextStyle(fontFamily: bodyFont, color: surface, fontSize: 12)),
    );
  }
}
