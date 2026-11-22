// Kayıt (web/src/state.js birebir). Biçim web ile AYNI JSON şemasıdır:
//   anahtar 'mozaik.save.v1'      -> { v, lang, settings, flags, progress, hints, ads, daily, gallery, current, currentDaily }
//   anahtar 'mozaik.purchase.v1'  -> { adFree, bonusGranted }  (ilerleme sıfırlanınca silinmez)
// Yükleme tür denetimlidir: her alan varsayılana göre doğrulanır, uyuşmazsa varsayılan kullanılır;
// bilinmeyen alanlar korunur. Ayrıntı: packages/mozaik_core/README.md
import 'dart:convert';

import 'config.dart';

/// Soyut anahtar-değer deposu. Uygulama shared_preferences ile bağlar
/// (getString eşzamanlı okunur; setString/remove ateşle-unut).
abstract class KeyValueStore {
  String? getString(String key);
  void setString(String key, String value);
  void remove(String key);
}

/// Bellek içi depo (testler / kalıcı depo yoksa).
class MemoryKeyValueStore implements KeyValueStore {
  final Map<String, String> values;
  MemoryKeyValueStore([Map<String, String>? initial]) : values = initial ?? {};
  @override
  String? getString(String key) => values[key];
  @override
  void setString(String key, String value) {
    values[key] = value;
  }

  @override
  void remove(String key) {
    values.remove(key);
  }
}

// JS `k in d` Object.prototype adlarını da "var" sayar: bu adlardaki fazladan alanlar web'de korunmaz.
const Set<String> _protoKeys = {
  'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', //
  'toString', 'valueOf', '__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__',
  '__lookupSetter__',
};

final RegExp _isoRe = RegExp(r'^\d{4}-\d{2}-\d{2}$');

bool _isObj(Object? x) => x is Map;

/// Varsayılana göre tür denetimi (JS `coerce`).
Object? coerce(Object? a, Object? d) {
  if (d is Map) {
    final out = <String, dynamic>{};
    final Map src = a is Map ? a : const {};
    for (final k in d.keys) {
      out['$k'] = coerce(src[k], d[k]);
    }
    for (final k in src.keys) {
      if (!d.containsKey(k) && !_protoKeys.contains(k)) out['$k'] = src[k];
    }
    return out;
  }
  if (d is List) return a is List ? a : <dynamic>[];
  if (d is num) return (a is num && a.isFinite) ? a : d;
  if (d is bool) return a is bool ? a : d;
  if (d is String) return a is String ? a : d;
  return a; // null varsayılan: serbest (ayrıca özel denetim)
}

class SaveState {
  static const String saveKey = 'mozaik.save.v1';
  static const String purchaseKey = 'mozaik.purchase.v1';

  final KeyValueStore store;
  final MozaikConfig config;
  final Map<String, String> _mem = {};
  bool _persistent = true;

  /// Yüklü kayıt (JSON şekli). load() çağrılmadan kullanılmamalı.
  Map<String, dynamic> data = {};

  SaveState(this.store, this.config);

  bool get isPersistent => _persistent;

  String? _get(String k) {
    try {
      return store.getString(k);
    } catch (_) {
      _persistent = false;
      return _mem[k];
    }
  }

  void _set(String k, String v) {
    try {
      store.setString(k, v);
    } catch (_) {
      _persistent = false;
      _mem[k] = v;
    }
  }

  void _remove(String k) {
    try {
      store.remove(k);
    } catch (_) {
      _persistent = false;
    }
    _mem.remove(k);
  }

  static Map<String, dynamic> defaults(MozaikConfig c) => <String, dynamic>{
        'v': c.storeVersion,
        'lang': null,
        'settings': <String, dynamic>{
          'theme': 'system',
          'autoX': true,
          'showErrors': true,
          'quickStone': false,
          'patterns': true,
          'sound': true,
          'haptic': true,
        },
        'flags': <String, dynamic>{'tutorialDone': false, 'hintIntroShown': false, 'removeAdsOfferDay': null},
        'progress': <String, dynamic>{'levels': <String, dynamic>{}},
        'hints': <String, dynamic>{'balance': c.hints['start'], 'lastLoginDay': null, 'levelTiers': 0},
        'ads': <String, dynamic>{
          'day': null,
          'rewardedHints': 0,
          'rewardedStreak': 0,
          'gifts': 0,
          'interstitialToday': 0,
          'lastInterstitialAt': 0,
          'lastRewardedAt': 0,
          'completions': 0,
          'nextAdAt': (c.ads['firstFreeLevels'] as num) + 1,
        },
        'daily': <String, dynamic>{
          'done': <String, dynamic>{},
          'streak': 0,
          'lastDay': null,
          'shields': 0,
          'broken': null,
          'lastRescueDay': null,
        },
        'gallery': <dynamic>[],
        'current': null,
        'currentDaily': null,
      };

