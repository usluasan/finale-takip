# Finale Takibi — bağımsız uygulama

Üç parça var: **sunucu** (veriler burada durur), **web** (tarayıcı/telefon) ve **masaüstü uygulaması** (Windows/Mac).
Mevcut verileriniz (krediler, cariler, kullanıcılar, ayarlar, 1 CV) `veri/` klasöründe hazır geliyor.

## 1) Sunucuyu çalıştırma
Gerekli: Node.js 22.5 veya üstü (https://nodejs.org). Başka paket kurmak gerekmez.

- Windows: `baslat.bat` dosyasındaki iki anahtarı değiştirip çift tıklayın.
- Mac/Linux: `APP_KEY=... ADMIN_KEY=... ./baslat.sh`
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

## Bilmeniz gerekenler
- Rol/yetki sistemi arayüz düzeyindedir. `APP_KEY` ile giren biri teknik olarak tüm veriyi okuyabilir; anahtarı yalnızca güvendiklerinize verin.
- "Claude ile fiş/fatura oku" özelliği bu sürümde yok; yerel OCR (Tesseract) çalışır.
- claude.ai'daki sürüm kendi verisini kullanmaya devam eder, ikisi senkron değildir. Geçişten sonra tek tarafı kullanın.
- Haftalık kredi maili (planlı görev) hâlâ claude.ai verisini okur; geçişte yeniden yapılandırılmalı.
