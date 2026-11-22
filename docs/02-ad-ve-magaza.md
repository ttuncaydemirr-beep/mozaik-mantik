# Mozaik Mantık: Ad ve Mağaza Araştırması (22 Kasım 2026)

Hazırlayan: mağaza ve isim araştırmacısı. Bu belge hukuki görüş değildir; yalnızca bulunanları listeler.

## 1. Ad çakışması

Arama kapsamı: "Mozaik Mantık", "Mozaik Mantik", "Mosaic Logic", "Mozaiko", "Mozaik" için Play Store ve genel web.

| Bulgu | Geliştirici | Bağlantı | Not |
|---|---|---|---|
| Mozaiko: Logic Puzzles | Kotidy (Talence, Fransa) | https://play.google.com/store/apps/details?id=app.mozaiko | 9 Kasım 2026'da güncellenmiş, 0+ indirme. "Pixel art logic puzzles", günlük ızgara. İçinde Constellations (Star Battle) ve Eclipse (ikili bulmaca) var. |
| Mozaiko (itch.io) | belirsiz | https://mosaiko.itch.io/mosaiko | Aynı ad, ilişkisi doğrulanmadı. |
| Mosaic Match, Atelier Mosaic, Mosaic Encore, Fill-a-Pix vb. | çeşitli | App Store sonuçları (arama sonuçlarında) | Çoğunlukla iOS ve resim/yapboz türü; Queens/Star Battle türü değil. |
| "Mozaik Mantık" adlı oyun/uygulama | bulunamadı | - | Tam eşleşme yok (Play ve web aramaları). |
| "Mosaic Logic" adlı oyun/uygulama | bulunamadı | - | Tam eşleşme yok. |
| Mozzaik, Mizoko geliştirici sayfaları | farklı | play.google.com/store/apps/developer?id=mozzaik | Alakasız, yalnız arama yankısı. |

Karışma riski: **ORTA-DÜŞÜK (genel olarak orta)**.
- Aleyhte: "Mozaiko" ile "Mozaik" ortak kök; ikisi de mantık bulmacası; Mozaiko'nun içinde Star Battle türü var ve aynı arama sonuçlarında çıkabilir. Fonetik olarak yakın (özellikle yazım hatasıyla aramalarda).
- Lehte: Mozaiko'nun resmi adı "Mozaiko: Logic Puzzles"; bizim adımız iki sözcüklü ve Türkçe "Mantık" içeriyor. Mozaiko'nun 0+ indirmesi var, yeni ve küçük. Görsel kimliğimiz (İznik çinisi) ile onların pixel art çizgisi ayrışıyor.
- Öneri: ad kalabilir, ama başlıkta tek başına "Mozaik" kullanma; "Mantık" kelimesi her zaman birlikte geçsin. Mozaiko'nun mağaza anahtar kelimelerini ve "pixel art" ifadesini kullanma.

## 2. Paket adı: com.demirgamesstudio.mozaikmantik

Sonuç: **doğrulanamadı**. WebFetch "client_error" döndü, sayfa içeriği alınamadı; curl da proxy üzerinden 000 döndü. Aynı yöntemle var olan bir sayfa (app.mozaiko) WebFetch ile açıldığı için hata büyük olasılıkla "sayfa yok" anlamına gelir, ama bu kesin kanıt değil. Aramalarda bu paket adı da hiç geçmedi. Kesin kontrol: Play Console'da uygulama oluşturulurken paket adı zaten sorgulanır; boş değilse orada hata verir.

## 3. Marka riski

- "Mozaik Mantık" için bilinen bir oyuncak, yayın veya uygulama markası bulunamadı.
- "Mozaik" tek başına Türkiye'de yaygın bir sözcük: Mozaik Yayınları (okul test/soru yayını, ör. 8. sınıf matematik), Mozaik Şarapçılık, Mozaik Organik Tarım ticari markaları, ABD'de Mozaik Inc. portföyü görüldü. Bunlar farklı sektör; yine de gerçek bir tescil sorgusu önerilir.
- Kaynaklar: https://trademark.justia.com/owners/mozaik-sarapcilik-tarim-ve-hayvancilik-sanayi-ticaret-limited-sirketi-2760045 , https://trademarkdir.com/owner/mozaik-inc , https://www.bkmkitap.com/mozaik-yayinlari-8-sinif-matematik-6-1-tekrar-foyleri-ozel-baski
- "Mozaik Bulmaca" adında kitaplar var (nadirkitap.com), ama marka değil, genel tür adı.
- Öneri: Türk Patent ve Marka Kurumu (TÜRKPATENT) ve EUIPO/WIPO'da 9, 28 ve 41. sınıfta ücretsiz ön sorgu yapılsın.

