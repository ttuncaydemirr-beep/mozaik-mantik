# Mozaik Mantık — Görsel Kimlik Önerisi (v1)

Hazırlayan: görsel tasarım araştırmacısı, Demir Games Studio. Tüm kontrast ve renk körlüğü sayıları `design/_tools/gen.py` ile hesaplandı (WCAG 2.x göreli parlaklık; renk körlüğü: Machado 2009 matrisleri, şiddet 1.0, CIEDE2000). Hiçbir değer varsayılan/standart palet veya hazır tema değildir; rakip oyunların (Meowdoku, Queens, Mozaiko) renk ve görünüşü referans alınmamıştır. Tarihsel dayanak: İznik çinisi beyaz sır üzerine kobalt, firuze, adaçayı/zümrüt yeşili ve kabarık "Ermeni bolu" domates kırmızısıyla özdeşleşir (Wikipedia "Iznik pottery", T.C. Kültür ve Turizm Bakanlığı "Characteristics of İznik Tiles").

## 0. Ortak kararlar (iki yön için de geçerli)

- **Yazı tipleri (gömülü, OFL):** Onest (Latin + Kiril; ğĞ ıİ şŞ, äöüß, ₺ dahil), El Messiri (Latin + Kiril + Arapça; çini/hat havalı, yalnız başlıklar), Noto Kufi Arabic (Arapça arayüz; geometrik, kufi/çini ruhu). Hepsi değişken (variable) yazı tipi; dosyalar `design/fonts/`. Hiçbiri önceki projelerde kullanılmadı. Google Fonts bağlantısı yok; `@font-face` tokens dosyasında.
- **Glif denetimi (fontTools):** ğĞıİşŞçÇöÖüÜäÄß: Onest, El Messiri, Noto Kufi tamam. Arapça 28 harf + ء أ إ آ ة ى: El Messiri ve Noto Kufi tamam (Onest'te yok, yedek zincirle Kufi'ye düşer). Kiril А–я, ё: Onest ve El Messiri tamam (Noto Kufi'de yok, ama Arapça metinde gerekmez). **Eksik:** ₺ işareti El Messiri'de ve Kufi'de yok, Onest'te var; El Messiri yalnız başlıkta kullanıldığı ve fiyat metni `--font-ui` ile yazıldığı için sorun çıkmaz. ★ ve ✕ hiçbirinde yok: yıldız ve X **SVG ile çizilir**, metin karakteri kullanılmaz.
- **Bölge sınırı kuralı (kurallar 9.1):** bölgeler arası **3 dp** `--region-border`, bölge içi **1 dp** `--grid-line`; ızgaranın dış çerçevesi 3 dp `--text`. Sınır, kendisine komşu her bölge renginde en az 3:1 olacak biçimde seçildi (tablo 3). Sınır hücrenin içine değil derze çizilir; dokunma alanı derzin ortasına kadar uzanır.
- **Desen modu:** 10 desen, 12×12 döşeme, yarı saydam vuruş (`--p0..--p9`, çizgi kalınlığı 1.1–1.8). Desen yalnız `background-image`, taş ve X desenin üstünde kendi dolgusuyla çizilir. Desen eşleşmesi sabit: r0 nokta, r1 yatay çizgi, r2 dikey çizgi, r3 çapraz /, r4 çapraz \, r5 ızgara, r6 dalga, r7 dama, r8 artı, r9 baklava. Zikzak **yalnız çakışmaya ayrılmıştır** (`--p-conflict`, beyaz zikzak, kurallar 9.1).
- **Taş (çini parçası), CSS/SVG:** hücrenin %78'i boyunda yuvarlak köşeli kare (`border-radius: 22%`), dolgu `--stone`, 1.5 dp iç çerçeve `--stone-ink` (%35 saydam), ortada 5 köşeli stilize "lale/yıldız" rozeti: `<svg viewBox="0 0 24 24"><path d="M12 3 L14 9 L21 9 L15.5 13 L17.5 20 L12 15.8 L6.5 20 L8.5 13 L3 9 L10 9 Z" fill="stone-ink"/></svg>` (çini lalesinden esinli, taç/kedi değil), altında 2 dp `--shadow` ile hafif kabarıklık (sırlı çini hissi). Biçim (yıldızlı kare) renkten bağımsız tanınır.
- **X işareti:** hücrenin %46'sında iki çapraz çizgi, 2.4 dp, uçlar yuvarlak, `--mark`; çizgilerin kesiştiği yerde 1 dp "sır çatlağı" kıvrımı (isteğe bağlı). Taş değil çarpı olduğu biçimden anlaşılır, rengi taşla aynı aileden.
- **Çakışma gösterimi:** `--danger` 3 dp çerçeve + hücre üstüne `--p-conflict` zikzak + taş yerinde titreme. Üç ayrı ipucu (renk, desen, çerçeve).
- **Izgara görünümü:** "çini panosu": ızgara bir `--surface` levha üzerinde, 3 dp `--text` dış çerçeve, `--radius` köşe, `--shadow` gölge; hücre arası boşluk yok, derz çizgileriyle ayrılır (kurallar 9.2: dokunma alanı derz ortasına uzanır).
- **Animasyon süreleri (reduce-motion açıkken tümü 0.35× ve ölçek/sarsıntı kapalı, yalnız solma):** taş yerleştirme 140 ms (ölçek .6→1, `cubic-bezier(.2,.8,.2,1)`), X 100 ms (çizgiler sırayla), çakışma 260 ms (3 salınım, ±2 dp), seviye bitişi 700 ms (çini dalgası: hücreler köşegen sırayla 20 ms aralıkla parlar), tema geçişi 200 ms, ipucu vurgusu 600 ms nabız ×2. Süreler tokenlarda `--dur-*`.

---

## Yön A — Lale Bahçesi

**Ruh hali:** Sıcak, el yapımı bir çini atölyesi: krem sır zemin, lacivert mürekkep, pastel sırlı bölgeler. Bölgeler açık ve yumuşak tonlardadır, taş ve X lacivert (koyu) çini olarak üstlerinde net durur. Başlıklarda hat kıvrımlı El Messiri, arayüzde sakin Onest: sakin, "rahatlatıcı bulmaca" hissi. Koyu temada bölgeler derinleşir (gece atölyesi), taşlar krem rengine döner, vurgu altın olur.

### 1. Palet

| Token | Açık | Koyu |
|---|---|---|
| --bg zemin | `#F6EEDD` | `#121A2E` |
| --surface yüzey | `#FFFAEF` | `#1B2540` |
| --surface-2 | `#EADFC6` | `#26335C` |
| --text metin | `#1D2842` | `#F3EBD8` |
| --text-2 ikincil | `#4F5A73` | `#B6BED2` |
| --accent vurgu | `#1C4A9E` | `#F0B24A` |
| --accent-ink | `#FFFFFF` | `#1A1405` |
| --success başarı | `#17703F` | `#63CF92` |
| --danger çakışma | `#B3261E` | `#FF8F80` |
| --grid-line | `#6E7791` | `#7C86A6` |
| --region-border | `#1D2842` | `#F3EBD8` |
| --stone taş | `#1D2842` | `#F5EBD3` |
| --stone-ink | `#F6EEDD` | `#1B2340` |
| --mark X | `#1D2842` | `#F5EBD3` |

**10 bölge rengi ve deseni**

| # | Ad | Açık | Koyu | Desen |
|---|---|---|---|---|
| r0 | Kobalt | `#7F9FE8` | `#2B52A8` | nokta |
| r1 | Turkuaz | `#6FD0C8` | `#117F82` | yatay çizgi |
| r2 | Mercan | `#F59C84` | `#B4452E` | dikey çizgi |
| r3 | Zümrüt | `#86CC95` | `#2C7A48` | çapraz / |
| r4 | Altın | `#F3DA7C` | `#9A7712` | çapraz \ |
| r5 | Mor/Patlıcan | `#D6B2E8` | `#76459A` | ızgara |
| r6 | Karanfil pembe | `#F6B3C9` | `#A63D68` | dalga |
| r7 | Zeytin | `#B9C45E` | `#4A5A12` | dama |
| r8 | Gök | `#C3DDF3` | `#3C6E9C` | artı |
| r9 | Toprak/Tuğla | `#E6CBAF` | `#8A5E40` | baklava |

Yazı tipi: UI = Onest + Noto Kufi Arabic; başlık = El Messiri (tüm diller; Kiril ve Arapça dahil), yedek Onest/Kufi. Gerekçe: Hat dokunuşlu başlık çini/Osmanlı yazı kültürüne gönderme yapar, tek dosyada Latin+Kiril+Arapça kapsar; gövde Onest okunaklı ve Türkçe ı/İ, ğ, ş şekilleri net. Köşe yarıçapı 14px.

### 2. Kontrast tablosu (WCAG, Python ile hesaplandı)

**Açık tema, metin ve bileşenler**

| Çift | Oran | Eşik |
|---|---|---|
| metin / zemin | 12.68 ✓ | 4.5 |
| metin / yüzey | 14.06 ✓ | 4.5 |
| metin / yüzey-2 | 11.06 ✓ | 4.5 |
| ikincil metin / zemin | 5.98 ✓ | 4.5 |
| ikincil metin / yüzey | 6.63 ✓ | 4.5 |
| vurgu mürekkebi / vurgu | 8.32 ✓ | 4.5 |
| vurgu / zemin | 7.21 ✓ | 3 |
| başarı / zemin | 5.31 ✓ | 3 |
| çakışma / zemin | 5.66 ✓ | 3 |
| taş motifi / taş | 12.68 ✓ | 3 |

**Bölge renkleri üzerinde** (taş, X, bölge sınırı; eşik 3:1)

| Bölge | taş | X | sınır |
|---|---|---|---|
| r0 Kobalt | 5.60 ✓ | 5.60 ✓ | 5.60 ✓ |
| r1 Turkuaz | 8.04 ✓ | 8.04 ✓ | 8.04 ✓ |
| r2 Mercan | 6.95 ✓ | 6.95 ✓ | 6.95 ✓ |
| r3 Zümrüt | 7.73 ✓ | 7.73 ✓ | 7.73 ✓ |
| r4 Altın | 10.55 ✓ | 10.55 ✓ | 10.55 ✓ |
| r5 Mor/Patlıcan | 7.94 ✓ | 7.94 ✓ | 7.94 ✓ |
| r6 Karanfil pembe | 8.51 ✓ | 8.51 ✓ | 8.51 ✓ |
| r7 Zeytin | 7.75 ✓ | 7.75 ✓ | 7.75 ✓ |
| r8 Gök | 10.43 ✓ | 10.43 ✓ | 10.43 ✓ |
| r9 Toprak/Tuğla | 9.43 ✓ | 9.43 ✓ | 9.43 ✓ |

En düşük bölge üstü oran: **5.60:1**. Hiçbir çift eşiğin altında değil.

**Koyu tema, metin ve bileşenler**

| Çift | Oran | Eşik |
|---|---|---|
| metin / zemin | 14.58 ✓ | 4.5 |
| metin / yüzey | 12.77 ✓ | 4.5 |
| metin / yüzey-2 | 10.34 ✓ | 4.5 |
| ikincil metin / zemin | 9.30 ✓ | 4.5 |
| ikincil metin / yüzey | 8.15 ✓ | 4.5 |
| vurgu mürekkebi / vurgu | 9.75 ✓ | 4.5 |
| vurgu / zemin | 9.21 ✓ | 3 |
| başarı / zemin | 8.96 ✓ | 3 |
| çakışma / zemin | 7.83 ✓ | 3 |
| taş motifi / taş | 13.01 ✓ | 3 |

**Bölge renkleri üzerinde** (taş, X, bölge sınırı; eşik 3:1)

| Bölge | taş | X | sınır |
|---|---|---|---|
| r0 Kobalt | 6.16 ✓ | 6.16 ✓ | 6.15 ✓ |
| r1 Turkuaz | 4.04 ✓ | 4.04 ✓ | 4.04 ✓ |
| r2 Mercan | 4.62 ✓ | 4.62 ✓ | 4.62 ✓ |
| r3 Zümrüt | 4.44 ✓ | 4.44 ✓ | 4.44 ✓ |
| r4 Altın | 3.53 ✓ | 3.53 ✓ | 3.52 ✓ |
| r5 Mor/Patlıcan | 5.73 ✓ | 5.73 ✓ | 5.73 ✓ |
| r6 Karanfil pembe | 5.08 ✓ | 5.08 ✓ | 5.07 ✓ |
| r7 Zeytin | 6.41 ✓ | 6.41 ✓ | 6.40 ✓ |
| r8 Gök | 4.54 ✓ | 4.54 ✓ | 4.53 ✓ |
| r9 Toprak/Tuğla | 4.71 ✓ | 4.71 ✓ | 4.71 ✓ |

En düşük bölge üstü oran: **3.52:1**. Hiçbir çift eşiğin altında değil.

### 3. Renk körlüğü değerlendirmesi (45 bölge çifti, CIEDE2000 ΔE; ΔE < 10 = zor ayırt, < 5 = pratikte aynı)

| Tema | Normal en düşük ΔE | Protanopi | Döteranopi | Tritanopi |
|---|---|---|---|---|
| Açık | 11.9 (0 çift &lt;10, 0 çift &lt;5) | 5.4 (6 çift &lt;10, 0 çift &lt;5) | 5.6 (9 çift &lt;10, 0 çift &lt;5) | 5.5 (7 çift &lt;10, 0 çift &lt;5) |
| Koyu | 10.0 (0 çift &lt;10, 0 çift &lt;5) | 2.3 (8 çift &lt;10, 2 çift &lt;5) | 4.1 (8 çift &lt;10, 2 çift &lt;5) | 5.3 (7 çift &lt;10, 0 çift &lt;5) |

Yorum: renkler tek başına her çifti güvenceye almıyor; renk körlüğü simülasyonlarında 6–9 çift ΔE 10 altına iniyor (kırmızı-yeşil ailesi: mercan/zümrüt/zeytin/toprak; mavi-mor ailesi: kobalt/mor). Bu çiftlerde **desen modu zorunludur** (kurallar 9.1) ve sistem erişilebilirlik ayarı varsa otomatik açılır. 10 desen birbirinden biçim olarak ayrıdır (nokta, çizgi, çapraz, ızgara, dalga, dama, artı, baklava), her bölge çifti desen yüzünden de ayırt edilir. Kalın bölge sınırı desen kapalıyken bile bölgeleri ayırır.

---

## Yön B — Kobalt Sır

**Ruh hali:** Taze fırınlanmış, doygun sırlı çini panosu: serin buz-beyaz zemin, derin kobalt/firuze/mercan bölgeler, taşlar ve X **beyaz sır**. Bölgeler arasındaki derz beyazdır (gerçek çini derzi gibi). Yazı tipi tek aile (Onest + Kufi), düz ve modern: net, "usta bulmacacı" hissi. Koyu temada bölgeler bir kademe derinleşir, taşlar krem-beyaz kalır.

### 1. Palet

| Token | Açık | Koyu |
|---|---|---|
| --bg zemin | `#EEF3F7` | `#0A1424` |
| --surface yüzey | `#FFFFFF` | `#122038` |
| --surface-2 | `#DCE6EE` | `#1B2E50` |
| --text metin | `#0C1B36` | `#EAF1F7` |
| --text-2 ikincil | `#46556E` | `#A9B8CC` |
| --accent vurgu | `#0B6E75` | `#4FD1C5` |
| --accent-ink | `#FFFFFF` | `#04201D` |
| --success başarı | `#1A7A45` | `#5FD18E` |
| --danger çakışma | `#C0201A` | `#FF8576` |
| --grid-line | `rgba(255,255,255,.45)` | `rgba(234,241,247,.32)` |
| --region-border | `#F4F7FA` | `#EAF1F7` |
| --stone taş | `#FFFFFF` | `#F4F7FA` |
| --stone-ink | `#0C1B36` | `#0A1424` |
| --mark X | `#FFFFFF` | `#F4F7FA` |

**10 bölge rengi ve deseni**

| # | Ad | Açık | Koyu | Desen |
|---|---|---|---|---|
| r0 | Kobalt | `#2457B3` | `#1C4590` | nokta |
| r1 | Turkuaz | `#0E7C86` | `#0B6670` | yatay çizgi |
| r2 | Mercan | `#C2412D` | `#A33322` | dikey çizgi |
| r3 | Zümrüt | `#1F7F4C` | `#176A3E` | çapraz / |
| r4 | Altın | `#A87500` | `#8A6000` | çapraz \ |
| r5 | Mor/Patlıcan | `#6D3F98` | `#573079` | ızgara |
| r6 | Karanfil pembe | `#B03470` | `#8E2A5A` | dalga |
| r7 | Zeytin | `#556008` | `#3F4B00` | dama |
| r8 | Gök | `#2F6FA8` | `#245A8C` | artı |
| r9 | Toprak/Tuğla | `#8A4E2B` | `#7A4A28` | baklava |

Yazı tipi: UI = Onest + Noto Kufi Arabic; başlık = Onest 700–800 (Arapçada Kufi 700). Gerekçe: Tek geometrik aile küçük ızgara rakamlarında ve düğmelerde en okunaklı olandır; Kufi Arapça, çini panolardaki geometrik kufi kitabelerini andırır; dosya sayısı ve yükleme maliyeti en düşük. Köşe yarıçapı 10px.

### 2. Kontrast tablosu (WCAG, Python ile hesaplandı)

**Açık tema, metin ve bileşenler**

| Çift | Oran | Eşik |
|---|---|---|
| metin / zemin | 15.34 ✓ | 4.5 |
| metin / yüzey | 17.13 ✓ | 4.5 |
| metin / yüzey-2 | 13.54 ✓ | 4.5 |
| ikincil metin / zemin | 6.75 ✓ | 4.5 |
| ikincil metin / yüzey | 7.54 ✓ | 4.5 |
| vurgu mürekkebi / vurgu | 6.00 ✓ | 4.5 |
| vurgu / zemin | 5.37 ✓ | 3 |
| başarı / zemin | 4.80 ✓ | 3 |
| çakışma / zemin | 5.43 ✓ | 3 |
| taş motifi / taş | 17.13 ✓ | 3 |

**Bölge renkleri üzerinde** (taş, X, bölge sınırı; eşik 3:1)

| Bölge | taş | X | sınır |
|---|---|---|---|
| r0 Kobalt | 6.80 ✓ | 6.80 ✓ | 6.32 ✓ |
| r1 Turkuaz | 4.95 ✓ | 4.95 ✓ | 4.60 ✓ |
| r2 Mercan | 5.14 ✓ | 5.14 ✓ | 4.78 ✓ |
| r3 Zümrüt | 5.00 ✓ | 5.00 ✓ | 4.65 ✓ |
| r4 Altın | 4.03 ✓ | 4.03 ✓ | 3.75 ✓ |
| r5 Mor/Patlıcan | 7.46 ✓ | 7.46 ✓ | 6.94 ✓ |
| r6 Karanfil pembe | 5.88 ✓ | 5.88 ✓ | 5.47 ✓ |
| r7 Zeytin | 6.86 ✓ | 6.86 ✓ | 6.38 ✓ |
| r8 Gök | 5.30 ✓ | 5.30 ✓ | 4.93 ✓ |
| r9 Toprak/Tuğla | 6.55 ✓ | 6.55 ✓ | 6.09 ✓ |

En düşük bölge üstü oran: **3.75:1**. Hiçbir çift eşiğin altında değil.

**Koyu tema, metin ve bileşenler**

| Çift | Oran | Eşik |
|---|---|---|
| metin / zemin | 16.18 ✓ | 4.5 |
| metin / yüzey | 14.29 ✓ | 4.5 |
| metin / yüzey-2 | 11.86 ✓ | 4.5 |
| ikincil metin / zemin | 9.15 ✓ | 4.5 |
| ikincil metin / yüzey | 8.08 ✓ | 4.5 |
| vurgu mürekkebi / vurgu | 9.16 ✓ | 4.5 |
| vurgu / zemin | 9.89 ✓ | 3 |
| başarı / zemin | 9.66 ✓ | 3 |
| çakışma / zemin | 7.79 ✓ | 3 |
| taş motifi / taş | 17.16 ✓ | 3 |

**Bölge renkleri üzerinde** (taş, X, bölge sınırı; eşik 3:1)

| Bölge | taş | X | sınır |
|---|---|---|---|
| r0 Kobalt | 8.48 ✓ | 8.48 ✓ | 8.00 ✓ |
| r1 Turkuaz | 6.20 ✓ | 6.20 ✓ | 5.85 ✓ |
| r2 Mercan | 6.40 ✓ | 6.40 ✓ | 6.03 ✓ |
| r3 Zümrüt | 6.17 ✓ | 6.17 ✓ | 5.82 ✓ |
| r4 Altın | 5.20 ✓ | 5.20 ✓ | 4.91 ✓ |
| r5 Mor/Patlıcan | 9.28 ✓ | 9.28 ✓ | 8.76 ✓ |
| r6 Karanfil pembe | 7.43 ✓ | 7.43 ✓ | 7.01 ✓ |
| r7 Zeytin | 8.81 ✓ | 8.81 ✓ | 8.31 ✓ |
| r8 Gök | 6.70 ✓ | 6.70 ✓ | 6.32 ✓ |
| r9 Toprak/Tuğla | 6.88 ✓ | 6.88 ✓ | 6.49 ✓ |

En düşük bölge üstü oran: **4.91:1**. Hiçbir çift eşiğin altında değil.

### 3. Renk körlüğü değerlendirmesi (45 bölge çifti, CIEDE2000 ΔE; ΔE < 10 = zor ayırt, < 5 = pratikte aynı)

| Tema | Normal en düşük ΔE | Protanopi | Döteranopi | Tritanopi |
|---|---|---|---|---|
| Açık | 9.1 (1 çift &lt;10, 0 çift &lt;5) | 2.4 (6 çift &lt;10, 1 çift &lt;5) | 3.6 (8 çift &lt;10, 2 çift &lt;5) | 3.9 (6 çift &lt;10, 2 çift &lt;5) |
| Koyu | 7.8 (1 çift &lt;10, 0 çift &lt;5) | 1.6 (9 çift &lt;10, 2 çift &lt;5) | 3.7 (9 çift &lt;10, 2 çift &lt;5) | 3.5 (8 çift &lt;10, 2 çift &lt;5) |

Yorum: renkler tek başına her çifti güvenceye almıyor; renk körlüğü simülasyonlarında 6–9 çift ΔE 10 altına iniyor (kırmızı-yeşil ailesi: mercan/zümrüt/zeytin/toprak; mavi-mor ailesi: kobalt/mor). Bu çiftlerde **desen modu zorunludur** (kurallar 9.1) ve sistem erişilebilirlik ayarı varsa otomatik açılır. 10 desen birbirinden biçim olarak ayrıdır (nokta, çizgi, çapraz, ızgara, dalga, dama, artı, baklava), her bölge çifti desen yüzünden de ayırt edilir. Kalın bölge sınırı desen kapalıyken bile bölgeleri ayırır.

---

## Karşılaştırma ve tavsiye

| Ölçüt | A Lale Bahçesi | B Kobalt Sır |
|---|---|---|
| Duygu | sıcak, rahat, el yapımı | net, doygun, parlak |
| Taş/X okunurluğu | koyu taş, pastel zemin (min 3.52–5.60 : 1) | beyaz taş, doygun zemin (min 3.75–4.91 : 1) |
| Renk körlüğü (normal ΔE en düşük) | 11.9 (açık) | 9.1 (açık) |
| Çini kimliği | krem sır + pastel: sade, atölye | kobalt-beyaz derz: İznik pano gibi |
| Yazı tipi dosyaları | 3 (başlıkta El Messiri) | 2 etkin (Onest, Kufi) |
| Mağaza ekran görüntüsünde | yumuşak, kalabalıkta sönük kalabilir | canlı, ikon ve banner ile uyumlu |

**Tavsiye: A (Lale Bahçesi).** Gerekçe: (1) pastel bölgeler normal görüşte en iyi ayrışıyor (en düşük ΔE 11.9, B'de 9.1), yani renk körü olmayan oyuncuların çoğu için desen gerekmiyor; (2) koyu taş ve X hem açık hem koyu temada en tutarlı kontrastı veriyor; (3) "Çini Atölyesi" koleksiyonuyla (krem sır, altın çerçeve, yıldızlı sırlama) doğal örtüşüyor, altın vurgu ★★★ parçalarla bağdaşıyor; (4) uzun oturumlarda göz yormayan, "rahatlatıcı bulmaca" konumuna uyan ton. B daha canlı ve mağazada dikkat çekici, ama doygun bölgeler uzun oyunda yorucu olabilir ve beyaz derz koyu bölgeleri birbirinden daha az ayırır. B ikinci tercih, kolay geçiş için aynı token adlarını kullanır (yalnız dosya değişir).


## Dosyalar
- `design/tokens-a.css`, `design/tokens-b.css`: `:root` (açık) ve `[data-theme="dark"]` değişkenleri, `--p0..--p9`, `--p-conflict`, `@font-face`.
- `design/patterns.svg`: 10 desenin önizleme levhası.
- `design/fonts/`: ElMessiri-VF.ttf (138.664 B), Onest-VF.ttf (193.056 B), NotoKufiArabic-VF.ttf (434.204 B) + OFL lisansları (3 dosya, ≈13 KB). Toplam yazı tipi 766 KB (klasör toplamı 779.080 B, lisanslar dahil) (TTF, alt küme yapılmadı; woff2 aracı kurulamadığı için TTF). Flutter'a geçişte aynı TTF'ler kullanılır.
- Hesaplama betikleri: `design/_tools/` (gen.py, out.py, md.py).
