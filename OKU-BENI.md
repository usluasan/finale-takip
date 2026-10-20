# Finale Takibi — bağımsız uygulama

Üç parça var: **sunucu** (veriler burada durur), **web** (tarayıcı/telefon) ve **masaüstü uygulaması** (Windows/Mac).
Verileriniz (krediler, cariler, kullanıcılar, ayarlar, CV'ler) `veri/` klasöründe durur. Bu klasör GitHub deposunda YOKTUR (gizli veri); yalnızca sizin bilgisayarınızda/sunucunuzda bulunur. Depoyu yeni indiren biri boş veriyle başlar; mevcut veriyi taşımak için `veri/` klasörünü elle kopyalayın.

## 1) Sunucuyu çalıştırma
Gerekli: Node.js 22.5 veya üstü (https://nodejs.org). Başka paket kurmak gerekmez.

- Windows: `baslat.bat` dosyasındaki iki anahtarı değiştirip çift tıklayın.
- Mac/Linux: `./baslat.sh`

Yönetim anahtarı kuralı: `ADMIN_KEY` tanımlanırsa en az 16 karakter olmalı ve yer tutucu ("BURAYA-...") olmamalı; aksi halde sunucu açılmaz. Yerel denemede `ALLOW_WEAK_KEYS=1` ile atlanabilir.
Sunucuya (apps.finale.com.tr/finale/) kurulum: `deploy/DEPLOY.md`.
- Docker: `docker-compose.yml` içindeki anahtarları değiştirip `docker compose up -d`

**Giriş (v0.5.0):** herkes uygulamadaki **kullanıcı adı ve şifresiyle** girer; şifreyi sunucu doğrular, şifre özetleri tarayıcıya hiç gönderilmez. Şifreler en az 8 karakter. 15 dakikada 10 hatalı denemede o adres 15 dakika engellenir.
`ADMIN_KEY` isteğe bağlıdır ve ekranda karşılığı yoktur; yalnızca acil durum betikleri içindir.
**Şifre unutulursa (acil durum):** sunucuda `node server/kullanici.js sifre <kullanıcı adı>` (Docker'da: `sudo docker exec -it finale-takip-finale-takip-1 node server/kullanici.js sifre <ad>`). Şifre ekranda görünmeden iki kez sorulur. Kullanıcıları listelemek: `... kullanici.js liste`, boş kurulumda ilk yönetici: `... kullanici.js ekle <ad>`.
Adres: `http://SUNUCU-IP:8080` — telefon ve bilgisayarda tarayıcıyla bu adres açılır.

**Önemli:** İnternetten erişilecekse sunucunun önüne HTTPS koyun (Caddy, nginx veya Cloudflare Tunnel). Aksi halde anahtar ve veriler şifresiz gider.
Yedek: `veri/` klasörünü kopyalamanız yeterli.

## 2) Masaüstü uygulaması
`desktop/` klasöründe bir kez `npm install`, sonra:
- deneme: `npm start`
- kurulum dosyası: `npm run dist` (Windows'ta .exe, Mac'te .dmg; ilgili işletim sisteminde çalıştırın)

İlk açılışta sunucu adresini, sonra anahtarı sorar. Adres sonradan Uygulama → "Sunucu adresini değiştir" ile değişir.

## 3) Sayfayı yeniden üretme (build)
Uygulamanın asıl kaynağı `kaynak-artifact-index.html` dosyasıdır. `web/index.html` bundan **üretilir**, elle düzenlenmez.
Kaynak sayfa değiştiğinde proje klasöründe (`~/Projects/finale-takip`) şunu çalıştırın:

- üret: `python3 build.py`
- sadece kontrol et (dosyaya dokunmaz): `python3 build.py --kontrol`

Betik şunları yapar: başa doctype/head ve `shim.js` ekler, xlsx kütüphanesini internet yerine yerel `vendor/` klasöründen yükler, sayfayı `<body>` içine alır. Ek paket gerekmez (Mac'te hazır gelen Python 3 yeterli).

## Bilmeniz gerekenler
- Rol/yetki sistemi henüz arayüz düzeyindedir: giriş yapan her kullanıcı teknik olarak tüm veriyi okuyabilir. Rol kontrolünün sunucuya taşınması sıradaki iştir.
- "Claude ile fiş/fatura oku" özelliği bu sürümde yok; yerel OCR (Tesseract) çalışır.
- claude.ai'daki sürüm kendi verisini kullanmaya devam eder, ikisi senkron değildir. Geçişten sonra tek tarafı kullanın.
- Haftalık kredi maili (planlı görev) hâlâ claude.ai verisini okur; geçişte yeniden yapılandırılmalı.
