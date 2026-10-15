# Finale Takibi — Sürümler

Bu dosya sürüm geçmişidir: hangi sürümde ne var, hangi commit'ler o sürüme ait ve o sürüme nasıl dönülür.
Yeni sürüm EN ALTA eklenir. Güncel sürüm ayrıca `SURUM` dosyasında tek satır olarak durur.

## Sürüm numarası nasıl okunur

`vBÜYÜK.ORTA.KÜÇÜK Kodad` — örnek: `v0.1.0 Heisenberg`

| Basamak | Ne zaman artar | Kodad |
|---|---|---|
| KÜÇÜK (v0.1.**1**) | Hata düzeltme, küçük görünüm düzeltmesi, belge | Aynı kalır |
| ORTA (v0.**2**.0) | Yeni özellik, yeni ekran, yeni modül | Yeni bilim insanı |
| BÜYÜK (v**1**.0.0) | Veri yapısı değişimi, geriye uyumsuz değişiklik, büyük dönüm noktası | Yeni bilim insanı |

Kodadlar ünlü bilim insanlarının soyadlarıdır. Her git etiketi (`v0.1.0`) GitHub'da "Releases" sayfasında da görünür.
Not: claude.ai artifact'ının kendi sayacı ("sürüm 56") ayrıdır; hangi artifact sürümüne denk geldiği her sürümde yazılır.

## Bir şeyi bulmak ve geri dönmek

Tüm komutlar `~/Projects/finale-takip` klasöründe çalıştırılır.

| Amaç | Komut |
|---|---|
| Sürümleri listele | `git tag -n1` |
| Commit geçmişini kısa gör | `git log --oneline` |
| Bir kaydın (ör. C021) commit'ini bul | `git log --grep=C021` |
| Bir commit'te ne değişti | `git show <commit>` |
| İki sürüm arasında ne değişti | `git diff v0.1.0 v0.2.0 --stat` |
| Eski sürüme sadece bakmak | `git switch --detach v0.1.0` (geri gelmek için: `git switch main`) |
| Tek bir commit'i geri almak (geçmişi silmeden) | `git revert <commit>` |

Geri alma her zaman `git revert` ile yapılır; geçmiş silinmez (`git reset --hard` ve zorla push kullanılmaz).
Veri (`veri/finale.db`) git'te olmadığı için sürüm değiştirmek veriyi geri almaz; veri yedeği ayrıca `veri/` klasörü kopyalanarak alınır.

---

## v0.1.0 Heisenberg — 13 Ekim 2026

İlk sürüm. claude.ai artifact **sürüm 56** + bağımsız uygulama paketi (pkg1).

**İçerik**
- Sayfa: kredi takibi, gelen/giden fatura, nakit akışı, kâr/zarar, düzenli giderler, personel masrafları ve onay, cariler, özgeçmişler, sözleşmeler, banka, kredi kartları, iki şirket seçici, roller, takım lideri kapsamı, mobil ve kenar menü görünümü.
- Bağımsız paket: `server/` (Node 22.5+, node:sqlite, REST + SSE), `web/shim.js`, `desktop/` (Electron), Docker ve başlatma betikleri.
- Altyapı: `build.py`, `CLAUDE.md`, sürüm ve commit kuralları, bu dosya.

**Commit'ler**

| Commit | Kayıt | Ne |
|---|---|---|
| `defa23f` | C001–C014 | İlk yükleme: zip'teki 28 dosya |
| `c16b496` | C015, C016 | `CLAUDE.md` kalıcı kurallar |
| `d4bd206` | C017 | `build.py` ve OKU-BENI build bölümü |
| `f3f6582` | C018, C019 | `desktop/package-lock.json` |
| `93ab87b` | C020 | Repo adresi belgelere işlendi |
| `4ba2c41` | C022 | `.claude/launch.json` (önizleme için sunucu başlatma ayarı) |
| `fb377b1` | C021 | Sürüm sistemi, `SURUMLER.md`, `SURUM` — **`v0.1.0` etiketi bu commit üzerinde** |

**Test durumu**
- Test edildi: sunucu gerçek veriyle açıldı; 17 ekranın tamamı hatasız yüklendi; veri sayıları doğru (12 kredi, 2 cari, 2 şirket, 2 kullanıcı); Word önizleme; yerel xlsx; `build.py` çıktısı bayt bayt aynı.
- Test edilmedi: kayıt ekleme/düzenleme/silme, Excel'e aktar, dosya yükleme, PDF önizleme, OCR, parola ile giriş ve roller, mobil görünüm, Electron, Docker.

