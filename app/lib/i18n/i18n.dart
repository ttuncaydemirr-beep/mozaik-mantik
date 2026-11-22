import 'dart:convert';
import 'dart:ui' show Locale;

import 'package:flutter/services.dart';

/// Desteklenen 8 dil. Arapça sağdan sola.
const List<String> kSupportedLangs = [
  'tr', 'ar', 'en', 'de', 'es', 'pt', 'ru', 'id', //
];
const String kFallbackLang = 'en';

/// Cihaz dilinden (languageCode) 8 dilden birini seçer, yoksa İngilizce.
String pickLang(Iterable<Locale> deviceLocales) {
  for (final l in deviceLocales) {
    if (kSupportedLangs.contains(l.languageCode)) return l.languageCode;
  }
  return kFallbackLang;
}

/// assets/i18n/<dil>.json düz sözlüğü. Eksik anahtarda İngilizceye, o da yoksa
/// anahtarın kendisine düşer. Türkçe için büyük harf dönüşümü yapılmaz.
class I18n {
  I18n(this.lang, this._map, this._fallback);

  final String lang;
  final Map<String, String> _map;
  final Map<String, String> _fallback;

  bool get isRtl => lang == 'ar';
  Locale get locale => Locale(lang);

  String t(String key) => _map[key] ?? _fallback[key] ?? key;

  static Future<Map<String, String>> _read(String lang, AssetBundle b) async {
    final raw = await b.loadString('assets/i18n/$lang.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    return json.map((k, v) => MapEntry(k, v.toString()));
  }

  static Future<I18n> load(String lang, {AssetBundle? bundle}) async {
    final b = bundle ?? rootBundle;
    final map = await _read(lang, b);
    final fb = lang == kFallbackLang ? map : await _read(kFallbackLang, b);
    return I18n(lang, map, fb);
  }
}
