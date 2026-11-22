# Mozaik Mantık — Kural ve Oynanış Belgesi (v1.0)

Hazırlayan: Oyun tasarımı (Demir Games Studio) · Tarih: 22 Kasım 2026 · Durum: Tuncay onayına hazır taslak

Kapsam: İlk sürüm. Tek mekanik, 5 zorluk, 300 hazır seviye, günlük bulmaca, 8 dil (tr, ar, en, de, es, pt, ru, id), Arapça sağdan sola. Önce web önizleme, kurallar oturunca aynı tasarım Flutter'a taşınır.

---

## 0. Kısa pazar bulguları (kullanıcı yorumlarından)

Not: Hızlı bir tarama yaptım. Yalnızca iki yorum sayfasını okuyabildim; Meowdoku ve Kwalee Queens için kullanılabilir yorum metni bulunamadı. Bu yüzden bulgular örneklem niteliğindedir, kesin pazar verisi değildir.

1. **Reklam ve reklamsız sürüm sorunu.** Queens türü bir uygulamanın yorumlarında kullanıcılar "reklamsız" satın alıp yine reklam gördüğünü, bazı reklamsız alımların çalışmadığını ve oyunlar arasında reklam çıktığını yazıyor. Kaynak: https://justuseapp.com/en/app/6737204850/queens-logic-board-puzzle/reviews
2. **İpucu "neden"i söylemiyor.** İpucu yalnızca bir kareyi parlatıyor; bir kullanıcının ifadesiyle "Hints should have the why" (aynı kaynak). Ödüllü videodan sonra ipucu gelmediği şikâyeti de var. Bizim kademeli ipucu sistemimizin (Bölüm 4) dayanağı bu.
3. **Tahmin / çoklu çözüm.** Aynı sayfada çoklu çözümlü bulmacalar "deneme-yanılma" diye eleştiriliyor. Bir Star Battle uygulamasının yorumlarında da bazı oyuncular tahmin etmek zorunda kaldıklarını ve her bulmacanın mantıkla çözülüp çözülmediğini sorguluyor. Kaynak: https://appshunter.io/ios/app/1494377962/reviews/3 . Bizim "tek çözüm + tahmin gerektirmez" şartımızın (Bölüm 2) dayanağı.
4. **İlerleme kaybı ve satın alma baskısı.** Güncelleme sonrası ilerlemenin sıfırlanması (justuseapp), yeni oyun başlatmayı engelleyen satın alma ekranları ve aynı bulmacanın tekrar gelmesi (appshunter) sık geçen şikâyetler. Çıkarım: kayıt sistemi sürümler arası uyumlu olmalı; satın alma ekranı oyunu asla engellememeli; her oyuncuya tekrarsız sıra verilmeli.
5. **Övgüler.** Sürükleyerek işaretleme ("swipe-to-block") jesti, geniş bulmaca paketleri ve "mantıkla çözme tatmini" övülüyor; zorluk basamaklarında kolay ile zor arasında boşluk olduğu, ara seviye istendiği belirtiliyor (appshunter). Çıkarım: sürükleme jesti zorunlu, 5 basamaklı kademe doğru.

---

## 1. Temel kural seti (tek standart)

**Seçilen standart: "Bir-Bir-Bir, Değmez".** N×N ızgara, tam N renkli bölge.

| Kural | Değer |
|---|---|
| K1 Satır | Her satırda tam 1 taş |
| K2 Sütun | Her sütunda tam 1 taş |
| K3 Bölge | Her bölgede tam 1 taş |
| K4 Komşuluk | İki taş, çapraz dahil 8 yönde birbirine değemez (yan yana, alt alta, çaprazda komşu olamaz) |
| K5 Bölge sayısı | Bölge sayısı = ızgara boyutu N. Toplam taş = N |
| K6 Bölge yapısı | Her bölge 4 yönde bitişik hücrelerden oluşur, boş değildir, hücre birden fazla bölgeye ait olamaz |

**Gerekçe.**
- K1+K2+K3 birlikte N bölge zorunlu kılar; bu, bulmacayı "her satır/sütun/bölge eşit ağırlıkta" tutar ve tek çözümlü üretimi mümkün kılar.
- K4 (çapraz dahil değmeme) oyuna ayırt edici derinlik verir: satır ve sütunun ötesinde "komşu eleme" tekniklerini (Bölüm 2) doğurur. Değmeye izin verilseydi bulmaca çok gevşer, zorluk ölçeği çökerdi.
- Bu kural kümesi genel bir bulmaca türüdür; rakipten ayrışmayı arayüz, tema, ipucu ve koleksiyon ile yapıyoruz (Bölüm 7, 3, 4).
- Çift taşlı (satır başına 2) varyant ilk sürümde yok (Bölüm 2.3).

