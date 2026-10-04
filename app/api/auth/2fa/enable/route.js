import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { verifyTotpToken, generateBackupCodes, hashBackupCode } from '@/lib/twofa';
import { createRateLimiter } from '@/lib/ratelimit';

// 6 haneli kodun brute-force ile denenmesine karşı sıkı limit (1.000.000
// ihtimalden birini yakalamak için gerçekçi olarak binlerce deneme gerekir,
// ama yine de savunma katmanı olarak sınırlıyoruz).
const enableLimiter = createRateLimiter(10, 10 * 60 * 1000);

// POST /api/auth/2fa/enable   body: { token: "123456" }
// /setup ile üretilmiş secret'ı doğrulayan İLK kodu kontrol eder; doğruysa
// 2FA'yı fiilen açar ve tek seferlik gösterilecek yedek kodları üretir.
export async function POST(request) {
    const rl = await enableLimiter(request);
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

        const { token } = await request.json();

        const dbUser = await db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?').get(user.id);
        if (!dbUser?.totp_secret) {
            return NextResponse.json({ error: 'Önce /2fa/setup ile bir kurulum başlatmalısınız.' }, { status: 400 });
        }
        if (dbUser.totp_enabled) {
            return NextResponse.json({ error: '2FA zaten aktif.' }, { status: 400 });
        }

        if (!verifyTotpToken(token, dbUser.totp_secret)) {
            return NextResponse.json({ error: 'Kod yanlış veya süresi dolmuş. Authenticator uygulamanızdaki güncel kodu girin.' }, { status: 400 });
        }

        const backupCodes = generateBackupCodes(10);
        const hashedCodes = backupCodes.map(hashBackupCode);

        await db.prepare('UPDATE users SET totp_enabled = 1, totp_backup_codes = ? WHERE id = ?')
            .run(JSON.stringify(hashedCodes), user.id);

        try {
            await db.prepare('INSERT INTO user_activity_log (user_id, action, details) VALUES (?, ?, ?)')
                .run(user.id, '2fa_enabled', null);
        } catch {}

        // backupCodes SADECE burada, DÜZ METİN olarak, bir kez döner. DB'de asla
        // tutulmaz — kullanıcı bunları güvenli bir yere kaydetmeli.
        return NextResponse.json({ success: true, backupCodes });
    } catch (error) {
        console.error('POST /api/auth/2fa/enable error:', error);
        return NextResponse.json({ error: '2FA etkinleştirilemedi.' }, { status: 500 });
    }
}
