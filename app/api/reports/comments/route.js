export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, getVerifiedUser, hasPermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { getClientIp } from '@/lib/security/requestHelpers';
const reportLimiter = createRateLimiter(10, 60000);


// ── In-memory rate limiter for comment reports ─────────────────────
const reportRateLimitMap = new Map();
const REPORT_RATE_LIMIT_MS = 60 * 1000; // 60 seconds between reports
const REPORT_MAX_PER_WINDOW = 10; // max reports per window

function getReportRateLimitKey(request, userId) {
    const ip = getClientIp(request);
    return userId ? `user:${userId}` : `ip:${ip}`;
}

function checkReportRateLimit(key) {
    const now = Date.now();
    const record = reportRateLimitMap.get(key);
    if (!record || now - record.windowStart > REPORT_RATE_LIMIT_MS) {
        reportRateLimitMap.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: REPORT_MAX_PER_WINDOW - 1 };
    }
    if (record.count >= REPORT_MAX_PER_WINDOW) {
        const retryAfterSec = Math.ceil((REPORT_RATE_LIMIT_MS - (now - record.windowStart)) / 1000);
        return { allowed: false, retryAfter: retryAfterSec };
    }
    record.count += 1;
    return { allowed: true, remaining: REPORT_MAX_PER_WINDOW - record.count };
}

// GET - Fetch comment reports (admin only)
export async function GET(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const { user: tokenUser, error, status } = await getVerifiedUser(request, db);
        if (error) {
            console.error('GET /api/reports/comments - Auth error:', error, 'Status:', status);
            return NextResponse.json({ success: false, error }, { status });
        }

        const dbUser = await db.prepare('SELECT role FROM users WHERE id = ?').get(tokenUser.id);
        const builtinCanManageComments = dbUser && ['admin', 'manager', 'moderator'].includes(dbUser.role);
        const customCanManageComments = dbUser && await hasPermission(dbUser, 'manage_comments', db);
        if (!builtinCanManageComments && !customCanManageComments) {
            console.error('GET /api/reports/comments - Insufficient role:', dbUser?.role);
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 });
        }

        // Fetch comment reports from bug_reports table
        // type='comment' OR type='comment_report' - eski satırlar type='bug' veya NULL olabilir
        // NULL olanlar için comment_id IS NOT NULL kontrolü ekle (bu yorum şikayetleridir)
        const reports = await db.prepare(`
            SELECT r.*,
                   u.username as reporter_username,
                   c.content as comment_content,
                   c.user_id as comment_user_id,
                   cu.username as comment_username,
                   s.title as series_title,
                   s.slug as series_slug,
                   ch.chapter_number
            FROM bug_reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN comments c ON r.comment_id = c.id
            LEFT JOIN users cu ON c.user_id = cu.id
            LEFT JOIN series s ON r.series_id = s.id
            LEFT JOIN chapters ch ON r.chapter_id = ch.id
            WHERE r.comment_id IS NOT NULL
            ORDER BY r.created_at DESC
            LIMIT 100
        `).all();

        console.log(`GET /api/reports/comments - Found ${reports.length} comment reports`);
        return NextResponse.json({ success: true, reports });
    } catch (error) {
        console.error('Error fetching comment reports:', error);
        console.error('GET /api/reports/comments error:', error);
        return NextResponse.json({ success: false, error: 'Raporlar alınamadı.' }, { status: 500 });
    }
}

