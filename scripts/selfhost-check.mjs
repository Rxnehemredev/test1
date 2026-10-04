#!/usr/bin/env node
// Vercel dışı kurulum ön-kontrolü. Kullanım:
//   set -a; . /etc/asteria/asteria.env; set +a
//   node scripts/selfhost-check.mjs                 # yalnızca yapılandırma
//   node scripts/selfhost-check.mjs --probe         # + çalışan uygulamaya canlı saldırı sondaları
//   (--base http://127.0.0.1:3000 --public https://alanadin.com)
import fs from 'node:fs';

const env = process.env;
const args = process.argv.slice(2);
const probe = args.includes('--probe');
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = arg('--base', 'http://127.0.0.1:3000');
const PUBLIC = arg('--public', env.NEXT_PUBLIC_BASE_URL || '');

let fail = 0, warn = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };
const wrn = (m) => { warn++; console.log(`  \x1b[33m!\x1b[0m ${m}`); };
const chk = (cond, good, badMsg) => (cond ? ok(good) : bad(badMsg));

console.log('\n[1] Yapılandırma');
chk(env.SELF_HOSTED === '1', 'SELF_HOSTED=1', 'SELF_HOSTED=1 değil → ön proxy kilidi KAPALI (Node portuna doğrudan erişen herkes nginx\'i atlar)');
chk((env.PROXY_SHARED_SECRET || '').length >= 32, 'PROXY_SHARED_SECRET ≥ 32 karakter', 'PROXY_SHARED_SECRET eksik/kısa (openssl rand -hex 32)');
chk(env.TRUSTED_PROXY_COUNT === '1' || env.TRUSTED_PROXY === 'cloudflare', 'İstemci IP kaynağı tanımlı (TRUSTED_PROXY_COUNT)', 'TRUSTED_PROXY_COUNT=1 değil → IP çözümlenemez / sahte X-Forwarded-For riski');
chk(/^https:\/\//.test(env.NEXT_PUBLIC_BASE_URL || ''), 'NEXT_PUBLIC_BASE_URL https://', 'NEXT_PUBLIC_BASE_URL https:// ile başlamalı');
chk(Boolean(env.ALLOWED_HOSTS) || Boolean(env.NEXT_PUBLIC_BASE_URL), 'İzin verilen host listesi türetilebiliyor', 'ALLOWED_HOSTS / NEXT_PUBLIC_BASE_URL yok → Host doğrulaması devre dışı');
chk(env.NODE_ENV === 'production', 'NODE_ENV=production', 'NODE_ENV=production değil');
chk((env.JWT_SECRET || '').length >= 32, 'JWT_SECRET ≥ 32 karakter', 'JWT_SECRET kısa (≥ 32)');
chk(/^[0-9a-f]{64}$/i.test(env.ENCRYPTION_KEY || ''), 'ENCRYPTION_KEY 64 hex', 'ENCRYPTION_KEY 64 hex karakter olmalı');
chk((env.IMAGE_PROXY_SECRET || '').length >= 32, 'IMAGE_PROXY_SECRET ≥ 32 karakter', 'IMAGE_PROXY_SECRET kısa');
chk(new Set([env.JWT_SECRET, env.ENCRYPTION_KEY, env.IMAGE_PROXY_SECRET, env.PROXY_SHARED_SECRET].filter(Boolean)).size ===
    [env.JWT_SECRET, env.ENCRYPTION_KEY, env.IMAGE_PROXY_SECRET, env.PROXY_SHARED_SECRET].filter(Boolean).length,
    'Sırlar birbirinden farklı', 'Aynı değer birden fazla sır için kullanılmış');
chk((env.ADMIN_PASSWORD || '').length >= 14, 'ADMIN_PASSWORD ≥ 14 karakter', 'ADMIN_PASSWORD en az 14 karakter olmalı');
if (!env.CRON_SECRET && !env.BLOG_CRON_SECRET) wrn('CRON_SECRET tanımsız → zamanlanmış işler (blog kuyruğu, scraper) çalışmaz');
if (!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)) ok('Redis yok → bellek deposu (tek sunucuda doğru ve tam çalışır)');
else wrn('Upstash Redis tanımlı: her istekte ek ağ gecikmesi. Tek sunucuda bellek deposu yeterli ve daha hızlı.');

for (const f of ['/etc/asteria/asteria.env', '/etc/nginx/asteria-proxy-secret.conf']) {
  try {
    const mode = fs.statSync(f).mode & 0o777;
    chk((mode & 0o007) === 0, `${f} izinleri güvenli (${mode.toString(8)})`, `${f} herkes tarafından okunabilir (${mode.toString(8)}) → chmod 640/600`);
  } catch { /* dosya bu makinede yok */ }
}

if (!probe) { summary(); process.exit(fail ? 1 : 0); }

console.log(`\n[2] Canlı sondalar → ${BASE}`);
const SECRET = env.PROXY_SHARED_SECRET || '';
const HOST = (PUBLIC || 'https://localhost').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const good = { host: HOST, 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36', 'x-asteria-proxy': SECRET };
let n = 100;
const ip = () => `198.18.${(n >> 8) & 255}.${n++ & 255}`; // benchmark aralığı; her sonda yeni IP
async function get(path, headers = {}, init = {}) {
  try {
    const r = await fetch(BASE + path, { redirect: 'manual', headers: { ...good, 'x-forwarded-for': ip(), ...headers }, ...init });
    return r.status;
  } catch { return 0; }
}
const expect = async (name, p, want) => { const s = await p; (want.includes(s) ? ok : bad)(`${name} → ${s} (beklenen ${want.join('/')})`); };

await expect('Sır olmadan doğrudan erişim', get('/', { 'x-asteria-proxy': '' }), [403, 503]);
await expect('Yanlış sır', get('/', { 'x-asteria-proxy': 'x'.repeat(40) }), [403]);
await expect('Normal istek', get('/api/health'), [200, 500]);
await expect('Sahte Host', get('/', { host: 'evil.example' }), [421]);
await expect('XSS payload', get('/api/series?q=%3Cscript%3Ealert(1)%3C/script%3E'), [403]);
await expect('Path traversal', get('/api/%2e%2e%2f%2e%2e%2fetc/passwd'), [400, 403, 404]);
await expect('Zararlı path (.env)', get('/.env'), [403]);
await expect('sqlmap UA', get('/', { 'user-agent': 'sqlmap/1.7' }), [403]);
await expect('TRACE metodu', get('/', {}, { method: 'TRACE' }), [405, 403]);
await expect('Cross-origin POST', get('/api/comments', { origin: 'https://evil.example', 'content-type': 'application/json' }, { method: 'POST', body: '{}' }), [403]);
await expect('x-middleware-subrequest sahteciliği', get('/', { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' }), [400]);

summary();
process.exit(fail ? 1 : 0);

function summary() {
  console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${fail} hata\x1b[0m, ${warn} uyarı\n`);
}
