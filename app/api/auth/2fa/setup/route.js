import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { generateTotpSecret, generateOtpAuthUrl } from '@/lib/twofa';
import { createRateLimiter } from '@/lib/ratelimit';

const setupLimiter = createRateLimiter(5, 60 * 1000); // 5 istek/dk — QR kurulum ekranı spam'e açık olmasın

// POST /api/auth/2fa/setup
// Yeni bir TOTP gizli anahtarı üretir ve kullanıcının hesabına (henüz
// totp_enabled=0 halde) kaydeder. Kullanıcı bunu authenticator app'e taratıp
// doğru 6 haneli kodu /api/auth/2fa/enable'a gönderene kadar 2FA fiilen
// AKTİF OLMAZ — bu yüzden yarım kalan bir kurulum kimseyi hesabından atmaz.
export async function POST(request) {
    const rl = await setupLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' }, {
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

        const existing = await db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id);
        if (existing?.totp_enabled) {
            return NextResponse.json({ error: '2FA zaten aktif. Önce mevcut 2FA\'yı kapatmalısınız.' }, { status: 400 });
        }

        const secret = generateTotpSecret();
        await db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, user.id);

        const otpauthUrl = generateOtpAuthUrl(secret, user.email);

        return NextResponse.json({
            secret,
            otpauthUrl,
            // Manuel giriş için okunması kolay, gruplu hâli (authenticator app QR
            // okuyamazsa kullanıcı bunu elle girebilir).
            secretGrouped: secret.match(/.{1,4}/g)?.join(' ') || secret,
        });
    } catch (error) {
        console.error('POST /api/auth/2fa/setup error:', error);
        return NextResponse.json({ error: '2FA kurulumu başlatılamadı.' }, { status: 500 });
    }
}
