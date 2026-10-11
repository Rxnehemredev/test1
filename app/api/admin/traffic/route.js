import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess, hasPermission } from '@/lib/auth';
import { batchQueue } from '@/lib/queue';
import { createRateLimiter } from '@/lib/ratelimit';
import { clampInt } from '@/lib/security/sqlWhitelist';
import { getClientIp } from '@/lib/security/requestHelpers';
const adminLimiter = createRateLimiter(100, 60000);


// GET: Site trafiği istatistikleri
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }
        const canViewTraffic = ['admin', 'manager'].includes(user.role) || await hasPermission(user, 'view_traffic', db) || await hasPermission(user, 'manage_settings', db);
        if (!canViewTraffic) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '7'; // gün sayısı

        const days = clampInt(range, 1, 90, 7); // 1..90 gün (negatif/NaN → 7)

        // Son N günün günlük ziyaret sayısı
        const dailyVisits = await db.prepare(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as visits,
                COUNT(DISTINCT visitor_hash) as unique_visitors
            FROM site_traffic_log
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            GROUP BY date(created_at)
            ORDER BY date ASC
        `).all(days);

        // En çok ziyaret edilen sayfalar
        const topPages = await db.prepare(`
            SELECT 
                path,
                COUNT(*) as visits,
                COUNT(DISTINCT visitor_hash) as unique_visitors
            FROM site_traffic_log
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            GROUP BY path
            ORDER BY visits DESC
            LIMIT 20
        `).all(days);

        // Toplam istatistikler
        const totalStats = await db.prepare(`
            SELECT 
                COUNT(*) as total_visits,
                COUNT(DISTINCT visitor_hash) as unique_visitors,
                COUNT(DISTINCT date(created_at)) as active_days
            FROM site_traffic_log
            WHERE created_at >= datetime('now', '-' || ? || ' days')
        `).get(days);

        // Bugünkü ziyaret
        const todayStats = await db.prepare(`
            SELECT 
                COUNT(*) as visits,
                COUNT(DISTINCT visitor_hash) as unique_visitors
            FROM site_traffic_log
            WHERE date(created_at) = date('now')
        `).get();

        // Saatlik dağılım (bugün)
        const hourlyToday = await db.prepare(`
            SELECT 
                strftime('%H', created_at) as hour,
                COUNT(*) as visits
            FROM site_traffic_log
            WHERE date(created_at) = date('now')
            GROUP BY hour
            ORDER BY hour ASC
        `).all();

        // Yeni kullanıcı kayıtları (son N gün)
        const newUsers = await db.prepare(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as count
            FROM users
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            GROUP BY date(created_at)
            ORDER BY date ASC
        `).all(days);

        // Yeni bölümler (son N gün)
        const newChapters = await db.prepare(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as count
            FROM chapters
            WHERE created_at >= datetime('now', '-' || ? || ' days')
              AND (publish_at IS NULL OR publish_at <= datetime('now'))
            GROUP BY date(created_at)
            ORDER BY date ASC
        `).all(days);

        return NextResponse.json({
            success: true,
            dailyVisits,
            topPages,
            totalStats,
            todayStats,
            hourlyToday,
            newUsers,
            newChapters,
            range: days,
        });
    } catch (error) {
        console.error('Traffic GET error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST: Trafik kaydı (anonim)
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const body = await request.json();
        const { path, referrer } = body;

        if (!path) return NextResponse.json({ error: 'path gerekli' }, { status: 400 });

        // Ziyaretçi hash'i (IP bazlı ama saklama)
        const ip = getClientIp(request);
        const ua = request.headers.get('user-agent') || '';

        // Bot kontrolü
        const isBot = /bot|crawler|spider|scraper|headless/i.test(ua);
        if (isBot) return NextResponse.json({ success: true });

        // Ziyaretçi kimliği — günlük benzersizlik için tarih+hash
        const today = new Date().toISOString().split('T')[0];
        const visitorHash = Buffer.from(`${ip}-${today}`).toString('base64').substring(0, 16);

        // Anlık INSERT yerine batch queue kullan — yüksek trafikte bottleneck önler
        await batchQueue.pushTraffic(path, visitorHash, referrer || null, ua.substring(0, 200));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}