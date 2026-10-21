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

## İlk kurulum (sunucuda fnroot; 20 Ekim 2026'da bu adımlarla kuruldu)

`fnroot` için yalnızca `/usr/bin/docker` parolasız sudo'dur (`/etc/sudoers.d/fnroot-docker`); `sudo VAR=x docker ...` çalışmaz, Compose değişkenleri `compose.env` dosyasından okunur.

```bash
# 0) Mac'ten: etiketli sürümü aktar (git dışı hiçbir şey gitmez), ~/Projects/finale-takip klasöründe
git archive --format=tar v0.4.1 | ssh -i ~/.ssh/finale_sunucu -p 2222 fnroot@192.168.5.110 \
  'mkdir -p /opt/docker/finale/finale-takip && tar -x -C /opt/docker/finale/finale-takip'

# Sunucuda, /opt/docker/finale klasöründe:
cd /opt/docker/finale
D="sudo -n /usr/bin/docker compose --env-file compose.env -p finale-takip -f finale-takip/deploy/compose.yaml"

# 1) Sırlar sunucuda üretilir, ekrana basılmaz; sürüm compose.env'de
umask 077
printf "ADMIN_KEY=%s\nTRUST_PROXY=1\nCOOKIE_PATH=/finale/\n" "$(openssl rand -hex 24)" > finale-takip.env   # v0.5.0: APP_KEY yok
printf "FINALE_SURUM=v0.4.1\n" > compose.env

# 2) İmaj
$D config --quiet && $D build

# 3) Veri taşıma (İLK AÇILIŞTAN ÖNCE; yedek /opt/docker/finale/yedek/<zaman>/goc/finale.db, klasör 700, dosya 600)
$D run --rm --no-deps -u root -v /opt/docker/finale/yedek/<zaman>/goc:/goc:ro --entrypoint cp finale-takip /goc/finale.db /data/finale.db
$D run --rm --no-deps -u root --entrypoint chown finale-takip -R node:node /data

# 4) Başlat ve NPM ağı içinden doğrula
$D up -d --wait
sudo -n /usr/bin/docker exec nginx-proxy-manager curl -s http://finale-takip:8080/saglik    # {"ok":1}
sudo -n /usr/bin/docker exec nginx-proxy-manager nginx -t

# 5) NPM: apps.finale.com.tr kaydının Advanced ayarına deploy/npm-finale.conf eklenir
#    (Hasan UI'dan; önce mevcut ayar yedeklenir; ortak nottaki "Kilit" kuralına uyulur)
```

## Giriş ve acil durum (v0.5.0)

Herkes uygulamadaki **kullanıcı adı + şifreyle** girer; şifreyi sunucu doğrular. Ekranda anahtar ya da parolasız giriş yoktur.
Şifre unutulursa (kullanıcının kendisi ya da yönetici), Mac'te Terminal'de:

```bash
ssh -t -i ~/.ssh/finale_sunucu -p 2222 fnroot@192.168.5.110 'sudo -n /usr/bin/docker exec -it finale-takip-finale-takip-1 node server/kullanici.js sifre <kullanıcı adı>'
```

Şifre ekranda görünmeden iki kez sorulur; o kullanıcının açık oturumları kapanır. Kullanıcı listesi: aynı komutta `sifre <ad>` yerine `liste`.

Mac'te tutarlı veri yedeği (çalışan veritabanı düz `cp` ile kopyalanmaz), `~/Projects/finale-takip` klasöründe:

```bash
python3 -c "import sqlite3;s=sqlite3.connect('file:veri/finale.db?mode=ro',uri=True);d=sqlite3.connect('finale-goc.db');s.backup(d);d.close()"
```

`veri/blobs/` doluysa o klasör de `/data/blobs/` altına taşınır (20 Ekim 2026 itibarıyla boş).

## CV dönüştürme (v0.7.0)

- Yapay zekâ anahtarı sunucudaki `/opt/docker/finale/finale-takip.env` dosyasına `ANTHROPIC_API_KEY=...` satırıyla eklenir (Hasan kendi Terminal'inde, ekranda göstermeden), ardından `up -d --force-recreate`.
- Anahtar yoksa çevirme ekranı açılır ama alanları kullanıcı doldurur; PDF üretimi yine çalışır.
- Model `claude-opus-5-5`; CV başına tahmini maliyet birkaç on sent (CV uzunluğuna göre). CV içeriği Anthropic API'ye gönderilir.
- İmaj Chromium nedeniyle yaklaşık 1,4 GB'tır.

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

- Güncelleme: Mac'ten `git archive vX.Y.Z` ile yeni klasöre aktar (ör. `finale-takip-vX.Y.Z`), `compose.env` içinde `FINALE_SURUM=vX.Y.Z`, build + `up -d --wait`. NPM ayarına dokunmak gerekmez (ad değişkenle çözülür).
- Geri dönüş: önceki etiketin imajı sunucuda durur (`finale-takip:vESKI`); `FINALE_SURUM=vESKI ... up -d --wait`.
- Her güncellemeden önce veri yedeği: servisi durdur (`... stop finale-takip`), volume içeriğini `$D run --rm --no-deps -u root -v /opt/docker/finale/yedek/<zaman>:/y --entrypoint cp finale-takip -a /data/. /y/` ile `/opt/docker/finale/yedek/<zaman>/` altına kopyala (izin `700`), sonra yeniden başlat. Servis durmuşken WAL dosyaları da kopyalandığı için yedek tutarlıdır.
- Volume (`finale-takip_finale_data`) hiçbir zaman `down -v` ile silinmez.
- NPM bloğu kaldırılırsa `/finale/` kök 503'e düşer; diğer yollar etkilenmez.

## Bilinen sınırlar

- Roller hâlâ yalnızca arayüzde uygulanır; giriş yapan her kullanıcı teknik olarak tüm veriyi okuyup yazabilir (sıradaki iş: rol kontrolü sunucuda).
- Deneme sınırı bellekte tutulur; sunucu yeniden başlarsa sıfırlanır.
- `app.finale.com.tr` için DNS kaydı yok (20 Ekim 2026 kontrolü); ayrı bir API alan adı kullanılacaksa önce DNS A kaydı ve NPM'de sertifika gerekir.
