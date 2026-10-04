export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { getDb } from '@/lib/db';

const adminLimiter = createRateLimiter(20, 60000);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

// GET: IndexNow kurulum durumunu döndürür (anahtar + doğrulama dosyası hazır mı)
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }
    try {
        await requireAdmin(request);
        const { INDEXNOW_KEY } = await import('@/lib/indexNow');
        return NextResponse.json({
            key: INDEXNOW_KEY,
            keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        });
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
}

// POST: Tek bir URL'yi (action=submit-url) veya son eklenen seri/bölümleri
// (action=submit-recent) IndexNow'a bildirir.
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }
    try {
        await requireAdmin(request);
        const body = await request.json().catch(() => ({}));
        const { action } = body;
        const { notifyIndexNowWithDetail } = await import('@/lib/indexNow');

        if (action === 'submit-url') {
            const url = body.url;
            if (!url) return NextResponse.json({ error: 'url gerekli' }, { status: 400 });
            const result = await notifyIndexNowWithDetail([url]);
            return result.success
                ? NextResponse.json({ success: true, message: result.message })
                : NextResponse.json({ error: result.error }, { status: 500 });
        }

        if (action === 'submit-recent') {
            // Son 50 seri + son 100 bölümü toplu bildir (ilk kurulumda arka
            // katalogu hızlıca arama motorlarına tanıtmak için).
            const db = await getDb();
            const series = await db.prepare(
                'SELECT slug, id FROM series WHERE published = 1 ORDER BY id DESC LIMIT 50'
            ).all();
            const chapters = await db.prepare(`
                SELECT c.chapter_number, s.slug, s.id as series_id
                FROM chapters c JOIN series s ON s.id = c.series_id
                WHERE s.published = 1
                ORDER BY c.id DESC LIMIT 100
            `).all();

            const urls = [
                ...series.map(s => `${BASE_URL}/seri/${s.slug || s.id}`),
                ...chapters.map(c => `${BASE_URL}/seri/${c.slug || c.series_id}/bolum/${c.chapter_number}`),
            ];

            const result = await notifyIndexNowWithDetail(urls);
            return result.success
                ? NextResponse.json({ success: true, message: result.message, count: urls.length })
                : NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('IndexNow admin error:', error);
        return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
    }
}
