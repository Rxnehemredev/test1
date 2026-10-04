import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateBlogForSeries, generateBlogForChapter, generateGeneralTopicBlog } from '@/lib/ai-blog';
import { safeEqual } from '@/lib/security/safeEqual';

// ─────────────────────────────────────────────────────────────────────────
// blog_queue'daki bekleyen işleri sırayla, YAVAŞÇA işler. Gemini'nin gerçek
// dakikalık istek limitine (free tier'da düşük, ör. ~5 istek/dk) takılmamak
// için tek çağrıda en fazla BATCH_SIZE kadar iş işlenir ve aralarında
// GAP_MS kadar bekleme konur.
//
// Vercel Hobby planında serverless fonksiyon süresi 10 saniye ile sınırlı
// ve cron günde en fazla 1 kez çalışabiliyor — bu yüzden:
//  - Varsayılan BATCH_SIZE=1 (10sn içine rahatça sığar, hobby planda da güvenli)
//  - "Site'de olmadan da tak tak eklensin" isteniyorsa, bu route'u ÜCRETSİZ
//    bir dış zamanlayıcıyla (ör. cron-job.org) her birkaç dakikada bir
//    çağırmak gerekiyor — Vercel'in kendi cron'u Hobby'de günde 1 kere çalışır.
//    Detay için DEVAM-NOTU.md'ye bakınız.
//
// Tetikleme iki şekilde yapılabilir:
//  1) Vercel Cron / dış zamanlayıcı: Header'da `Authorization: Bearer <CRON_SECRET>`
//     (Vercel cron bunu otomatik ekler) VEYA `x-blog-cron-secret: <BLOG_CRON_SECRET>`
//  2) Admin panelden "Şimdi işle" butonu: normal admin oturumu (cookie) ile
// ─────────────────────────────────────────────────────────────────────────

// Gemini yanıtı 10 sn'yi kolayca aşabilir; varsayılan süre yetmediğinde Vercel
// fonksiyonu yanıt vermeden kesiyordu (panelde sadece "Blog üretilemedi" görünüyordu).
// Hobby planın izin verdiği üst sınır: 60 sn.
export const maxDuration = 60;

const BATCH_SIZE_DEFAULT = 1;
const BATCH_SIZE_MAX = 5;
const GAP_MS = 13000; // Gemini free-tier RPM'e karşı güvenli aralık

function isAuthorizedCron(request) {
    const secret = process.env.BLOG_CRON_SECRET || process.env.CRON_SECRET;
    if (!secret) return false;
    const bearer = request.headers.get('authorization');
    if (bearer && safeEqual(bearer, `Bearer ${secret}`)) return true;
    const custom = request.headers.get('x-blog-cron-secret');
    if (custom && safeEqual(custom, secret)) return true;
    return false;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(db, item) {
    try {
        if (item.kind === 'series') {
            const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(item.series_id);
            if (!series) return { ok: false, error: 'Seri bulunamadı (silinmiş olabilir)' };
            await generateBlogForSeries(series);
            return { ok: true };
        }
        if (item.kind === 'chapter') {
            const chapter = await db.prepare('SELECT * FROM chapters WHERE id = ?').get(item.chapter_id);
            if (!chapter) return { ok: false, error: 'Bölüm bulunamadı (silinmiş olabilir)' };
            const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(chapter.series_id);
            if (!series) return { ok: false, error: 'Seri bulunamadı' };
            await generateBlogForChapter(series, chapter);
            return { ok: true };
        }
        if (item.kind === 'topic') {
            await generateGeneralTopicBlog(item.topic);
            return { ok: true };
        }
        return { ok: false, error: `Bilinmeyen kind: ${item.kind}` };
    } catch (e) {
        return { ok: false, error: e.message?.slice(0, 300) || 'Bilinmeyen hata' };
    }
}

async function handle(request) {
    const cronOk = isAuthorizedCron(request);
    if (!cronOk) {
        // Cron secret yoksa/uyuşmuyorsa, admin oturumu kabul et (panelden manuel tetikleme)
        try {
            const user = await requireAuth(request);
            if (!user || !['admin', 'manager'].includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const { searchParams } = new URL(request.url);
    const batchSize = Math.max(1, Math.min(BATCH_SIZE_MAX, parseInt(searchParams.get('batch'), 10) || BATCH_SIZE_DEFAULT));

    const db = await getDb();

    // Sıradaki bekleyen işleri al ve HEMEN 'processing' işaretle — aynı anda
    // iki tetikleme (ör. hem dış zamanlayıcı hem admin butonu) çakışıp aynı
    // işi iki kere işlemesin diye.
    const items = await db.prepare(`SELECT * FROM blog_queue WHERE status = 'pending' ORDER BY id ASC LIMIT ?`).all(batchSize);
    if (items.length === 0) {
        return NextResponse.json({ processed: 0, results: [], message: 'Kuyruk boş' });
    }
    for (const item of items) {
        await db.prepare(`UPDATE blog_queue SET status = 'processing' WHERE id = ?`).run(item.id);
    }

    const results = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const outcome = await processOne(db, item);
        if (outcome.ok) {
            await db.prepare(`UPDATE blog_queue SET status = 'done', processed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(item.id);
        } else {
            await db.prepare(`UPDATE blog_queue SET status = 'failed', error = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(outcome.error, item.id);
        }
        results.push({ id: item.id, kind: item.kind, ...outcome });
        if (i < items.length - 1) await sleep(GAP_MS);
    }

    return NextResponse.json({ processed: results.length, results });
}

export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }
