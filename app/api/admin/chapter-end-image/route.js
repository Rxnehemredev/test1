import { NextResponse } from 'next/server';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadToImgbb } from '@/lib/imgbb';
import { assertValidImage } from '@/lib/imageValidation';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) throw new Error('Forbidden');
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('chapter_end_image');

        if (!file || typeof file.arrayBuffer !== 'function') {
            return NextResponse.json({ error: 'Görsel dosyası gerekli' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Sadece PNG, WebP veya JPEG dosyaları kabul edilir' }, { status: 400 });
        }

        // Aşama 3 — Güvenlik: sadece `file.type` (istemci tarafından sahtelenebilir) kontrolüyle
        // yetinilmiyor; buffer sharp ile gerçek bir görüntü olarak doğrulanıyor.
        const buffer = Buffer.from(await file.arrayBuffer());
        try {
            await assertValidImage(buffer, ['png', 'webp', 'jpeg']);
        } catch (validationErr) {
            return NextResponse.json({ error: validationErr.message }, { status: 400 });
        }

        const { url } = await uploadToImgbb(buffer, 'chapter-end-image');

        const db = await getDb();
        await db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run('chapter_end_image_path', url);
        await db.prepare('DELETE FROM app_settings WHERE setting_key = ?').run('chapter_end_image_abs_path');

        return NextResponse.json({ path: url, message: 'Bölüm sonu görseli başarıyla yüklendi' });
    } catch (err) {
        console.error('Bölüm sonu görseli yükleme hatası:', err);
        return NextResponse.json({ error: 'Görsel yüklenemedi: ' + err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db2 = await getDb();
        if (!await hasAdminPanelAccess(user, db2)) throw new Error('Forbidden');
    } catch {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const db = await getDb();
        await db.prepare("DELETE FROM app_settings WHERE setting_key IN ('chapter_end_image_path', 'chapter_end_image_abs_path')").run();

        return NextResponse.json({ message: 'Bölüm sonu görseli silindi' });
    } catch (err) {
        return NextResponse.json({ error: 'Görsel silinemedi: ' + err.message }, { status: 500 });
    }
}
