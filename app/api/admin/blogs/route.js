import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateBlogForSeries, generateGeneralTopicBlog, AiBlogError } from '@/lib/ai-blog';
import { requireAuth } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';

// Gemini yanıtı 10 sn'yi kolayca aşabilir; varsayılan süre yetmediğinde Vercel
// fonksiyonu yanıt vermeden kesiyordu (panelde sadece "Blog üretilemedi" görünüyordu).
// Hobby planın izin verdiği üst sınır: 60 sn.
export const maxDuration = 60;

const routeLimiter = createRateLimiter(30, 60 * 1000);

function checkStaff(user) {
    return user && ['admin', 'manager'].includes(user.role);
}

// GET /api/admin/blogs — admin panel için TÜM blogları listeler (published/draft fark etmez)
// Ayrıca hâlâ blogu olmayan (eski) yayınlanmış serileri de döner ki admin
// "eksik olanları oluştur" diyebilsin.
export async function GET(request) {
    try {
        const user = await requireAuth(request);
        if (!checkStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = await getDb();

        const blogs = await db.prepare(`
            SELECT b.id, b.title, b.slug, b.status, b.views, b.created_at, b.chapter_id,
                   s.id as series_id, s.title as series_title, s.slug as series_slug
            FROM blogs b
            LEFT JOIN series s ON b.series_id = s.id
            ORDER BY b.created_at DESC
        `).all();

        const seriesWithoutBlog = await db.prepare(`
            SELECT s.id, s.title, s.slug, s.cover_url
            FROM series s
            WHERE s.published = 1 AND NOT EXISTS (SELECT 1 FROM blogs b WHERE b.series_id = s.id AND b.chapter_id IS NULL)
            ORDER BY s.created_at DESC
            LIMIT 100
        `).all();

        return NextResponse.json({ blogs, seriesWithoutBlog });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        console.error('GET /api/admin/blogs error:', error);
        return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
    }
}

// POST /api/admin/blogs { series_id } — belirtilen seri için (yeniden) AI blog üretir.
// Var olan blog varsa önce onu siler, ardından yenisini oluşturur ("yeniden üret" butonu için).
export async function POST(request) {
    try {
        const rl = await routeLimiter(request);
        if (!rl.success) return NextResponse.json({ error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` }, { status: 429 });

        const user = await requireAuth(request);
        if (!checkStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        const { series_id } = body;

        // Konudan blog: admin bir konu/başlık yazar → üretilen yazı doğrudan yayınlanır
        // (herkese açık /blog sayfasında görünür).
        if (!series_id && typeof body.topic === 'string') {
            const topic = body.topic.trim();
            if (topic.length < 3) return NextResponse.json({ error: 'Konu en az 3 karakter olmalı' }, { status: 400 });
            if (topic.length > 200) return NextResponse.json({ error: 'Konu en fazla 200 karakter olabilir' }, { status: 400 });
            const blog = await generateGeneralTopicBlog(topic);
            return NextResponse.json({ blog });
        }

        if (!series_id) return NextResponse.json({ error: 'series_id veya topic gerekli' }, { status: 400 });

        const db = await getDb();
        const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(series_id);
        if (!series) return NextResponse.json({ error: 'Seri bulunamadı' }, { status: 404 });

        // ÖNCE yenisini üret, SONRA eskisini sil. Eskiden silme önce yapılıyordu: Gemini
        // hata verirse (limit, zaman aşımı...) mevcut blog de kaybolup geriye hiçbir şey kalmıyordu.
        // Ayrıca eski sorgu serinin BÖLÜM blog yazılarını da siliyordu (series_id ile eşleşiyorlar);
        // artık yalnızca serinin tanıtım yazıları (chapter_id boş) yenilenir.
        const previous = await db.prepare(
            'SELECT id FROM blogs WHERE series_id = ? AND chapter_id IS NULL'
        ).all(series_id);

        const blog = await generateBlogForSeries(series);

        if (blog) {
            for (const old of previous) {
                if (old.id !== blog.id) {
                    await db.prepare('DELETE FROM blogs WHERE id = ?').run(old.id);
                }
            }
        }

        return NextResponse.json({ blog });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof AiBlogError) {
            return NextResponse.json({ error: error.message }, { status: 502 });
        }
        console.error('POST /api/admin/blogs error:', error);
        return NextResponse.json({ error: 'Blog üretilemedi' }, { status: 500 });
    }
}
