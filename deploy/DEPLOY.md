# Finale Takibi — sunucuya kurulum (apps.finale.com.tr/finale/)

Bu dosya sır içermez. Sunucu erişim bilgileri ve parola repoda **yoktur**; Hasan'daki özel deployment rehberinde durur.
İki oturumun (Finale + GRIN) ortak koordinasyon notu: `~/Projects/ortak-sunucu/CALISMA-NOTU.md`.

## Hedef düzen

```text
İnternet -> NPM (80/443, SSL, apps.finale.com.tr; tek kayıt, "Advanced" ayarında yol blokları)
              -> /finale/ -> finale-takip:8080   (bu repo; docker-network'e "finale-takip" adıyla katılır)
              -> /grin/   -> grin-web:80         (GRIN, ayrı repo/oturum)
              -> /        -> 503 "hazırlanıyor"  (Hasan karar verene kadar)
```

Ayrı gateway konteyneri yoktur (Hasan'ın 20 Ekim 2026 kararı: yönlendirme mevcut NPM'de).

- Compose projesi: `finale-takip`, sunucu dizini: `/opt/docker/finale`, repo: `/opt/docker/finale/finale-takip`
- Compose dosyası: `deploy/compose.yaml` (servis `finale-takip`, iç port `8080`, sağlık ucu `/saglik`, host portu yok)
- Kalıcı veri: Docker volume `finale-takip_finale_data` -> `/data` (SQLite `finale.db` + `blobs/`)
- Sırlar: `/opt/docker/finale/finale-takip.env` (`chmod 600`, örneği `deploy/finale-takip.env.ornek`)
- NPM bloğu: `deploy/npm-finale.conf` (upstream değişkenle çözülür; Finale kapalıyken NPM ve diğer siteler etkilenmez)

## İlk kurulum (sunucuda, root)

```bash
# 1) Kod: etiketli sürümü al (örnek v0.4.1)
cd /opt/docker/finale
git clone --branch v0.4.1 https://github.com/usluasan/finale-takip.git finale-takip   # ya da rsync ile aktar

# 2) Sırlar: anahtarları sunucuda üret, dosyaya yaz (iki farklı değer: openssl rand -hex 24)
cp finale-takip/deploy/finale-takip.env.ornek finale-takip.env && chmod 600 finale-takip.env

# 3) İmaj
export FINALE_SURUM=v0.4.1
docker compose -p finale-takip -f finale-takip/deploy/compose.yaml build

# 4) Veri taşıma (İLK AÇILIŞTAN ÖNCE; yedek dosyası /root/finale-backups/<zaman>/goc/finale.db)
docker compose -p finale-takip -f finale-takip/deploy/compose.yaml run --rm --no-deps -u root \
  -v /root/finale-backups/<zaman>/goc:/goc:ro --entrypoint cp finale-takip /goc/finale.db /data/finale.db
docker compose -p finale-takip -f finale-takip/deploy/compose.yaml run --rm --no-deps -u root \
  --entrypoint chown finale-takip -R node:node /data

# 5) Başlat ve ağ içinde doğrula
docker compose -p finale-takip -f finale-takip/deploy/compose.yaml up -d --wait
docker exec nginx-proxy-manager curl -s http://finale-takip:8080/saglik    # {"ok":1} (NPM imajında curl yoksa wget -qO- deneyin)

# 6) NPM: apps.finale.com.tr kaydının Advanced ayarına deploy/npm-finale.conf eklenir
#    (Hasan UI'dan; önce mevcut ayar yedeklenir; ortak nottaki "Kilit" kuralına uyulur)
docker exec nginx-proxy-manager nginx -t
```

Mac'te tutarlı veri yedeği (çalışan veritabanı düz `cp` ile kopyalanmaz), `~/Projects/finale-takip` klasöründe:

```bash
python3 -c "import sqlite3;s=sqlite3.connect('file:veri/finale.db?mode=ro',uri=True);d=sqlite3.connect('finale-goc.db');s.backup(d);d.close()"
```

`veri/blobs/` doluysa o klasör de `/data/blobs/` altına taşınır (20 Ekim 2026 itibarıyla boş).

## Kabul testleri

```bash
curl -I https://apps.finale.com.tr/finale        # 308 -> /finale/
curl -I https://apps.finale.com.tr/finale/       # 200 text/html
curl -s https://apps.finale.com.tr/finale/saglik # {"ok":1}
curl -I https://apps.finale.com.tr/              # 503 (kök bilinçli olarak bekleme sayfası)
```

Tarayıcıda: giriş anahtarı -> uygulama girişi -> tüm sekmeler, Excel'e aktar, dosya yükleme/önizleme, iki pencerede canlı güncelleme (SSE).
Çapraz doğrulama: Finale oturumu `/grin/` yolunu, GRIN oturumu `/finale/` yolunu da kontrol eder.

## Güncelleme ve geri dönüş

- Güncelleme: `git -C finale-takip fetch --tags && git -C finale-takip checkout vX.Y.Z`, `FINALE_SURUM=vX.Y.Z` ile build + `up -d --wait`. NPM ayarına dokunmak gerekmez (ad değişkenle çözülür).
- Geri dönüş: önceki etiketin imajı sunucuda durur (`finale-takip:vESKI`); `FINALE_SURUM=vESKI ... up -d --wait`.
- Her güncellemeden önce veri yedeği: servisi durdur (`... stop finale-takip`), `/var/lib/docker/volumes/finale-takip_finale_data/_data/` klasörünü `/root/finale-backups/<zaman>/` altına kopyala (izin `700`), sonra yeniden başlat. Servis durmuşken WAL dosyaları da kopyalandığı için yedek tutarlıdır.
- Volume (`finale-takip_finale_data`) hiçbir zaman `down -v` ile silinmez.
- NPM bloğu kaldırılırsa `/finale/` kök 503'e düşer; diğer yollar etkilenmez.

## Bilinen sınırlar

- Roller hâlâ yalnızca arayüzde uygulanır; `APP_KEY` bilen herkes veriyi okuyup yazabilir. Anahtarı yalnızca güvenilen kişilere verin.
- Deneme sınırı bellekte tutulur; sunucu yeniden başlarsa sıfırlanır.
- `app.finale.com.tr` için DNS kaydı yok (20 Ekim 2026 kontrolü); ayrı bir API alan adı kullanılacaksa önce DNS A kaydı ve NPM'de sertifika gerekir.