**Test edilebilir doğrulama (birim testleri bunu bire bir uygular).**
- V1: `taş sayısı == N` ve her satırda sayım = 1.
- V2: her sütunda sayım = 1.
- V3: her bölgede sayım = 1.
- V4: her taş çifti için `max(|Δsatır|, |Δsütun|) >= 2`.
- V5: seviye geçerli sayılır ancak ve ancak V1–V4 hepsi sağlanıyorsa. Çözüm = V1–V4'ü sağlayan konfigürasyon.
- Hata tanımı (oyun içi): oyuncu bir taş koyduğunda V1/V2/V3/V4'ten biri o taş için ihlal ediliyorsa "çakışma" vardır (taşla çakışan taşlar işaretlenir). Çözümle karşılaştırmaya dayalı hata gösterimi yoktur (çözümü ele vermemek için; Bölüm 3.5).
- Seviye doğrulama paketi: her seviye için testte (a) bölgeler bitişik, (b) bölge sayısı = N, (c) çözüm sayısı tam 1 (Bölüm 2.2), (d) gömülü çözüm V5'i sağlıyor.

---

## 2. Beş zorluk seviyesi

### 2.1 Mantık teknikleri (çözücünün kademeleri)

Çözücü, ardışık adımlarda "uygulanabilir en kolay tekniği" seçer. Teknik kademeleri:

- **T1 Tek aday.** Bölge/satır/sütunda tek aday hücre kalmışsa taş orada. Konulan taşın satırı, sütunu, bölgesi ve 8 komşusu elenir.
- **T2 Bölge kilidi.** Bir bölgenin tüm adayları tek satır (veya sütun) içindeyse, o satırın (sütunun) diğer bölgelere ait hücreleri elenir. Tersi de geçerli (bir satırın adayları tek bölgede kalıyorsa o bölgenin diğer hücreleri elenir).
- **T3 Küme.** k bölgenin tüm adayları tam k satır (veya sütun) içindeyse, bu satırların diğer hücreleri elenir (k=2 ve 3). Tersi de geçerli.
- **T4 Ortak komşu.** Bir bölgenin (veya satır/sütunun) tüm aday hücrelerine aynı anda komşu olan hücreler elenir; ayrıca k=4'e kadar küme ve komşuluk ile birleşen zincirler. Kural bazlı, varsayımsız çıkarım.
- **T5 Çelişki (derinlik 1).** Bir hücreye taş koyup en çok 2 tur T1–T4 uygulayınca çelişki çıkıyorsa o hücre elenir. Oyuncu için bu bir "tahmin" değildir: sonuç kanıtlanabilir, ama oyuncu zihninde "ya şöyle olsaydı" der. Bu yüzden yalnızca en üst seviyede ve ipucunda "Çelişki" adıyla açıklanır.
- **T6 (YASAK).** Derinlik 2 ve üstü çelişki veya deneme-yanılma. Hiçbir seviyede T6 gerekmez.

### 2.2 Tek çözüm ve "tahmin yok" ölçütü (kabul testi)

Her seviye için üretim hattında iki bağımsız kontrol:
1. **Tekillik:** geri izlemeli (backtracking) çözücü tüm çözümleri sayar; sayı tam 1 olmalı.
2. **Tahminsizlik:** mantık çözücüsü yalnızca T1–T5 ile bulmacayı tamamen bitirmelidir. T6 gerekiyorsa seviye çöpe atılır.

**Zorluk etiketi = çözücünün kullandığı en zor teknik.** Seviye, çözümü için gereken en yüksek teknik kademesine göre sınıflandırılır; zorluk ayrıca "o kademenin kaç adımda gerektiği" ile ince ayarlanır (aynı zorluk içinde sıralama için).

### 2.3 Zorluk tablosu

| # | Ad (Türkçe) | Izgara | Taş | En zor teknik (kabul koşulu) | Hedef süre | Seviye sayısı |
|---|---|---|---|---|---|---|
| 1 | Çırak | 5×5 (15 seviye), 6×6 (35) | 5–6 | Yalnız T1. T2 gerekmez. | 1–2 dk | 50 |
| 2 | Kalfa | 7×7 | 7 | En zor T2; en az 1 adımda T2 gerekir | 2–4 dk | 60 |
| 3 | Usta | 8×8 | 8 | En zor T3; en az 1 adımda T3 gerekir | 4–7 dk | 70 |
| 4 | Başusta | 9×9 | 9 | En zor T4; en az 2 adımda T4 gerekir | 6–10 dk | 70 |
| 5 | Nakkaş | 10×10 | 10 | En zor T5; en az 1 adımda T5 gerekir | 8–15 dk | 50 |

Toplam: 300 seviye. Hedef süreler, ilk iç testte (en az 10 oyuncu) ortalama çözüm süresinin bandın içine düşmesi ile doğrulanır; dışına düşen seviye bir alt/üst zorluğa kaydırılır.

**Bölge tasarım kısıtları (üretici için):**
- D1: bir tane tek hücrelik bölge olabilir (ilk 10 seviye); sonra yok.
- D2–D5: en küçük bölge ≥ 2 hücre; en büyük bölge ≤ ızgara alanının %30'u.
- Hiçbir seviyede bir bölge tüm bir satırı/sütunu kapsamamalı (çözümü hemen verir).
- Aynı seviye iki kez üretilmez (bölge düzeni özet kodu / hash ile tekilleme, yansıma ve döndürme dahil).

### 2.4 Satır başına 2 taşlı varyant: REDDEDİLDİ (ilk sürüm)

