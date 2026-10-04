import { NextResponse } from 'next/server';
import { invalidateSeriesCaches } from '@/lib/seriesCache';
import { getDb } from '@/lib/db';
import { requireAdmin, requireAuth, hasPermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { isSameOrigin } from '@/lib/security/sameOrigin';
import { safeHref } from '@/lib/security/safeUrl';
const routeLimiter = createRateLimiter(60, 60000);

// Build sırasında statik cache'lenmesin — liste her istekte (content_version'a göre) taze olmalı
export const dynamic = 'force-dynamic';


// EN→TR ve TR→EN eşleşme tablosu — genre filtresini her iki dilde de çalıştırmak için
const GENRE_TR_MAP = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim',
    'Ecchi': 'Ecchi', 'Harem': 'Harem', 'Josei': 'Josei', 'Mature': 'Yetişkin',
    'Mecha': 'Mecha', 'Psychological': 'Psikolojik', 'Seinen': 'Seinen',
    'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon',
    'Manhwa': 'Manhwa', 'Manhua': 'Manhua',
};
// TR→EN ters haritası
const GENRE_EN_MAP = Object.fromEntries(Object.entries(GENRE_TR_MAP).map(([en, tr]) => [tr, en]));

export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const genreParam = searchParams.get('genre') || '';
        const status = searchParams.get('status') || '';
        const type = searchParams.get('type') || '';
        const sort = searchParams.get('sort') || 'latest';
        const limit = Math.min(parseInt(searchParams.get('limit')) || 24, 100);
        const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
        const offset = (page - 1) * limit;

        // Multi-genre: comma-separated list for AND filtering
        const genres = genreParam ? genreParam.split(',').map(g => g.trim()).filter(Boolean) : [];

        let whereClause = 'WHERE s.published = 1';
        const params = [];

        if (search) {
            // LIKE joker karakterleri (% _ \) kullanıcı girdisinde etkisizleştirilir; uzunluk sınırlanır
            const escSearch = search.slice(0, 100).replace(/[\\%_]/g, m => '\\' + m);
            whereClause += " AND (s.title LIKE ? ESCAPE '\\' OR s.author LIKE ? ESCAPE '\\' OR s.artist LIKE ? ESCAPE '\\')";
            params.push(`%${escSearch}%`, `%${escSearch}%`, `%${escSearch}%`);
        }

        // Genre filtresi: case-insensitive + EN/TR çift yönlü eşleşme
        // Veritabanında genre'ler "Action", "action", "Aksiyon" gibi farklı formatlarda saklanmış olabilir
        for (const g of genres) {
            const gLower = g.toLowerCase();
            // Olası tüm varyantları topla: İngilizce, Türkçe, küçük harf
            const variants = new Set([g]);
            if (GENRE_TR_MAP[g]) variants.add(GENRE_TR_MAP[g]);       // EN→TR
            if (GENRE_EN_MAP[g]) variants.add(GENRE_EN_MAP[g]);       // TR→EN
            // Küçük harf versiyonları
            variants.add(gLower);
            variants.add(g.charAt(0).toUpperCase() + g.slice(1).toLowerCase());

            // Her varyant için LOWER() ile case-insensitive OR koşulu oluştur
            const orClauses = [...variants].map(() => 'LOWER(s.genres) LIKE ?').join(' OR ');
            whereClause += ` AND (${orClauses})`;
            for (const v of variants) {
                params.push(`%"${v.toLowerCase()}"%`);
            }
        }

        if (status) {
            whereClause += ' AND s.status = ?';
            params.push(status);
        }

        if (type) {
            whereClause += ' AND s.type = ?';
            params.push(type);
        }

        const baseQuery = `
            SELECT s.*, COUNT(ch.id) as chapterCount
            FROM series s
            LEFT JOIN chapters ch ON s.id = ch.series_id
            ${whereClause}
            GROUP BY s.id
        `;

        let orderClause;
        switch (sort) {
            case 'popular': orderClause = 'ORDER BY s.views DESC'; break;
            case 'rating':  orderClause = 'ORDER BY s.rating DESC'; break;
            case 'title':   orderClause = 'ORDER BY s.title ASC';  break;
            default:        orderClause = 'ORDER BY s.created_at DESC';
        }

        // Get total count for pagination
        const countRow = await db.prepare(
            `SELECT COUNT(*) as cnt FROM (${baseQuery})`
        ).get(...params);
        const total = countRow?.cnt || 0;

        const series = await db.prepare(
            `${baseQuery} ${orderClause} LIMIT ? OFFSET ?`
        ).all(...params, limit, offset);

        const withParsedGenres = series.map(s => ({
            ...s,
            genres: JSON.parse(s.genres || '[]'),
        }));

        // Arama/filtre parametresi yoksa kısa süreli CDN cache'e izin ver
        const isFilteredRequest = search || genreParam || status || type;
        const cacheHeader = isFilteredRequest
            ? 'no-store'
            : 'public, s-maxage=15, stale-while-revalidate=30';

        return NextResponse.json({
            series: withParsedGenres,
            total,
            page,
            hasMore: offset + series.length < total,
        }, {
            headers: { 'Cache-Control': cacheHeader },
        });
    } catch (error) {
        console.error('GET /api/series error:', error);
        return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
    }
}

export async function POST(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }

    try {
        const user = await requireAuth(request);
        if (!await hasPermission(user, 'manage_series') && user.role !== 'admin' && user.role !== 'manager') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const { title, description, cover_url, author, artist, status, genres } = await request.json();

        if (!title || typeof title !== 'string' || title.length > 300) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        // Kapak URL'si yalnızca site içi yol veya http(s) olabilir (javascript:/data: gibi şemalar engellenir)
        const safeCover = cover_url ? safeHref(String(cover_url), '') : '';
        if (cover_url && !safeCover) {
            return NextResponse.json({ error: 'Geçersiz kapak adresi' }, { status: 400 });
        }

        const db = await getDb();
        const result = await db.prepare(
            'INSERT INTO series (title, description, cover_url, author, artist, status, genres) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(title, description, safeCover || '/demo/cover1.jpg', author, artist, status || 'ongoing', JSON.stringify(Array.isArray(genres) ? genres : []));

        const series = await db.prepare('SELECT * FROM series WHERE id = ?').get(result.lastInsertRowid);

        await invalidateSeriesCaches();
        return NextResponse.json({ series }, { status: 201 });
    } catch (error) {
        console.error('POST /api/series error:', error);
        return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
    }
}
