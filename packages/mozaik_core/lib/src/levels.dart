// Seviye verisi: data/levels.json, data/daily.json, data/tutorial.json ayrıştırma (web/src/data.js).
// Biçim farklılıklarına toleranslı: dizi ya da {levels|puzzles|tutorial: [...]} kabul edilir.
import 'dart:convert';

import 'config.dart';
import 'solver.dart';

class Level {
  final String id;
  final String pack;
  final int n;
  final String regions;
  final List<int> solution;
  final int? tech;
  final int? steps;

  /// Günlük bulmacalarda haftanın günü: mon..sun
  final String? dow;

  /// Öğreticide anlatım anahtarı.
  final String? teach;

  /// Öğreticide ilk ipucu (ham JSON).
  final Map<String, dynamic>? firstHint;

  const Level({
    required this.id,
    required this.pack,
    required this.n,
    required this.regions,
    required this.solution,
    this.tech,
    this.steps,
    this.dow,
    this.teach,
    this.firstHint,
  });

  factory Level.fromJson(Map<String, dynamic> j) => Level(
        id: j['id'] as String,
        pack: (j['pack'] ?? '') as String,
        n: (j['n'] as num).toInt(),
        regions: j['regions'] as String,
        solution: [for (final x in (j['solution'] as List? ?? const [])) (x as num).toInt()],
        tech: (j['tech'] as num?)?.toInt(),
        steps: (j['steps'] as num?)?.toInt(),
        dow: j['dow'] as String?,
        teach: j['teach'] as String?,
        firstHint: j['firstHint'] as Map<String, dynamic>?,
      );

  Level copyWith({String? dow, bool clearDow = false}) => Level(
      id: id,
      pack: pack,
      n: n,
      regions: regions,
      solution: solution,
      tech: tech,
      steps: steps,
      dow: clearDow ? null : (dow ?? this.dow),
      teach: teach,
      firstHint: firstHint);

  List<List<int>> get regionGrid => parseRegions(n, regions);

  /// Öğretici: ilk hedef hücre indeksi (firstHint.place[0]); yoksa null.
  int? get tutorialFirstIndex {
    final fh = firstHint;
    final pl = fh == null ? null : fh['place'];
    if (pl is List && pl.isNotEmpty && pl[0] is List) {
      final p = pl[0] as List;
      return (p[0] as num).toInt() * n + (p[1] as num).toInt();
    }
    return null;
  }
}

List<dynamic> _list(Object? x, List<String> keys) {
  if (x == null) return const [];
  if (x is List) return x;
  if (x is Map) {
    for (final k in keys) {
      if (x[k] is List) return x[k] as List;
    }
  }
  return const [];
}

List<Level> parseLevelList(Object? json, List<String> keys) =>
    [for (final e in _list(json, keys)) Level.fromJson(e as Map<String, dynamic>)];

class LevelData {
  final MozaikConfig config;
  final List<Level> levels;
  final List<Level> daily;
  final List<Level> tutorial;
  final Map<String, List<Level>> packs;
  final Map<String, Level> _byId;

  LevelData._(this.config, this.levels, this.daily, this.tutorial, this.packs, this._byId);

  factory LevelData(MozaikConfig config,
      {List<Level> levels = const [], List<Level> daily = const [], List<Level> tutorial = const []}) {
    final byId = <String, Level>{};
    final packs = <String, List<Level>>{for (final p in config.packs) p: <Level>[]};
    for (final l in levels) {
      byId[l.id] = l;
      packs[l.pack]?.add(l);
    }
    return LevelData._(config, levels, daily, tutorial, packs, byId);
  }

  /// JSON metinlerinden (assets) kur.
  factory LevelData.fromJsonStrings(MozaikConfig config, {String? levels, String? daily, String? tutorial}) =>
      LevelData(config,
          levels: levels == null ? const [] : parseLevelList(jsonDecode(levels), const ['levels']),
          daily: daily == null ? const [] : parseLevelList(jsonDecode(daily), const ['puzzles', 'levels']),
          tutorial: tutorial == null
              ? const []
              : parseLevelList(jsonDecode(tutorial), const ['levels', 'puzzles', 'tutorial']));

  Level? level(String id) => _byId[id];
  int packIndex(String p) => config.packs.indexOf(p) + 1;
  List<int> packSizes(String p) {
    final a = (packs[p] ?? const <Level>[]).map((l) => l.n).toList();
    if (a.isEmpty) return [0, 0];
    a.sort();
    return [a.first, a.last];
  }

  Level? nextInPack(Level l) {
    final a = packs[l.pack];
    if (a == null) return null;
    final i = a.indexOf(l);
    return i >= 0 && i + 1 < a.length ? a[i + 1] : null;
  }
}