// POST - Submit comment report
export async function POST(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const body = await request.json();
        const { commentId, reason, details } = body;

        if (!commentId || !reason) {
            return NextResponse.json({ 
                success: false, 
                error: 'Yorum ID ve sebep zorunludur' 
            }, { status: 400 });
        }

        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Giriş yapmanız gerekiyor' 
            }, { status: 401 });
        }

        // Rate limiting
        const rlKey = getReportRateLimitKey(request, user.id);
        const rl = checkReportRateLimit(rlKey);
        if (!rl.allowed) {
            return NextResponse.json({
                success: false,
                error: `Çok fazla rapor gönderdiniz. Lütfen ${rl.retryAfter} saniye sonra tekrar deneyin.`
            }, { status: 429 });
        }

        const db = await getDb();

        // Get comment info
        const comment = await db.prepare(`
            SELECT c.*, s.title as series_title, ch.chapter_number
            FROM comments c
            LEFT JOIN series s ON c.series_id = s.id
            LEFT JOIN chapters ch ON c.chapter_id = ch.id
            WHERE c.id = ?
        `).get(commentId);

        if (!comment) {
            return NextResponse.json({ 
                success: false, 
                error: 'Yorum bulunamadı' 
            }, { status: 404 });
        }

        // Don't allow reporting own comments
        if (comment.user_id === user.id) {
            return NextResponse.json({ 
                success: false, 
                error: 'Kendi yorumunuzu raporlayamazsınız' 
            }, { status: 400 });
        }

        // Check if already reported by this user (within last hour)
        const existingReport = await db.prepare(`
            SELECT id FROM bug_reports
            WHERE user_id = ? AND comment_id = ?
            AND created_at > datetime('now', '-1 hour')
        `).get(user.id, commentId);

        if (existingReport) {
            return NextResponse.json({ 
                success: false, 
                error: 'Bu yorumu zaten raporladınız' 
            }, { status: 400 });
        }

        // Generate title
        const title = `Yorum Raporu: ${comment.series_title || 'Bilinmeyen Seri'} - Bölüm ${comment.chapter_number || '?'}`;
        const description = `${reason}${details ? '\n\n' + details : ''}`;

        // Insert into bug_reports with type 'comment_report'
        const result = await db.prepare(`
            INSERT INTO bug_reports (user_id, comment_id, series_id, chapter_id, type, title, description)
            VALUES (?, ?, ?, ?, 'comment_report', ?, ?)
        `).run(user.id, commentId, comment.series_id || null, comment.chapter_id || null, title, description);

        // ── Şikayet edilen kullanıcıya bildirim gönder ──
        if (comment.user_id && comment.user_id !== user.id) {
            try {
                let notifLink = null;
                if (comment.series_id) {
                    const seriesInfo = await db.prepare('SELECT slug FROM series WHERE id = ?').get(comment.series_id);
                    if (seriesInfo) {
                        if (comment.chapter_id) {
                            const chInfo = await db.prepare('SELECT chapter_number FROM chapters WHERE id = ?').get(comment.chapter_id);
                            notifLink = `/seri/${seriesInfo.slug}/bolum/${chInfo?.chapter_number || comment.chapter_id}#comment-${commentId}`;
                        } else {
                            notifLink = `/seri/${seriesInfo.slug}#comment-${commentId}`;
                        }
                    }
                }
                await db.prepare('INSERT INTO notifications (user_id, type, message, link, is_read) VALUES (?, ?, ?, ?, 0)').run(
                    comment.user_id,
                    'comment_reported',
                    'Yorumunuz şikayet edildi ve incelenmek üzere yöneticiye iletildi',
                    notifLink
                );
            } catch (notifErr) {
                console.error('Şikayet bildirimi gönderme hatası:', notifErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Yorum raporunuz başarıyla gönderildi',
            reportId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error submitting comment report:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Rapor gönderilemedi' 
        }, { status: 500 });
    }
}

