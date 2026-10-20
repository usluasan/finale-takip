# Finale Takibi sunucu imajı — bağımlılık yok, yalnızca Node'un yerleşik modülleri
FROM node:22-alpine
WORKDIR /app
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
