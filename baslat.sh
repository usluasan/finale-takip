#!/bin/sh
# Sunucuyu başlatır. Giriş, uygulamadaki kullanıcı adı + şifreyle yapılır (v0.5.0).
# ADMIN_KEY isteğe bağlıdır: yalnızca acil durum/yönetim betikleri için (en az 16 karakter, örn. openssl rand -hex 24).
export ADMIN_KEY="${ADMIN_KEY:-}"
export PORT="${PORT:-8080}"
exec node server/server.js
