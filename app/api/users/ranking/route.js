import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { getCached, RANKING_CACHE_TTL } from '@/lib/apiCache';
import { toPublicUser } from '@/lib/security/publicUser';

const MAX_LIMIT = 100;
const rankingRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function GET(request) {
    try {
        const rl = await rankingRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        // Kullanıcıdan gelen limit'i güvenli aralığa sıkıştır — daha önce
        // ?limit=999999 gibi bir istekle tüm users tablosu tek seferde
        // (auth kontrolü olmadan) dökülebiliyordu.
        let limit = limitParam ? parseInt(limitParam, 10) : 100;
        if (!Number.isFinite(limit) || limit <= 0) limit = 100;
        limit = Math.min(limit, MAX_LIMIT);

        // Sıralama verisi saatte bir yenilenir — her istekte DB'ye gitmek
        // yerine 1 saatlik pencerede bellekten (cache) döndürülür.
        const users = await getCached(`ranking:${limit}`, RANKING_CACHE_TTL, async () => {
            const db = await getDb();

            // Sıralama eskisi gibi yomi_points (Asteria Scans Puanı — uçak oyunu dahil tüm
            // kaynaklardan kazanılan puan) üzerinden yapılıyor.
            return db.prepare(`
                SELECT id, username, avatar_url, role, coalesce(yomi_points, 0) as yomi_points, created_at
                FROM users 
                ORDER BY yomi_points DESC, created_at ASC
                LIMIT ?
            `).all(limit);
        });

        return NextResponse.json({ 
            success: true, 
            ranking: users.map(toPublicUser) 
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800'
            }
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.' }, { status: 500 });
    }
}