**Bilinen eksikler ve açıklar**
- Banka bakiyesi ve kart ödemeleri nakit akışına bağlı değil.
- Roller yalnızca arayüzde; `APP_KEY` bilen tüm veriyi okur/yazar.
- Giriş çerezi anahtarın kendisini saklıyor; giriş denemesi sınırı yok.
- Başlatma dosyalarındaki yer tutucu anahtarlar değiştirilmezse sunucu onlarla açılır.
- Kullanıcı parolaları tek tur SHA-256 ile özetleniyor.
- "Claude ile fiş/fatura oku" bağımsız pakette yok; haftalık kredi maili hâlâ claude.ai verisini okuyor.

**Etiketten sonraki belge düzeltmeleri** (yeni sürüm sayılmaz)

| Commit | Kayıt | Ne |
|---|---|---|
| `62ced6d` | C023 | Yalnızca kayıt dosyaları değişti; tablo düzeltmesi bir betik hatası yüzünden bu commit'e GİRMEDİ |
| C024 commit'i (`git log --grep=C024`) | C024 | Commit tablosuna gerçek commit kodları yazıldı (C023'ün eksiğini tamamlar) |

---

## v0.2.0 Curie — 13 Ekim 2026

Yeni modül: **Aktiviteler** (danışman efor girişi). claude.ai artifact'ı güncellenmedi; canlı sayfa hâlâ **sürüm 56**, bu sürüm yalnızca bağımsız uygulamada var.

**İçerik**
- Aktivite girişi: danışman, tarih, proje, tür, modül, talep no, çalışma yeri, saat, açıklama, faturalanabilir. Adam/gün = saat ÷ projenin "1 adam/gün kaç saat" değeri (varsayılan 8).
- İç onay: onay yetkisi olmayan rolün girdiği kayıt "onay bekliyor" olur; yönetici onaylar, neden yazarak reddeder, onayı geri alır, hepsini birden onaylar.
- Projeler: müşteri carisi, faturalama birimi (adam/gün, saat, faturalanmaz), birim ücret, para birimi, KDV, durum.
- Faturalama: seçilen ayda proje bazında onaylı tutar; "Fatura taslağı oluştur" Giden faturalar'a numarasız kayıt açar ve aktiviteleri kilitler. Dövizli projede kur elle girilir, fatura TL yazılır.
- Excel'e aktarma, Özet'te onay uyarısı, Ayarlar > Listeler'de aktivite türleri ve modüller.

**Commit'ler**

| Commit | Kayıt | Ne |
|---|---|---|
| `b97746c` | C027 | Aktiviteler sekmesi |
| C028 commit'i (`git log --grep=C028`) | C028 | Sürüm v0.2.0 Curie — **`v0.2.0` etiketi bu commit üzerinde** |

**Test durumu**
- Test edildi (boş test veritabanında): proje ve aktivite ekleme, doğrulamalar, personel girişi ve onay akışının tamamı, TL ve EUR fatura taslağı, taslak silinince aktivitenin serbest kalması, Excel içeriği, 18 sekmenin hatasız açılması, mobil genişlik.
- Test edilmedi: gerçek veriyle açılış, claude.ai artifact'ı, ekip lideri kapsamı, birden çok şirket, Electron, Docker.

