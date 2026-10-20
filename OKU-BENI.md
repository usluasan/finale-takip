# Finale Takibi — bağımsız uygulama

Üç parça var: **sunucu** (veriler burada durur), **web** (tarayıcı/telefon) ve **masaüstü uygulaması** (Windows/Mac).
Verileriniz (krediler, cariler, kullanıcılar, ayarlar, CV'ler) `veri/` klasöründe durur. Bu klasör GitHub deposunda YOKTUR (gizli veri); yalnızca sizin bilgisayarınızda/sunucunuzda bulunur. Depoyu yeni indiren biri boş veriyle başlar; mevcut veriyi taşımak için `veri/` klasörünü elle kopyalayın.

## 1) Sunucuyu çalıştırma
Gerekli: Node.js 22.5 veya üstü (https://nodejs.org). Başka paket kurmak gerekmez.

- Windows: `baslat.bat` dosyasındaki iki anahtarı değiştirip çift tıklayın.
- Mac/Linux: `APP_KEY=... ADMIN_KEY=... ./baslat.sh`

Anahtar kuralları (v0.4.1): iki anahtar da **en az 16 karakter**, birbirinden farklı ve yer tutucu ("BURAYA-...") olmamalı; aksi halde sunucu açılmaz. Üretmek için Terminal'de: `openssl rand -hex 24`. Yalnızca yerel denemede bu kontrol `ALLOW_WEAK_KEYS=1` ile atlanabilir.
Sunucuya (apps.finale.com.tr/finale/) kurulum: `deploy/DEPLOY.md`.
- Docker: `docker-compose.yml` içindeki anahtarları değiştirip `docker compose up -d`

`APP_KEY`: herkesin ilk açılışta girdiği anahtar. `ADMIN_KEY`: sadece sizin; bununla girince "Uygulama sahibi olarak parolasız gir" düğmesi çalışır.
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
- Rol/yetki sistemi arayüz düzeyindedir. `APP_KEY` ile giren biri teknik olarak tüm veriyi okuyabilir; anahtarı yalnızca güvendiklerinize verin.
- "Claude ile fiş/fatura oku" özelliği bu sürümde yok; yerel OCR (Tesseract) çalışır.
- claude.ai'daki sürüm kendi verisini kullanmaya devam eder, ikisi senkron değildir. Geçişten sonra tek tarafı kullanın.
- Haftalık kredi maili (planlı görev) hâlâ claude.ai verisini okur; geçişte yeniden yapılandırılmalı.
