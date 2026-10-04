// node --test scripts/tests/client-ip.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// requestHelpers.js 'next/server' import eder; testte yalnızca getClientIp lazım → stub'la.
const src = fs.readFileSync(new URL('../../lib/security/requestHelpers.js', import.meta.url), 'utf8')
    .replace("import { NextResponse } from 'next/server';", 'const NextResponse = { json() {} };');
const tmp = path.join(os.tmpdir(), `rh-${process.pid}.mjs`);
fs.writeFileSync(tmp, src);
const { getClientIp } = await import(tmp);

const H = (o) => ({ headers: new Headers(o) });
const ENV_KEYS = ['VERCEL', 'VERCEL_ENV', 'TRUSTED_PROXY', 'TRUSTED_PROXY_COUNT', 'NODE_ENV'];
function withEnv(env, fn) {
    const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    ENV_KEYS.forEach((k) => delete process.env[k]);
    Object.assign(process.env, env);
    try { fn(); } finally {
        ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
    }
}

test('Vercel: x-real-ip öncelikli, yoksa XFF ilk eleman', () => {
    withEnv({ VERCEL: '1' }, () => {
        assert.equal(getClientIp(H({ 'x-real-ip': '203.0.113.5', 'x-forwarded-for': '203.0.113.5' })), '203.0.113.5');
        assert.equal(getClientIp(H({ 'x-forwarded-for': '198.51.100.7' })), '198.51.100.7');
    });
});

test('TRUSTED_PROXY_COUNT=1: sağdan 1. eleman; soldaki sahte girdi yok sayılır', () => {
    withEnv({ TRUSTED_PROXY_COUNT: '1' }, () => {
        assert.equal(getClientIp(H({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })), '203.0.113.9');
    });
});

test('TRUSTED_PROXY_COUNT=2: sondan ikinci eleman', () => {
    withEnv({ TRUSTED_PROXY_COUNT: '2' }, () => {
        assert.equal(getClientIp(H({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9, 172.70.0.1' })), '203.0.113.9');
    });
});

test('TRUSTED_PROXY_COUNT: zincir beklenenden kısaysa fail-closed', () => {
    withEnv({ TRUSTED_PROXY_COUNT: '3' }, () => {
        assert.equal(getClientIp(H({ 'x-forwarded-for': '6.6.6.6, 7.7.7.7' })), '0.0.0.0');
        assert.equal(getClientIp(H({})), '0.0.0.0');
    });
});

test('TRUSTED_PROXY_COUNT geçersizse (abc/0/-1) yok sayılır', () => {
    for (const v of ['abc', '0', '-1']) {
        withEnv({ TRUSTED_PROXY_COUNT: v, VERCEL: '1' }, () => {
            assert.equal(getClientIp(H({ 'x-real-ip': '203.0.113.5' })), '203.0.113.5');
        });
    }
});

test('Vercel dışında x-real-ip production\'da yok sayılır', () => {
    withEnv({ NODE_ENV: 'production' }, () => {
        assert.equal(getClientIp(H({ 'x-real-ip': '6.6.6.6' })), '0.0.0.0');
    });
});

test('Cloudflare: yalnızca TRUSTED_PROXY=cloudflare iken cf-connecting-ip', () => {
    withEnv({ TRUSTED_PROXY: 'cloudflare' }, () => {
        assert.equal(getClientIp(H({ 'cf-connecting-ip': '203.0.113.1', 'x-forwarded-for': '6.6.6.6' })), '203.0.113.1');
    });
    withEnv({ VERCEL: '1' }, () => {
        assert.equal(getClientIp(H({ 'cf-connecting-ip': '6.6.6.6', 'x-real-ip': '203.0.113.2' })), '203.0.113.2');
    });
});

test('Geçersiz IP / header yoksa 0.0.0.0', () => {
    withEnv({ VERCEL: '1' }, () => {
        assert.equal(getClientIp(H({ 'x-real-ip': 'not-an-ip' })), '0.0.0.0');
        assert.equal(getClientIp(null), '0.0.0.0');
    });
});

test('Legacy (tanımsız ortam): XFF son eleman', () => {
    withEnv({ NODE_ENV: 'production' }, () => {
        assert.equal(getClientIp(H({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })), '203.0.113.9');
    });
});
