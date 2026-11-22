from gen import *
def ok(v,t): return f'{v:.2f}'+(' ✓' if v>=t else ' ✗')
out=[]
W=out.append
W('# Mozaik Mantık — Görsel Kimlik Önerisi (v1)\n')
W('Hazırlayan: görsel tasarım araştırmacısı, Demir Games Studio. Tüm kontrast ve renk körlüğü sayıları `design/_tools/gen.py` ile hesaplandı (WCAG 2.x göreli parlaklık; renk körlüğü: Machado 2009 matrisleri, şiddet 1.0, CIEDE2000). Hiçbir değer varsayılan/standart palet veya hazır tema değildir; rakip oyunların (Meowdoku, Queens, Mozaiko) renk ve görünüşü referans alınmamıştır. Tarihsel dayanak: İznik çinisi beyaz sır üzerine kobalt, firuze, adaçayı/zümrüt yeşili ve kabarık "Ermeni bolu" domates kırmızısıyla özdeşleşir (Wikipedia "Iznik pottery", T.C. Kültür ve Turizm Bakanlığı "Characteristics of İznik Tiles").\n')
W('## 0. Ortak kararlar (iki yön için de geçerli)\n')
W('''- **Yazı tipleri (gömülü, OFL):** Onest (Latin + Kiril; ğĞ ıİ şŞ, äöüß, ₺ dahil), El Messiri (Latin + Kiril + Arapça; çini/hat havalı, yalnız başlıklar), Noto Kufi Arabic (Arapça arayüz; geometrik, kufi/çini ruhu). Hepsi değişken (variable) yazı tipi; dosyalar `design/fonts/`. Hiçbiri önceki projelerde kullanılmadı. Google Fonts bağlantısı yok; `@font-face` tokens dosyasında.
- **Glif denetimi (fontTools):** ğĞıİşŞçÇöÖüÜäÄß: Onest, El Messiri, Noto Kufi tamam. Arapça 28 harf + ء أ إ آ ة ى: El Messiri ve Noto Kufi tamam (Onest'te yok, yedek zincirle Kufi'ye düşer). Kiril А–я, ё: Onest ve El Messiri tamam (Noto Kufi'de yok, ama Arapça metinde gerekmez). **Eksik:** ₺ işareti El Messiri'de ve Kufi'de yok, Onest'te var; El Messiri yalnız başlıkta kullanıldığı ve fiyat metni `--font-ui` ile yazıldığı için sorun çıkmaz. ★ ve ✕ hiçbirinde yok: yıldız ve X **SVG ile çizilir**, metin karakteri kullanılmaz.
- **Bölge sınırı kuralı (kurallar 9.1):** bölgeler arası **3 dp** `--region-border`, bölge içi **1 dp** `--grid-line`; ızgaranın dış çerçevesi 3 dp `--text`. Sınır, kendisine komşu her bölge renginde en az 3:1 olacak biçimde seçildi (tablo 3). Sınır hücrenin içine değil derze çizilir; dokunma alanı derzin ortasına kadar uzanır.
- **Desen modu:** 10 desen, 12×12 döşeme, yarı saydam vuruş (`--p0..--p9`, çizgi kalınlığı 1.1–1.8). Desen yalnız `background-image`, taş ve X desenin üstünde kendi dolgusuyla çizilir. Desen eşleşmesi sabit: r0 nokta, r1 yatay çizgi, r2 dikey çizgi, r3 çapraz /, r4 çapraz \\, r5 ızgara, r6 dalga, r7 dama, r8 artı, r9 baklava. Zikzak **yalnız çakışmaya ayrılmıştır** (`--p-conflict`, beyaz zikzak, kurallar 9.1).
- **Taş (çini parçası), CSS/SVG:** hücrenin %78'i boyunda yuvarlak köşeli kare (`border-radius: 22%`), dolgu `--stone`, 1.5 dp iç çerçeve `--stone-ink` (%35 saydam), ortada 8 yapraklı "lale/yıldız" rozeti: `<svg viewBox="0 0 24 24"><path d="M12 3 L14 9 L21 9 L15.5 13 L17.5 20 L12 15.8 L6.5 20 L8.5 13 L3 9 L10 9 Z" fill="stone-ink"/></svg>` (sade 5 kollu stilize lale yıldızı, rakip yıldız/taç/kedi değil), altında 2 dp `--shadow` ile hafif kabarıklık (sırlı çini hissi). Biçim (yıldızlı kare) renkten bağımsız tanınır.
- **X işareti:** hücrenin %46'sında iki çapraz çizgi, 2.4 dp, uçlar yuvarlak, `--mark`; çizgilerin kesiştiği yerde 1 dp "sır çatlağı" kıvrımı (isteğe bağlı). Taş değil çarpı olduğu biçimden anlaşılır, rengi taşla aynı aileden.
- **Çakışma gösterimi:** `--danger` 3 dp çerçeve + hücre üstüne `--p-conflict` zikzak + taş yerinde titreme. Üç ayrı ipucu (renk, desen, çerçeve).
- **Izgara görünümü:** "çini panosu": ızgara bir `--surface` levha üzerinde, 3 dp `--text` dış çerçeve, `--radius` köşe, `--shadow` gölge; hücre arası boşluk yok, derz çizgileriyle ayrılır (kurallar 9.2: dokunma alanı derz ortasına uzanır).
- **Animasyon süreleri (reduce-motion açıkken tümü 0.35× ve ölçek/sarsıntı kapalı, yalnız solma):** taş yerleştirme 140 ms (ölçek .6→1, `cubic-bezier(.2,.8,.2,1)`), X 100 ms (çizgiler sırayla), çakışma 260 ms (3 salınım, ±2 dp), seviye bitişi 700 ms (çini dalgası: hücreler köşegen sırayla 20 ms aralıkla parlar), tema geçişi 200 ms, ipucu vurgusu 600 ms nabız ×2. Süreler tokenlarda `--dur-*`.
''')
for k in 'ab':
    p=P[k]
    W(f'---\n\n## Yön {k.upper()} — {p["name"]}\n')
    if k=='a':
        W('**Ruh hali:** Sıcak, el yapımı bir çini atölyesi: krem sır zemin, lacivert mürekkep, pastel sırlı bölgeler. Bölgeler açık ve yumuşak tonlardadır, taş ve X lacivert (koyu) çini olarak üstlerinde net durur. Başlıklarda hat kıvrımlı El Messiri, arayüzde sakin Onest: sakin, "rahatlatıcı bulmaca" hissi. Koyu temada bölgeler derinleşir (gece atölyesi), taşlar krem rengine döner, vurgu altın olur.\n')
    else:
        W('**Ruh hali:** Taze fırınlanmış, doygun sırlı çini panosu: serin buz-beyaz zemin, derin kobalt/firuze/mercan bölgeler, taşlar ve X **beyaz sır**. Bölgeler arasındaki derz beyazdır (gerçek çini derzi gibi). Yazı tipi tek aile (Onest + Kufi), düz ve modern: net, "usta bulmacacı" hissi. Koyu temada bölgeler bir kademe derinleşir, taşlar krem-beyaz kalır.\n')
    W('### 1. Palet\n')
    W('| Token | Açık | Koyu |\n|---|---|---|')
    lab_={'bg':'--bg zemin','surface':'--surface yüzey','surface2':'--surface-2','text':'--text metin','text2':'--text-2 ikincil','accent':'--accent vurgu','accent_ink':'--accent-ink','success':'--success başarı','danger':'--danger çakışma','grid':'--grid-line','border':'--region-border','stone':'--stone taş','stone_ink':'--stone-ink','mark':'--mark X'}
    for kk,v in lab_.items(): W(f'| {v} | `{p["light"][kk]}` | `{p["dark"][kk]}` |')
    W('\n**10 bölge rengi ve deseni**\n')
    W('| # | Ad | Açık | Koyu | Desen |\n|---|---|---|---|---|')
    for i in range(10): W(f'| r{i} | {NAMES[i]} | `{p["light"]["r"][i]}` | `{p["dark"]["r"][i]}` | {PAT[i]} |')
    W(f'\nYazı tipi: UI = {"Onest + Noto Kufi Arabic" }; başlık = {"El Messiri (tüm diller; Kiril ve Arapça dahil), yedek Onest/Kufi" if k=="a" else "Onest 700–800 (Arapçada Kufi 700)"}. Gerekçe: {"Hat dokunuşlu başlık çini/Osmanlı yazı kültürüne gönderme yapar, tek dosyada Latin+Kiril+Arapça kapsar; gövde Onest okunaklı ve Türkçe ı/İ, ğ, ş şekilleri net." if k=="a" else "Tek geometrik aile küçük ızgara rakamlarında ve düğmelerde en okunaklı olandır; Kufi Arapça, çini panolardaki geometrik kufi kitabelerini andırır; dosya sayısı ve yükleme maliyeti en düşük."} Köşe yarıçapı {p["radius"]}.\n')
    W('### 2. Kontrast tablosu (WCAG, Python ile hesaplandı)\n')
    for th in ('light','dark'):
        d=p[th]
        W(f'**{"Açık" if th=="light" else "Koyu"} tema, metin ve bileşenler**\n')
        W('| Çift | Oran | Eşik |\n|---|---|---|')
        items=[('metin / zemin',d['text'],d['bg'],4.5),('metin / yüzey',d['text'],d['surface'],4.5),('metin / yüzey-2',d['text'],d['surface2'],4.5),('ikincil metin / zemin',d['text2'],d['bg'],4.5),('ikincil metin / yüzey',d['text2'],d['surface'],4.5),('vurgu mürekkebi / vurgu',d['accent_ink'],d['accent'],4.5),('vurgu / zemin',d['accent'],d['bg'],3),('başarı / zemin',d['success'],d['bg'],3),('çakışma / zemin',d['danger'],d['bg'],3),('taş motifi / taş',d['stone_ink'],d['stone'],3)]
        for n,a,b,t in items: W(f'| {n} | {ok(cr(a,b),t)} | {t} |')
        W('\n**Bölge renkleri üzerinde** (taş, X, bölge sınırı; eşik 3:1)\n')
        W('| Bölge | taş | X | sınır |\n|---|---|---|---|')
        for i,c in enumerate(d['r']): W(f'| r{i} {NAMES[i]} | {ok(cr(d["stone"],c),3)} | {ok(cr(d["mark"],c),3)} | {ok(cr(d["border"],c),3)} |')
        mn=min(min(cr(d['stone'],c),cr(d['mark'],c),cr(d['border'],c)) for c in d['r'])
        W(f'\nEn düşük bölge üstü oran: **{mn:.2f}:1**. Hiçbir çift eşiğin altında değil.\n')
    W('### 3. Renk körlüğü değerlendirmesi (45 bölge çifti, CIEDE2000 ΔE; ΔE < 10 = zor ayırt, < 5 = pratikte aynı)\n')
    W('| Tema | Normal en düşük ΔE | Protanopi | Döteranopi | Tritanopi |\n|---|---|---|---|---|')
    for th in ('light','dark'):
        r=pairs_report(p[th]['r'])
        def f(x): return f'{x["min"]:.1f} ({x["n_lt10"]} çift &lt;10, {x["n_lt5"]} çift &lt;5)'
        W(f'| {"Açık" if th=="light" else "Koyu"} | {f(r["normal"])} | {f(r["protanopi"])} | {f(r["döteranopi"])} | {f(r["tritanopi"])} |')
    W('\nYorum: renkler tek başına her çifti güvenceye almıyor; renk körlüğü simülasyonlarında 6–9 çift ΔE 10 altına iniyor (kırmızı-yeşil ailesi: mercan/zümrüt/zeytin/toprak; mavi-mor ailesi: kobalt/mor). Bu çiftlerde **desen modu zorunludur** (kurallar 9.1) ve sistem erişilebilirlik ayarı varsa otomatik açılır. 10 desen birbirinden biçim olarak ayrıdır (nokta, çizgi, çapraz, ızgara, dalga, dama, artı, baklava), her bölge çifti desen yüzünden de ayırt edilir. Kalın bölge sınırı desen kapalıyken bile bölgeleri ayırır.\n')
