import { NextResponse } from 'next/server';
import { describeConfigError } from '@/lib/envGuard';
import { getDb } from '@/lib/db';
import { hashPassword, finalizeLoginResponse } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { verifyTurnstile } from '@/lib/security/turnstile';

// Username: 3-30 chars, alphanumeric + underscore + Turkish characters
const USERNAME_REGEX = /^[a-zA-Z0-9_çÇğĞıİşŞüÜöÖ]{3,30}$/;
// Basic email format check
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerRateLimiter = createRateLimiter(3, 60 * 60 * 1000, { sensitive: true });

// Yeni hesaplar için minimum şifre uzunluğu (önceden 6). Mevcut kullanıcılar etkilenmez:
// giriş (login) tarafında uzunluk zorlaması YOK; sadece yeni kayıtlarda ve (login
// yanıtındaki `passwordWarning` ile) kısa şifreli eski hesaplara uyarı gösterilir.
const MIN_PASSWORD_LENGTH = 12; // (route dosyalarından export edilemez — Next.js yalnızca HTTP metodlarına izin verir)

export async function POST(request) {
    try {
        const rateLimitResult = await registerRateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
            );
        }

        const body = await request.json();
        const username = typeof body.username === 'string' ? body.username.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const turnstileToken = body.turnstileToken || '';

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (!USERNAME_REGEX.test(username)) {
            return NextResponse.json(
                { error: 'Kullanıcı adı 3-30 karakter olmalı, sadece harf, rakam, alt çizgi ve Türkçe karakter içerebilir' },
                { status: 400 }
            );
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return NextResponse.json({ error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır` }, { status: 400 });
        }

        if (password.length > 128) {
            return NextResponse.json({ error: 'Password is too long (max 128 characters)' }, { status: 400 });
        }

        // Verify Turnstile if configured
        const turnstile = await verifyTurnstile(turnstileToken, request);
        if (!turnstile.ok) {
            return NextResponse.json({ error: turnstile.error }, { status: turnstile.status || 400 });
        }

        const db = await getDb();

        const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existing) {
            return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
        }

        const passwordHash = hashPassword(password);
        const result = await db.prepare(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
        ).run(username, email, passwordHash);

        const user = { id: result.lastInsertRowid, username, email, role: 'user' };

        // Oturum cookie'si finalizeLoginResponse'ta (tek implementasyon); response gövdesinde token YOK.
        return await finalizeLoginResponse(db, user, { status: 201, skipMaintenanceCheck: true });
    } catch (error) {
        console.error('POST /api/auth/register error:', error);
        const cfg = describeConfigError(error);
        return NextResponse.json({ error: cfg || 'Registration failed' }, { status: 500 });
    }
}
