import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { resolveGeminiKey, geminiEnvDiagnostics } from '@/lib/ai-blog';
import { isSameOrigin } from '@/lib/security/sameOrigin';
import { createRateLimiter } from '@/lib/ratelimit';

// Blog üretimi için Gemini API anahtarı durumu / kaydı.
// Anahtarın KENDİSİ hiçbir zaman geri döndürülmez (sadece ayarlı mı + kaynağı).
const limiter = createRateLimiter(20, 60 * 1000);

function isStaff(user) {
    return user && ['admin', 'manager'].includes(user.role);
}

// GET → { configured, source }
export async function GET(request) {
    try {
        const user = await requireAuth(request);
        if (!isStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const { key, source } = await resolveGeminiKey();
        return NextResponse.json({ configured: Boolean(key), source, envSeen: geminiEnvDiagnostics() });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        return NextResponse.json({ error: 'Durum okunamadı' }, { status: 500 });
    }
}

// POST { key } → anahtarı app_settings'e kaydeder (sadece admin). Boş key = siler.
export async function POST(request) {
    try {
        const rl = await limiter(request);
        if (!rl.success) return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 });
        if (!isSameOrigin(request)) return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });

        const user = await requireAuth(request);
        if (user.role !== 'admin') return NextResponse.json({ error: 'Bu ayarı yalnızca admin değiştirebilir' }, { status: 403 });

        const body = await request.json();
        const key = typeof body?.key === 'string' ? body.key.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, '') : '';
        if (key && !/^[\w\-]{20,200}$/.test(key)) {
            return NextResponse.json({ error: 'Anahtar biçimi geçersiz (boşluk/tırnak olmadan, tam kopyalayın).' }, { status: 400 });
        }

        const db = await getDb();
        if (key) {
            await db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run('gemini_api_key', key);
        } else {
            await db.prepare("DELETE FROM app_settings WHERE setting_key = 'gemini_api_key'").run();
        }
        try {
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)')
                .run(user.id, user.username, 'update_settings', JSON.stringify({ gemini_api_key: key ? '***' : '(silindi)' }));
        } catch { /* log hatası ana işlemi etkilemesin */ }

        const r = await resolveGeminiKey();
        return NextResponse.json({ success: true, configured: Boolean(r.key), source: r.source });
    } catch (error) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: error.message }, { status: 401 });
        console.error('POST /api/admin/blogs/gemini-key error:', error);
        return NextResponse.json({ error: 'Kaydedilemedi' }, { status: 500 });
    }
}