Gerekçe:
- Mekanik başına "tek mekanik" kararımızı bozar; kural metni ve öğretici iki katına çıkar.
- Tekil çözüm üretimi ve "tahminsiz" doğrulama çok daha pahalı; ilk sürüm takvimini riske atar.
- Izgara boyutu sınırlı kalacak (ekrana sığma, Bölüm 9); 10×10 zaten yeterli derinlik veriyor.
- Fırsat olarak saklanır: v1.1'de "Çift Taş" ayrı bir paket olarak (ayrı mekanik, ayrı öğretici) yeniden değerlendirilir. İndirme/elde tutma verisi iyi çıkarsa yapılır.

---

## 3. Kontroller

### 3.1 Hücre durumları ve dokunma döngüsü
Durumlar: **boş → işaret (X) → taş → boş**.
- Tek dokunuş sıradaki duruma geçirir.
- Ayarlarda "Hızlı taş" seçeneği (varsayılan kapalı): boş → taş → X → boş sırasına çevirir.
- Uzun basma (350 ms): doğrudan taş koyar / varsa kaldırır (deneyimli oyuncu kısayolu).
- Dokunma geri bildirimi: hafif titreşim (ayarlardan kapatılabilir) ve kısa ses.

### 3.2 Sürükleyerek çoklu işaretleme
- Boş bir hücreden başlayıp sürüklemek geçilen **boş** hücrelere X koyar. X hücreden başlayıp sürüklemek geçilen X hücrelerini siler.
- Sürükleme taş olan hücreye girince taşı etkilemez (atlar).
- Sürükleme tek geri al adımıdır (sürüklemede yapılan tüm işaretler bir seferde geri alınır).
- Taş yalnızca dokunarak/uzun basarak konur; sürükleme taş koymaz (yanlışlıkla taş koymayı önler).

### 3.3 Otomatik X (Ayarlar'dan açılıp kapanır; varsayılan: AÇIK)
- Taş konunca: o taşın satırındaki, sütunundaki, bölgesindeki ve 8 komşusundaki **boş** hücrelere otomatik X konur.
- Otomatik X'ler oyuncunun elle koyduğu X'lerden ayrı etiketlenir (açık renk/ince çizgi).
- Taş kaldırılınca yalnızca o taşın doğurduğu ve başka taş tarafından da gerekçelendirilmeyen otomatik X'ler silinir. Elle konan X'e dokunulmaz.
- Otomatik X, çözüm bilgisi vermez; yalnızca K1–K4 yüzünden imkânsız hücreleri işaretler.
- Ayar kapalıyken oyun akışı aynıdır; oyuncu tüm X'leri kendisi koyar.

### 3.4 Geri al / ileri al
- Sınırsız, seviye boyunca (seviye yeniden başlatılana kadar).
- Bir dokunuş + onun otomatik X'leri = tek adım.
- Yeni bir hamle yapılınca ileri al yığını temizlenir.
- İpucunun uyguladığı adım da geri alınabilir; ancak harcanan ipucu hakkı iade edilmez.
- Butonlar: geri al, ileri al (ikon, ≥ 44 dp).

### 3.5 Hata gösterimi
- **Varsayılan: anında çakışma gösterimi AÇIK.** Çakışan taşlar kırmızı çerçeve + zikzak desen (yalnız renk değil) ile gösterilir; çakışmanın nedeni olan satır/sütun/bölge/komşuluk çizgisi kısa süre parlar.
- Ayarlarda "Hataları göster" kapatılabilir. Kapalıyken çakışma görünmez, ama hata sayısı **yine sayılır** (paylaşımda adil olsun diye).
- Hata sayısı = çakışma yaratan taş koyma sayısı. Aynı çakışma yeniden koymadan sayılmaz.
- Çözümle karşılaştırma yoktur: kurala uyan ama çözümde olmayan taş "hata" sayılmaz. Gerekçe: aksi halde hata göstergesi çözümü ele verir ve oyuncuyu tahmine iter (Bölüm 0, madde 3). Çözümde olmayan taş sonunda mutlaka çakışmaya yol açar; oyuncu yanlış yolu mantıkla bulur.

### 3.6 Seviye sonu
- Son taş konulup V5 sağlanınca: taşlar çini parçasına dönüşür, tahta birkaç saniyelik bir "mozaik tamamlandı" animasyonu oynar, ardından sonuç kartı gelir.
- Sonuç kartı: süre, ipucu, hata (ikonlarla), kazanılan yıldız (1–3), yeni çini parçası (Bölüm 7), "Sonraki" ve "Tekrar" düğmeleri.
- **Yıldız ölçütü:** ★ çözüldü. ★★ ipucu ≤ 1 **ve** hata ≤ 2. ★★★ ipucu 0 **ve** hata 0. Süre yıldızı etkilemez (baskı yaratmamak için); en iyi süre kişisel rekor olarak gösterilir.
- "Sonraki" düğmesi hiçbir zaman geciktirilmez veya reklamla engellenmez (reklam kuralları Bölüm 8).
- Seviye ortasında oyundan çıkılırsa tahta, işaretler, süre ve geri al yığını kaydedilir; döndüğünde devam eder.

---

## 4. İpucu sistemi

