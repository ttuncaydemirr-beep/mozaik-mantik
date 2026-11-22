// İpucu ekonomisi ve reklam sayaçları (web/src/economy.js birebir). Tüm rakamlar MozaikConfig'ten.
// Zaman: `now` = epoch ms, `today` = yerel gün "YYYY-MM-DD" (dışarıdan verilir).
import 'config.dart';
import 'daily.dart';
import 'game.dart';
import 'js_compat.dart';
import 'save_state.dart';

class InterstitialDecision {
  final bool show;

  /// ok | disabled | adfree | first-levels | interval | offline | daily-cap | rewarded-recent | min-gap
  final String reason;
  const InterstitialDecision(this.show, this.reason);
  Map<String, Object?> toJson() => {'show': show, 'reason': reason};
}

class RewardResult {
  /// hint | streak | gift | unavailable
  final String kind;
  final num add;

  /// Yalnız streak türünde dolu.
  final bool? rescued;
  const RewardResult(this.kind, this.add, [this.rescued]);
  Map<String, Object?> toJson() => {'kind': kind, 'add': add, if (kind == 'streak') 'rescued': rescued};
}

class Economy implements HintWallet {
  final SaveState state;
  final MozaikConfig config;
  final Daily daily;
  Economy(this.state, this.config, this.daily);

  Map<String, dynamic> get _d => state.data;
  Map<String, dynamic> get _h => _d['hints'] as Map<String, dynamic>;
  Map<String, dynamic> get _a => _d['ads'] as Map<String, dynamic>;
  Map<String, dynamic> get _ch => config.hints;
  Map<String, dynamic> get _ca => config.ads;
  num _num(Object? x) => x as num;

  bool adFree() => jsTruthy(state.purchase()['adFree']);
  num balance() => _num(_h['balance']);
  @override
  bool canAfford(num n) => balance() >= n;
  @override
  bool spend(num n) {
    if (balance() < n) return false;
    _h['balance'] = balance() - n;
    state.save();
    return true;
  }

  /// Ücretsiz kaynaklar genel tavanı aşamaz. Dönen: gerçekten eklenen miktar.
  num grant(num n) {
    final cap = _num(_ch['cap']), b = balance();
    var add = cap - b;
    if (n < add) add = n;
    if (add < 0) add = 0;
    _h['balance'] = b + add;
    state.save();
    return add;
  }

  /// Günün başında sayaçları sıfırla.
  void rollDay(String today) {
    final a = _a;
    if (a['day'] != today) {
      a['day'] = today;
      a['rewardedHints'] = 0;
      a['rewardedStreak'] = 0;
      a['gifts'] = 0;
      a['interstitialToday'] = 0;
      state.save();
    }
  }

  /// Günlük ilk giriş: bakiye ücretsiz tavanın altındaysa tamamlanır.
  num dailyLogin(String today) {
    final h = _h;
    num add = 0;
    rollDay(today);
    if (h['lastLoginDay'] == today) return 0;
    h['lastLoginDay'] = today;
    final amt = _num(adFree() ? _ch['dailyLoginAdFree'] : _ch['dailyLogin']);
    final freeCap = _num(_ch['freeCap']);
    if (_num(h['balance']) < freeCap) {
      add = amt < freeCap - _num(h['balance']) ? amt : freeCap - _num(h['balance']);
      h['balance'] = _num(h['balance']) + add;
    }
    state.save();
    return add;
  }

  num onDailyPuzzleDone() => grant(_num(_ch['dailyPuzzle']));

  /// Her N farklı seviye tamamlamada +1.
  num onUniqueLevels(num uniqueCount) {
    final tiers = (uniqueCount / _num(_ch['everyLevels'])).floor();
    final h = _h;
    num add = 0;
    if (tiers > _num(h['levelTiers'])) {
      add = grant((tiers - _num(h['levelTiers'])) * _num(_ch['everyLevelsAmount']));
      h['levelTiers'] = tiers;
      state.save();
    }
    return add;
  }

  // --- Ödüllü reklam
  num rewardedHintsLeft(String today) {
    rollDay(today);
    final v = _num(_ca['rewardedHintsPerDay']) - _num(_a['rewardedHints']);
    return v < 0 ? 0 : v;
  }

  bool canWatchRewardedHint(String today) => rewardedHintsLeft(today) > 0;

  num grantRewardedHints(int now) {
    final a = _a;
    a['rewardedHints'] = _num(a['rewardedHints']) + 1;
    a['lastRewardedAt'] = now;
    final add = grant(_num(_ch['rewardedAmount']));
    state.save();
    return add;
  }

