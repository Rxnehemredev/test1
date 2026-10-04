import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, verifyPassword } from '@/lib/auth';
import { verifyTotpToken, consumeBackupCode } from '@/lib/twofa';
import { createRateLimiter } from '@/lib/ratelimit';

const disableLimiter = createRateLimiter(5, 10 * 60 * 1000);

// POST /api/auth/2fa/disable   body: { password, token? , backupCode? }
// 2FA'yı kapatmak, kapatan kişinin GERÇEKTEN hesap sahibi olduğunu iki
// faktörle de (şifre + TOTP/yedek kod) kanıtlamasını gerektirir. Sadece
// şifreyle kapatılabilseydi, çalınan bir oturum token'ı 2FA'yı devre dışı
// bırakıp kalıcı erişim sağlamak için kötüye kullanılabilirdi.
export async function POST(request) {
    const rl = await disableLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' }, {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfter) },
        });
    }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user } = result;

        const { password, token, backupCode } = await request.json();
        if (!password) {
            return NextResponse.json({ error: 'Şifre gerekli.' }, { status: 400 });
        }
        if (!token && !backupCode) {
            return NextResponse.json({ error: '2FA kodu veya yedek kod gerekli.' }, { status: 400 });
        }

        const dbUser = await db.prepare(
            'SELECT password_hash, totp_secret, totp_enabled, totp_backup_codes FROM users WHERE id = ?'
        ).get(user.id);

        if (!dbUser?.totp_enabled) {
            return NextResponse.json({ error: '2FA zaten kapalı.' }, { status: 400 });
        }

        if (!verifyPassword(password, dbUser.password_hash)) {
            return NextResponse.json({ error: 'Şifre yanlış.' }, { status: 401 });
        }

        let secondFactorOk = false;
        if (token) {
            secondFactorOk = verifyTotpToken(token, dbUser.totp_secret);
        } else if (backupCode) {
            secondFactorOk = consumeBackupCode(dbUser.totp_backup_codes, backupCode) !== null;
        }

        if (!secondFactorOk) {
            return NextResponse.json({ error: 'Doğrulama kodu geçersiz.' }, { status: 401 });
        }

        await db.prepare(
            'UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL WHERE id = ?'
        ).run(user.id);

        try {
            await db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)')
                .run(user.id, '2fa_disabled', null);
        } catch {}

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('POST /api/auth/2fa/disable error:', error);
        return NextResponse.json({ error: '2FA kapatılamadı.' }, { status: 500 });
    }
}
