import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import bcrypt from 'bcryptjs';

const rateLimiter = createRateLimiter(10, 60 * 1000); // 10 req/min

const VALID_AVATAR_PREFIXES = ['https://', 'http://', '/uploads/'];
const USERNAME_RE = /^[a-zA-Z0-9_\-.]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidAvatarUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return VALID_AVATAR_PREFIXES.some(p => url.startsWith(p));
}

export async function PUT(request) {
    const rl = await rateLimiter(request);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, {
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
        const { user: tokenUser } = result;

        const { username, email, currentPassword, newPassword, avatar_url, display_name } = await request.json();

        const user = await db.prepare(
            'SELECT id, username, email, password_hash, avatar_url, last_avatar_update, display_name FROM users WHERE id = ?'
        ).get(tokenUser.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update username
        if (username && username !== user.username) {
            if (!USERNAME_RE.test(username)) {
                return NextResponse.json({ error: 'Kullanıcı adı 3-30 karakter, sadece harf/rakam/_/-/. içerebilir.' }, { status: 400 });
            }
            const reserved = ['admin', 'root', 'system', 'moderator', 'mod', 'support'];
            if (reserved.includes(username.toLowerCase())) {
                return NextResponse.json({ error: 'Bu kullanıcı adı kullanılamaz.' }, { status: 400 });
            }
            const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, user.id);
            if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            await db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
        }

        // Update email
        if (email && email !== user.email) {
            if (!EMAIL_RE.test(email)) {
                return NextResponse.json({ error: 'Geçersiz e-posta adresi.' }, { status: 400 });
            }
            const existing = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, user.id);
            if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
            await db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
        }

        // Update password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
            }
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
            if (newPassword.length < 8) {
                return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
            }
            const hash = await bcrypt.hash(newPassword, 12);
            await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
        }

        // Update avatar
        if (avatar_url && avatar_url !== user.avatar_url) {
            if (!isValidAvatarUrl(avatar_url)) {
                return NextResponse.json({ error: 'Geçersiz profil resmi URL\'si.' }, { status: 400 });
            }
            if (user.last_avatar_update) {
                const msInDay = 24 * 60 * 60 * 1000;
                const lastUpdate = new Date(
                    user.last_avatar_update.includes('T')
                        ? user.last_avatar_update
                        : user.last_avatar_update + 'Z'
                ).getTime();
                if (Date.now() - lastUpdate < msInDay) {
                    return NextResponse.json({ error: 'Profile picture can only be changed once every 24 hours.' }, { status: 400 });
                }
            }
            await db.prepare('UPDATE users SET avatar_url = ?, last_avatar_update = CURRENT_TIMESTAMP WHERE id = ?').run(avatar_url, user.id);
        }

        // Update display name (görünen isim) — ayrı, boşsa username'e döner
        if (display_name !== undefined && display_name !== user.display_name) {
            const trimmed = (display_name || '').toString().trim();
            if (trimmed === '') {
                await db.prepare('UPDATE users SET display_name = NULL WHERE id = ?').run(user.id);
            } else {
                if (trimmed.length < 2 || trimmed.length > 30) {
                    return NextResponse.json({ error: 'Görünen isim 2-30 karakter olmalı.' }, { status: 400 });
                }
                await db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(trimmed, user.id);
            }
        }

        const updated = await db.prepare(
            'SELECT id, username, email, display_name, avatar_url, cover_url, role, yomi_points, last_daily_login, last_avatar_update, last_cover_update, created_at FROM users WHERE id = ?'
        ).get(user.id);
        return NextResponse.json({ user: updated, message: 'Profile updated successfully' });

    } catch (error) {
        console.error('PUT /api/auth/profile error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}