  bool canWatchRewardedStreak(String today) {
    rollDay(today);
    return _num(_a['rewardedStreak']) < _num(_ca['rewardedStreakPerDay']);
  }

  void markRewardedStreak(int now) {
    _a['rewardedStreak'] = _num(_a['rewardedStreak']) + 1;
    _a['lastRewardedAt'] = now;
    state.save();
  }

  bool giftAvailable(String today) {
    rollDay(today);
    return _num(_a['gifts']) < _num(_ch['giftPerDay']);
  }

  num grantGift() {
    _a['gifts'] = _num(_a['gifts']) + 1;
    return grant(_num(_ch['giftAmount']));
  }

  // --- Geçiş reklamı
  /// Aralık sayacı her tamamlamada (tekrar dahil) ilerler.
  num onLevelCompleted() {
    _a['completions'] = _num(_a['completions']) + 1;
    state.save();
    return _num(_a['completions']);
  }

  /// En az 1 yıldızlı (benzersiz) seviye sayısı.
  int uniqueCompleted() {
    final p = (_d['progress'] as Map<String, dynamic>)['levels'] as Map<String, dynamic>;
    var n = 0;
    for (final r in p.values) {
      if (jsTruthy(r) && r is Map && _num(r['stars']) >= 1) n++;
    }
    return n;
  }

  /// "Sonraki"ye basıldığında çağrılır. [online] null = bilinmiyor (yalnız false çevrimdışı sayılır).
  InterstitialDecision interstitialDecision(int now, bool? online, String today) {
    final ca = _ca, a = _a;
    final k = _num(a['completions']);
    rollDay(today);
    if (!jsTruthy(ca['interstitialEnabled'])) return const InterstitialDecision(false, 'disabled');
    if (adFree()) return const InterstitialDecision(false, 'adfree');
    if (uniqueCompleted() <= _num(ca['firstFreeLevels'])) return const InterstitialDecision(false, 'first-levels');
    if (k < _num(a['nextAdAt'])) return const InterstitialDecision(false, 'interval');
    if (jsTruthy(ca['requireOnline']) && online == false) return const InterstitialDecision(false, 'offline');
    final cap = ca['dailyCap'];
    if (cap != null && _num(a['interstitialToday']) >= _num(cap)) {
      return const InterstitialDecision(false, 'daily-cap');
    }
    final lr = _num(a['lastRewardedAt']);
    if (jsTruthy(lr) && now - lr < _num(ca['rewardedResetsCounterSec']) * 1000) {
      a['nextAdAt'] = k + _num(ca['everyLevels']);
      state.save();
      return const InterstitialDecision(false, 'rewarded-recent');
    }
    final li = _num(a['lastInterstitialAt']);
    if (jsTruthy(li) && now - li < _num(ca['minGapSec']) * 1000) return const InterstitialDecision(false, 'min-gap');
    return const InterstitialDecision(true, 'ok');
  }

  void markInterstitialShown(int now) {
    final a = _a;
    a['lastInterstitialAt'] = now;
    a['interstitialToday'] = _num(a['interstitialToday']) + 1;
    a['nextAdAt'] = _num(a['completions']) + _num(_ca['everyLevels']);
    state.save();
  }

  /// Ödüllü reklam sonucu (başarı ya da yükleme hatası). purpose: hint | streak
  RewardResult finishRewarded(String purpose, bool ok, int now, String today) {
    if (ok) {
      if (purpose == 'hint') return RewardResult('hint', grantRewardedHints(now));
      markRewardedStreak(now);
      final okr = daily.rescue(_d['daily'] as Map<String, dynamic>, today);
      state.save();
      return RewardResult('streak', 0, okr);
    }
    if (purpose == 'hint' && giftAvailable(today)) return RewardResult('gift', grantGift());
    return const RewardResult('unavailable', 0);
  }

  bool canWatch(String purpose, String today) =>
      purpose == 'hint' ? canWatchRewardedHint(today) : canWatchRewardedStreak(today);

  /// Reklamları kaldır (satın alma doğrulandıktan sonra). Bonus tavana bakılmaksızın, tek sefer.
  num removeAds(String today) {
    final p = state.purchase();
    num bonus = 0;
    p['adFree'] = true;
    if (!jsTruthy(p['bonusGranted'])) {
      p['bonusGranted'] = true;
      bonus = _num(_ch['removeAdsBonus']);
      _h['balance'] = balance() + bonus;
    }
    state.setPurchase(p);
    state.save();
    return bonus;
  }

  bool restore() => jsTruthy(state.purchase()['adFree']);
}