### 4.1 Kademeli ipucu (3 basamak, "neden"i açıklar)
İpucu, mantık çözücünün o anki tahtada bulduğu **en kolay** çıkarımı kullanır (T1'den başlar). Oyuncunun yanlış yerleştirdiği/çakışan taş varsa önce o gösterilir ("önce şunu düzelt").

1. **Aşama 1 — Bölgeyi göster.** Çıkarımın dayandığı alan (bölge, satır ya da sütun) yumuşak parıltıyla vurgulanır. Metin yok. Maliyet: **1 ipucu hakkı**.
2. **Aşama 2 — Tekniği açıkla.** Teknik ikonu ve kısa adı (T1–T5 adı, tek satır) görünür; elenecek hücrelerde yarı saydam X'ler canlandırılarak "neden"i gösterir. Maliyet: **0** (aşama 1'in devamı).
3. **Aşama 3 — Uygula.** Çıkarımın sonucu tahtaya işlenir (taş konur veya X'ler konur). Tek geri al adımıdır. Maliyet: **ek 1 ipucu hakkı** (tam ipucu toplam 2 hak).

Oyuncu istediği aşamada durabilir. Aşama 1 harcanmadan aşama 3'e doğrudan geçmek mümkün değildir (sırayla).

### 4.2 Kural: ipucu hakkı yokken
Düğme "reklam izle, +2 ipucu" durumuna dönüşür (Bölüm 4.4). Oyun asla engellenmez.

### 4.3 İpucu ekonomisi (rakamlar)
| Kaynak | Miktar | Sınır |
|---|---|---|
| Kurulumda başlangıç | 5 hak | tek sefer |
| Günlük ilk giriş | +1 hak (reklamsız alıcıya +2) | bakiye 5'in altındaysa tamamlanır, "ücretsiz tavan" 5 |
| Günlük bulmacayı çözmek | +1 hak | genel tavan 12 |
| Her 10 seviye tamamlama (toplam) | +1 hak | genel tavan 12 |
| Ödüllü reklam izleme | +2 hak | günde en çok 10 reklam; bakiye tavanı 12 aşılmaz |
| "Reklamları kaldır" satın alma | +10 hak (tek sefer) | genel tavan 12'ye bakılmaksızın bir kez |

- Genel bakiye tavanı: **12** (ödüllü reklamla kazanılan haklar da dahil; tavan aşılmaz).
- Tahmini ücretsiz gelir: ~1 + 1 + 0,7 ≈ 2,5 hak/gün düzenli oyuncuda. Tahmini tüketim: haftada 20 seviye × %15 ipucu kullanımı × ort. 1,5 hak ≈ 4,5 hak/hafta. Yani dikkatli oyuncu reklam izlemeden idare eder; ağır ipucu kullanan oyuncu için ödüllü reklam doğal gelir kapısıdır. Bu oranlar yayından sonraki ilk 2 haftada telemetriyle kalibre edilecek.
- İpucu satışı (IAP paketi) ilk sürümde yok: "ödemeyen oyuncu ceza görüyor" algısı pazar liderine yönelik şikâyeti besliyor (Bölüm 0).
- Kullanılan hak, aşama 3'ten sonra geri al ile iade edilmez.

### 4.4 Ödüllü reklam akışı
- Düğme "▶ +2" ikonuyla açıkça ne kazanacağını gösterir; oyuncu dokunmadan reklam asla oynamaz.
- Reklam yüklenemez veya oynatılamazsa: ödül verilmez, düğme "şimdi hazır değil" durumuna döner ve oyuncuya ücretsiz +1 hediye hak verilir (yorumlardaki "videodan sonra ipucu gelmedi" şikâyeti için). Günde en çok 1 hediye.
- Reklam tamamen izlenip ödül verildiğinde hak anında bakiyeye yazılır, uygulama kapanırsa kaybolmaz (yerel kayıt).

---

## 5. Günlük bulmaca

### 5.1 Herkese aynı
- **Gün numarası** = yerel takvim tarihinin ilk herkese açık günden (gün #1; web önizlemenin stüdyo sitesinde yayınlandığı gün, tarih yayında sabitlenir) itibaren kaçıncı gün olduğu. Aynı takvim tarihinde dünyanın her yerinde aynı bulmaca açılır (saat dilimi farkı sadece "bugün"ün ne zaman başladığını değiştirir).
- Bulmaca **önceden üretilmiş havuzdan** seçilir: havuz haftanın gününe göre 7 kuyruğa ayrılır (her kayıtta `dow` alanı) ve o günün haftanın günü kuyruğundan `kuyruk[dow][floor((gün# - 1) / 7) mod kuyruk uzunluğu]` alınır; böylece zorluk eğrisi takvimle tutar. Havuz, tarih tohumlu (seed = gün numarası) deterministik üreticiyle çevrimdışı oluşturulur ve tek çözüm / tahminsizlik testlerinden (Bölüm 2.2) geçirilmiş 400 bulmacadan oluşur, uygulamayla birlikte gelir. Cihazda üretim yapılmaz: web ve Flutter arasında farklı sonuç riski yok.
- Havuz tükenmeden önce (uygulama güncellemesiyle veya stüdyo sitesindeki statik JSON ile) yenilenir; sunucu gerekmez (Bölüm 11, soru 3).
- **Haftalık zorluk eğrisi:** Pzt Çırak, Sal Kalfa, Çar Usta, Per Usta, Cum Başusta, Cmt Başusta, Paz Nakkaş.
- Günlük bulmacada ipucu ve geri al kullanılabilir; yıldız yoktur, onun yerine paylaşılabilir sonuç vardır.
- Aynı gün bulmaca bir kez "resmî" sayılır; ilk tamamlama kaydedilir. Tekrar oynama serbesttir ama seri ve paylaşım ilk sonuçtan alınır.
- Kaçırılan günler: "Arşiv" ilk sürümde yok (basit tut); kaçırılan gün oynanabilir ama seriyi kurtarmaz (aşağıda seri kurtarma ayrı).

### 5.2 Seri sayacı
- Seri, her takvim günü günlük bulmacayı tamamlayınca +1 olur. Bir günü kaçırınca sıfırlanır.
- **Seri koruma:** her 7 günlük seri için 1 koruma kazanılır (en çok 2 biriktirilir); bir gün kaçırılırsa otomatik harcanır, seri bozulmaz.
- **Seri kurtarma (ödüllü reklam):** koruması olmayan oyuncu seri bozulduktan sonra bir kez, ödüllü reklam izleyerek dünkü seriyi kurtarabilir (günde 1 kez, en çok haftada 1). Satın alma gerekmez.
- Cihaz saati geriye alınarak seri hile ile uzatılabilir; ilk sürümde çözülmeyecek, risk kabul edildi (sunucu yok).
- Ekranda yalnızca ikon + sayı (🔥 12) gösterilir.

### 5.3 Paylaşım metni (çözümü ele vermez, dilden bağımsız)
Paylaşım yalnızca emoji, rakam ve oyun adından oluşur; metin çevirisi gerekmez, 8 dilde aynı görünür. Çözümün **konumunu** değil, oyuncunun **hamle seyrini** gösterir (kaç taş koydu, hangisinde ipucu aldı, hata oldu).

Biçim:
```
Mozaik Mantık #12
⏱ 03:42   💡 1   ✖ 0   ★★☆   🔥 5
🟦🟦🟨🟦🟦🟦🟦🟦
https://ttuncaydemirr-beep.github.io/
```
- Satır 1: oyun adı (çevrilmez) + gün numarası.
- Satır 2: süre (dk:sn, Batı rakamları), 💡 kullanılan ipucu sayısı, ✖ hata sayısı, ★ sayısı (günlükte yıldız ölçütü Bölüm 3.6 ile aynı hesaplanır), 🔥 seri.
- Satır 3: **hamle şeridi.** Her konulan ve yerinde kalan taş için bir kare, **konulma sırasıyla**: 🟦 temiz yerleştirme, 🟨 ipucuyla yerleştirme, 🟥 çakışma yaratıp sonra düzeltilmiş taş. Kare sayısı = N (ızgara boyutu). Şerit hangi hücrelere taş konduğunu söylemez; çözümü ele vermez.
- Satır 4: stüdyo sitesi bağlantısı (gerçek Play bağlantısı yayında eklenir).
- Arapça için: her satırın başına görünmez sol-sağ işareti (U+200E) eklenir; kare ve rakam sırası bozulmaz. Metin sistem paylaşım menüsüyle gönderilir, düz metindir. "Kopyalandı" geri bildirimi (anahtar: share_copied).
- Rakamlar tüm dillerde Batı rakamlarıdır (paylaşımı tutarlı tutar).
- Hata sayısı paylaşımda "0" ise ✖ 0 görünür (gizlenmez; "temiz çözüm" gurur kaynağı).

---

## 6. Öğretici (en çok 3 kısa seviye, metinsiz ağırlıklı)

Öğretici ilk açılışta otomatik başlar, "Atla" ile kapatılabilir (kısa metin). Reklam yok, ipucu hakkı harcanmaz, hata sayılmaz. Her seviye 20–60 sn.

| # | Izgara | Öğrettiği | Anlatım | Metin |
|---|---|---|---|---|
| 1 | 4×4, tek çözüm | "Her bölgeye bir taş" ve K1–K3 | Tek hücrelik bölge titreşir, el ikonu dokunur, taş konur, satır/sütun/bölge çizgisi kapanır; sonra kalan bölgeler elle tamamlatılır | tut_1 (1 satır) |
| 2 | 5×5 | K4 "taşlar değmez" | Konan taşın çevresindeki 8 hücreye otomatik X yağar (animasyon); oyuncu geri kalanını T1 ile çözer | tut_2 (1 satır) |
| 3 | 6×6 | T2 "bölge kilidi" | Bir bölgenin tüm adayları tek satırda: satır parlar, diğer hücreler solar; oyuncu bu çıkarımla ilerler | tut_3 (1 satır) |

- Doğru yönlendirme: yanlış hücreye dokununca hata çıkmaz, parlayan hücre geri gelir ("sessiz yönlendirme").
- İpucu ve tekniği, ilk gerçek seviyede bir kez daha gösterilir (ikon balonu, metinsiz).
- Öğretici seviyeleri ilerleme ve seviye sayacından hariçtir (ilk reklam sayacına da dahil değildir).

---

## 7. İlerleme

### 7.1 Seviye haritası / paketler
- 5 paket = 5 zorluk (Çırak, Kalfa, Usta, Başusta, Nakkaş). Paketler sırayla açılır: Kalfa için Çırak'ta ≥ 30 seviye tamam (ya da Çırak'ta ≥ 20 ★★+); sonraki paketler aynı mantıkla. Kilit ekranında koşul yalnızca ikon + sayıyla gösterilir. Her paket yine de kilit atlanarak "Rastgele" ile oynanabilir olmamalı: bu, zorluk eğrisini korur.
- Paket içinde seviyeler küçük çini karolarının ızgarası olarak gösterilir (yol/harita yerine "pano"). Tamamlanan karo renkli, o seviyenin yıldızları karo altında.
- Aynı paketten seviye sırası sabittir (herkese aynı), tekrar eden bulmaca gelmez (Bölüm 0, madde 4).
- Seviyeye tekrar girip daha iyi yıldız alınabilir; en iyi sonuç saklanır.

### 7.2 Yıldız ve puan
- Seviye başına 1–3 ★ (Bölüm 3.6). Paket sonunda toplam yıldız gösterilir. Ayrı bir "puan" sistemi yok (basit tut).
- Toplam yıldız eşikleri koleksiyondaki "altın çerçeve" için kullanılır (Bölüm 7.3).

### 7.3 Koleksiyon: "Çini Atölyesi" (özgün özellik)
Fikir: Her seviye bir **çini parçası** kazandırır. Her pakete ait büyük bir **İznik çini panosu** parça parça tamamlanır.
- Pano boyutu = paketteki seviye sayısı: Çırak 5×10 parça (50), Kalfa 6×10 (60), Usta 7×10 (70), Başusta 7×10 (70), Nakkaş 5×10 (50).
- Her panonun motifi bir İznik klasiği: lale, karanfil, servi, hatayi, salkım (öneri, nihai seçim görsel kimlik ekibine bırakılır).
- Parça görünümü yıldıza bağlı: ★ sade sırsız parça, ★★ renkli sırlı, ★★★ sırlı + altın çerçeve. Daha iyi yıldız alınca parça "yeniden sırlanır".
- Pano tamamlanınca: motifin tam resmi bir "çini müzesi" galerisine girer; paylaşılabilir bir görsel olarak dışa aktarılabilir (metinsiz).
- **Günlük çini:** günlük bulmacayı çözmek, o ayın "ay panosu"nda o günün karosunu açar (28–31 parça). Ay biterken pano tamamlanmışsa özel bir çini olarak galeriye eklenir. Bu, seri sayacıyla birleşerek elde tutmayı destekler.
- Hiçbir çini parçası satın alınmaz; sadece oynayarak kazanılır (kozmetik dahi para ile satılmaz).
- Rakiplerden ayrışma: kedi/hayvan teması yok; tema ve koleksiyon, tamamen Türk çini sanatı üzerine kurulu. Görseller (motifler, palet, taş şekli) özgün çizilir; rakibin hiçbir görseli, rengi ya da adı referans alınmaz.

### 7.4 Görsel kimlik notu (tasarım yönü, kesinleşme görsel kimlik kararlarında)
- Bölge renkleri İznik paletinden: kobalt, turkuaz, mercan/domates kırmızısı, zümrüt, krem/beyaz, altın sarısı vb. Kesin değerler ekibin araştırmasıyla ve "Görsel Kimlik Kararları" belgesiyle belirlenir; varsayılan/standart renk ve yazı tipleri kullanılmaz.
- Taş = küçük bir çini parçası (motifli kare/altıgen); X = küçük çatlak/sır işareti. Izgara = bir çini panosu.

---

## 8. Reklam yerleşimi (kesin kurallar)

**Gelir modeli:** ödüllü reklamla ipucu + 3–4 seviyede bir geçiş reklamı + tek seferlik "Reklamları kaldır".

### 8.1 Geçiş (interstitial) reklamı
- Yalnızca **seviye sonu kartında "Sonraki"ye basıldıktan sonra** gösterilir. Seviye ortasında, ipucu sırasında, uygulama açılışında, paketler arası geçişte, günlük bulmacada ve öğreticide **asla**.
- **İlk 6 gerçek seviyede hiç** reklam yok (öğretici seviyeleri sayılmaz).
- Sıklık: 7. tamamlanan seviyeden itibaren **her 4 tamamlanan seviyede 1** (7., 11., 15., ...). 
- En az **120 sn** önceki geçiş reklamından sonra olmalı; olmazsa o seviyede gösterilmez, sayaç 4'te bekler, sonraki tamamlamada yeniden denenir.
- Günlük üst sınır **yok** (Tuncay onayı, 22 Kasım). Sıklığı yukarıdaki kurallar yönetir.
- Tüm rakamlar (kaç seviyede bir, en kısa ara, isteğe bağlı günlük sınır) Firebase Remote Config'ten güncelleme olmadan değiştirilebilir. Yayından sonra 3, 4 ve 5 seviyede bir denenir; 7. gün geri dönüş ve oyuncu başı gelire göre en iyisi seçilir.
- Oyuncu son 5 dakikada ödüllü reklam izlediyse sayaç sıfırlanır (iki reklam üst üste yok).
- Sonuç kartı ≥ 2 sn gösterildikten sonra reklam başlar (oyuncu başarının tadını çıkarsın); kapanma düğmesi reklam tarafından geciktirilebilen kısım dışında oyun hiç beklemez.
- Reklam yüklenmemişse sessizce atlanır; oyun beklemez.
- Çevrimdışıyken reklam gösterilmez.
- Uygulamaya geri dönüşte (arka plandan) reklam yok.

### 8.2 Ödüllü reklam
- Yalnızca oyuncu bir düğmeye bastığında oynar. Ödül düğmenin üzerinde net görünür.
- Kullanım yerleri: (a) "ipucu hakkı +2" (Bölüm 4.3, günde en çok 10), (b) "seri kurtarma" (Bölüm 5.2).
- Günde toplam en çok **11** ödüllü reklam (10 ipucu + 1 seri kurtarma); sınırlar Remote Config'ten değiştirilebilir.
- Reklamsız alıcılar için ödüllü reklam **isteğe bağlı** olarak sürer (ödül kazanmak için gönüllü izleme).

### 8.3 Banner (yalnızca öneri; Banner Kararları belgesiyle birlikte karara bağlanır)
- Yalnızca **seviye haritası / paket seçim ekranında** altta, uyarlanabilir banner (≤ 60 dp). **Oyun tahtası, günlük bulmaca, sonuç kartı, öğretici ve ayarlarda yok.** Bu ekranlarda banner oyuncuyu kaybettirmez.
- Reklamsız alıcıda görünmez.

### 8.4 "Reklamları kaldır"
- Tek seferlik satın alma; Google Play'den geri yüklenebilir ("Satın alımı geri yükle" düğmesi Ayarlar'da).
- Kaldırdıkları: geçiş reklamları ve banner. Kalanlar: isteğe bağlı ödüllü reklam.
- Bonus: +10 ipucu hakkı (tek sefer) ve günlük giriş +2.
- Satın alma ekranı oyunu **asla engellemez**; yalnızca Ayarlar'da ve (en çok günde bir kez, sonuç kartının altında küçük bir düğme olarak) sunulur, açılır pencere olarak çıkmaz.
- Başarılı satın alma sonrası tüm reklamlar hemen kapanır, yeniden başlatma gerekmez (yorumlardaki "ödedim, reklam sürüyor" şikâyeti: Bölüm 0, madde 1).

