// İlerleme iş kuralları (web/src/progress.js birebir): seviye kaydı, yıldız, paket kilidi,
// seviye/günlük tamamlama ödülleri, galeri.
import 'config.dart';
import 'daily.dart';
import 'economy.dart';
import 'game.dart';
import 'js_compat.dart';
import 'levels.dart';
import 'save_state.dart';
import 'util.dart';

class PackStats {
  final int total;
  final int done;
  final int s2;
  final num stars;
  const PackStats(this.total, this.done, this.s2, this.stars);
  Map<String, Object?> toJson() => {'total': total, 'done': done, 's2': s2, 'stars': stars};
}

class PackLock {
  final bool locked;
  final num remaining;
  const PackLock(this.locked, this.remaining);
  Map<String, Object?> toJson() => {'locked': locked, 'remaining': remaining};
}

class LevelRecord {
  final bool piece;
  final bool first;
  final num? best;
  const LevelRecord(this.piece, this.first, this.best);
  Map<String, Object?> toJson() => {'piece': piece, 'first': first, 'best': best};
}

/// Seviye/günlük tamamlama sonucu (sonuç kartı). mode: level | daily
class CompletionInfo {
  final String mode;
  final num time;
  final num hints;
  final num errors;
  final int stars;
  // level
  final bool? newPiece;
  final num? best;
  // daily
  final bool? first;
  final Map<String, dynamic>? record;
  final bool? shield;
  final num hintBonus;
  const CompletionInfo({
    required this.mode,
    required this.time,
    required this.hints,
    required this.errors,
    required this.stars,
    this.newPiece,
    this.best,
    this.first,
    this.record,
    this.shield,
    required this.hintBonus,
  });
  Map<String, Object?> toJson() => mode == 'level'
      ? {
          'mode': mode,
          'time': time,
          'hints': hints,
          'errors': errors,
          'stars': stars,
          'newPiece': newPiece,
          'best': best,
          'hintBonus': hintBonus,
        }
      : {
          'mode': mode,
          'time': time,
          'hints': hints,
          'errors': errors,
          'stars': stars,
          'first': first,
          'record': record,
          if (shield != null) 'shield': shield,
          'hintBonus': hintBonus,
        };
}

class Progress {
  final SaveState state;
  final MozaikConfig config;
  final LevelData data;
  final Economy economy;
  final Daily daily;
  final Clock clock;
  Progress(this.state, this.config, this.data, this.economy, this.daily, this.clock);

  Map<String, dynamic> get _levels => (state.data['progress'] as Map<String, dynamic>)['levels'] as Map<String, dynamic>;
  List<dynamic> get _gallery => state.data['gallery'] as List<dynamic>;

  bool _hasGallery(String t, String k) => _gallery.any((x) => x is Map && x['t'] == t && x['k'] == k);

  static num _stars(Object? r) => jsTruthy(r) && r is Map ? (r['stars'] as num) : 0;

  PackStats packStats(String pack) {
    final list = data.packs[pack] ?? const <Level>[];
    final p = _levels;
    var done = 0, s2 = 0;
    num stars = 0;
    for (final l in list) {
      final r = p[l.id];
      final s = _stars(r);
      if (jsTruthy(r) && s >= 1) {
        done++;
        stars += s;
        if (s >= (config.unlock['star2Min'] as num)) s2++;
      }
    }
    return PackStats(list.length, done, s2, stars);
  }

  /// Paket kilidi: önceki pakette >= 30 tamam ya da >= 20 adet iki+ yıldız (paket boyutuyla sınırlı).
  PackLock packLock(int pi, [bool forceUnlock = false]) {
    if (forceUnlock || pi == 0) return const PackLock(false, 0);
    final st = packStats(config.packs[pi - 1]);
    final u = config.unlock;
    final cC = u['completed'] as num, cS = u['star2Count'] as num;
    final needC = cC < st.total ? cC : st.total;
    final needS = cS < st.total ? cS : st.total;
    if (st.done >= needC || st.s2 >= needS) return const PackLock(false, 0);
    final a = needC - st.done, b = needS - st.s2;
    final m = a < b ? a : b;
    return PackLock(true, m < 1 ? 1 : m);
  }

