# Asteria Scans — sertleştirilmiş üretim imajı (Next "standalone" çıktısı)
# Derleme:  docker build -f deploy/docker/Dockerfile -t asteria:latest .
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 SELF_HOSTED=1 BUILD_STANDALONE=1
# Derleme için gereken NEXT_PUBLIC_* değerleri build-arg ile verilir:
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 SELF_HOSTED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    NODE_OPTIONS="--max-http-header-size=16384 --max-old-space-size=1024"
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health',{headers:{'x-asteria-proxy':process.env.PROXY_SHARED_SECRET||'','x-forwarded-for':'127.0.0.1','host':new URL(process.env.NEXT_PUBLIC_BASE_URL||'http://localhost').host}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
