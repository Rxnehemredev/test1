import { NextResponse } from 'next/server';
import { describeConfigError } from '@/lib/envGuard';
import { getDb } from '@/lib/db';
import { verifyPassword, generatePreAuthToken, finalizeLoginResponse } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/security/turnstile';

const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000, { sensitive: true });

export async function POST(request) {
    try {
        const rateLimitResult = await loginRateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
            );
        }

        const body = await request.json();
        // Kayıt sırasında e-posta küçük harfe çevrilip saklanıyor; girişte de aynısını yapmazsak
        // telefonlarda otomatik büyük harfle başlayan e-postalar ("Ali@...") "hatalı şifre" veriyordu.
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const turnstileToken = body.turnstileToken;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Verify Turnstile if configured
        const turnstile = await verifyTurnstile(turnstileToken, request);
        if (!turnstile.ok) {
            return NextResponse.json({ error: turnstile.error }, { status: turnstile.status || 400 });
        }

        const db = await getDb();
        const user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);

        if (!user || !verifyPassword(password, user.password_hash)) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Ban kontrolü
        if (user.banned_until) {
            const bannedUntil = new Date(user.banned_until);
            if (bannedUntil > new Date()) {
                return NextResponse.json(
                    { error: 'Account suspended', bannedUntil: user.banned_until },
                    { status: 403 }
                );
            }
        }

        // 2FA kuruluysa oturumu HEMEN açma — sadece kısa ömürlü bir "ön-oturum"
        // token'ı ver, gerçek oturum token'ı 2. adımda (doğru TOTP/yedek kod ile)
        // /api/auth/2fa/login-verify tarafından üretilir. Şifreyi bilmek artık
        // tek başına yeterli değil.
        if (user.totp_enabled) {
            return NextResponse.json({
                requires2FA: true,
                preAuthToken: generatePreAuthToken(user),
            });
        }

        // Bakım modu kontrolü + cookie/token üretimi ortak fonksiyonda (lib/auth.js)
        // — /api/auth/2fa/login-verify ile birebir aynı mantığı paylaşır.
        // Şifre politikası geçiş dönemi: yeni kayıtlarda min 12 karakter. Eski, kısa şifreli
        // hesaplar girişi engellenmeden uyarılır (istemci `passwordWarning`'i gösterebilir).
        const extra = password.length < 12
            ? { passwordWarning: 'Şifren 12 karakterden kısa. Hesabını korumak için profilinden daha uzun bir şifre belirlemeni öneririz.' }
            : {};
        return await finalizeLoginResponse(db, user, { extra });
    } catch (error) {
        console.error('POST /api/auth/login error:', error);
        const cfg = describeConfigError(error);
        return NextResponse.json({ error: cfg || 'Login failed' }, { status: 500 });
    }
}