  LevelRecord recordLevel(Level lv, int stars, num time) {
    final p = _levels;
    final old = p[lv.id];
    final r = jsTruthy(old) && old is Map<String, dynamic>
        ? old
        : <String, dynamic>{'stars': 0, 'best': null, 'done': 0};
    final piece = stars > (r['stars'] as num);
    final first = r['done'] == 0;
    final rs = r['stars'] as num;
    r['stars'] = rs > stars ? rs : stars;
    final b = r['best'] as num?;
    r['best'] = b == null ? time : (b < time ? b : time);
    r['done'] = (r['done'] as num) + 1;
    p[lv.id] = r;
    checkGallery();
    return LevelRecord(piece, first, r['best'] as num?);
  }

  /// Paket seviyesi tamamlandı: yıldız + kayıt + sayaçlar + ipucu ödülü.
  CompletionInfo completeLevel(Level lv, GameStats game) {
    final s = stars(game.hints, game.errors);
    final rec = recordLevel(lv, s, game.elapsed);
    economy.onLevelCompleted();
    final bonus = economy.onUniqueLevels(economy.uniqueCompleted());
    state.data['current'] = null;
    state.save();
    return CompletionInfo(
        mode: 'level',
        time: game.elapsed,
        hints: game.hints,
        errors: game.errors,
        stars: s,
        newPiece: rec.piece,
        best: rec.best,
        hintBonus: bonus);
  }

  CompletionInfo completeDaily(String date, GameStats game) {
    final s = stars(game.hints, game.errors);
    final res = daily.complete(state.data['daily'] as Map<String, dynamic>, date, <String, dynamic>{
      'time': game.elapsed,
      'hints': game.hints,
      'errors': game.errors,
      'stars': s,
      'strip': game.strip(),
      'at': clock.now().millisecondsSinceEpoch,
    });
    final bonus = res.first ? economy.onDailyPuzzleDone() : 0;
    checkGallery();
    state.data['currentDaily'] = null;
    state.save();
    return CompletionInfo(
        mode: 'daily',
        time: game.elapsed,
        hints: game.hints,
        errors: game.errors,
        stars: s,
        first: res.first,
        record: res.record,
        shield: res.shield,
        hintBonus: bonus);
  }

  /// Biten paket panosu ve biten ay panosu galeriye girer.
  bool checkGallery() {
    final p = _levels;
    final g = _gallery;
    var added = false;
    for (final pk in config.packs) {
      final list = data.packs[pk] ?? const <Level>[];
      if (list.isNotEmpty && list.every((l) => jsTruthy(p[l.id]) && _stars(p[l.id]) >= 1) && !_hasGallery('pack', pk)) {
        g.add(<String, dynamic>{'t': 'pack', 'k': pk});
        added = true;
      }
    }
    final done = (state.data['daily'] as Map<String, dynamic>)['done'] as Map<String, dynamic>;
    final months = <String>{};
    for (final d in done.keys) {
      months.add(d.length >= 7 ? d.substring(0, 7) : d);
    }
    for (final m in months) {
      final y = int.parse(m.substring(0, 4)), mo = int.parse(m.substring(5, 7));
      final n = daysInMonth(y, mo);
      var all = true;
      for (var i = 1; i <= n; i++) {
        if (!jsTruthy(done['$m-${pad2(i)}'])) {
          all = false;
          break;
        }
      }
      if (all && !_hasGallery('month', m)) {
        g.add(<String, dynamic>{'t': 'month', 'k': m});
        added = true;
      }
    }
    if (added) state.save();
    return added;
  }
}
