import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPreAuthToken, finalizeLoginResponse } from '@/lib/auth';
import { verifyTotpToken, consumeBackupCode } from '@/lib/twofa';
import { createRateLimiter } from '@/lib/ratelimit';

// IP bazlı: 10 deneme / 10 dk. Token süresi zaten 5 dk olduğu için bu,
// pratikte "bir preAuthToken ömrü boyunca birkaç deneme" anlamına gelir.
const verifyLimiter = createRateLimiter(10, 10 * 60 * 1000, { sensitive: true });

// HESAP bazlı sayaç (rate limiter'dan BAĞIMSIZ): IP rotasyonu / dağıtık saldırı IP
// limitini aşsa bile tek bir hesabın TOTP kodu 15 dakikada en fazla 5 kez denenebilir.
// Sayaç ve kilit users tablosunda (totp_failed_attempts, totp_locked_until[epoch ms]).
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function lockedResponse(lockedUntilMs) {
    const retryAfter = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 1000));
    return NextResponse.json(
        {
            error: `Çok fazla hatalı kod girildi. Hesap ${Math.ceil(retryAfter / 60)} dakika süreyle kilitlendi.`,
            lockedUntil: lockedUntilMs,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
}

// POST /api/auth/2fa/login-verify   body: { preAuthToken, token? , backupCode? }
// Login akışının 2. adımı. preAuthToken sadece "kim olduğunu" taşır — asıl
// yetki TOTP kodunun (ya da yedek kodun) doğru olmasından gelir.
export async function POST(request) {
    const rl = await verifyLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' }, {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const { preAuthToken, token, backupCode } = await request.json();
        if (!preAuthToken) {
            return NextResponse.json({ error: 'Ön-oturum eksik. Lütfen tekrar giriş yapın.' }, { status: 400 });
        }
        if (!token && !backupCode) {
            return NextResponse.json({ error: 'Doğrulama kodu gerekli.' }, { status: 400 });
        }

        const payload = verifyPreAuthToken(preAuthToken);
        if (!payload) {
            return NextResponse.json({ error: 'Ön-oturum süresi doldu. Lütfen tekrar giriş yapın.' }, { status: 401 });
        }

        const db = await getDb();
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
        if (!user || !user.totp_enabled) {
            return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 401 });
        }

        // Ban kontrolü — normal login route'undaki ile aynı, 2FA doğrulasa bile
        // banlı hesap oturum açamaz.
        if (user.banned_until) {
            const bannedUntil = new Date(user.banned_until);
            if (bannedUntil > new Date()) {
                return NextResponse.json(
                    { error: 'Account suspended', bannedUntil: user.banned_until },
                    { status: 403 }
                );
            }
        }

        // ── Hesap bazlı kilit kontrolü ────────────────────────────────────────
        const now = Date.now();
        const lockedUntil = Number(user.totp_locked_until) || 0;
        if (lockedUntil > now) return lockedResponse(lockedUntil);
        if (lockedUntil > 0) {
            // Kilit süresi dolmuş → yeni pencere: sayaç ve kilit sıfırlanır.
            await db.prepare(
                'UPDATE users SET totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = ? AND totp_locked_until IS NOT NULL AND totp_locked_until <= ?'
            ).run(user.id, now);
        }

        // ── Deneme hakkını DOĞRULAMADAN ÖNCE, ATOMİK olarak rezerve et ──────────
        // (Önce-kontrol-sonra-artır deseni paralel isteklerle aşılırdı: 100 eşzamanlı
        // istek hepsi "kilit yok" görüp 100 tahmin yapabilirdi.) Tek UPDATE hem kilidi
        // denetler hem sayacı artırır; 5. rezervasyon kilidi koyar, sonrakiler 0 satır
        // etkiler → eşzamanlılıkta bile pencere başına en fazla 5 tahmin.
        const reserve = await db.prepare(
            `UPDATE users
                SET totp_failed_attempts = totp_failed_attempts + 1,
                    totp_locked_until = CASE WHEN totp_failed_attempts + 1 >= ? THEN ? ELSE NULL END
              WHERE id = ? AND totp_locked_until IS NULL`
        ).run(MAX_FAILED_ATTEMPTS, now + LOCK_DURATION_MS, user.id);
        if (reserve.changes === 0) {
            const fresh = await db.prepare('SELECT totp_locked_until FROM users WHERE id = ?').get(user.id);
            return lockedResponse(Number(fresh?.totp_locked_until) || now + LOCK_DURATION_MS);
        }

        let verified = false;
        if (token) {
            verified = verifyTotpToken(token, user.totp_secret);
        } else if (backupCode) {
            const remaining = consumeBackupCode(user.totp_backup_codes, backupCode);
            if (remaining !== null) {
                verified = true;
                await db.prepare('UPDATE users SET totp_backup_codes = ? WHERE id = ?').run(remaining, user.id);
            }
        }

        if (!verified) {
            const after = await db.prepare('SELECT totp_failed_attempts, totp_locked_until FROM users WHERE id = ?').get(user.id);
            const lockedNow = Number(after?.totp_locked_until) || 0;
            if (lockedNow > Date.now()) return lockedResponse(lockedNow);
            const left = Math.max(0, MAX_FAILED_ATTEMPTS - (Number(after?.totp_failed_attempts) || 0));
            return NextResponse.json({ error: `Kod yanlış. Kalan deneme: ${left}`, attemptsLeft: left }, { status: 401 });
        }

        // Başarılı doğrulama: sayaç + kilit sıfırlanır.
        await db.prepare('UPDATE users SET totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = ?').run(user.id);

        return await finalizeLoginResponse(db, user);
    } catch (error) {
        console.error('POST /api/auth/2fa/login-verify error:', error);
        return NextResponse.json({ error: 'Doğrulama başarısız.' }, { status: 500 });
    }
}