// PUT - Update report status (admin)
export async function PUT(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const { user: tokenUser, error, status } = await getVerifiedUser(request, db);
        if (error) {
            return NextResponse.json({ success: false, error }, { status });
        }

        const dbUser = await db.prepare('SELECT role FROM users WHERE id = ?').get(tokenUser.id);
        const canManageComments2 = dbUser && (['admin', 'manager', 'moderator'].includes(dbUser.role) || await hasPermission(dbUser, 'manage_comments', db));
        if (!canManageComments2) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 });
        }

        const body = await request.json();
        const { reportId, status: reportStatus } = body;

        if (!reportId || !reportStatus) {
            return NextResponse.json({ success: false, error: 'Rapor ID ve durum zorunludur' }, { status: 400 });
        }

        // Önce rapor bilgilerini al
        const report = await db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(reportId);
        if (!report) {
            return NextResponse.json({ success: false, error: 'Rapor bulunamadı' }, { status: 404 });
        }

        // Update status - comment_id ile eslesen raporlari guncelle
        await db.prepare('UPDATE bug_reports SET status = ? WHERE id = ?').run(
            reportStatus,
            reportId
        );

        // ── Raporu gönderen kullanıcıya bildirim gönder ──
        if (report && report.user_id) {
            try {
                let msg = '';
                let notifType = 'comment_report';
                if (reportStatus === 'resolved') {
                    msg = 'Şikayet ettiğiniz yorum işleme alındı ve gerekli önlemler alındı.';
                    notifType = 'comment_report_resolved';
                } else if (reportStatus === 'rejected') {
                    msg = 'Şikayet ettiğiniz yorum incelendi ve uygunsuz bulunmadı.';
                    notifType = 'comment_report_rejected';
                }
                if (msg) {
                    // Bildirim için link oluştur
                    let notifLink = null;
                    if (report.series_id) {
                        const seriesInfo = await db.prepare('SELECT slug FROM series WHERE id = ?').get(report.series_id);
                        if (seriesInfo) {
                            if (report.chapter_id) {
                                const chInfo = await db.prepare('SELECT chapter_number FROM chapters WHERE id = ?').get(report.chapter_id);
                                notifLink = `/seri/${seriesInfo.slug}/bolum/${chInfo?.chapter_number || report.chapter_id}`;
                            } else {
                                notifLink = `/seri/${seriesInfo.slug}`;
                            }
                        }
                    }
                    await db.prepare('INSERT INTO notifications (user_id, type, message, link, is_read) VALUES (?, ?, ?, ?, 0)').run(
                        report.user_id,
                        notifType,
                        msg,
                        notifLink
                    );
                }
            } catch (notifErr) {
                console.error('Rapor durumu bildirimi gönderme hatası:', notifErr);
            }
        }

        return NextResponse.json({ success: true, message: 'Rapor durumu güncellendi' });
    } catch (error) {
        console.error('Error updating comment report:', error);
        return NextResponse.json({ success: false, error: 'Güncelleme yapılamadı' }, { status: 500 });
    }
}

// DELETE - Delete comment report (admin)
export async function DELETE(request) {
    { const __rl = await reportLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const { user: tokenUser, error, status } = await getVerifiedUser(request, db);
        if (error) {
            return NextResponse.json({ success: false, error }, { status });
        }

        const dbUser = await db.prepare('SELECT role FROM users WHERE id = ?').get(tokenUser.id);
        const canManageComments3 = dbUser && (['admin', 'manager', 'moderator'].includes(dbUser.role) || await hasPermission(dbUser, 'manage_comments', db));
        if (!canManageComments3) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 });
        }

        const body = await request.json();
        const { reportId } = body;

        if (!reportId) {
            return NextResponse.json({ success: false, error: 'Rapor ID zorunludur' }, { status: 400 });
        }

        // Check if report exists
        const report = await db.prepare('SELECT id FROM bug_reports WHERE id = ?').get(reportId);
        if (!report) {
            return NextResponse.json({ success: false, error: 'Rapor bulunamadı' }, { status: 404 });
        }

        // Delete the report
        await db.prepare('DELETE FROM bug_reports WHERE id = ?').run(reportId);

        return NextResponse.json({ success: true, message: 'Rapor silindi' });
    } catch (error) {
        console.error('Error deleting comment report:', error);
        return NextResponse.json({ success: false, error: 'Silme işlemi yapılamadı' }, { status: 500 });
    }
}