### 8.5 Genel
- Reklam onayı (GDPR/UMP gibi) ilk açılışta tek seferlik; "Reklam tercihleri" Ayarlar'da.
- Reklam ağı çağrıları seviye oynanışını yavaşlatmaz (arka planda önceden yükleme).

---

## 9. Erişilebilirlik

### 9.1 Renk körlüğü: bölge ayrımı
- **Kalın bölge sınırı her zaman açık** (bölgeler arası 3 dp koyu çizgi, bölge içi 1 dp ince çizgi). Renge güvenmeden bölge ayırt edilir.
- **Desen modu** (Ayarlar, "Desen modu"): her bölgeye farklı bir çini deseni (nokta, çizgi, kare, dalga, yıldız vb., en çok 10 farklı desen) uygulanır; renk körü oyuncular için varsayılan olarak sistem erişilebilirlik ayarı varsa otomatik açılır.
- Renk paleti protanopi, deuteranopi, tritanopi simülasyonunda tüm bölge çiftlerinin ayırt edilebilirliğiyle test edilir; ayırt edilemeyen çiftlerde desen zorunludur.
- Durumlar renk dışında da ayırt edilir: taş = şekil, X = çarpı biçimi, çakışma = kırmızı + zikzak desen + çerçeve.
- Kontrast: sınırlar ve taş, hücre zeminine karşı en az 3:1; metinler en az 4,5:1. Koyu tema bulunur.

