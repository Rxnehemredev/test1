import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { debitPoints, refundPoints, isUniqueViolation } from '@/lib/points';
const purchaseLimiter = createRateLimiter(10, 60000);


// POST: { itemId } — Asteria Scans Puanı karşılığında mağaza öğesi satın al
export async function POST(request) {
    { const __rl = await purchaseLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const auth = await getVerifiedUser(request, db);
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { itemId } = await request.json();
        if (!itemId) return NextResponse.json({ error: 'itemId gerekli' }, { status: 400 });

        const item = await db.prepare('SELECT * FROM shop_items WHERE id = ? AND is_active = 1').get(itemId);
        if (!item) return NextResponse.json({ error: 'Öğe bulunamadı veya artık satışta değil' }, { status: 404 });

        // Fiyat doğrulaması: negatif/ondalıklı fiyat `bakiye - fiyat` ile puan BASAR (veya NaN üretir).
        if (!Number.isInteger(item.price) || item.price < 0) {
            console.error('shop/purchase: geçersiz fiyat', { itemId, price: item.price });
            return NextResponse.json({ error: 'Öğe şu anda satın alınamaz' }, { status: 400 });
        }

        // Hızlı çıkış (kullanıcı dostu mesaj). Asıl koruma aşağıdaki UNIQUE index + atomik UPDATE.
        const already = await db.prepare('SELECT id FROM user_purchases WHERE user_id = ? AND item_id = ?').get(auth.user.id, itemId);
        if (already) return NextResponse.json({ error: 'Bu öğeye zaten sahipsiniz' }, { status: 400 });

        // ATOMİK bakiye düşümü: koşul (`yomi_points >= ?`) UPDATE'in içinde. Eşzamanlı iki istek
        // aynı bakiyeyi görüp ikisi de geçemez (eski SELECT → karşılaştır → UPDATE deseni aşılırdı).
        if (!await debitPoints(db, auth.user.id, item.price)) {
            return NextResponse.json({ error: 'Yetersiz puan' }, { status: 400 });
        }

        // INSERT yalnızca düşüm başarılı olduktan SONRA. idx_user_purchases_unique (user_id, item_id)
        // aynı öğenin çift satın alınmasını DB seviyesinde engeller; ihlalde bedel iade edilir.
        try {
            await db.prepare('INSERT INTO user_purchases (user_id, item_id) VALUES (?, ?)').run(auth.user.id, itemId);
        } catch (insertErr) {
            await refundPoints(db, auth.user.id, item.price, `shop item=${itemId} insert hatası iadesi`);
            if (isUniqueViolation(insertErr)) {
                return NextResponse.json({ error: 'Bu öğeye zaten sahipsiniz' }, { status: 400 });
            }
            throw insertErr;
        }

        const updated = await db.prepare('SELECT yomi_points FROM users WHERE id = ?').get(auth.user.id);

        return NextResponse.json({
            success: true,
            message: `"${item.name}" satın alındı!`,
            item,
            remainingPoints: updated.yomi_points,
        });
    } catch (err) {
        console.error('shop/purchase POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
