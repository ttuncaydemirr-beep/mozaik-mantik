import 'package:flutter/material.dart';

import 'tokens.dart';

/// Yazı tipleri (design/fonts, OFL). Arapça için Noto Kufi yedeği.
const String kFontUi = 'Onest';
const String kFontDisplay = 'El Messiri';
const String kFontArabic = 'Noto Kufi Arabic';
const List<String> kUiFallback = [kFontArabic];

ThemeData buildTheme(MozaikTokens t, Brightness b) {
  final scheme = ColorScheme(
    brightness: b,
    primary: t.accent,
    onPrimary: t.accentInk,
    secondary: t.accent,
    onSecondary: t.accentInk,
    error: t.danger,
    onError: t.accentInk,
    surface: t.surface,
    onSurface: t.text,
    surfaceContainerHighest: t.surface2,
    outline: t.gridLine,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: b,
    colorScheme: scheme,
    scaffoldBackgroundColor: t.bg,
    fontFamily: kFontUi,
    fontFamilyFallback: kUiFallback,
    textTheme: ThemeData(brightness: b).textTheme.apply(
          bodyColor: t.text,
          displayColor: t.text,
          fontFamily: kFontUi,
          fontFamilyFallback: kUiFallback,
        ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: t.accent,
        foregroundColor: t.accentInk,
        minimumSize: const Size(160, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(kRadius)),
      ),
    ),
  );
}

final ThemeData lightTheme = buildTheme(kLightTokens, Brightness.light);
final ThemeData darkTheme = buildTheme(kDarkTokens, Brightness.dark);
