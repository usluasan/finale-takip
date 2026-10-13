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
| etiketli commit | C021, C022 | Sürüm sistemi, `SURUMLER.md`, `SURUM`, `.claude/launch.json` |

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
