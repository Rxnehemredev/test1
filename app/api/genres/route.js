import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listPublicGenres } from '@/lib/genreSlug';
import { createRateLimiter } from '@/lib/ratelimit';

// Public endpoint — yetki gerektirmez. Navbar tür mega-menüsü ve
// diğer public bileşenler buradan beslenmelidir.
// /api/admin/genres admin-korumalıdır; public erişim için bu route'u kullanın.
const publicGenreLimiter = createRateLimiter(60, 60 * 1000); // 60 istek/dk

export async function GET(request) {
    { const __rl = await publicGenreLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 }); }

    try {
        const db = await getDb();
        const genres = await listPublicGenres(db);
        return NextResponse.json({ genres }, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
        });
    } catch (error) {
        console.error('GET /api/genres error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