### 9.2 Dokunma hedefi
- **Tüm düğmeler, ikonlar ve kontroller en az 44×44 dp.**
- **Izgara hücreleri istisnadır:** 360 dp genişlikli telefonda 10×10 tahta ancak ~34 dp hücre verir. Çözüm: hücre boyutu = `(ekran genişliği − 16 dp) / N`, alt sınır 30 dp; **yakınlaştırma** ile hücre ≥ 44 dp yapılır (iki parmak/çift dokunma; tahta kaydırılabilir). 5×5–7×7'de hücreler zaten ≥ 44 dp.
- Boşluklar/sınırlar sıkışık hücrelerde dokunma alanını daraltmaz: hücre dokunma alanı ızgara çizgilerinin ortasına kadar uzanır.

### 9.3 Izgara boyutunun ekrana sığması
- Maksimum ızgara 10×10 (kasıtlı): 11×11 ve üstü telefonda hücreleri 31 dp altına indirir.
- Tahta, ekranın en az %55'ini kaplayacak şekilde ölçeklenir; geri kalan alan düğmeler ve üst çubuk içindir. Dikey ve yatay (tablet) yerleşim desteklenir; telefonda yalnızca dikey zorunlu.
- Yazı boyutu sistem ayarına uyar; tahta ölçeklenmez ama düğme metinleri taşmaz (az metin sayesinde).

