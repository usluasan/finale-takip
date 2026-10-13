# Finale Takibi — kalıcı çalışma kuralları

Bu dosya, bu repoda çalışan Claude için bağlayıcıdır. Kullanıcı: Hasan (SAP FI/TRM/CM/ABA ve yapay zeka danışmanı).
Proje: Finale Yazılım Danışmanlık Ticaret Ltd. Şti. (iki şirket) için "Finale Takibi" şirket takip uygulaması.

## Kurallar

1. **Dil:** Her zaman Türkçe konuş ve yaz. Kod yorumları, commit mesajları ve belgeler de Türkçe.
2. **Değişiklik kaydı:** Her değişiklikten sonra İKİ dosyayı birlikte güncelle, yeni kaydı EN ALTA ekle:
   - `DEGISIKLIK_AI.txt` — makine-okunur. Satır formatı:
     `ID | TARİH | SÜRÜM | TÜR | DOSYA/BÖLÜM | ETKİ | NOT`
     Tür: `FEAT`, `FIX`, `UI`, `INFRA`, `DATA`, `DOC`. ID sıralı gider (C001, C002, ...).
   - `DEGISIKLIKLER.txt` — Hasan'ın okuyup takip ettiği, tarihli, sade Türkçe liste.
3. **Commit:** Her değişiklikten sonra Hasan'a "GitHub'a commit edeyim mi?" diye sor.
   - Küçük değişikliklerde cevabı bekle.
   - Büyük değişikliklerde (yeni özellik, veri yapısı değişimi, sürüm atlaması) sormadan commit'le, push et ve Hasan'a bildir.
4. **Kapsam:** İşe başlamadan önce kapsam belirsizse çoktan seçmeli kısa sorular sor; netse hemen yap.
5. **Güvenlik:** Parola, anahtar (`APP_KEY`, `ADMIN_KEY`), kişisel/mali veri, `veri/` klasörü ve `finale.db` repoya ASLA girmez (`.gitignore`'da kalır). Güvenlik açığı görürsen söyle.
6. **Dürüstlük:** Test etmediğin şeyi "çalışıyor" deme. Neyin test edildiğini ve neyin edilmediğini açıkça yaz.
7. **Komutlar:** Hasan Mac kullanıyor ve komut satırında yeni. Komut verirken tam komutu ve hangi klasörde çalıştırılacağını yaz.

## Proje yapısı

- GitHub deposu (private): https://github.com/usluasan/finale-takip — dal `main`, yerel klasör `~/Projects/finale-takip`.
- `kaynak-artifact-index.html` — KAYNAK sayfa (tek dosya HTML). Canlı hâli claude.ai'da artifact (sürüm 56). Sayfa değişiklikleri burada yapılır.
- `web/index.html` — ÜRETİLEN dosya, elle düzenlenmez. `python3 build.py` ile kaynaktan üretilir
  (başa doctype/head + `shim.js` eklenir, xlsx yerel `vendor/` altından yüklenir). Kaynak her değiştiğinde build çalıştırılır; `python3 build.py --kontrol` uyumu denetler.
- `web/shim.js` — `claude.use` (db/assets/downloads/user) uyumluluk katmanı. `web/ocr`, `web/pdfjs`, `web/mammoth`, `web/vendor` üçüncü taraf kütüphanelerdir.
- `server/` — Node 22.5+, `node:sqlite`, REST + SSE. `APP_KEY` ve `ADMIN_KEY` ortam değişkenleriyle çalışır.
- `desktop/` — Electron masaüstü uygulaması.
- Kurulum: `OKU-BENI.md`. Devir bilgisi: `DEVIR-NOTU.md`.

## Bilinen eksikler

- Banka bakiyesi ve kart ödemeleri nakit akışına bağlı değil.
- "Claude ile fiş/fatura oku" bağımsız pakette yok (yerel OCR var).
- Roller yalnızca arayüz düzeyinde; sunucuda gerçek yetki kontrolü yok (`APP_KEY` bilen tüm veriyi okur/yazar).
- Haftalık kredi maili (pazartesi; huslu, sturhan, oyucesoy @finale.com.tr) hâlâ claude.ai verisini okuyor.
