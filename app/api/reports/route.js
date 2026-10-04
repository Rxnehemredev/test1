import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { getClientIp } from '@/lib/security/requestHelpers';
const reportLimiter = createRateLimiter(10, 60000);


// ── Basit in-memory rate limiter (IP + user bazlı) ──────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 dakika
const RATE_LIMIT_MAX = 3; // 5 dakikada max 3 hata bildirimi

function getRateLimitKey(request, userId) {
    const ip = getClientIp(request);
    return userId ? `user:${userId}` : `ip:${ip}`;
}

function checkRateLimit(key) {
    const now = Date.now();
    const record = rateLimitMap.get(key);
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }
    if (record.count >= RATE_LIMIT_MAX) {
        const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.windowStart)) / 1000);
        return { allowed: false, retryAfter: retryAfterSec };
    }
    record.count += 1;
    return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

export async function POST(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const body = await request.json();
        const { chapterId, seriesId, description } = body;

        if (!description || !description.trim()) {
            return NextResponse.json({ success: false, error: 'Açıklama alanı zorunludur' }, { status: 400 });
        }

        const user = getUserFromRequest(request);
        const userId = user ? user.id : null;

        // ── Rate limiting ────────────────────────────────────────
        const rlKey = getRateLimitKey(request, userId);
        const rl = checkRateLimit(rlKey);
        if (!rl.allowed) {
            return NextResponse.json({
                success: false,
                error: `Çok fazla hata bildirimi gönderdiniz. Lütfen ${rl.retryAfter} saniye sonra tekrar deneyin.`
            }, { status: 429 });
        }

        const db = await getDb();

        // Auto-generate title from chapter/series info
        let title = 'Bölüm Hata Bildirimi';
        if (chapterId) {
            try {
                const chapter = await db.prepare(`
                    SELECT c.chapter_number, s.title as series_title
                    FROM chapters c
                    LEFT JOIN series s ON c.series_id = s.id
                    WHERE c.id = ?
                `).get(chapterId);
                if (chapter) {
                    title = `Bölüm ${chapter.chapter_number}${chapter.series_title ? ' — ' + chapter.series_title : ''}`;
                }
            } catch { /* use default title */ }
        }

        await db.prepare(
            'INSERT INTO bug_reports (user_id, chapter_id, series_id, title, description) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, chapterId || null, seriesId || null, title, description.trim());

        return NextResponse.json({ success: true, message: 'Hata bildirimi başarıyla gönderildi' });
    } catch (error) {
        console.error('Error submitting bug report:', error);
        return NextResponse.json({ success: false, error: 'Hata bildirimi gönderilemedi' }, { status: 500 });
    }
}