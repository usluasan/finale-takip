# Devir notu (Claude Code için)
Proje: Finale Takibi (Finale Yazılım Danışmanlık Ticaret Ltd. Şti., iki şirket). Kullanıcı Hasan, Türkçe konuşur, yanıtlar Türkçe olmalı.
Kaynak sayfa: `kaynak-artifact-index.html` (tek dosya HTML, claude.ai artifact olarak yayında: https://claude.ai/artifact/V7Weg9afbLnbxEAyjHQPiJ, sürüm 56). `web/index.html` bundan üretilir (başa doctype/head + `shim.js` eklenir, xlsx yerel `vendor/` altından yüklenir).
Bağımsız uygulama: `server/` (Node 22.5+, node:sqlite, REST + SSE, APP_KEY/ADMIN_KEY), `web/` (shim.js: claude.use db/assets/downloads/user), `desktop/` (Electron). Kurulum: `OKU-BENI.md`.
Veri: `veri/finale.db` repoya KONMAZ (.gitignore). Kullanıcıda yerel olarak durur.
Değişiklik kuralı (kullanıcı kararı): her değişiklikten sonra `DEGISIKLIK_AI.txt` (makine-okunur) ve `DEGISIKLIKLER.txt` (Hasan için okunabilir) birlikte güncellenir, yeni kayıt en alta. Her değişiklikten sonra Hasan'a "GitHub'a commit edeyim mi?" diye sorulur; büyük değişikliklerde (yeni özellik, veri yapısı) sürüm sormadan kaydedilir ve bildirilir.
Bilinen eksikler: banka bakiyesi/kart ödemeleri nakit akışına bağlı değil; "Claude ile fiş oku" (sample) bağımsız pakette yok; roller arayüz düzeyinde; haftalık kredi maili (pazartesi, huslu/sturhan/oyucesoy@finale.com.tr) hâlâ claude.ai verisini okur.
