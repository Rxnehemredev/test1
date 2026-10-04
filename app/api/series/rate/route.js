import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


/**
 * GET /api/series/rate?seriesId=X
 * Kullanıcının bu seriye verdiği puanı döndürür (oturum açıksa).
 * Ayrıca serinin genel puan ortalamasını döndürür.
 */
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

  try {
    const { searchParams } = new URL(request.url);
    const seriesId = parseInt(searchParams.get('seriesId'));
    if (!seriesId || isNaN(seriesId)) {
      return NextResponse.json({ error: 'seriesId gerekli' }, { status: 400 });
    }

    const db = await getDb();

    // Genel ortalama puan ve oy sayısı
    const stats = await db.prepare(`
      SELECT
        ROUND(AVG(rating), 1) as avg_rating,
        COUNT(*) as vote_count
      FROM user_ratings WHERE series_id = ?
    `).get(seriesId);

    // Kullanıcının kendi puanı (opsiyonel — token yoksa null döner)
    let userRating = null;
    const decoded = getUserFromRequest(request);
    if (decoded?.id) {
      const row = await db.prepare(
        'SELECT rating FROM user_ratings WHERE series_id = ? AND user_id = ?'
      ).get(seriesId, decoded.id);
      userRating = row?.rating || null;
    }

    return NextResponse.json({
      success: true,
      avg_rating: stats?.avg_rating || null,
      vote_count: stats?.vote_count || 0,
      user_rating: userRating,
    });
  } catch (e) {
    console.error('GET /api/series/rate error:', e);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * POST /api/series/rate
 * Body: { seriesId, rating (1-10) }
 * Kullanıcının seriye puan vermesini / güncellemesini sağlar.
 */
export async function POST(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

  try {
    const decoded = getUserFromRequest(request);
    if (!decoded?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const seriesId = parseInt(body.seriesId);
    const rating = parseInt(body.rating);

    if (!seriesId || isNaN(seriesId)) {
      return NextResponse.json({ error: 'seriesId gerekli' }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Puan 1-5 arasında olmalıdır' }, { status: 400 });
    }

    const db = await getDb();

    // Seri var mı?
    const series = await db.prepare('SELECT id FROM series WHERE id = ? AND published = 1').get(seriesId);
    if (!series) {
      return NextResponse.json({ error: 'Seri bulunamadı' }, { status: 404 });
    }

    // Puan ekle veya güncelle
    await db.prepare(`
      INSERT INTO user_ratings (series_id, user_id, rating, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(series_id, user_id) DO UPDATE SET
        rating = excluded.rating,
        updated_at = CURRENT_TIMESTAMP
    `).run(seriesId, decoded.id, rating);

    // Seri tablosundaki rating'i güncelle (ortalama)
    const stats = await db.prepare(`
      SELECT ROUND(AVG(rating), 2) as avg_rating, COUNT(*) as vote_count
      FROM user_ratings WHERE series_id = ?
    `).get(seriesId);

    const newAvg = stats?.avg_rating || 0;
    await db.prepare('UPDATE series SET rating = ? WHERE id = ?').run(newAvg, seriesId);

    return NextResponse.json({
      success: true,
      user_rating: rating,
      avg_rating: parseFloat(Number(newAvg).toFixed(1)),
      vote_count: stats?.vote_count || 1,
    });
  } catch (e) {
    console.error('POST /api/series/rate error:', e);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * DELETE /api/series/rate?seriesId=X
 * Kullanıcının verdiği puanı kaldırır.
 */
export async function DELETE(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

  try {
    const decoded = getUserFromRequest(request);
    if (!decoded?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = parseInt(searchParams.get('seriesId'));
    if (!seriesId || isNaN(seriesId)) {
      return NextResponse.json({ error: 'seriesId gerekli' }, { status: 400 });
    }

    const db = await getDb();
    await db.prepare('DELETE FROM user_ratings WHERE series_id = ? AND user_id = ?').run(seriesId, decoded.id);

    // Ortalamayı güncelle
    const stats = await db.prepare(`
      SELECT ROUND(AVG(rating), 2) as avg_rating, COUNT(*) as vote_count
      FROM user_ratings WHERE series_id = ?
    `).get(seriesId);
    const newAvg = stats?.avg_rating || 0;
    await db.prepare('UPDATE series SET rating = ? WHERE id = ?').run(newAvg, seriesId);

    return NextResponse.json({
      success: true,
      avg_rating: newAvg ? parseFloat(Number(newAvg).toFixed(1)) : null,
      vote_count: stats?.vote_count || 0,
      user_rating: null,
    });
  } catch (e) {
    console.error('DELETE /api/series/rate error:', e);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}