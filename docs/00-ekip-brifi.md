# Mozaik Mantık — Web Önizleme Ekip Brifi

Yönetici: Claude. Herkes raporunu Claude'a verir. Teslimden önce bağımsız denetçi kontrol eder.

## Bağlayıcı belgeler
- `docs/01-kurallar.md` — oyun kuralları, zorluklar, kontroller, ipucu, günlük bulmaca, reklam, metin sözlüğü (Bölüm 10). Tek doğru kaynak.
- `docs/02-ad-ve-magaza.md` — ad ve mağaza başlıkları.

## Değişmez kurallar
- 8 dil: tr, ar, en, de, es, pt, ru, id. Arapça sağdan sola (dir="rtl"). Rakamlar her dilde Batı rakamı.
- Geliştirici adı: Demir Games Studio. Destek: nilkaren.tuncay.demir@gmail.com. Gizlilik: https://ttuncaydemirr-beep.github.io/privacy/mozaik-mantik/
- Varsayılan renk/yazı tipi yok (görsel kimlik ekibi belirler). Yazı tipleri dosyaya gömülür, Google Fonts bağlantısı yok. Renk tek başına anlam taşımaz: her bölgede desen ya da kalın sınır.
- Türkçe büyük harf için `toUpperCase()` kullanılmaz (`toLocaleUpperCase('tr')` ya da hiç büyütme).
- Rakiplerin (Meowdoku, Queens, Mozaiko) görünüşü, adı, rengi kopyalanmaz. Başlıkta "Queens" yok.
- Web önizlemede gerçek reklam yok: reklam noktaları yer tutucu (konsola log + sahte "reklam" kartı) olarak yapılır, kuralları birebir uygular.

## Klasör düzeni
```
/home/claude/mozaik/
  docs/                 belgeler
  tools/                üretici + çözücü (Node.js), testler
  data/levels.json      300 seviye
  data/daily.json       günlük havuz
  i18n/<dil>.json       8 dil sözlüğü (anahtarlar Bölüm 10 ile aynı)
  design/               görsel kimlik raporu + tokens.css + yazı tipleri
  web/                  tek dosyalık web önizleme kaynağı (index.html), build betiği
```

## Seviye biçimi (herkes buna uyar)
`data/levels.json`:
```json
{
  "version": 1,
  "levels": [
    {
      "id": "c-001",          // c=Çırak k=Kalfa u=Usta b=Başusta n=Nakkaş + sıra
      "pack": "cirak",        // cirak | kalfa | usta | basusta | nakkas
      "n": 5,                 // ızgara boyutu
      "regions": "AABBC...",  // n*n karakter, satır satır; A.. = bölge 0.. (en çok 10 bölge: A-J)
      "solution": [0,2,4,1,3],// her satırdaki taşın sütunu
      "tech": 1,              // gereken en zor teknik T1..T5
      "steps": 12             // çözücünün adım sayısı (aynı paket içinde sıralama için)
    }
  ]
}
```
`data/daily.json`: aynı biçimde `{ "version":1, "puzzles":[...] }`, id `d-0001`… Haftanın günü zorluk eğrisi kurallar Bölüm 5.1'de.

## Ortak çözücü API'si (`tools/solver.js`)
Hem Node'da (üretici, testler) hem tarayıcıda (ipucu) çalışır. Bağımlılık yok, saf JS, UMD biçimi: tarayıcıda `window.MozaikSolver`, Node'da `module.exports`.
- `parseRegions(n, regionsString)` → `number[][]` (n×n bölge indeksi)
- `findHint(n, regions, state)` → oyuncunun tahtasındaki en kolay çıkarım ya da `null`.
  - `state`: n×n dizi; 0 = boş, 1 = X (oyuncu işareti), 2 = taş.
  - Dönüş: `{ kind: "conflict" | "deduce", tech: 1..5, area: { type: "row"|"col"|"region"|"cell", index: number|[number,number] }, place: [[r,c], ...], eliminate: [[r,c], ...], explainKey: "hint_t1" | ... }`
  - Önce çakışan/yanlış taş varsa `kind:"conflict"` (tahtadaki çakışma GÖSTERİMİ yalnız kurallara göre: V1–V4; ipucu ise oyuncu isteyince çözümle karşılaştırıp yanlış taşı/X'i gösterebilir — kurallar 4.1, karar 22 Kasım). Oyuncunun X'leri çözümle çelişiyorsa (çözümdeki taş hücresine X konmuşsa) yine conflict, area = o hücre.
  - Oyuncunun koyduğu X'ler ve taşlar bilgisi olarak kullanılır (doğru oldukları varsayımıyla), çözücü kendi adaylarını bunlardan başlatır.
- `solveLogic(n, regions)` → `{ solved: bool, maxTech: 1..5|6, steps: number }`
- `countSolutions(n, regions, limit=2)` → number
- `checkBoard(n, regions, state)` → `{ conflicts: [[r,c],...], complete: bool }` (V1–V4)

## i18n biçimi
`i18n/tr.json`: `{ "anahtar": "metin", ... }` düz nesne. `{n}`, `{time}` yer tutucuları korunur.
