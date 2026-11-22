// Tek yapılandırma nesnesi (web/src/config.js). Flutter'da Firebase Remote Config karşılığı:
// uzak değerler [MozaikConfig.new] `override` ile derin birleştirilir (JS `merge` ile aynı kural).
import 'js_compat.dart';

Map<String, dynamic> _base() => <String, dynamic>{
      'storeVersion': 1,
      'developer': 'Demir Games Studio',
      'supportEmail': 'nilkaren.tuncay.demir@gmail.com',
      'privacyUrl': 'https://ttuncaydemirr-beep.github.io/privacy/mozaik-mantik/',
      'siteUrl': 'https://ttuncaydemirr-beep.github.io/',
      'languages': <dynamic>['tr', 'ar', 'en', 'de', 'es', 'pt', 'ru', 'id'],
      'languageNames': <String, dynamic>{
        'tr': 'Türkçe',
        'ar': 'العربية',
        'en': 'English',
        'de': 'Deutsch',
        'es': 'Español',
        'pt': 'Português',
        'ru': 'Русский',
        'id': 'Bahasa Indonesia',
      },
      'rtlLanguages': <dynamic>['ar'],
      'packs': <dynamic>['cirak', 'kalfa', 'usta', 'basusta', 'nakkas'],
      'unlock': <String, dynamic>{'completed': 30, 'star2Count': 20, 'star2Min': 2},
      'hints': <String, dynamic>{
        'start': 5,
        'cap': 12,
        'freeCap': 5,
        'dailyLogin': 1,
        'dailyLoginAdFree': 2,
        'dailyPuzzle': 1,
        'everyLevels': 10,
        'everyLevelsAmount': 1,
        'rewardedAmount': 2,
        'removeAdsBonus': 10,
        'giftAmount': 1,
        'giftPerDay': 1,
      },
      'ads': <String, dynamic>{
        'interstitialEnabled': true,
        'firstFreeLevels': 6,
        'everyLevels': 4,
        'minGapSec': 120,
        'dailyCap': null,
        'rewardedResetsCounterSec': 300,
        'rewardedHintsPerDay': 10,
        'rewardedStreakPerDay': 1,
        'streakRescueWeeklyMax': 1,
        'resultCardMinMs': 2000,
        'requireOnline': true,
        'fakeAdMs': 2500,
        'fakeFailRate': 0,
        'bannerEnabled': false,
      },
      'game': <String, dynamic>{
        'longPressMs': 350,
        'minCellPx': 30,
        'maxCellPx': 72,
        'winAnimMs': 1400,
        'hintIntroOnce': true,
      },
      'daily': <String, dynamic>{
        'epoch': '2026-11-22',
        // Pzt..Paz (0 = Pazar); anahtarlar JS nesnesindeki gibi metin
        'weekdayPack': <String, dynamic>{'1': 1, '2': 2, '3': 3, '4': 3, '5': 4, '6': 4, '0': 5},
        'selectMode': 'weekday',
        'shieldEvery': 7,
        'shieldMax': 2,
      },
    };

/// JS `merge(a, b)`: b'deki nesneler a'daki nesnelerle derin birleşir, diğer her şey (dizi, null dahil) üzerine yazılır.
Map<String, dynamic> deepMerge(Map<String, dynamic> a, Map? b) {
  if (b == null) return a;
  for (final e in b.entries) {
    final key = '${e.key}';
    final v = e.value;
    final cur = a[key];
    if (v is Map && cur is Map<String, dynamic>) {
      deepMerge(cur, v);
    } else {
      a[key] = deepCopy(v);
    }
  }
  return a;
}

class MozaikConfig {
  /// Birleştirilmiş ham değerler (JS `MZ.Config` ile aynı şekil).
  final Map<String, dynamic> raw;

  MozaikConfig([Map? override]) : raw = deepMerge(_base(), override);

  Map<String, dynamic> get hints => raw['hints'] as Map<String, dynamic>;
  Map<String, dynamic> get ads => raw['ads'] as Map<String, dynamic>;
  Map<String, dynamic> get daily => raw['daily'] as Map<String, dynamic>;
  Map<String, dynamic> get unlock => raw['unlock'] as Map<String, dynamic>;
  Map<String, dynamic> get game => raw['game'] as Map<String, dynamic>;

  num get storeVersion => raw['storeVersion'] as num;
  String get siteUrl => raw['siteUrl'] as String;
  String get privacyUrl => raw['privacyUrl'] as String;
  String get supportEmail => raw['supportEmail'] as String;
  String get developer => raw['developer'] as String;
  List<String> get languages => (raw['languages'] as List).cast<String>();
  List<String> get rtlLanguages => (raw['rtlLanguages'] as List).cast<String>();
  List<String> get packs => (raw['packs'] as List).cast<String>();
  bool isRtl(String lang) => rtlLanguages.contains(lang);
}
