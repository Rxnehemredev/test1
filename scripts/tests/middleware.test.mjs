// node --import ./scripts/tests/_register.mjs --test scripts/tests/middleware.test.mjs
// middleware.js'i GERÇEK katmanlarıyla (Next stub'ıyla) uçtan uca çalıştırır.
process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_BASE_URL = 'https://asteria.example';
process.env.SELF_HOSTED = '1';
process.env.PROXY_SHARED_SECRET = 'p'.repeat(48);
process.env.TRUSTED_PROXY_COUNT = '1';
delete process.env.VERCEL; delete process.env.VERCEL_ENV;
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;

import './_register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.fetch = async () => { throw new Error('ağ yok (test)'); }; // gate ayar çekimi başarısız → atlanır
const { middleware } = await import('@/middleware');
const { counters, bans } = await import('@/lib/security/memStore');

const SECRET = process.env.PROXY_SHARED_SECRET;
let ipSeq = 10;
const freshIp = () => `203.0.113.${ipSeq++}`;

function req({ method = 'GET', path = '/', search = '', ip = freshIp(), headers = {}, proxy = true } = {}) {
    const h = new Headers({
        host: 'asteria.example',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        ...(proxy ? { 'x-asteria-proxy': SECRET, 'x-forwarded-for': ip } : {}),
        ...headers,
    });
    return {
        method,
        headers: h,
        url: `https://asteria.example${path}${search}`,
        nextUrl: { pathname: path, search, origin: 'https://asteria.example' },
        cookies: { get: () => undefined },
    };
}

test('temiz sayfa isteği geçer; proxy sırrı uygulamaya iletilmez, nonce/CSP eklenir', async () => {
    const res = await middleware(req({ path: '/seri/solo-leveling' }));
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-security-policy').includes("'nonce-"));
    assert.equal(res.__nextRequestHeaders.get('x-asteria-proxy'), null);
    assert.ok(res.__nextRequestHeaders.get('x-nonce'));
});

test('nginx\'i atlayan doğrudan istek 403 (sahte X-Forwarded-For işe yaramaz)', async () => {
    const res = await middleware(req({ proxy: false, headers: { 'x-forwarded-for': '1.2.3.4' } }));
    assert.equal(res.status, 403);
    const wrong = await middleware(req({ proxy: false, headers: { 'x-asteria-proxy': 'x'.repeat(48), 'x-forwarded-for': '1.2.3.4' } }));
    assert.equal(wrong.status, 403);
});

test('XFF zinciri bozuksa (IP çözülemedi) 400', async () => {
    const res = await middleware(req({ proxy: false, headers: { 'x-asteria-proxy': SECRET } }));
    assert.equal(res.status, 400);
});

test('XSS payload → 403 ve IP anında banlanır; sonraki TEMİZ istek de 403', async () => {
    const ip = freshIp();
    const bad = await middleware(req({ ip, path: '/api/series', search: '?q=<script>alert(1)</script>' }));
    assert.equal(bad.status, 403);
    const next = await middleware(req({ ip, path: '/' }));
    assert.equal(next.status, 403, 'banlı IP temiz istekte de reddedilmeli');
    const other = await middleware(req({ path: '/' }));
    assert.equal(other.status, 200, 'başka IP etkilenmemeli');
});

test('tarayıcı UA\'sı (sqlmap) ve zararlı path banlanır', async () => {
    const ip = freshIp();
    const res = await middleware(req({ ip, headers: { 'user-agent': 'sqlmap/1.7' } }));
    assert.equal(res.status, 403);
    assert.equal((await middleware(req({ ip }))).status, 403);

    const ip2 = freshIp();
    assert.equal((await middleware(req({ ip: ip2, path: '/wp-login.php' }))).status, 403);
    assert.equal((await middleware(req({ ip: ip2, path: '/.env' }))).status, 403);
    assert.equal((await middleware(req({ ip: ip2, path: '/' }))).status, 403, '2 zararlı path (ağırlık 2+2) → ban');
});

test('cross-origin POST ve yanlış Host reddedilir', async () => {
    const ip = freshIp();
    const csrf = await middleware(req({ ip, method: 'POST', path: '/api/comments', headers: { origin: 'https://evil.com', 'content-length': '10' } }));
    assert.equal(csrf.status, 403);
    const host = await middleware(req({ headers: { host: 'evil.com' } }));
    assert.equal(host.status, 421);
});

test('aşırı büyük gövde 413; request smuggling 400', async () => {
    const big = await middleware(req({ method: 'POST', path: '/api/series/rate', headers: { 'content-length': String(5 * 1024 * 1024) } }));
    assert.equal(big.status, 413);
    const smug = await middleware(req({ method: 'POST', path: '/api/series/rate', headers: { 'content-length': '3', 'transfer-encoding': 'chunked' } }));
    assert.equal(smug.status, 400);
});

test('giriş uç noktası: 10 istek/dk sonrası 429', async () => {
    const ip = freshIp();
    const codes = [];
    for (let i = 0; i < 14; i++) {
        const r = await middleware(req({ ip, method: 'POST', path: '/api/auth/login', headers: { origin: 'https://asteria.example', 'content-length': '20' } }));
        codes.push(r.status);
    }
    assert.ok(codes.includes(429), `429 beklenirdi: ${codes}`);
});

test('izin verilmeyen metod 405', async () => {
    assert.equal((await middleware(req({ method: 'TRACE' }))).status, 405);
});
