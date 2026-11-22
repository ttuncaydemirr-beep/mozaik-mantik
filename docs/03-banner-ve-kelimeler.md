# Mozaik Mantık: Banner Yerleri ve Mağaza Anahtar Kelimeleri (22 Kasım 2026)

Hazırlayan: gelir ve mağaza araştırmacısı. Bu belge hukuki ya da finansal danışmanlık değildir. Gelir rakamları kaba varsayımdır, ölçülmüş veri değildir.

Okunan belgeler: 01-kurallar.md (Bölüm 3, 5, 7, 8) ve 02-ad-ve-magaza.md.

---

# İŞ 1: BANNER YERLERİ

## 1.1 Kısa pazar araştırması (5 aramanın sonucu, dürüst özet)

- **Rakipler banner kullanıyor mu: doğrulanamadı.** "Queens" ve "Star Battle" uygulamaları için yaptığım aramalar yalnızca App Store/uygulama listesi sayfaları döndürdü (örnek: https://apps.apple.com/us/app/queens-logic-puzzles/id6756427911 , https://apps.apple.com/us/app/star-battle-logic-puzzles/id6757847670). Hiçbirinde "banner nerede duruyor" bilgisi yoktu. Banner kullanımı hakkında kanıtlanmış bir rakip verisi yok.
- **Yorumlarda banner şikâyeti: bulunamadı.** Okunabilen Queens türü yorum sayfasında (https://justuseapp.com/en/app/6737204850/queens-logic-board-puzzle/reviews, 872 yorumdan yalnızca 20'si görünüyor) hiçbir yorum açıkça "banner" demiyor. Reklam şikâyetleri şunlar: oyunlar arasında reklam çıkması, "reklamsız aldım ama reklam sürüyor", "her yerde reklam" (türü belirtilmemiş) ve ödüllü reklamdan sonra ipucu/tahta gelmemesi. Yani şikâyet merkezi geçiş reklamı, reklamsız satın almanın çalışmaması ve ödül hatası. Bu, 01-kurallar Bölüm 0'daki bulguyla aynı.
- **Sektör bilgisi (Unity):** standart banner 320x50; yenileme aralığı tipik olarak 25 sn - 2 dk; talebin çoğu markalardan geliyor; yenileme süresi eCPM ve ARPDAU ile birlikte **elde tutma** üzerinden A/B test edilmeli. Puzzle'a özgü sayı yok. Kaynak: https://unity.com/en/blog/banner-monetization-best-practices
- Diğer baktığım genel kaynaklar (içeriği derinlemesine okunmadı, yalnızca arama sonucu başlığı): https://sensortower.com/blog/best-mobile-game-monetization-retention-practices , https://docs.crazygames.com/resources/monetizing-puzzle/

Sonuç: "rakipler yapıyor, o zaman sorun yok" diyebilecek kanıt yok. Karar kendi A/B ölçümümüze dayanmalı.

## 1.2 Ekran ekran değerlendirme

Gelir tahmini için kaba varsayımlar (kaynaksız, yalnızca büyüklük sırası): banner eCPM 0,2-0,8 USD (TR, AR, ID, BR'de alt uçta); ödüllü ve geçiş reklamı eCPM'i bunun kat kat üstünde. Örnek: 1.000 günlük aktif oyuncu (DAU), banner'lı ekranda günde toplam ~2 dk, 30 sn yenileme: ~4.000 gösterim x 0,4 USD / 1000 = **~1,6 USD/gün (~50 USD/ay)**. Karşılaştırma: aynı 1.000 DAU'da günde ~8 seviye ve her 4 seviyede bir geçiş reklamı: ~2 gösterim/oyuncu x eCPM ~5 USD = **~10 USD/gün**. Yani banner, mevcut reklam gelirine **en iyi ihtimalle %10-15 ek** getirir; yerleşimi bozarsa bu kazanç küçük bir elde tutma kaybıyla silinir.

| Ekran | Oyuncu kaybı riski | Yanlış tıklama riski | Beklenen gelir katkısı | Karar |
|---|---|---|---|---|
| **Ana menü** (Oyna, Günlük, Çini Atölyesi, Ayarlar) | **Orta.** İlk izlenim ekranı; büyük düğmeler sıkışır, kimlik ("çini atölyesi" hissi) bozulur. Reklam görünce ilk yükleme yavaşlarsa ilk oturum etkilenir. | Orta-yüksek: büyük düğmelerin hemen altı | Çok düşük: ekranda kalış süresi saniyeler | **Önerilmez** |
| **Paket seçimi / seviye panosu** (5 paket, karo ızgarası) | **Düşük-orta.** Karar ve gezinme ekranı, oyun yok, oyuncu zaten bekliyor/göz gezdiriyor; geçiş reklamı burada yok. Risk: karo ızgarası uzun listeyse alt alan daralır; kilit koşulu ve yıldız bilgisi yerleşimi sıkışır. | Orta: karolara dokunma yoğun, banner sabit alt şeritte ve kaydırılan listeden ayrı olmalı | Düşük, ama toplam banner gelirinin çoğu burada: günde birkaç ziyaret, her ziyaret 20-60 sn | **ADAY 1: şartlı öner** |
| **Oyun tahtası** | **Yüksek.** Dikkat gerektirir; tahta ekranın en az %55'i olmalı (Bölüm 9.3), 10x10'da hücre 30 dp alt sınırında; banner bunu daraltır ve yanlış taş koymaya yol açar. Bölüm 8.3 ve Banner Kararları zaten yasak. | Çok yüksek | Yüksek gösterim (en uzun süre) ama güveni en çok yakan yer | **Yasak** |
| **Sonuç kartı** | **Yüksek.** Başarı anı; "Sonraki" ve "Tekrar" düğmesi, yıldızlar, yeni çini; geçiş reklamı bu kartın hemen ardından geliyor, üst üste reklam algısı. "Reklamları kaldır" küçük düğmesi de burada. | Yüksek (Sonraki düğmesine yakın) | Düşük (kart birkaç saniye) | **Yasak** |
| **Günlük bulmaca** | **Yüksek.** Oyun alanı; seri baskısı var, kaybettirmek seriyi bozar. | Çok yüksek | Orta | **Yasak** |
| **Çini Atölyesi / galeri** | **Düşük.** Elde tutmanın duygusal çekirdeği ve paylaşım görseli; oyuncu burada bakıp keyif alıyor. Banner sanatın üstüne reklam koyar, marka kimliğiyle çelişir. Risk düşük ama değer de düşük; pano büyük görsel, ekran tam dolu. | Orta (parça ızgarası, kaydırma) | Çok düşük: ziyaret seyrek | **Önerilmez** (ikinci yer olarak değil) |
| **Ayarlar** | **Düşük** kayıp, ama "Reklamları kaldır", "Satın alımı geri yükle", "Reklam tercihleri", dil gibi satın alma/onay düğmeleri aynı ekranda. Banner'ın satın alma ve izin düğmelerine yakınlığı kural ve güven sorunu. | Yüksek (anahtar ve düğme listesi) | Çok düşük | **Önerilmez** (satın alma ekranı kuralı) |
| **Öğretici** | **Yüksek.** İlk dakikalar, kullanıcı kaybı en hassas an; Bölüm 6 reklamsız diyor. | Yüksek | Sıfır | **Yasak** |

## 1.3 Banner'ın ek getirisi ile oyuncu kaybının karşılaştırması

- Bu oyunda zaten üç reklam yüzeyi var: ödüllü (ipucu, seri kurtarma), geçiş (7. seviyeden sonra 4'te bir) ve "Reklamları kaldır" satışı. Pazardaki şikâyetlerin merkezi geçiş reklamı yoğunluğu ve reklamsız satın almanın bozuk çalışması (yukarıda), banner değil.
- Banner'ın artı tarafı: oyuncu başı reklam gelirine küçük ek; "Reklamları kaldır" ürününün değerini görünür kılar (banner görmeyen kişi neyin kalktığını bilemez). Bu ikinci etki ölçülebilir ama kanıtım yok.
- Banner'ın eksi tarafı: geçiş reklamı zaten yüksek frekanslı, bunun üstüne sürekli görünen reklam "her yerde reklam" algısı yaratabilir. Kaybı sadece geri dönüş (D1/D7) ve oturum süresi gösterir; bu veriler ancak yayından sonra, kontrol grubuyla çıkar.
- Denge: beklenen gelir ekleme **düşük**, risk **düşük-orta** ve tamamen ölçülebilir, uzaktan kapatılabilir. Bu yüzden "hiç önerme" da savunulabilir; ben yalnızca paket/pano ekranı için, şartlı ve kapalı başlangıçla öneriyorum.

## 1.4 ÖNERİM

**1 yer öner: Paket seçimi / seviye panosu ekranı, altta sabit, uyarlanabilir banner (en çok 60 dp). İkinci yer önerilmez.** Hiçbir oyun, sonuç, günlük, öğretici, ayar, galeri ve menü ekranında banner olmaz.

Öneriye özel şartlar (Banner Kararları'ndaki ortak şartlara ek):
1. Ortak şartların tamamı geçerli: izin formu (UMP) yanıtlanmadan istek yok; reklamsız alıcıya gösterilmez ve satın alma anında anında kalkar; sabit alan ayrılır (ekran zıplamaz, reklam yoksa bile alan boşluk olarak kalır ya da kapalıysa hiç ayrılmaz); banner ile en yakın karo/düğme arasında 16-24 dp boşluk; ekranda tek reklam; açılır pencerede yok.
2. Banner, **kaydırılan karo ızgarasının dışında**, ekranın altına sabit bir şerit olarak yerleşir. Izgara bu şeridin üstünde kaydırılır; son karo satırı banner altına gizlenmez.
3. Banner "Reklamları kaldır" gibi satın alma düğmesinin yanına konmaz; bu düğme ayarlarda ve sonuç kartında zaten var.
4. **İlk 6 gerçek seviye tamamlanana kadar banner yok** (geçiş reklamı muafiyetiyle aynı mantık; ilk izlenimi korur). Bu benim önerim, Banner Kararları'nda yoktur; yönetici onaylarsa eklenir.
5. Uzaktan açma/kapama (Firebase Remote Config) ve **%50 reklam görmeyen kontrol grubu**; D1, D7 geri dönüş, oturum, ödüllü izleme, satın alma ve kaldırma oranı, anormal tıklama oranı izlenir. Biri düşerse banner kapanır.
6. Yayın planı: ilk sürümde **kapalı başlat**, 1-2 hafta temel veri topla, sonra %50'ye aç. Kaybın istatistiksel olarak ölçülebilmesi için en az birkaç yüz DAU gerekir; DAU çok düşükse banner'ı hiç açmamak daha mantıklı (gelir ~1-2 USD/gün civarı olur, ölçülemeyecek bir kayba değmez).
7. Yenileme aralığı 30-60 sn; Unity de eCPM ve elde tutma dengesi için A/B önerir.

Geri bırakma: veri kötü çıkarsa "hiç banner yok" nihai karar olur; bu durumda 01-kurallar Bölüm 11 soru 2'nin alternatifi uygulanır.

---

# İŞ 2: MAĞAZA ANAHTAR KELİMELERİ

## 2.1 Yöntem ve sınırlar (önemli)

- **Play Store arama sayfası denendi ve açılmadı.** WebFetch, https://play.google.com/store/search?q=... için "robots_disallowed" döndürdü (iki ayrı dilde denendi: https://play.google.com/store/search?q=logic%20puzzle&c=apps&hl=en ve ...?q=mantık%20bulmacası&c=apps&hl=tr). Yani **gerçek arama sonuçlarına bakılamadı.**
- Bu yüzden rekabet düzeyi **dolaylı ve kabadır**: web aramalarında çıkan sonuç türleri (genel Play kategori sayfaları, listeleme siteleri, "en iyi uygulamalar" yazıları), Queens/Star Battle türünün çok sayıda App Store klonu olması ve genel pazar bilgim. Hepsi **tahmin**; yayından sonra Play Console "Mağaza listeleme performansı > Arama terimleri" ve ASO aracıyla (ör. AppTweak, Sensor Tower) doğrulanmalı.
- Baktığım arama sayfaları: tr https://www.tamindir.com/android/kategori/oyun/bulmaca/ ; de https://www.pcwelt.de/article/1157782/die-besten-gedaechtnistrainer-fuer-android.html ; es https://www.xatakandroid.com/juegos-android/los-13-mejores-juegos-de-puzzles-para-android/amp ; ru https://www.rustore.ru/catalog/app/ru.nyanko.offline.puzzles ; id https://techno.viva.co.id/platform/6101-6-rekomendasi-game-teka-teki-android-asah-otak-berikan-manfaat-kemampuan-kognitif?page=all . Not: ar ve pt için ayrı arama yapılmadı (12 arama/çekim sınırı), değerlendirmeleri ortak bilgi ve diğer dillerle benzetmeyle yaptım.
- Rekabet ölçeği: **Yüksek** = genel, binlerce uygulamanın hedeflediği ifade; **Orta** = belirli tür/özellik, onlarca-yüzlerce rakip; **Düşük** = niş tarif, az rakip ama aranma hacmi de düşük olabilir. Arama hacmi bilinmiyor, "olası" olması gerekçem.

## 2.2 Başlık ve kısa açıklama kuralları

- Başlık en fazla 30 karakter, emoji ve tekrarlı özel karakter yok, "#1/popüler" gibi ifade yok. Kısa açıklama için sınır 80 karakter. Kaynak: https://support.google.com/googleplay/android-developer/answer/9898842?hl=en (Play "Metadata" politikası).
- Başlık ve açıklamada Queens, Star Battle, Sudoku, Mozaiko, pixel art ve başka marka/oyun adı yok. Karakterler Python ile sayıldı (aşağıdaki tabloda).
- Marka kararı 02 belgesindeki gibi: Latin harfli dillerde ve Rusçada "Mozaik Mantık", Arapçada yerelleştirilmiş ad.

## 2.3 Dil dil ifade listesi, rekabet ve seçim

### Türkçe (tr)
| İfade | Rekabet (tahmin) | Not |
|---|---|---|
| mantık oyunu | Yüksek | Genel; çok sayıda zeka oyunu |
| zeka oyunları | Yüksek | Çok genel, çocuk/IQ uygulamaları da çıkar |
| bulmaca oyunu | Yüksek | Sudoku, kelime, yapboz karışık |
| mantık bulmacası | Orta-yüksek | Tür adına yakın, genel |
| çevrimdışı bulmaca | Orta | İnternetsiz isteyen kitle |
| renkli bölge bulmacası | Düşük | Tür tarifi; az kişi bu kelimeleri yazar ama yazan çok isabetli |
| bölge bulmaca | Düşük | Kısa niş ifade |
| çini bulmaca | Düşük | Tema; arayan az, rakip neredeyse yok |

Seçilen 2-3 (az kalabalık ama olası): **mantık bulmacası** (orta-yüksek, ama açıklamaya girmesi gerekli), **bölge bulmaca**, **çevrimdışı bulmaca**.
- Başlık: `Mozaik Mantık: Bölge Bulmaca` (28)
- Kısa açıklama: `Her renkli bölgeye bir taş koy. Çini temalı, çevrimdışı mantık bulmacası.` (73)

### İngilizce (en)
| İfade | Rekabet | Not |
|---|---|---|
| logic puzzle | Yüksek | Çok genel |
| brain teaser | Yüksek | Genel |
| puzzle games offline | Yüksek | Genel, çok sayıda |
| color puzzle | Yüksek | Renk eşleştirme oyunlarıyla karışır |
| grid logic puzzle | Orta | Tür yakını |
| one per row puzzle | Düşük | Az yazılır |
| color region puzzle | Düşük-orta | Tarif; Queens/Star Battle klonları bu sözcükleri kullanıyor olabilir |
| tile logic puzzle | Düşük | Tema ve tür |

Seçilen: **grid logic puzzle**, **color region puzzle**, **tile logic puzzle**.
- Başlık: `Mozaik Mantık: Region Puzzle` (28)
- Kısa açıklama: `Place one tile in every color region. Offline logic puzzles, no guessing.` (73)

### Almanca (de)
| İfade | Rekabet | Not |
|---|---|---|
| Logikrätsel | Orta-yüksek | Alman pazarında yerleşik tür adı |
| Denkspiele | Yüksek | Genel |
| Knobelspiele | Yüksek | Genel |
| Rätsel offline | Orta-yüksek | |
| Logikspiel | Orta-yüksek | |
| Farbfeld Rätsel | Düşük | Tarif |
| Logikrätsel ohne Internet | Orta | |
| Gehirntraining | Yüksek | Genel, hafıza uygulamalarıyla karışık |

Seçilen: **Logikrätsel ohne Internet**, **Farbfeld Rätsel**, **Logikrätsel** (açıklamada).
- Başlık: `Mozaik Mantık: Farbfeld-Rätsel` (30)
- Kısa açıklama: `Ein Stein pro Farbregion. Logikrätsel ohne Raten, auch offline spielbar.` (72)

### Arapça (ar)
| İfade | Rekabet | Not |
|---|---|---|
| ألغاز منطقية | Yüksek | Genel |
| لعبة ذكاء | Yüksek | Genel |
| ألغاز ذكاء | Yüksek | Genel |
| ألعاب عقلية | Yüksek | Genel |
| ألغاز بدون انترنت | Orta | Çevrimdışı arayan çok kullanıcı var |
| لعبة ألغاز منطقية بدون نت | Orta | |
| ألغاز المناطق الملونة | Düşük | Tarif; pratikte az yazılır |
| لغز موزاييك | Orta-düşük | Marka ile örtüşür; "موزاييك" başka mozaik/yapboz oyunlarında da geçer |

Seçilen: **ألغاز بدون انترنت**, **ألغاز منطقية** (açıklamada), **ألغاز المناطق**.
- Başlık: `موزاييك المنطق: ألغاز المناطق` (29)
- Kısa açıklama: `ضع حجرًا واحدًا في كل منطقة ملونة. ألغاز منطقية بلا إنترنت وبلا تخمين.` (70)
- Not: Play'de Arapçada ek bir yazım varyantı (ألغاز / الغاز, ة/ه) arama sonucunu değiştirir; Play bunları kısmen eşler. Yayından sonra veriye bakılmalı.

### İspanyolca (es)
| İfade | Rekabet | Not |
|---|---|---|
| juegos de lógica | Yüksek | Genel |
| puzzle de lógica | Yüksek | Genel |
| juegos de ingenio | Yüksek | Genel |
| acertijos | Yüksek | Çok genel |
| juego mental | Yüksek | |
| juegos sin internet | Yüksek | Çok genel |
| puzzle de regiones de colores | Düşük | Tarif |
| rompecabezas lógico offline | Orta | |

Seçilen: **puzzle de lógica** (açıklamada), **puzzle regiones de colores**, **rompecabezas lógico offline**.
- Başlık: `Mozaik Mantık: Puzzle Colores` (29)
- Kısa açıklama: `Una ficha por cada región de color. Puzzles de lógica sin adivinar, offline.` (76)

### Portekizce, Brezilya (pt-BR)
| İfade | Rekabet | Not |
|---|---|---|
| jogo de lógica | Yüksek | Genel |
| quebra-cabeça de lógica | Yüksek | Genel (yapboz da çıkar) |
| jogos de raciocínio | Yüksek | Genel |
| desafio mental | Yüksek | Genel |
| jogos offline | Çok yüksek | Aşırı genel |
| jogo de lógica offline | Orta-yüksek | |
| quebra-cabeça colorido | Orta | Yapboz/boyama karışır |
| lógica colorida | Düşük | Tarif |

Seçilen: **lógica colorida**, **jogo de lógica offline**, **quebra-cabeça de lógica** (açıklamada).
- Başlık: `Mozaik Mantık: Lógica Colorida` (30)
- Kısa açıklama: `Uma peça em cada região colorida. Lógica sem chute, jogue offline.` (66)

### Rusça (ru)
| İfade | Rekabet | Not |
|---|---|---|
| логические головоломки | Yüksek | Genel |
| головоломки | Çok yüksek | Aşırı genel |
| игры на логику | Yüksek | Genel |
| игры без интернета | Çok yüksek | |
| логические игры офлайн | Orta-yüksek | |
| головоломка с цветными зонами | Düşük | Tarif |
| логическая головоломка на поле | Orta | |
| тренировка мозга | Yüksek | Genel |

Seçilen: **логические игры офлайн**, **цветные зоны / головоломка с цветными зонами**, **логические головоломки** (açıklamada).
- Başlık: `Mozaik Mantık: Цветные зоны` (27)
- Kısa açıklama: `Одна плитка в каждой цветной зоне. Логика без угадывания, без интернета.` (72)
- Not: Rusya'da Google Play kısıtlıdır (RuStore baskın); Rusça konuşan diğer pazarlar (Kazakistan, Ukrayna, Beyaz Rusya vb.) için geçerlidir.

### Endonezce (id)
| İfade | Rekabet | Not |
|---|---|---|
| teka-teki logika | Yüksek | Genel |
| game puzzle | Çok yüksek | Genel |
| game asah otak | Yüksek | Genel |
| game offline | Çok yüksek | Aşırı genel |
| game logika offline | Orta | |
| teka-teki warna | Orta | Renk eşleştirme karışır |
| teka-teki zona warna | Düşük | Tarif |
| game puzzle tanpa internet | Orta-yüksek | |

Seçilen: **game logika offline**, **teka-teki zona warna**, **teka-teki logika** (açıklamada).
- Başlık: `Mozaik Mantık: Teka-Teki Zona` (29)
- Kısa açıklama: `Satu ubin di tiap wilayah warna. Teka-teki logika tanpa menebak, offline.` (73)

## 2.4 Başlık ve açıklama sayımı (Python ile sayıldı)

| Dil | Başlık | Karakter (en çok 30) | Kısa açıklama | Karakter (en çok 80) |
|---|---|---|---|---|
| tr | Mozaik Mantık: Bölge Bulmaca | 28 | Her renkli bölgeye bir taş koy. Çini temalı, çevrimdışı mantık bulmacası. | 73 |
| en | Mozaik Mantık: Region Puzzle | 28 | Place one tile in every color region. Offline logic puzzles, no guessing. | 73 |
| de | Mozaik Mantık: Farbfeld-Rätsel | 30 | Ein Stein pro Farbregion. Logikrätsel ohne Raten, auch offline spielbar. | 72 |
| ar | موزاييك المنطق: ألغاز المناطق | 29 | ضع حجرًا واحدًا في كل منطقة ملونة. ألغاز منطقية بلا إنترنت وبلا تخمين. | 70 |
| es | Mozaik Mantık: Puzzle Colores | 29 | Una ficha por cada región de color. Puzzles de lógica sin adivinar, offline. | 76 |
| pt-BR | Mozaik Mantık: Lógica Colorida | 30 | Uma peça em cada região colorida. Lógica sem chute, jogue offline. | 66 |
| ru | Mozaik Mantık: Цветные зоны | 27 | Одна плитка в каждой цветной зоне. Логика без угадывания, без интернета. | 72 |
| id | Mozaik Mantık: Teka-Teki Zona | 29 | Satu ubin di tiap wilayah warna. Teka-teki logika tanpa menebak, offline. | 73 |

Başlık ve kısa açıklamada başka oyun/marka adı yok. Almanca ve Portekizce başlık tam 30 karakterde; çeviri/düzeltme sonrası taşma riski var, her değişiklikte yeniden sayılmalı. Kısa açıklamalar çevirmen/anadili konuşan kişiyle gözden geçirilmeli (özellikle Arapça, Rusça, Endonezce).

## 2.5 Uzun açıklamada "star battle" tür adı olarak geçebilir mi? (Play politikası açısından kısa değerlendirme, hukuki görüş değil)

- Play Metadata politikası; başlık, ikon ve geliştirici adında başka bir marka/program ile ilişki ima etmeyi, ilgisiz ya da tekrarlı anahtar kelimeyi, uygulamalar arası karşılaştırmayı yasaklar (https://support.google.com/googleplay/android-developer/answer/9898842?hl=en).
- Güvenli tarafta kalmak için öneri: uzun açıklamada **tür adı** olarak, tek kez ve doğal cümle içinde ("renkli bölge mantık bulmacası; bu tür oyunlar bazen Star Battle olarak bilinir" gibi) geçmesi **düşük-orta risk** taşır; ama bu bir güvence değil. "Star Battle" tek bir şirkete ait tescilli marka olarak doğrulanmadı (türü tanımlayan genel bir bulmaca adı gibi görünüyor, pek çok uygulamada başlıkta kullanılıyor), "Queens" ise bir ticari oyun adı olduğu için riskli. Doğrulama yapılmadı: tescil sorgusu önerilir (TÜRKPATENT, EUIPO, USPTO).
- Öneri: **uzun açıklamada "Queens" hiç geçmesin; "star battle" kullanılacaksa en çok 1 kez ve karşılaştırma/marka çağrışımı olmadan.** Tekrar, listeleme ya da "X gibi" kalıbı keyword stuffing sayılır. Başlık, kısa açıklama ve tüm etiketlerde yok. Daha güvenli seçenek: hiç kullanmayıp "color region logic puzzle", "bir bölgeye bir taş" tarifini kullanmak; zaten bu çalışmanın seçtiği ifadeler tarif odaklı.

---

## Kaynaklar
- https://unity.com/en/blog/banner-monetization-best-practices
- https://sensortower.com/blog/best-mobile-game-monetization-retention-practices
- https://docs.crazygames.com/resources/monetizing-puzzle/
- https://justuseapp.com/en/app/6737204850/queens-logic-board-puzzle/reviews
- https://apps.apple.com/us/app/queens-logic-puzzles/id6756427911
- https://apps.apple.com/us/app/star-battle-logic-puzzles/id6757847670
- https://support.google.com/googleplay/android-developer/answer/9898842?hl=en
- https://www.tamindir.com/android/kategori/oyun/bulmaca/
- https://www.pcwelt.de/article/1157782/die-besten-gedaechtnistrainer-fuer-android.html
- https://www.xatakandroid.com/juegos-android/los-13-mejores-juegos-de-puzzles-para-android/amp
- https://www.rustore.ru/catalog/app/ru.nyanko.offline.puzzles
- https://techno.viva.co.id/platform/6101-6-rekomendasi-game-teka-teki-android-asah-otak-berikan-manfaat-kemampuan-kognitif?page=all
- Denenen ama açılmayan (robots_disallowed): https://play.google.com/store/search?q=logic%20puzzle&c=apps&hl=en
