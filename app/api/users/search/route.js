import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { toPublicUser } from '@/lib/security/publicUser';

// @-etiket autocomplete için hafif kullanıcı arama endpoint'i.
// Sadece username'e göre prefix arama yapar (LIKE 'q%'), avatar + rütbe
// göstermek için yomi_points'i de döner.
const searchRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function GET(request) {
    try {
        const rl = await searchRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const db = await getDb();
        // Sadece giriş yapmış kullanıcılar arama yapabilir (chat zaten girişli kullanıcılar için)
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim();

        if (q.length === 0) {
            return NextResponse.json({ users: [] });
        }
        if (q.length > 30) {
            return NextResponse.json({ users: [] });
        }

        // LIKE joker karakterlerini kaçır (kullanıcı '%' veya '_' yazarsa arama bozulmasın)
        const escaped = q.replace(/[%_]/g, c => `\\${c}`);

        const users = await db.prepare(`
            SELECT id, username, display_name, avatar_url, yomi_points
            FROM users
            WHERE username LIKE ? ESCAPE '\\'
            ORDER BY
                CASE WHEN username = ? THEN 0 ELSE 1 END,
                yomi_points DESC
            LIMIT 8
        `).all(`${escaped}%`, q);

        return NextResponse.json({ users: users.map(toPublicUser) });
    } catch (error) {
        console.error('GET /api/users/search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