### 9.4 Diğer
- Ekran okuyucu: her hücre "satır, sütun, bölge numarası, durum" okur (anahtarlar a11y_*).
- Ses ve titreşim kapatılabilir; hareket azaltma ayarı animasyonları kısaltır.
- Arapça: arayüz sağdan sola aynalanır (düğme sırası, menüler). **Izgara aynalanmaz** (satır/sütun düzeni ve paylaşılan sonuç herkes için aynı kalsın); sayılar Batı rakamlarıyla yazılır.
- Dil seçimi: sistem dilini izler; Ayarlar'dan değiştirilebilir. Tüm metinler çeviri anahtarı üzerinden gelir; oyunda metin yok denecek kadar azdır.

---

## 10. Metin sözlüğü (yalnız Türkçe; çeviriler sonra)

Format: `anahtar: Türkçe metin`. Parantez içindeki `{n}`, `{time}` yer tutucudur.

**Genel**
- app_name: Mozaik Mantık
- btn_ok: Tamam
- btn_cancel: İptal
- btn_next: Sonraki
- btn_retry: Tekrar
- btn_share: Paylaş
- btn_skip: Atla
- btn_apply: Uygula

**Menü**
- menu_play: Oyna
- menu_daily: Günlük
- menu_collection: Çini Atölyesi
- menu_settings: Ayarlar

