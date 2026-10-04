export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const reports = await db.prepare(`
            SELECT r.*, u.username as username, u.email as email,
                   c.chapter_number, s.title as series_title
            FROM bug_reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN chapters c ON r.chapter_id = c.id
            LEFT JOIN series s ON r.series_id = s.id
            WHERE r.type NOT IN ('comment_report')
            ORDER BY r.created_at DESC
        `).all();

        return NextResponse.json({ success: true, reports });
    } catch (error) {
        console.error('Error fetching bug reports:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch bug reports' }, { status: 500 });
    }
}

export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ success: false, error: 'Id and status are required' }, { status: 400 });
        }

        // Güncellenmeden önce rapor bilgilerini al (bildirim için)
        const report = await db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);

        await db.prepare('UPDATE bug_reports SET status = ? WHERE id = ?').run(status, id);

        // ── Kullanıcıya bildirim gönder (raporu gönderen giriş yapmış bir kullanıcıysa) ──
        if (report && report.user_id) {
            try {
                let msg = '';
                let notifType = 'bug_report';
                const reportTitle = report.title || 'Hata Bildirimi';
                if (status === 'resolved') {
                    msg = `"${reportTitle}" hata bildiriminiz çözüldü olarak işaretlendi.`;
                    notifType = 'bug_report_resolved';
                } else if (status === 'rejected') {
                    msg = `"${reportTitle}" hata bildiriminiz reddedildi.`;
                    notifType = 'bug_report_rejected';
                } else if (status === 'in_progress') {
                    msg = `"${reportTitle}" hata bildiriminiz inceleniyor.`;
                    notifType = 'bug_report_progress';
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
                    ).run(report.user_id, notifType, msg, '');
                }
            } catch (notifErr) {
                console.error('Bildirim gönderme hatası:', notifErr);
            }
        }

        return NextResponse.json({ success: true, message: 'Rapor durumu güncellendi' });
    } catch (error) {
        console.error('Error updating bug report:', error);
        return NextResponse.json({ success: false, error: 'Failed to update bug report' }, { status: 500 });
    }
}

export async function DELETE(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Id is required' }, { status: 400 });
        }

        await db.prepare('DELETE FROM bug_reports WHERE id = ?').run(id);

        return NextResponse.json({ success: true, message: 'Rapor silindi' });
    } catch (error) {
        console.error('Error deleting bug report:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete bug report' }, { status: 500 });
    }
}
