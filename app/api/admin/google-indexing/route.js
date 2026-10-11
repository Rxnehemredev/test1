export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { createRateLimiter } from '@/lib/ratelimit';
import { encryptData } from '@/lib/security/encryption';
import { getStoredGoogleKey, notifyGoogleIndexingWithDetail } from '@/lib/googleIndexing';
import { isSameOrigin } from '@/lib/security/sameOrigin';

const adminLimiter = createRateLimiter(100, 60000);
const LEGACY_KEY_PATH = path.join(process.cwd(), 'google-indexing-key.json');

function cleanupLegacyFile() {
    try {
        if (fs.existsSync(LEGACY_KEY_PATH)) {
            fs.unlinkSync(LEGACY_KEY_PATH);
        }
    } catch {}
}

export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        await requireAdmin(request);
        const key = await getStoredGoogleKey();
        if (!key) {
            return NextResponse.json({ exists: false, clientEmail: null, projectId: null });
        }
        return NextResponse.json({
            exists: true,
            clientEmail: key.client_email || null,
            projectId: key.project_id || null,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
}

export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı (CSRF)' }, { status: 403 });
    }

    try {
        await requireAdmin(request);
        const formData = await request.formData();
        const action = formData.get('action');

        if (action === 'upload-key') {
            const file = formData.get('file');
            if (!file || typeof file === 'string') {
                return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 });
            }
            const text = await file.text();
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch {
                return NextResponse.json({ error: 'Geçersiz JSON dosyası' }, { status: 400 });
            }
            if (!parsed.client_email || !parsed.private_key) {
                return NextResponse.json({ error: 'Geçersiz servis hesabı anahtarı: client_email veya private_key eksik' }, { status: 400 });
            }

            // Anahtarı asla dosya sistemine yazmıyoruz. AES-256-GCM ile şifreleyip app_settings'e kaydediyoruz.
            const encryptedValue = encryptData(text);
            const db = await getDb();
            await db.prepare("INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES ('google_indexing_key', ?)").run(encryptedValue);
            
            // Disk üzerinde eski dosya kalmışsa temizle
            cleanupLegacyFile();

            return NextResponse.json({
                success: true,
                clientEmail: parsed.client_email,
                projectId: parsed.project_id || null,
                message: 'Google Indexing API anahtarı güvenli şekilde şifrelenerek veritabanına kaydedildi',
            });
        }

        if (action === 'delete-key') {
            const db = await getDb();
            await db.prepare("DELETE FROM app_settings WHERE setting_key = 'google_indexing_key'").run();
            cleanupLegacyFile();
            return NextResponse.json({ success: true, message: 'Anahtar silindi' });
        }

        if (action === 'test-indexing') {
            const key = await getStoredGoogleKey();
            if (!key) {
                return NextResponse.json({ error: 'Google Indexing anahtarı bulunamadı. Lütfen önce anahtarı yükleyin.' }, { status: 400 });
            }
            const testUrl = formData.get('url') || (process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app') + '/';
            const result = await notifyGoogleIndexingWithDetail(testUrl);
            if (result.success) {
                return NextResponse.json({ success: true, message: result.message });
            } else {
                return NextResponse.json({ error: result.error || 'Bilinmeyen hata' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('Google Indexing admin error:', error);
        return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
    }
}

export async function DELETE(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı (CSRF)' }, { status: 403 });
    }

    try {
        await requireAdmin(request);
        const db = await getDb();
        await db.prepare("DELETE FROM app_settings WHERE setting_key = 'google_indexing_key'").run();
        cleanupLegacyFile();
        return NextResponse.json({ success: true, message: 'Anahtar silindi' });
    } catch (error) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
}