  /// Tür denetimli göç (JS `migrate`).
  static Map<String, dynamic> migrate(Object? raw, MozaikConfig c) {
    final d = coerce(raw, defaults(c)) as Map<String, dynamic>;
    d['v'] = c.storeVersion;
    final hints = d['hints'] as Map<String, dynamic>;
    if ((hints['balance'] as num) < 0) hints['balance'] = 0;
    if (d['lang'] != null && d['lang'] is! String) d['lang'] = null;
    final st = d['settings'] as Map<String, dynamic>;
    if (!const ['light', 'dark', 'system'].contains(st['theme'])) st['theme'] = 'system';
    if (hints['lastLoginDay'] != null && hints['lastLoginDay'] is! String) hints['lastLoginDay'] = null;
    final ads = d['ads'] as Map<String, dynamic>;
    if (ads['day'] != null && ads['day'] is! String) ads['day'] = null;
    final progress = d['progress'] as Map<String, dynamic>;
    final p = <String, dynamic>{};
    for (final e in (progress['levels'] as Map<String, dynamic>).entries) {
      final r = e.value;
      if (r is Map && r['stars'] is num && (r['stars'] as num) >= 0 && (r['stars'] as num) <= 3) {
        p[e.key] = <String, dynamic>{
          'stars': r['stars'],
          'best': r['best'] is num ? r['best'] : null,
          'done': r['done'] is num ? r['done'] : 1,
        };
      }
    }
    progress['levels'] = p;
    final daily = d['daily'] as Map<String, dynamic>;
    final dn = <String, dynamic>{};
    for (final e in (daily['done'] as Map<String, dynamic>).entries) {
      final q = e.value;
      if (q is Map && _isoRe.hasMatch(e.key) && q['strip'] is List) dn[e.key] = q;
    }
    daily['done'] = dn;
    final ld = daily['lastDay'];
    if (ld != null && !(ld is String && _isoRe.hasMatch(ld))) daily['lastDay'] = null;
    if (daily['lastRescueDay'] != null && daily['lastRescueDay'] is! String) daily['lastRescueDay'] = null;
    final b = daily['broken'];
    if (b != null && !(b is Map && b['streak'] is num && b['missed'] is num && b['day'] is String)) {
      daily['broken'] = null;
    }
    d['gallery'] = (d['gallery'] as List).where((x) => x is Map && x['t'] is String && x['k'] is String).toList();
    for (final k in const ['current', 'currentDaily']) {
      final cur = d[k];
      if (cur != null && !(cur is Map && cur['key'] is String && _isObj(cur['g']))) d[k] = null;
    }
    final flags = d['flags'] as Map<String, dynamic>;
    flags['removeAdsOfferDay'] = flags['removeAdsOfferDay'] is String ? flags['removeAdsOfferDay'] : null;
    return d;
  }

  Map<String, dynamic> load() {
    final raw = _get(saveKey);
    Object? d;
    if (raw != null && raw.isNotEmpty) {
      try {
        d = jsonDecode(raw);
      } catch (_) {
        d = null;
      }
    }
    try {
      data = _isObj(d) ? migrate(d, config) : defaults(config);
    } catch (_) {
      data = defaults(config);
    }
    return data;
  }

  void save() {
    _set(saveKey, jsonEncode(data));
  }

  Map<String, dynamic> reset() {
    _remove(saveKey);
    data = defaults(config);
    save();
    return data;
  }

  /// Satın alma kaydı (Play sahiplik kaydının yerel kopyası).
  Map<String, dynamic> purchase() {
    final raw = _get(purchaseKey);
    Map<String, dynamic> p = {'adFree': false, 'bonusGranted': false};
    if (raw != null && raw.isNotEmpty) {
      try {
        final q = jsonDecode(raw);
        if (_isObj(q)) p = coerce(q, p) as Map<String, dynamic>;
      } catch (_) {
        // web ile aynı: okunamayan satın alma kaydı yok sayılır
      }
    }
    return p;
  }

  void setPurchase(Map<String, dynamic> p) {
    _set(purchaseKey, jsonEncode(p));
  }

  // --- Tipli kısayollar (uygulama katmanı için)
  Map<String, dynamic> get settings => data['settings'] as Map<String, dynamic>;
  Map<String, dynamic> get flags => data['flags'] as Map<String, dynamic>;
  Map<String, dynamic> get hints => data['hints'] as Map<String, dynamic>;
  Map<String, dynamic> get ads => data['ads'] as Map<String, dynamic>;
  Map<String, dynamic> get daily => data['daily'] as Map<String, dynamic>;
  Map<String, dynamic> get levels => (data['progress'] as Map<String, dynamic>)['levels'] as Map<String, dynamic>;
  List<dynamic> get gallery => data['gallery'] as List<dynamic>;
}
