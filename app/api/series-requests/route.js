import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasPermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { getClientIp } from '@/lib/security/requestHelpers';
const reportLimiter = createRateLimiter(10, 60000);


// Aşama 2 — Admin note XSS koruması
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export const dynamic = 'force-dynamic';

// ── Basit in-memory rate limiter ─────────────────────────────────
const rlMap = new Map();
function checkRL(key, maxCount, windowMs) {
    const now = Date.now();
    const rec = rlMap.get(key);
    if (!rec || now - rec.start > windowMs) {
        rlMap.set(key, { count: 1, start: now });
        return { allowed: true };
    }
    if (rec.count >= maxCount) {
        const retryAfter = Math.ceil((windowMs - (now - rec.start)) / 1000);
        return { allowed: false, retryAfter };
    }
    rec.count += 1;
    return { allowed: true };
}
function getIP(request) {
    return getClientIp(request);
}

// Ensure series_requests table exists
async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS series_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            series_title TEXT NOT NULL,
            series_type TEXT DEFAULT 'manga',
            author TEXT DEFAULT '',
            description TEXT DEFAULT '',
            source_url TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            status TEXT DEFAULT 'pending',
            admin_note TEXT DEFAULT '',
            upvotes INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS series_request_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(request_id, user_id)
        )
    `).run();
}

// GET — list requests
export async function GET(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        ensureTable(db);

        const { searchParams } = new URL(request.url);
        const adminView = searchParams.get('admin') === '1';
        const userId = searchParams.get('userId');
        const myRequests = searchParams.get('mine') === '1';

        if (adminView) {
            const user = await requireAuth(request);
            if (!user || (!['admin', 'manager'].includes(user.role) && !await hasPermission(user, 'manage_requests', db))) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            const rows = await db.prepare(`
                SELECT * FROM series_requests ORDER BY
                    CASE status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
                    created_at DESC
            `).all();
            return NextResponse.json({ requests: rows });
        }

        if (myRequests) {
            // Kullanıcının kendi istekleri - sadece giriş yapmış kullanıcının kendi isteklerini göster
            // userId query string'den değil, authenticate edilmiş kullanıcıdan alınır
            const currentUser = await requireAuth(request);
            if (!currentUser) {
                return NextResponse.json({ error: 'Login required' }, { status: 401 });
            }
            const rows = await db.prepare(`
                SELECT * FROM series_requests WHERE user_id = ? ORDER BY created_at DESC
            `).all(currentUser.id);
            return NextResponse.json({ requests: rows });
        }

        // Public listing — approved/added/reviewing/rejected requests visible (NOT pending)
        // Pending requests require admin approval before public visibility
        //
        // Aşama 3 — Güvenlik: SELECT * kullanılmıyor. user_id (kullanıcı ID'si) ve
        // admin_note (iç admin notu) gibi herkese açık olmaması gereken alanlar
        // döndürülmüyor; yalnızca genel görünümün ihtiyaç duyduğu kolonlar seçiliyor.
        const rows = await db.prepare(`
            SELECT id, series_title, series_type, author, description, source_url,
                   reason, status, upvotes, created_at, username
            FROM series_requests
            WHERE status IN ('reviewing', 'approved', 'added', 'rejected')
            ORDER BY
                CASE status
                    WHEN 'reviewing' THEN 0
                    WHEN 'approved' THEN 1
                    WHEN 'added' THEN 2
                    WHEN 'rejected' THEN 3
                    ELSE 4
                END,
                upvotes DESC, created_at DESC
        `).all();

        return NextResponse.json({ requests: rows });
    } catch (error) {
        console.error('GET series-requests error:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

// POST — create / admin actions / upvote
export async function POST(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        ensureTable(db);

        const body = await request.json();
        const { action } = body;
        
        let currentUser;
        try { currentUser = await requireAuth(request); } catch { currentUser = null; }

        if (currentUser && !['admin', 'manager'].includes(currentUser.role)) {
            const dbUser = await db.prepare('SELECT banned_until FROM users WHERE id = ?').get(currentUser.id);
            if (dbUser && dbUser.banned_until && new Date(dbUser.banned_until) > new Date()) {
                return NextResponse.json({
                    error: `İşlem yapmanız engellendi. Engelin biteceği tarih: ${new Date(dbUser.banned_until).toLocaleString('tr-TR')}`
                }, { status: 403 });
            }
        }

        // ── Admin: update status ────────────────────────────────
        if (action === 'update-status') {
            if (!currentUser || (!['admin', 'manager'].includes(currentUser.role) && !await hasPermission(currentUser, 'manage_requests', db))) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const { id, status, admin_note } = body;
            if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

            await db.prepare(`
                UPDATE series_requests SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?
            `).run(status, admin_note ?? '', id);

            // ── Kullanıcıya bildirim gönder ──────────────────────
            try {
                const req = await db.prepare('SELECT user_id, series_title FROM series_requests WHERE id = ?').get(id);
                if (req) {
                    let msg = '';
                    let notifType = 'series_request';
                    if (status === 'approved') {
                        msg = `"${req.series_title}" seri isteğiniz onaylandı! Yakında eklenecek.`;
                        notifType = 'series_request_approved';
                    } else if (status === 'rejected') {
                        msg = `"${req.series_title}" seri isteğiniz reddedildi.${admin_note ? ` Not: ${escapeHtml(admin_note)}` : ''}`;
                        notifType = 'series_request_rejected';
                    } else if (status === 'added') {
                        msg = `"${req.series_title}" seri isteğiniz sisteme eklendi!`;
                        notifType = 'series_request_added';
                    } else if (status === 'reviewing') {
                        msg = `"${req.series_title}" seri isteğiniz incelemeye alındı.`;
                        notifType = 'series_request_reviewing';
                    }
                    if (msg) {
                        try {
                            await db.prepare(`
                                CREATE TABLE IF NOT EXISTS notifications (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    user_id INTEGER NOT NULL,
                                    type TEXT NOT NULL,
                                    message TEXT NOT NULL,
                                    link TEXT DEFAULT '',
                                    is_read INTEGER DEFAULT 0,
                                    created_at TEXT DEFAULT (datetime('now'))
                                )
                            `).run();
                        } catch {}
                        await db.prepare(
                            'INSERT INTO notifications (user_id, type, message, link, is_read) VALUES (?, ?, ?, ?, 0)'
                        ).run(req.user_id, notifType, msg, '/requests');
                    }
                }
            } catch (notifErr) {
                console.error('Notification insert error:', notifErr);
                // Bildirim hatası ana işlemi engellemesin
            }

            return NextResponse.json({ ok: true });
        }

        // ── Admin: delete ───────────────────────────────────────
        if (action === 'delete') {
            if (!currentUser || (!['admin', 'manager'].includes(currentUser.role) && !await hasPermission(currentUser, 'manage_requests', db))) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            await db.prepare('DELETE FROM series_requests WHERE id = ?').run(body.id);
            await db.prepare('DELETE FROM series_request_votes WHERE request_id = ?').run(body.id);
            return NextResponse.json({ ok: true });
        }

        // ── Upvote toggle ───────────────────────────────────────
        if (action === 'upvote') {
            if (!currentUser) return NextResponse.json({ error: 'Login required' }, { status: 401 });

            // Rate limit: kullanıcı başına 30 saniyede 5 upvote
            const upvoteRL = checkRL(`upvote:${currentUser.id}`, 5, 30 * 1000);
            if (!upvoteRL.allowed) {
                return NextResponse.json({
                    error: `Çok hızlı oy kullanıyorsunuz. Lütfen ${upvoteRL.retryAfter} saniye bekleyin.`
                }, { status: 429 });
            }

            const { id } = body;
            const existing = await db.prepare(
                'SELECT id FROM series_request_votes WHERE request_id = ? AND user_id = ?'
            ).get(id, currentUser.id);

            if (existing) {
                await db.prepare('DELETE FROM series_request_votes WHERE request_id = ? AND user_id = ?').run(id, currentUser.id);
                await db.prepare('UPDATE series_requests SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(id);
                return NextResponse.json({ voted: false });
            } else {
                await db.prepare('INSERT INTO series_request_votes (request_id, user_id) VALUES (?, ?)').run(id, currentUser.id);
                await db.prepare('UPDATE series_requests SET upvotes = upvotes + 1 WHERE id = ?').run(id);
                return NextResponse.json({ voted: true });
            }
        }

        // ── Create new request ──────────────────────────────────
        if (!currentUser) {
            return NextResponse.json({ error: 'Login required to submit a request' }, { status: 401 });
        }

        // Rate limit: kullanıcı başına 1 saatte max 3 yeni istek
        const ip = getIP(request);
        const newReqRL = checkRL(`newreq:${currentUser.id}:${ip}`, 3, 60 * 60 * 1000);
        if (!newReqRL.allowed) {
            return NextResponse.json({
                error: `Çok fazla seri isteği gönderdiniz. Lütfen ${Math.ceil(newReqRL.retryAfter / 60)} dakika sonra tekrar deneyin.`
            }, { status: 429 });
        }

        const { series_title, series_type, author, description, source_url, reason } = body;
        if (!series_title?.trim()) {
            return NextResponse.json({ error: 'Series title is required' }, { status: 400 });
        }

        // Aşama 2 — Alan uzunluk kontrolleri
        if (series_title.trim().length > 200) {
            return NextResponse.json({ error: 'Seri başlığı en fazla 200 karakter olabilir.' }, { status: 400 });
        }
        if (description && description.length > 2000) {
            return NextResponse.json({ error: 'Açıklama en fazla 2000 karakter olabilir.' }, { status: 400 });
        }
        if (reason && reason.length > 1000) {
            return NextResponse.json({ error: 'Neden alanı en fazla 1000 karakter olabilir.' }, { status: 400 });
        }
        if (source_url && source_url.length > 500) {
            return NextResponse.json({ error: 'Kaynak URL en fazla 500 karakter olabilir.' }, { status: 400 });
        }
        if (author && author.length > 200) {
            return NextResponse.json({ error: 'Yazar adı en fazla 200 karakter olabilir.' }, { status: 400 });
        }

        // Prevent duplicates: same user + same title within 7 days
        const dup = await db.prepare(`
            SELECT id FROM series_requests
            WHERE user_id = ? AND LOWER(series_title) = LOWER(?) AND created_at >= datetime('now', '-7 days')
        `).get(currentUser.id, series_title.trim());

        if (dup) {
            return NextResponse.json({ error: 'You already requested this series recently.' }, { status: 409 });
        }

        const result = await db.prepare(`
            INSERT INTO series_requests (user_id, username, series_title, series_type, author, description, source_url, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            currentUser.id,
            currentUser.username,
            series_title.trim(),
            series_type || 'manga',
            (author || '').trim(),
            (description || '').trim(),
            (source_url || '').trim(),
            (reason || '').trim()
        );

        return NextResponse.json({ ok: true, id: result.lastInsertRowid });
    } catch (error) {
        console.error('POST series-requests error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}