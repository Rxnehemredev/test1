import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { generateBlogForSeries, generateBlogForChapter, generateGeneralTopicBlog } from '@/lib/ai-blog';

// ─────────────────────────────────────────────────────────────────────────
// "Otomatik Pilot" — admin panelde bir düğmeye basınca başlayan, sayfa
// açık kaldığı sürece çalışan CANLI üretim. Kuyruk tablosuna dokunmaz,
// panel her tetiklemede bu route'u çağırır ve TEK bir rastgele blog
// üretir (seri / bölüm / genel konu karışık). Hız kontrolü tamamen
// client'ta (panelde) 12 saniyede bir çağrı yapılarak sağlanıyor — bu
// route sadece ek bir güvenlik ağı olarak kendi rate limitini de uygular.
//
// Not: Bu "sitede/panelde olduğun sürece çalışır" tarzı bir otomasyondur.
// Sekmeyi kapatırsan/sayfadan ayrılırsan durur — arka planda (sen yokken)
// devam eden üretim için admin panelindeki kuyruk sistemi + dış
// zamanlayıcı kurulumu (DEVAM-NOTU.md madde 12f) gerekiyor, bu ayrı bir
// mekanizma.
// ─────────────────────────────────────────────────────────────────────────

// Gemini yanıtı 10 sn'yi kolayca aşabilir; varsayılan süre yetmediğinde Vercel
// fonksiyonu yanıt vermeden kesiyordu (panelde sadece "Blog üretilemedi" görünüyordu).
// Hobby planın izin verdiği üst sınır: 60 sn.
export const maxDuration = 60;

// Gemini free-tier'ın (gemini-3.5-flash-lite) gerçek 15 istek/dk limitine
// karşı ek güvenlik ağı. Panel 4.5sn'de bir çağırıyor (~13/dk); burada
// sınırın hemen altında (14/dk) bırakıyoruz ki tek bir gecikme panic'e
// yol açmasın ama yine de gerçek limite yakın hız elde edelim.
const routeLimiter = createRateLimiter(14, 60 * 1000);

function checkStaff(user) {
    return user && ['admin', 'manager'].includes(user.role);
}

const KIND_LABELS = { series: 'Seri', chapter: 'Bölüm', topic: 'Genel Konu' };

async function pickAndGenerate(db) {
    const roll = Math.random();

    // %35 seri, %35 bölüm, %30 genel/rastgele konu — kullanıcının istediği
    // "hem sitedeki serilerle hem de genel/başka konularla ilgili" karışımı.
    if (roll < 0.35) {
        // Önce blogu olmayan bir seri dene (yeni içerik önceliği)
        let series = await db.prepare(`
            SELECT s.* FROM series s
            WHERE s.published = 1
              AND NOT EXISTS (SELECT 1 FROM blogs b WHERE b.series_id = s.id AND b.chapter_id IS NULL)
            ORDER BY RANDOM() LIMIT 1
        `).get();
        // Yoksa herhangi bir yayınlanmış seriden companion/ek yazı üret
        if (!series) {
            series = await db.prepare(`
                SELECT * FROM series WHERE published = 1 ORDER BY RANDOM() LIMIT 1
            `).get();
        }
        if (series) {
            try {
                await generateBlogForSeries(series);
                return { ok: true, kind: 'series', label: series.title };
            } catch (error) {
                return { ok: false, kind: 'series', label: series.title, error: error.message };
            }
        }
        // Site'de hiç seri yoksa genel konuya düş
    } else if (roll < 0.70) {
        let chapter = await db.prepare(`
            SELECT c.*, s.title as series_title FROM chapters c
            JOIN series s ON c.series_id = s.id
            WHERE s.published = 1
              AND NOT EXISTS (SELECT 1 FROM blogs b WHERE b.chapter_id = c.id)
            ORDER BY RANDOM() LIMIT 1
        `).get();
        if (chapter) {
            const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(chapter.series_id);
            const label = `${chapter.series_title} — Bölüm ${chapter.chapter_number}`;
            try {
                await generateBlogForChapter(series, chapter);
                return { ok: true, kind: 'chapter', label };
            } catch (error) {
                return { ok: false, kind: 'chapter', label, error: error.message };
            }
        }
        // Blogu olmayan bölüm kalmadıysa genel konuya düş
    }

    try {
        const blog = await generateGeneralTopicBlog();
        return { ok: true, kind: 'topic', label: blog.title };
    } catch (error) {
        return { ok: false, kind: 'topic', label: '(genel konu)', error: error.message };
    }
}

export async function POST(request) {
    try {
        const rl = await routeLimiter(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok hızlı istek geldi (Gemini limiti). ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const user = await requireAuth(request);
        if (!checkStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = await getDb();
        const outcome = await pickAndGenerate(db);

        return NextResponse.json({
            ...outcome,
            kindLabel: KIND_LABELS[outcome.kind] || outcome.kind,
        });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        console.error('POST /api/admin/blogs/autopilot error:', error);
        return NextResponse.json({ error: 'Üretilemedi (sunucu hatası)' }, { status: 500 });
    }
}