**Zorluk ve seviye**
- diff_1: Çırak
- diff_2: Kalfa
- diff_3: Usta
- diff_4: Başusta
- diff_5: Nakkaş
- level_n: Seviye {n}
- pack_locked: {n} seviye daha

**Oyun**
- game_undo: Geri al
- game_redo: İleri al
- game_hint: İpucu
- stat_time: Süre
- stat_hints: İpucu
- stat_errors: Hata
- win_title: Harika!
- win_new_piece: Yeni çini parçası!

**İpucu**
- hint_none: İpucu hakkın bitti
- hint_watch_ad: Reklam izle, +2 ipucu
- hint_ad_unavailable: Şimdi hazır değil
- hint_gift: Hediye ipucu
- tech_1: Tek aday
- tech_2: Bölge kilidi
- tech_3: Bölge kümesi
- tech_4: Ortak komşu
- tech_5: Çelişki
- hint_fix_first: Önce bunu düzelt

**Günlük**
- daily_title: Günlük Bulmaca
- daily_done: Bugün çözüldü
- daily_next_in: Yenisine {time}
- daily_streak: {n} gün
- streak_save: Seriyi kurtar
- streak_protected: Seri korundu
- share_copied: Kopyalandı

**Öğretici**
- tut_1: Her bölgeye bir taş
- tut_2: Taşlar birbirine değmez
- tut_3: Bölge tek satıra sığıyorsa satır onundur

**Koleksiyon**
- col_title: Çini Atölyesi
- col_complete: Pano tamamlandı
- col_month: Ay panosu

**Ayarlar**
- set_autox: Otomatik X
- set_errors: Hataları göster
- set_quick_stone: Hızlı taş
- set_patterns: Desen modu
- set_sound: Ses
- set_haptic: Titreşim
- set_dark: Koyu tema
- set_language: Dil
- set_remove_ads: Reklamları kaldır
- set_restore: Satın alımı geri yükle
- set_privacy: Gizlilik politikası
- set_ads_consent: Reklam tercihleri
- set_about: Demir Games Studio

**Erişilebilirlik**
- a11y_cell: {row}. satır, {col}. sütun, {region}. bölge, {state}
- a11y_state_empty: boş
- a11y_state_x: işaretli
- a11y_state_stone: taş

(Toplam 67 anahtar. Paylaşım metni dilden bağımsız olduğu için sözlükte yoktur. Oyun adı ve "Demir Games Studio" çevrilmez.)

---

## 11. Açık sorular (Tuncay'ın kararı)

1. **"Reklamları kaldır" fiyatı ve ek ürün.** Öneri: tek ürün, orta fiyat kademesi (yaklaşık 100 TL / 3 USD karşılığı Play fiyat basamağı); ipucu paketi satılmasın, çini kozmetiği satılmasın. Gerekçe: pazar liderine en büyük şikâyet reklam ve Android'de reklamsız sürüm olmaması; "tek net satın alma" güven yaratır ve yorumları olumlu tutar.
2. **Seviye haritası altında banner reklam olsun mu?** Öneri: ilk sürümde **olsun**, yalnızca harita/paket ekranında, 60 dp altı; oyun ekranlarında hiç olmasın; metrikler kullanıcı kaybı gösterirse kaldırılır. Alternatif: hiç banner yok (daha temiz, biraz daha az gelir).
3. **Günlük bulmaca ve seri için sunucu/hesap gereksin mi?** Öneri: ilk sürümde **sunucusuz** (çevrimdışı havuz + yerel kayıt, yenileme stüdyo sitesindeki statik dosyayla). Gerekçe: hız, maliyet sıfır, gizlilik sade; ama cihaz saati değiştirilerek seri uzatılabilir ve cihaz değişince seri taşınamaz. Liderlik tablosu/bulut yedek v1.1'de Play Games ile eklenebilir.

---

### Ek: ilk sürüm kabul listesi (özet)
- [ ] V1–V5 doğrulama birim testleri geçer.
- [ ] 300 seviyenin tamamı: tek çözüm, T1–T5 ile çözülür, zorluk etiketi çözücüden gelir.
- [ ] Günlük havuz 400 bulmaca, aynı tarihte aynı bulmaca (web ve Flutter çıktıları özdeş).
- [ ] Paylaşım metni 8 dilde aynı ve sol-sağ işaretiyle Arapça'da bozulmuyor.
- [ ] Reklam kuralları sayaçlarla test edilir (ilk 6 benzersiz seviye, 4'te 1, 120 sn, günlük sınır yok).
- [ ] Renk körü simülasyonu ve desen modu testi; düğmeler ≥ 44 dp.
