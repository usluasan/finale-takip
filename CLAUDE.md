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
3. **Commit:** Commit'leri Claude yapar (Hasan'ın 13 Ekim 2026 kararı). Bir değişiklik tamamlanıp test edilince sormadan commit'le, push et ve Hasan'a ne yaptığını bildir.
   - Yalnızca şu durumlarda önce sor: kapsam belirsizse, geri alınması zor bir işse (veri silme/dönüştürme, geçmişi değiştirme), ya da yarım/test edilmemiş bir şeyi commit'lemek gerekiyorsa.
   - Her commit TEK bir konuyu içerir; ilgisiz değişiklikler ayrı commit olur. Kayıt dosyaları (madde 2) aynı commit'e girer.
   - Sürüm atlamasına ve etiketlemeye Claude karar verir ("Sürüm ve commit düzeni" bölümü).
4. **Kapsam:** İşe başlamadan önce kapsam belirsizse çoktan seçmeli kısa sorular sor; netse hemen yap.
5. **Güvenlik:** Parola, anahtar (`APP_KEY`, `ADMIN_KEY`), kişisel/mali veri, `veri/` klasörü ve `finale.db` repoya ASLA girmez (`.gitignore`'da kalır). Güvenlik açığı görürsen söyle.
6. **Dürüstlük:** Test etmediğin şeyi "çalışıyor" deme. Neyin test edildiğini ve neyin edilmediğini açıkça yaz.
7. **Komutlar:** Hasan Mac kullanıyor ve komut satırında yeni. Komut verirken tam komutu ve hangi klasörde çalıştırılacağını yaz.

## Sürüm ve commit düzeni

Amaç: Hasan da Claude da her commit'te neyin değiştiğini, nedenini ve nasıl geri alınacağını tek bakışta anlasın.

**Commit mesajı biçimi** (hepsi Türkçe):

```
TÜR(bölüm): tek satır özet [C0xx]

Ne değişti:
- ...
Neden:
- ...
Test:
- edildi: ...
- edilmedi: ...
Geri alma: git revert <bu commit> (ek adım varsa yaz)
```

- `TÜR`: `FEAT`, `FIX`, `UI`, `INFRA`, `DATA`, `DOC` (DEGISIKLIK_AI.txt ile aynı). `bölüm`: `sayfa`, `sunucu`, `shim`, `masaustu`, `build`, `belge`, `surum` gibi.
- `[C0xx]`: bu commit'in DEGISIKLIK_AI.txt kayıt numarası/numaraları. Böylece `git log --grep=C021` commit'i, kayıt da commit'i bulur.
- Hata düzeltmesinde hatayı getiren commit/kayıt da yazılır ("Düzeltir: C015").

**Sürümler:** `vBÜYÜK.ORTA.KÜÇÜK Kodad`; kurallar ve geçmiş `SURUMLER.md` dosyasında, güncel sürüm `SURUM` dosyasında.
- KÜÇÜK: hata/küçük düzeltme (kodad aynı). ORTA: yeni özellik (yeni kodad). BÜYÜK: veri yapısı/geriye uyumsuz değişiklik (yeni kodad).
- Kodad ünlü bir bilim insanının soyadıdır (ilk sürüm: Heisenberg). Daha önce kullanılmamış bir ad seç.
- Sürüm atlarken sırayla: `SURUM`, `SURUMLER.md` (içerik, commit tablosu, test durumu), `desktop/package.json` + `package-lock.json` sürümü, iki kayıt dosyası → commit → açıklamalı etiket (`git tag -a v0.2.0 -m "v0.2.0 Kodad"`) → `git push --follow-tags` → `gh release create`.
- Geri alma `git revert` ile yapılır; `git reset --hard`, geçmişi yeniden yazma ve zorla push yapılmaz.

## Proje yapısı

- GitHub deposu (private): https://github.com/usluasan/finale-takip — dal `main`, yerel klasör `~/Projects/finale-takip`.
- `kaynak-artifact-index.html` — KAYNAK sayfa (tek dosya HTML). Canlı hâli claude.ai'da artifact (sürüm 56). Sayfa değişiklikleri burada yapılır.
- `web/index.html` — ÜRETİLEN dosya, elle düzenlenmez. `python3 build.py` ile kaynaktan üretilir
  (başa doctype/head + `shim.js` eklenir, xlsx yerel `vendor/` altından yüklenir). Kaynak her değiştiğinde build çalıştırılır; `python3 build.py --kontrol` uyumu denetler.
- `web/shim.js` — `claude.use` (db/assets/downloads/user) uyumluluk katmanı. `web/ocr`, `web/pdfjs`, `web/mammoth`, `web/vendor` üçüncü taraf kütüphanelerdir.
- `server/` — Node 22.5+, `node:sqlite`, REST + SSE. `APP_KEY` ve `ADMIN_KEY` ortam değişkenleriyle çalışır.
- `desktop/` — Electron masaüstü uygulaması.
- Kurulum: `OKU-BENI.md`. Devir bilgisi: `DEVIR-NOTU.md`. Sürüm geçmişi: `SURUMLER.md`, güncel sürüm: `SURUM`.
- `.claude/launch.json` — Claude Code önizlemesi için sunucu başlatma ayarı (anahtarları `veri/yerel-anahtarlar.env` dosyasından okur; o dosya repoda yoktur).

## Bilinen eksikler

- Banka bakiyesi ve kart ödemeleri nakit akışına bağlı değil.
- "Claude ile fiş/fatura oku" bağımsız pakette yok (yerel OCR var).
- Roller yalnızca arayüz düzeyinde; sunucuda gerçek yetki kontrolü yok (`APP_KEY` bilen tüm veriyi okur/yazar).
- Haftalık kredi maili (pazartesi; huslu, sturhan, oyucesoy @finale.com.tr) hâlâ claude.ai verisini okuyor.
