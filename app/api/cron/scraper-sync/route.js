import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { syncAllSources } from '@/lib/scraper';
import { invalidateSeriesCaches } from '@/lib/seriesCache';
import { isSameOrigin } from '@/lib/security/sameOrigin';
import { safeEqual } from '@/lib/security/safeEqual';

// ─────────────────────────────────────────────────────────────────────────
// Bot Scraper — otomatik kaynak eşitleme (zamanlanmış çalışma)
//
// SORUN: "Bot Scraper" hiçbir zaman kendiliğinden veri çekmiyordu, çünkü
// scraper_sources tablosundaki "auto_sync=1" kaynakları tarayan mantık
// sadece admin panelindeki "Tüm Kaynakları Eşitle" butonuna elle basılınca
// çalışıyordu (app/api/admin/scrape → action: 'sync-all'). Hiçbir cron /
// zamanlayıcı bu endpoint'i tetiklemiyordu, projede scraper için bir cron
// route'u dahi yoktu (yalnızca blog-queue cron'u vardı).
//
// ÇÖZÜM: Eşitleme mantığı lib/scraper.js içine `syncAllSources(db)` olarak
// taşındı (tek servis, tek doğru kaynak) ve bu route onu çağırıyor. Bu route
// hem Vercel Cron hem de admin panelinden hem de dışarıdan bir zamanlayıcı
// (ör. cron-job.org) ile tetiklenebilir.
//
// Tetikleme yöntemleri:
//  1) Vercel Cron: vercel.json → crons[].path = "/api/cron/scraper-sync"
//     Vercel, isteğe otomatik olarak `Authorization: Bearer <CRON_SECRET>`
//     header'ı ekler.
//  2) Dış zamanlayıcı: `Authorization: Bearer <SCRAPER_CRON_SECRET>` VEYA
//     `x-scraper-cron-secret: <SCRAPER_CRON_SECRET>` header'ı ile.
//  3) Admin panelinden manuel tetikleme: normal admin oturumu (cookie) ile
//     (bu durumda action zaten admin panelindeki "Tüm Kaynakları Eşitle"
//     butonu üzerinden /api/admin/scrape'e gider; bu route'a admin oturumuyla
//     doğrudan istek atmak da desteklenir).
//
// NOT: Vercel Hobby planında cron günde en fazla 1 kez çalışır. Daha sık
// (ör. her 30-60 dakikada bir) otomatik kontrol isteniyorsa bu route'u
// ücretsiz bir dış zamanlayıcıyla (cron-job.org vb.) periyodik olarak
// çağırmak gerekir — detay için blog-queue cron'undaki DEVAM-NOTU.md
// referansına bakınız, aynı mantık burada da geçerlidir.
// ─────────────────────────────────────────────────────────────────────────

function isAuthorizedCron(request) {
    const secret = process.env.SCRAPER_CRON_SECRET || process.env.CRON_SECRET;
    if (!secret) return false;
    const bearer = request.headers.get('authorization');
    if (bearer && safeEqual(bearer, `Bearer ${secret}`)) return true;
    const custom = request.headers.get('x-scraper-cron-secret');
    if (custom && safeEqual(custom, secret)) return true;
    return false;
}

async function handle(request) {
    const cronOk = isAuthorizedCron(request);
    if (!cronOk) {
        // Cron secret yoksa/uyuşmuyorsa, admin oturumu kabul et (manuel tetikleme) — ama yalnızca
        // aynı siteden gelen POST ile; GET ile çerezli tetikleme (<img src=...> gibi CSRF) kabul edilmez.
        if (request.method !== 'POST' || !isSameOrigin(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            const user = await requireAuth(request);
            if (!user || !['admin', 'manager'].includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const db = await getDb();
        const { synced, total_new, results } = await syncAllSources(db);
        if (total_new > 0) await invalidateSeriesCaches();
        return NextResponse.json({
            success: true,
            synced,
            total_new,
            results,
            message: `${synced} kaynak kontrol edildi, ${total_new} yeni bölüm bulundu`,
        });
    } catch (err) {
        console.error('/api/cron/scraper-sync error:', err);
        return NextResponse.json({ error: 'Scraper bot senkronizasyon hatası' }, { status: 500 });
    }
}

export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }
