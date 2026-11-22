# mozaik_core

Mozaik Mantık'ın tüm oyun mantığı, saf Dart (Flutter bağımlılığı yok). Web önizlemedeki
`tools/solver.js` ve `web/src/*.js` davranışının birebir karşılığıdır; altın testler bunu doğrular.

Uygulama: `mozaik_core: { path: ../packages/mozaik_core }`

## Modüller

| Dosya | Karşılık | İçerik |
|---|---|---|
| `solver.dart` | tools/solver.js | `parseRegions`, `findHint`, `solveLogic`, `countSolutions`, `checkBoard`, `canonicalKey` |
| `game.dart` | web/src/logic.js | `Game` (hücre durumları 0/1/2/3, tap/longPress/drag, geri/ileri al, otomatik X, ipucu akışı 1/0/1, serialize/restore), `stars` |
| `economy.dart` | web/src/economy.js | `Economy` (bakiye, tavan, günlük giriş, ödüllü/geçiş reklam kararları, reklamsız mod) |
| `daily.dart` | web/src/daily.js | `Daily` (gün#, dow kuyrukları, seri, koruma, kurtarma, ay panosu) |
| `share.dart` | web/src/share.js | `Share.build` (RTL'de satır başı U+200E) |
| `progress.dart` | web/src/progress.js | `Progress` (seviye kaydı, paket kilidi, ödüller, galeri) |
| `save_state.dart` | web/src/state.js | `SaveState`, `KeyValueStore`, `coerce`, `migrate` |
| `config.dart` | web/src/config.js | `MozaikConfig` (Remote Config değerleri `override` ile derin birleşir) |
| `levels.dart` | web/src/data.js | `Level`, `LevelData` (data/*.json ayrıştırma) |
| `util.dart` | web/src/util.js | tarih yardımcıları, `Clock`, `localDateIso`, `msToMidnight`, `fmtTime` |

Saat dışarıdan verilir (`Clock`, `now` ms, `today` "YYYY-MM-DD"); depolama `KeyValueStore` ile soyutlanır
(uygulama `shared_preferences` ile bağlar: `getString` eşzamanlı, `setString`/`remove` ateşle-unut).
Rastgelelik paket içinde kullanılmaz.

## Kayıt biçimi (web ile uyumlu)

Anahtarlar ve şema web ile aynıdır; web'in yazdığı JSON Dart'ta, Dart'ın yazdığı web'de okunur.

- `mozaik.save.v1`: `{ v, lang, settings{theme,autoX,showErrors,quickStone,patterns,sound,haptic},
  flags{tutorialDone,hintIntroShown,removeAdsOfferDay}, progress{levels{id:{stars,best,done}}},
  hints{balance,lastLoginDay,levelTiers}, ads{day,rewardedHints,rewardedStreak,gifts,interstitialToday,
  lastInterstitialAt,lastRewardedAt,completions,nextAdAt}, daily{done{YYYY-MM-DD:{time,hints,errors,stars,strip,at,streak,dayNo}},
  streak,lastDay,shields,broken,lastRescueDay}, gallery[{t,k}], current, currentDaily }`
  - `v` = `storeVersion` (şu an 1). Yükleme her alanı varsayılana göre tür denetiminden geçirir (yanlış tür -> varsayılan),
    bilinmeyen alanları korur; okunamayan kayıt -> varsayılanlar.
  - `current` / `currentDaily`: `{ key: "level:<id>" | "daily:<tarih>", g: Game.serialize() }`
  - `Game.serialize()`: `{ c: "0123..." (n² hane), l: [{i,h,x}], u: [{c,l}], r: [{c,l}], e: ms, h: ipucu, x: hata }`
- `mozaik.purchase.v1`: `{ adFree, bonusGranted }` (ilerleme sıfırlanınca silinmez)

Not: Dart `jsonEncode` tam sayı değerli ondalıkları `5.0` biçiminde yazabilir; JSON olarak eşdeğerdir.

## Testler

`dart test` — altın fikstürler `test/golden/` (üretici: `node tools/golden.js`, depo kökünden).
CI (`.github/workflows/core.yml`) fikstürlerin JS kaynağıyla güncel olduğunu da denetler.