**Bilinen eksikler**
- Rolleri Ayarlar'da daha önce kaydettiyseniz "Aktiviteler" sekmesi yönetici dışındaki rollere elle işaretlenmelidir.
- Onay ve kilit yalnızca arayüzde; sunucuda yetki kontrolü yok (v0.1.0'daki genel eksikle aynı).
- Fatura miktarı 2 ondalığa yuvarlanır (12,5 saat = 1,56 adam/gün).
- Müşteri onayı izlenmez; projeye danışman ataması yok (her danışman tüm aktif projeleri görür); resmî tatil takvimi yok.
- v0.1.0'daki eksikler sürüyor.

---

## v0.3.0 Feynman — 13 Ekim 2026

Aktiviteler modülü, şirketin SAP'deki aktivite programları (ZFNL_AKTIVITE_YONETIMI, ZFNL_AKTIVITE_RAPOR) örnek alınarak genişletildi. claude.ai artifact'ı güncellenmedi (hâlâ **sürüm 56**).

**İçerik**
- Faturalama tipi (Ayarlar'da düzenlenir: kod, ad, kural), faturalama durumu ve faturalanmama nedeni.
- Efor statüsü: Eforlanacak, Proje kapsamında, Danışmanda bekliyor, Eforlanmayacak. Yalnızca onaylı ve "Eforlanacak" kayıtlar fatura taslağına girer.
- İş durumu (iptalde neden zorunlu) ve iş statüsü.
- Efor statüsü filtresi, Excel'de yeni sütunlar, projede varsayılan faturalama tipi.
- Onay akışı değişmedi; "Danışmanda bekliyor" kayıt onaylanınca "Eforlanacak" olur.

**Commit'ler**

| Commit | Kayıt | Ne |
|---|---|---|
| `321c639` | C029 | Faturalama tipi, efor statüsü, iş durumu, iş statüsü |
| C030 commit'i (`git log --grep=C030`) | C030 | Sürüm v0.3.0 Feynman — **`v0.3.0` etiketi bu commit üzerinde** |

**Test durumu**
- Test edildi (boş test veritabanında): tip kuralları ve alan görünürlüğü, zorunlu nedenler, tip 05 onay akışı, efor filtresi, eski kayıtların gösterimi, fatura tablosu, Excel sütunları, tip adı kaydı.
- Test edilmedi: gerçek veri, claude.ai artifact'ı, ekip lideri kapsamı, Electron, Docker.

**Bilinen eksikler**
- Faturalama tipi adları "Tip 01–07" olarak geliyor; iş durumu ve iş statüsü listeleri tahmini. Ayarlar'dan gerçek değerler yazılmalı.
- SAP'de olup henüz olmayanlar: ayrı faturalanacak efor (saat + gün), çalışılan / faturalanacak müşteri ayrımı, PYP öğesi, faturalanacak danışman, müşteri danışmanı, ek açıklama, aktivite numarası, danışmanın danışmanı onaylaması.
- v0.2.0'daki eksikler sürüyor.

---

## v0.3.1 Feynman — 14 Ekim 2026

Görünüm güncellemesi: marka rengi koyu yeşilden turkuaza geçti (Claude Design tuvalinde seçildi). Yeni özellik yok. claude.ai artifact'ı güncellenmedi (hâlâ **sürüm 56**).

**Commit'ler**

| Commit | Kayıt | Ne |
|---|---|---|
| `a0774fc` | C031 | Marka rengi turkuaz, uygulama simgesi |
| C032 commit'i (`git log --grep=C032`) | C032 | Sürüm v0.3.1 — **`v0.3.1` etiketi bu commit üzerinde** |

**Test durumu**
- Test edildi: test sunucusunda açık ve koyu temada Aktiviteler sekmesi.
- Test edilmedi: gerçek veri, Electron, Docker.

**Bilinen eksikler**
- Finale tasarım sistemi (claude.ai) hâlâ eski yeşil renklerde.
- Birincil düğme degradesinin açık ucunda beyaz yazı 3,68:1 (eskisi 3,96:1).

---

## v0.4.0 Noether — 15 Ekim 2026

Aktiviteler: Claude Design tuvalindeki haftalık şerit ve telefondan hızlı giriş; SAP'deki aktivite programından kalan alanlar. claude.ai artifact'ı güncellenmedi (hâlâ **sürüm 56**).

**İçerik**
- Haftalık şerit (Pzt–Cum, 8 saate göre halka, önceki haftalar) ve 640px altında sade hızlı giriş.
- Proje kodu, fatura müşterisi, PYP öğeleri, müşteri danışmanı; aktivitede PYP, faturalanacak danışman, faturalanacak efor (saat + ek gün), ek açıklama, aktivite numarası.
- Fatura taslağı faturalanacak efordan ve fatura müşterisine kesilir.

**Commit'ler**

| Commit | Kayıt | Ne |
|---|---|---|
| `1e55f4e` | C033 | Haftalık şerit ve telefondan hızlı giriş |
| `f7d7de6` | C034 | SAP alanları |
| C035 commit'i (`git log --grep=C035`) | C035 | Sürüm v0.4.0 Noether — **`v0.4.0` etiketi bu commit üzerinde** |

**Test durumu**
- Test edildi (test sunucusunda): şerit ve hafta geçişi, mobilde hızlı giriş ve doğrulama, SAP alanlarının tamamı, efor hesabı, fatura taslağı, Excel.
- Test edilmedi: gerçek veri, personel rolüyle giriş, Electron, Docker.

**Bilinen eksikler**
- SAP'deki gibi faturalanacak danışman için ikinci kayıt açılmaz; tek kayıtta alan olarak tutulur.
- Eski aktivitelerin numarası yoktur.
- Haftalık şerit resmî tatilleri bilmez.

