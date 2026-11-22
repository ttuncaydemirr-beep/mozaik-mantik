// GENERATED FILE - DO NOT EDIT.
// Kaynak: design/tokens-a.css (Yon A: Lale Bahcesi). Uretici: app/tool/gen_tokens.py
// ignore_for_file: public_member_api_docs
import 'package:flutter/painting.dart';

/// Tasarim yaricapi (CSS --radius).
const double kRadius = 14;

class MozaikTokens {
  const MozaikTokens({
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.text,
    required this.text2,
    required this.accent,
    required this.accentInk,
    required this.success,
    required this.danger,
    required this.gridLine,
    required this.regionBorder,
    required this.stone,
    required this.stoneInk,
    required this.mark,
    required this.r0,
    required this.r1,
    required this.r2,
    required this.r3,
    required this.r4,
    required this.r5,
    required this.r6,
    required this.r7,
    required this.r8,
    required this.r9,
  });

  final Color bg;
  final Color surface;
  final Color surface2;
  final Color text;
  final Color text2;
  final Color accent;
  final Color accentInk;
  final Color success;
  final Color danger;
  final Color gridLine;
  final Color regionBorder;
  final Color stone;
  final Color stoneInk;
  final Color mark;
  final Color r0;
  final Color r1;
  final Color r2;
  final Color r3;
  final Color r4;
  final Color r5;
  final Color r6;
  final Color r7;
  final Color r8;
  final Color r9;

  /// Bolge renkleri r0..r9 (desen modu icin bolge indeksiyle kullanilir).
  List<Color> get regions => [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9];
}

/// Acik tema (:root)
const MozaikTokens kLightTokens = MozaikTokens(
  bg: Color(0xFFF6EEDD),
  surface: Color(0xFFFFFAEF),
  surface2: Color(0xFFEADFC6),
  text: Color(0xFF1D2842),
  text2: Color(0xFF4F5A73),
  accent: Color(0xFF1C4A9E),
  accentInk: Color(0xFFFFFFFF),
  success: Color(0xFF17703F),
  danger: Color(0xFFB3261E),
  gridLine: Color(0xFF6E7791),
  regionBorder: Color(0xFF1D2842),
  stone: Color(0xFF1D2842),
  stoneInk: Color(0xFFF6EEDD),
  mark: Color(0xFF1D2842),
  r0: Color(0xFF7F9FE8), // Kobalt · desen: nokta
  r1: Color(0xFF6FD0C8), // Turkuaz · desen: yatay çizgi
  r2: Color(0xFFF59C84), // Mercan · desen: dikey çizgi
  r3: Color(0xFF86CC95), // Zümrüt · desen: çapraz /
  r4: Color(0xFFF3DA7C), // Altın · desen: çapraz \
  r5: Color(0xFFD6B2E8), // Mor/Patlıcan · desen: ızgara
  r6: Color(0xFFF6B3C9), // Karanfil pembe · desen: dalga
  r7: Color(0xFFB9C45E), // Zeytin · desen: dama
  r8: Color(0xFFC3DDF3), // Gök · desen: artı
  r9: Color(0xFFE6CBAF), // Toprak/Tuğla · desen: baklava
);

/// Koyu tema ([data-theme=dark])
const MozaikTokens kDarkTokens = MozaikTokens(
  bg: Color(0xFF121A2E),
  surface: Color(0xFF1B2540),
  surface2: Color(0xFF26335C),
  text: Color(0xFFF3EBD8),
  text2: Color(0xFFB6BED2),
  accent: Color(0xFFF0B24A),
  accentInk: Color(0xFF1A1405),
  success: Color(0xFF63CF92),
  danger: Color(0xFFFF8F80),
  gridLine: Color(0xFF7C86A6),
  regionBorder: Color(0xFFF3EBD8),
  stone: Color(0xFFF5EBD3),
  stoneInk: Color(0xFF1B2340),
  mark: Color(0xFFF5EBD3),
  r0: Color(0xFF2B52A8), // Kobalt · desen: nokta
  r1: Color(0xFF117F82), // Turkuaz · desen: yatay çizgi
  r2: Color(0xFFB4452E), // Mercan · desen: dikey çizgi
  r3: Color(0xFF2C7A48), // Zümrüt · desen: çapraz /
  r4: Color(0xFF9A7712), // Altın · desen: çapraz \
  r5: Color(0xFF76459A), // Mor/Patlıcan · desen: ızgara
  r6: Color(0xFFA63D68), // Karanfil pembe · desen: dalga
  r7: Color(0xFF4A5A12), // Zeytin · desen: dama
  r8: Color(0xFF3C6E9C), // Gök · desen: artı
  r9: Color(0xFF8A5E40), // Toprak/Tuğla · desen: baklava
);
