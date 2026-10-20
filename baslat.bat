@echo off
rem Sunucuyu baslatir. Giris, uygulamadaki kullanici adi + sifreyle yapilir (v0.5.0).
rem ADMIN_KEY istege baglidir (acil durum icin, en az 16 karakter).
set ADMIN_KEY=
set PORT=8080
node server\server.js
pause
