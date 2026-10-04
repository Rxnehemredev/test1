import { NextResponse } from 'next/server';
import { describeConfigError } from '@/lib/envGuard';
import { getDb } from '@/lib/db';
import {
    verifyPassword,
    generatePreAuthToken,
    finalizeLoginResponse,
    getAdminPanelAccessStatus,
} from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/security/turnstile';

// ══════════════════════════════════════════════════════════════════════════
// YÖNETİCİ GİRİŞİ — POST /api/admin/auth/login
//
// Normal kullanıcı girişinden (/api/auth/login) BİLEREK ayrı tutuldu:
//  • Sadece personel rolleri (admin, manager, moderator, team_member, özel roller)
//    oturum açabilir; normal üyeler burada doğru şifreyle bile oturum ALAMAZ.
//  • Kendi, daha sıkı rate limit'i var (IP başına 15 dk'da 5 deneme) ve
//    normal girişin sayacıyla karışmaz.
//  • Oturum, normal girişle aynı cookie'yi (yomi_token) kullanır; böylece admin
//    paneli ve tüm /api/admin/* uçları ek bir değişiklik olmadan çalışır.
//  • 2FA açıksa oturum hemen AÇILMAZ; ön-oturum token'ı döner ve ikinci adım
//    mevcut /api/auth/2fa/login-verify ile tamamlanır.
// ══════════════════════════════════════════════════════════════════════════

const adminLoginLimiter = createRateLimiter(5, 15 * 60 * 1000, { sensitive: true });

export async function POST(request) {
    try {
        const rl = await adminLoginLimiter(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
            );
        }

        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const turnstile = await verifyTurnstile(body.turnstileToken, request);
        if (!turnstile.ok) {
            return NextResponse.json({ error: turnstile.error }, { status: turnstile.status || 400 });
        }

        const db = await getDb();
        const user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);

        // Kullanıcı yok / şifre yanlış → aynı mesaj (hesap varlığı sızdırılmaz)
        if (!user || !verifyPassword(password, user.password_hash)) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (user.banned_until) {
            const bannedUntil = new Date(user.banned_until);
            if (bannedUntil > new Date()) {
                return NextResponse.json(
                    { error: 'Account suspended', bannedUntil: user.banned_until },
                    { status: 403 }
                );
            }
        }

        // Şifre doğru ama personel değil → oturum AÇMA.
        // (2FA zorunluluğu olan personel yine giriş yapabilir: 2FA'yı profilinden kurması gerekir.)
        const access = await getAdminPanelAccessStatus(user, db);
        if (!access.allowed && access.reason === 'not_staff') {
            return NextResponse.json({ error: 'Not authorized for admin panel' }, { status: 403 });
        }

        if (user.totp_enabled) {
            return NextResponse.json({
                requires2FA: true,
                preAuthToken: generatePreAuthToken(user),
            });
        }

        return await finalizeLoginResponse(db, user);
    } catch (error) {
        console.error('POST /api/admin/auth/login error:', error);
        const cfg = describeConfigError(error);
        return NextResponse.json({ error: cfg || 'Login failed' }, { status: 500 });
    }
}
