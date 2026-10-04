import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { optimizeProfileCover } from '@/lib/imageOptimizer';
import { uploadToImgbb } from '@/lib/imgbb';
import { createRateLimiter } from '@/lib/ratelimit';
const routeLimiter = createRateLimiter(60, 60000);


export async function POST(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const userData = getUserFromRequest(request);
        if (!userData) {
            return NextResponse.json({ error: 'Oturum bulunamadı, lütfen tekrar giriş yapın.' }, { status: 401 });
        }

        const db = await getDb();
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userData.id);

        if (!user) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
        }

        // 24-hour cooldown check with 2 changes per 24h limit
        const msInDay = 24 * 60 * 60 * 1000;
        if (user.last_cover_update) {
            const lastUpdate = new Date(user.last_cover_update + 'Z').getTime();
            const timeSinceLastUpdate = Date.now() - lastUpdate;
            if (timeSinceLastUpdate < msInDay) {
                const changesUsed = user.cover_changes_today || 0;
                if (changesUsed >= 2) {
                    const hoursLeft = Math.ceil((msInDay - timeSinceLastUpdate) / (1000 * 60 * 60));
                    return NextResponse.json({ error: `Kapak resmi 24 saatte en fazla 2 kez değiştirilebilir. ${hoursLeft} saat sonra tekrar deneyin.` }, { status: 400 });
                }
            }
        }

        const formData = await request.formData();
        const file = formData.get('cover');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Yüklenecek bir dosya seçilmedi.' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Geçersiz dosya türü. JPEG, PNG, WebP veya GIF seçin.' }, { status: 400 });
        }

        // Validate file size (max 5MB for covers)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Dosya çok büyük. En fazla 5MB olabilir.' }, { status: 400 });
        }

        // Get raw buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Canvas tabanlı kırpma parametrelerini al
        const cropX = parseFloat(formData.get('cropX')) || 0;
        const cropY = parseFloat(formData.get('cropY')) || 0;
        const cropScale = parseFloat(formData.get('cropScale')) || 1;
        const cropApplied = formData.get('cropApplied') === 'true';
        const viewportWidth = parseInt(formData.get('viewportWidth')) || 800;
        const viewportHeight = parseInt(formData.get('viewportHeight')) || 180;
        const outputWidth = parseInt(formData.get('outputWidth')) || 1200;
        const outputHeight = parseInt(formData.get('outputHeight')) || 400;

        // GÜVENLİK: sharp burada aynı zamanda içerik doğrulaması görevi görüyor —
        // gerçek bir görsel değilse parse aşamasında hata fırlatır. Önceden bu
        // durumda doğrulanmamış ham buffer olduğu gibi imgbb'ye yükleniyordu ve
        // bu, yukarıdaki (sahtelenebilir `file.type`'a dayanan) dosya türü
        // kontrolünü anlamsız kılıyordu. Artık sharp başarısız olursa yükleme
        // tamamen reddediliyor. (bkz. app/api/auth/profile/avatar/route.js)
        let finalBuffer;
        try {
            const cropOptions = {
                cropX, cropY, cropScale, cropApplied,
                viewportWidth, viewportHeight, outputWidth, outputHeight
            };
            finalBuffer = await optimizeProfileCover(buffer, cropOptions);
        } catch (sharpErr) {
            console.error('Sharp cover optimization failed, rejecting upload:', sharpErr.message);
            return NextResponse.json({ error: 'Geçersiz veya bozuk görsel dosyası.' }, { status: 400 });
        }

        const { url: coverUrl } = await uploadToImgbb(finalBuffer, `cover_${user.id}_${Date.now()}`);

        // Reset counter if more than 24 hours since last update
        const lastUpdateMs = user.last_cover_update ? new Date(user.last_cover_update + 'Z').getTime() : 0;
        const shouldReset = (Date.now() - lastUpdateMs) > msInDay;

        if (shouldReset) {
            await db.prepare('UPDATE users SET cover_url = ?, last_cover_update = CURRENT_TIMESTAMP, cover_changes_today = 1 WHERE id = ?').run(coverUrl, user.id);
        } else {
            await db.prepare('UPDATE users SET cover_url = ?, last_cover_update = CURRENT_TIMESTAMP, cover_changes_today = COALESCE(cover_changes_today, 0) + 1 WHERE id = ?').run(coverUrl, user.id);
        }

        // Return updated user
        const updated = await db.prepare('SELECT id, username, email, avatar_url, cover_url, role, yomi_points, last_daily_login, last_avatar_update, last_cover_update, cover_changes_today, created_at FROM users WHERE id = ?').get(user.id);
        return NextResponse.json({ user: updated, message: 'Kapak resmi başarıyla güncellendi', cover_url: coverUrl });

    } catch (error) {
        console.error('POST /api/auth/profile/cover error:', error);
        return NextResponse.json({
            error: error?.message || 'Kapak resmi yüklenemedi.',
        }, { status: 500 });
    }
}
