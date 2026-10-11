#!/usr/bin/env bash
# Vercel Cron'un VPS karşılığı. vercel.json'daki "crons" burada ÇALIŞMAZ; sistem cron'u kullan.
# Kullanım: run-cron.sh blog-queue|scraper-sync
# Not: SELF_HOSTED=1 iken uygulama X-Asteria-Proxy olmayan istekleri reddeder → başlıkları biz ekleriz.
set -euo pipefail
ENV_FILE="${ASTERIA_ENV_FILE:-/etc/asteria/asteria.env}"
set -a; . "$ENV_FILE"; set +a

JOB="${1:?kullanım: run-cron.sh blog-queue|scraper-sync}"
HOST="$(printf '%s' "$NEXT_PUBLIC_BASE_URL" | sed -E 's#^https?://##; s#/.*$##')"
case "$JOB" in
  blog-queue)   URL="http://127.0.0.1:3000/api/cron/blog-queue?batch=1"; SECRET="${BLOG_CRON_SECRET:-$CRON_SECRET}" ;;
  scraper-sync) URL="http://127.0.0.1:3000/api/cron/scraper-sync";       SECRET="${SCRAPER_CRON_SECRET:-$CRON_SECRET}" ;;
  *) echo "bilinmeyen iş: $JOB" >&2; exit 2 ;;
esac

# Gizli anahtarları komut satırında (ps'te görünür) değil, stdin'den başlık dosyası olarak ver.
curl -X POST --fail --silent --show-error --max-time 300 \
  -H @- "$URL" <<HDR
Host: ${HOST}
User-Agent: AsteriaCron/1.0
X-Forwarded-For: 127.0.0.1
X-Asteria-Proxy: ${PROXY_SHARED_SECRET}
Authorization: Bearer ${SECRET}
HDR
