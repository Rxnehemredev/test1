import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { optimizeAvatar } from '@/lib/imageOptimizer';
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
        if (user.last_avatar_update) {
            const lastUpdate = new Date(user.last_avatar_update + 'Z').getTime();
            const timeSinceLastUpdate = Date.now() - lastUpdate;
            if (timeSinceLastUpdate < msInDay) {
                const changesUsed = user.avatar_changes_today || 0;
                if (changesUsed >= 2) {
                    const hoursLeft = Math.ceil((msInDay - timeSinceLastUpdate) / (1000 * 60 * 60));
                    return NextResponse.json({ error: `Profil resmi 24 saatte en fazla 2 kez değiştirilebilir. ${hoursLeft} saat sonra tekrar deneyin.` }, { status: 400 });
                }
            }
        }

        const formData = await request.formData();
        const file = formData.get('avatar');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Yüklenecek bir dosya seçilmedi.' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Geçersiz dosya türü. JPEG, PNG, WebP veya GIF seçin.' }, { status: 400 });
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'Dosya çok büyük. En fazla 2MB olabilir.' }, { status: 400 });
        }

        // Get raw buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Canvas tabanlı kırpma yapıldığında client-side'da zaten kırpılmış görsel gelir
        // Ancak crop parametrelerini de alarak tutarlılık kontrolü yapabiliriz
        const cropX = parseFloat(formData.get('cropX')) || 0;
        const cropY = parseFloat(formData.get('cropY')) || 0;
        const cropScale = parseFloat(formData.get('cropScale')) || 1;
        const cropApplied = formData.get('cropApplied') === 'true';
        const viewportWidth = parseInt(formData.get('viewportWidth')) || 200;
        const viewportHeight = parseInt(formData.get('viewportHeight')) || 200;
        const outputWidth = parseInt(formData.get('outputWidth')) || 200;
        const outputHeight = parseInt(formData.get('outputHeight')) || 200;

        // GÜVENLİK: sharp burada aynı zamanda içerik doğrulaması görevi görüyor —
        // gerçek bir görsel değilse (ör. sahte Content-Type ile yüklenmiş
        // HTML/SVG/script içerikli bir dosya) parse aşamasında hata fırlatır.
        // Önceden bu hata durumunda doğrulanmamış ham buffer olduğu gibi imgbb'ye
        // yükleniyordu — bu da yukarıdaki dosya türü kontrolünü (client'ın
        // gönderdiği, sahtelenebilir `file.type` alanına dayanıyor) anlamsız
        // kılıyordu. Artık sharp başarısız olursa yükleme tamamen reddediliyor.
        let finalBuffer;
        try {
            const cropOptions = {
                cropX, cropY, cropScale, cropApplied,
                viewportWidth, viewportHeight, outputWidth, outputHeight
            };
            finalBuffer = await optimizeAvatar(buffer, cropOptions);
        } catch (sharpErr) {
            console.error('Sharp avatar optimization failed, rejecting upload:', sharpErr.message);
            return NextResponse.json({ error: 'Geçersiz veya bozuk görsel dosyası.' }, { status: 400 });
        }

        const { url: avatarUrl } = await uploadToImgbb(finalBuffer, `avatar_${user.id}_${Date.now()}`);

        // Reset counter if more than 24 hours since last update
        const lastUpdateMs = user.last_avatar_update ? new Date(user.last_avatar_update + 'Z').getTime() : 0;
        const shouldReset = (Date.now() - lastUpdateMs) > msInDay;

        if (shouldReset) {
            await db.prepare('UPDATE users SET avatar_url = ?, last_avatar_update = CURRENT_TIMESTAMP, avatar_changes_today = 1 WHERE id = ?').run(avatarUrl, user.id);
        } else {
            await db.prepare('UPDATE users SET avatar_url = ?, last_avatar_update = CURRENT_TIMESTAMP, avatar_changes_today = COALESCE(avatar_changes_today, 0) + 1 WHERE id = ?').run(avatarUrl, user.id);
        }

        // Return updated user
        const updated = await db.prepare('SELECT id, username, email, avatar_url, role, yomi_points, last_daily_login, last_avatar_update, avatar_changes_today, created_at FROM users WHERE id = ?').get(user.id);
        return NextResponse.json({ user: updated, message: 'Profil resmi başarıyla güncellendi', avatar_url: avatarUrl });

    } catch (error) {
        console.error('POST /api/auth/profile/avatar error:', error);
        return NextResponse.json({
            error: error?.message || 'Profil resmi yüklenemedi.',
        }, { status: 500 });
    }
}
