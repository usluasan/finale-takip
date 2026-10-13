#!/bin/sh
# Sunucuyu başlatır. Anahtarları kendinize göre değiştirin.
export APP_KEY="${APP_KEY:-BURAYA-HERKESIN-KULLANACAGI-ANAHTAR}"
export ADMIN_KEY="${ADMIN_KEY:-BURAYA-SADECE-SENIN-ANAHTARIN}"
export PORT="${PORT:-8080}"
exec node server/server.js