W('---\n\n## Karşılaştırma ve tavsiye\n')
W('''| Ölçüt | A Lale Bahçesi | B Kobalt Sır |
|---|---|---|
| Duygu | sıcak, rahat, el yapımı | net, doygun, parlak |
| Taş/X okunurluğu | koyu taş, pastel zemin (min ≈ 3.5–5.3 : 1) | beyaz taş, doygun zemin (min ≈ 3.7–4.9 : 1) |
| Renk körlüğü (normal ΔE en düşük) | 11.9 (açık) | 9.1 (açık) |
| Çini kimliği | krem sır + pastel: sade, atölye | kobalt-beyaz derz: İznik pano gibi |
| Yazı tipi dosyaları | 3 (başlıkta El Messiri) | 2 etkin (Onest, Kufi) |
| Mağaza ekran görüntüsünde | yumuşak, kalabalıkta sönük kalabilir | canlı, ikon ve banner ile uyumlu |

**Tavsiye: A (Lale Bahçesi).** Gerekçe: (1) pastel bölgeler normal görüşte en iyi ayrışıyor (en düşük ΔE 11.9, B'de 9.1), yani renk körü olmayan oyuncuların çoğu için desen gerekmiyor; (2) koyu taş ve X hem açık hem koyu temada en tutarlı kontrastı veriyor; (3) "Çini Atölyesi" koleksiyonuyla (krem sır, altın çerçeve, yıldızlı sırlama) doğal örtüşüyor, altın vurgu ★★★ parçalarla bağdaşıyor; (4) uzun oturumlarda göz yormayan, "rahatlatıcı bulmaca" konumuna uyan ton. B daha canlı ve mağazada dikkat çekici, ama doygun bölgeler uzun oyunda yorucu olabilir ve beyaz derz koyu bölgeleri birbirinden daha az ayırır. B ikinci tercih, kolay geçiş için aynı token adlarını kullanır (yalnız dosya değişir).
''')
W('\n## Dosyalar\n- `design/tokens-a.css`, `design/tokens-b.css`: `:root` (açık) ve `[data-theme="dark"]` değişkenleri, `--p0..--p9`, `--p-conflict`, `@font-face`.\n- `design/patterns.svg`: 10 desenin önizleme levhası.\n- `design/fonts/`: ElMessiri-VF.ttf (138.664 B), Onest-VF.ttf (193.056 B), NotoKufiArabic-VF.ttf (434.204 B) + OFL lisansları (3 dosya, ≈13 KB). Toplam yazı tipi ≈ 766 KB (TTF, alt küme yapılmadı; woff2 aracı kurulamadığı için TTF). Flutter\'a geçişte aynı TTF\'ler kullanılır.\n- Hesaplama betikleri: `design/_tools/` (gen.py, out.py, md.py).\n')
open('../01-gorsel-kimlik.md','w').write('\n'.join(out))