## 4. 8 dilde mağaza başlığı (Play sınırı 30 karakter)

Marka kararı: "Mozaik Mantık" Latin harfli dillerde ve Rusçada korunur (tek marka, arama tutarlılığı). Arapçada marka Latin harfle kalırsa sağdan sola metinde karışık görünür; bu yüzden Arapçada yerelleştirilmiş bir ad öneriyoruz ("Mozaik" sözcüğü Arapçada zaten موزاييك olarak bilinir). İsteğe bağlı ikinci seçenek de verildi.

| Dil | Başlık | Karakter |
|---|---|---|
| Türkçe | Mozaik Mantık: Bulmaca | 22 |
| İngilizce | Mozaik Mantık: Logic Puzzle | 27 |
| Almanca | Mozaik Mantık: Logikrätsel | 26 |
| Arapça (öneri) | موزاييك المنطق: ألغاز | 21 |
| Arapça (marka korunur) | Mozaik Mantık: ألغاز منطقية | 27 |
| İspanyolca | Mozaik Mantık: Puzzle Lógico | 28 |
| Portekizce | Mozaik Mantık: Jogo de Lógica | 29 |
| Rusça | Mozaik Mantık: Головоломка | 26 |
| Endonezce | Mozaik Mantık: Puzzle Logika | 28 |

Karakterler Python ile sayıldı. Başlıkta başka oyun/marka adı (Queens, Star Battle, Sudoku) yok.

### Anahtar kelimeler (kısa açıklama için, 3-5 adet)
- Türkçe: mantık bulmacası, zeka oyunu, bulmaca oyunu, çini, renkli bölge bulmacası
- İngilizce: logic puzzle, brain teaser, color grid puzzle, tile puzzle, offline puzzle
- Almanca: Logikrätsel, Denkspiel, Knobelspiel, Rätsel offline, Gehirntraining
- Arapça: ألغاز منطقية، لعبة ذكاء، ألعاب فكرية، ألغاز بدون إنترنت
- İspanyolca: puzzle de lógica, juego de ingenio, acertijos, juego mental, sin conexión
- Portekizce: quebra-cabeça de lógica, jogo de raciocínio, desafio mental, jogo offline, enigmas
- Rusça: логическая головоломка, головоломки, игра на логику, тренировка мозга, без интернета
- Endonezce: teka-teki logika, game puzzle, asah otak, game offline, teka-teki warna

Not: "Star Battle"/"Queens" kelimelerini anahtar kelime olarak kullanmak marka riski taşıdığı için dışarıda bırakıldı. Türden söz etmek gerekirse "color region logic puzzle" gibi tarif kullanın.

## 5. Alternatif adlar

"Mozaik Mantık" kritik derecede riskli bulunmadı, bu yüzden alternatifler yalnızca yedek. Alternatifler için Play araması yapılmadı (arama bütçesi bitti); önce hızlı Play ve TÜRKPATENT kontrolü gerekir.

1. **Çini Mantık**: çini temasını doğrudan söyler; "Mozaiko"dan uzak. "Ç" bazı dillerde zor yazılabilir, ama Latin alfabeli dillerde okunur.
2. **Lale Mozaik**: telaffuzu kolay (Arapçada لاله), çini motifi olan lale ile bağ kurar; "Mozaik" kökü Mozaiko'ya yine yakın, bu yüzden en zayıf seçenek.
3. **Karo Mantık**: Karo (tile) İspanyolca, Portekizce, Almanca, Rusça için okunaklı; Arapçada كارو sorunsuz.

Tüm alternatifler için durum: Play ve web kontrolü yapılmadı, güvenilir kontrol sonucu yok.

## Kaynaklar
- https://play.google.com/store/apps/details?id=app.mozaiko
- https://mosaiko.itch.io/mosaiko
- https://trademark.justia.com/owners/mozaik-sarapcilik-tarim-ve-hayvancilik-sanayi-ticaret-limited-sirketi-2760045
- https://trademark.justia.com/owners/mozaik-organik-tarim-ve-hayvancilik-sanayi-ticaret-anonim-sirketi-5278461
- https://trademarkdir.com/owner/mozaik-inc
- https://www.bkmkitap.com/mozaik-yayinlari-8-sinif-matematik-6-1-tekrar-foyleri-ozel-baski
- https://www.nadirkitap.com/mozaik-bulmaca-mekin-gani-pehlivan-kitap46427003.html
