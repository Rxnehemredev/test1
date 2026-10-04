import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { invalidateSettingsCache } from '@/lib/settings-cache';
import { createRateLimiter } from '@/lib/ratelimit';
import { isSameOrigin } from '@/lib/security/sameOrigin';
import { hasPermission } from '@/lib/auth';
const adminLimiter = createRateLimiter(100, 60000);


export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ success: false, error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }

    try {
        const user = await requireAuth(request);
        const body = await request.json();
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Site ayarlarını yalnızca admin/manager (veya manage_settings yetkisi olanlar) yazabilir.
        // Panele girebilen her rol (moderatör, ekip üyesi…) ayar yazabilseydi rol tanımlarını
        // ve anahtarları değiştirip yetki yükseltebilirdi.
        const canWriteSettings = ['admin', 'manager'].includes(user.role) || await hasPermission(user, 'manage_settings', db);
        if (!canWriteSettings) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ success: false, error: 'Geçersiz istek' }, { status: 400 });
        }
        // Hassas anahtarlar (rol tanımları, API anahtarları, sistem sayacı) yalnızca admin tarafından değiştirilebilir
        const SENSITIVE_KEY = /^(custom_roles|content_version)$|(secret|token|password|api_key|apikey|private|service_role)/i;
        for (const [key, value] of Object.entries(body)) {
            if (!/^[\w.:\-]{1,120}$/.test(key) || key === '__proto__') {
                return NextResponse.json({ success: false, error: `Geçersiz ayar anahtarı: ${key.slice(0, 40)}` }, { status: 400 });
            }
            if (String(value).length > 200000) {
                return NextResponse.json({ success: false, error: `Ayar değeri çok uzun: ${key}` }, { status: 400 });
            }
            if (SENSITIVE_KEY.test(key) && user.role !== 'admin') {
                return NextResponse.json({ success: false, error: `Bu ayarı yalnızca admin değiştirebilir: ${key}` }, { status: 403 });
            }
        }
        const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)');

        await db.transaction(async (settingsObj) => {
            for (const [key, value] of Object.entries(settingsObj)) {
                await stmt.run(key, String(value));
            }
        })(body);

        try {
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                user.id, user.username, 'update_settings', JSON.stringify(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '***' : v]))).substring(0, 200)
            );
        } catch (e) { /* log hatası ana işlemi etkilemesin */ }

        // Settings değiştiğinde cache'i anında temizle (favicon, logo vb. hemen yansısın)
        invalidateSettingsCache();
        try { const { revalidateTag, revalidatePath } = await import('next/cache'); revalidateTag('settings'); revalidatePath('/', 'layout'); } catch {}

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings save error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
