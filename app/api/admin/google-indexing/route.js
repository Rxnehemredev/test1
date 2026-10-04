export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


const KEY_PATH = path.join(process.cwd(), 'google-indexing-key.json');

export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        await requireAdmin(request);
        const exists = fs.existsSync(KEY_PATH);
        if (!exists) {
            return NextResponse.json({ exists: false, clientEmail: null });
        }
        try {
            const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
            return NextResponse.json({
                exists: true,
                clientEmail: key.client_email || null,
                projectId: key.project_id || null,
            });
        } catch {
            return NextResponse.json({ exists: true, clientEmail: null, parseError: true });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
}

export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

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
            fs.writeFileSync(KEY_PATH, text, 'utf8');
            return NextResponse.json({
                success: true,
                clientEmail: parsed.client_email,
                projectId: parsed.project_id || null,
                message: 'Google Indexing API anahtarı başarıyla yüklendi',
            });
        }

        if (action === 'delete-key') {
            if (fs.existsSync(KEY_PATH)) {
                fs.unlinkSync(KEY_PATH);
            }
            return NextResponse.json({ success: true, message: 'Anahtar silindi' });
        }

        if (action === 'test-indexing') {
            if (!fs.existsSync(KEY_PATH)) {
                return NextResponse.json({ error: 'google-indexing-key.json bulunamadı. Lütfen önce anahtarı yükleyin.' }, { status: 400 });
            }
            const { notifyGoogleIndexingWithDetail } = await import('@/lib/googleIndexing');
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

    try {
        await requireAdmin(request);
        if (fs.existsSync(KEY_PATH)) {
            fs.unlinkSync(KEY_PATH);
        }
        return NextResponse.json({ success: true, message: 'Anahtar silindi' });
    } catch (error) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }
}