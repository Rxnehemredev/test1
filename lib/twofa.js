// lib/twofa.js
//
// ══════════════════════════════════════════════════════════════════════════
// TOTP tabanlı İki Adımlı Doğrulama (2FA) — Google Authenticator / Authy vb.
// standart doğrulayıcı uygulamalarla uyumlu (RFC 6238).
//
// Madde 12 (Admin panel açık erişim) önlemi: admin_2fa_required ayarı
// açıldığında, admin paneline erişimi olan roller (admin/manager/moderator/
// team_member + özel roller) hesaplarında 2FA kurulu olmadan panele giremez.
// ══════════════════════════════════════════════════════════════════════════

import { authenticator } from 'otplib';
import crypto from 'crypto';

// Authenticator app'lerin (Google Authenticator, Authy, 1Password vb.) çoğu
// 30 saniyelik pencere + 6 haneli kod kullanır — varsayılanı bunlarla uyumlu tutuyoruz.
authenticator.options = { window: 1 }; // ±1 pencere (önceki/sonraki 30sn) — saat kayması toleransı

const APP_NAME = 'Asteria Scans';

export function generateTotpSecret() {
    return authenticator.generateSecret();
}

export function generateOtpAuthUrl(secret, accountLabel) {
    return authenticator.keyuri(accountLabel, APP_NAME, secret);
}

export function verifyTotpToken(token, secret) {
    if (!token || !secret) return false;
    // otplib boşluk/whitespace'e takılabiliyor — kullanıcı genelde "123 456" gibi girer
    const cleaned = String(token).replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleaned)) return false;
    try {
        return authenticator.verify({ token: cleaned, secret });
    } catch {
        return false;
    }
}

// ── Yedek kodlar (backup codes) ─────────────────────────────────────────
// Telefonunu kaybedersen hesabına girebilmen için tek kullanımlık 10 kod.
// Düz metin OLARAK SAKLANMAZ — sadece SHA-256 hash'i DB'de tutulur, kullanıcıya
// bir kere (üretildiği anda) gösterilir.

export function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // 10 haneli, okunması kolay (XXXXX-XXXXX) rastgele kod
        const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex karakter
        codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    }
    return codes;
}

export function hashBackupCode(code) {
    const normalized = String(code).trim().toUpperCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * storedHashes: JSON string (array of sha256 hex hashes) — DB'deki totp_backup_codes kolonu
 * Eşleşen kod bulunursa onu listeden çıkarıp (tek kullanımlık) yeni JSON string'i döner.
 * Eşleşme yoksa null döner.
 */
export function consumeBackupCode(storedHashesJson, inputCode) {
    if (!storedHashesJson || !inputCode) return null;
    let hashes;
    try {
        hashes = JSON.parse(storedHashesJson);
        if (!Array.isArray(hashes)) return null;
    } catch {
        return null;
    }
    const targetHash = hashBackupCode(inputCode);
    const idx = hashes.indexOf(targetHash);
    if (idx === -1) return null;
    hashes.splice(idx, 1);
    return JSON.stringify(hashes);
}
