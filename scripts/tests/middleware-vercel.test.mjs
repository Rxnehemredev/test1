// Vercel modunda (SELF_HOSTED yok) davranış BOZULMAMALI: proxy sırrı istenmez, *.vercel.app Host'ları geçer.
process.env.NODE_ENV = 'production';
process.env.VERCEL = '1';
process.env.NEXT_PUBLIC_BASE_URL = 'https://asteria.example';
delete process.env.SELF_HOSTED; delete process.env.PROXY_SHARED_SECRET;
delete process.env.TRUSTED_PROXY_COUNT; delete process.env.TRUSTED_PROXY;

import './_register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.fetch = async () => { throw new Error('ağ yok (test)'); };
const { middleware } = await import('@/middleware');

const req = (over = {}) => {
    const { host = 'asteria-abc.vercel.app', path = '/', search = '', method = 'GET', headers = {} } = over;
    return {
        method,
        headers: new Headers({
            host, 'x-real-ip': over.ip || '198.51.100.77',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36', ...headers,
        }),
        url: `https://${host}${path}${search}`,
        nextUrl: { pathname: path, search, origin: `https://${host}` },
        cookies: { get: () => undefined },
    };
};

test('Vercel: proxy sırrı olmadan normal istek geçer; vercel.app Host serbest', async () => {
    assert.equal((await middleware(req())).status, 200);
    assert.equal((await middleware(req({ host: 'asteria.example' }))).status, 200);
});

test('Vercel: yine de yabancı Host ve payload engellenir', async () => {
    assert.equal((await middleware(req({ host: 'evil.example', ip: '198.51.100.78' }))).status, 421);
    assert.equal((await middleware(req({ path: '/api/series', search: '?q=<script>', ip: '198.51.100.79' }))).status, 403);
});
