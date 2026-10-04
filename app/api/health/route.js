import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isPlaceholder } from '@/lib/envGuard';
import { getVerifiedUser, hasAdminPanelAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Teşhis endpoint'i: /api/health
// GÜVENLİK: Bu uç eskiden kimlik doğrulaması olmadan hangi env değişkenlerinin
// (JWT_SECRET, ADMIN_PASSWORD, IMGBB_API_KEY, DB token'ları dahil) tanımlı/eksik
// olduğunu ve ham DB hata mesajlarını herkese açık şekilde döndürüyordu — F12 →
// Network sekmesinden veya doğrudan URL ile hiçbir araç kullanmadan görülebilen
// bir bilgi ifşası açığıydı (saldırgana hangi secret'ların varsayılan/placeholder
// kaldığı konusunda keşif bilgisi sağlıyordu). Artık:
//   - Kimliği doğrulanmamış / admin olmayan istekler sadece { ok, db } görür.
//   - Detaylı env durumu ve DB hata mesajı SADECE admin paneline erişimi olan
//     kullanıcılara gösterilir.
function state(name) {
    const v = process.env[name];
    if (!v || !v.trim()) return 'missing';
    return isPlaceholder(v) ? 'placeholder' : 'ok';
}

export async function GET(request) {
    let dbOk = false;
    let dbError = null;
    try {
        const conn = await getDb();
        await conn.prepare('SELECT 1 AS ok').get();
        dbOk = true;
    } catch (e) {
        dbError = String(e?.message || e).slice(0, 300);
    }

    // Yetkisiz/anonim çağıranlar için: sadece minimal, sır içermeyen durum bilgisi.
    let isAdmin = false;
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (!result.error && await hasAdminPanelAccess(result.user, db)) {
            isAdmin = true;
        }
    } catch {}

    if (!isAdmin) {
        return NextResponse.json({ ok: dbOk }, { status: dbOk ? 200 : 500 });
    }

    const env = {
        TURSO_DATABASE_URL: state('TURSO_DATABASE_URL'),
        TURSO_AUTH_TOKEN: state('TURSO_AUTH_TOKEN'),
        JWT_SECRET: state('JWT_SECRET'),
        ADMIN_EMAIL: state('ADMIN_EMAIL'),
        ADMIN_EMAIL_2: state('ADMIN_EMAIL_2'),
        ADMIN_EMAILS: state('ADMIN_EMAILS'),
        ADMIN_PASSWORD: state('ADMIN_PASSWORD'),
        IMGBB_API_KEY: state('IMGBB_API_KEY'),
        NEXT_PUBLIC_BASE_URL: state('NEXT_PUBLIC_BASE_URL'),
    };
    return NextResponse.json({ env, db: { ok: dbOk, error: dbError } }, { status: dbOk ? 200 : 500 });
}
