# Finale Takibi sunucu imajı
FROM node:22-alpine
# CV'leri Finale formatında PDF'e basmak için Chromium ve Arial ile aynı ölçülerde açık yazı tipleri
RUN apk add --no-cache chromium font-liberation font-dejavu
ENV CHROME_PATH=/usr/bin/chromium-browser
WORKDIR /app
# Tek bağımlılık: CV ayıklama için Anthropic SDK (sürüm package-lock.json'da sabit)
COPY server/package.json server/package-lock.json /app/server/
RUN cd /app/server && npm ci --omit=dev --no-audit --no-fund
COPY server /app/server
COPY web /app/web
ENV DATA_DIR=/data PORT=8080 NODE_ENV=production
# Veri klasörü imajın "node" kullanıcısına ait; sunucu root olarak çalışmaz
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/saglik >/dev/null || exit 1
CMD ["node","server/server.js"]
