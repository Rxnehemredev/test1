import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { createRateLimiter } from '@/lib/ratelimit';
import { requiredJwtSecret } from '@/lib/envGuard';
const routeLimiter = createRateLimiter(60, 60000);


async function isStaffUser(request, db) {
    try {
        // Cookie'den JWT token oku
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/(?:^|;\s*)yomi_token=([^;]+)/);
        if (!match) return false;

        const payload = jwt.verify(decodeURIComponent(match[1]), requiredJwtSecret(), { algorithms: ['HS256'] });
        if (!payload?.role) return false;

        // Yerleşik yetkili roller
        const builtinStaff = ['admin', 'manager', 'moderator', 'team_member'];
        if (builtinStaff.includes(payload.role)) return true;

        // Özel rol: DB'den kontrol et
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
        if (row?.setting_value) {
            const customRoles = JSON.parse(row.setting_value);
            if (customRoles.some(r => r.name === payload.role)) return true;
        }

        return false;
    } catch {
        return false;
    }
}

// Cache-Control: no-store to always return fresh data
export async function GET(request) {
    { const __rl = await routeLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'").get();
        const maintenance = row?.setting_value === '1';

        // Bakım modu aktifse kullanıcının bypass yetkisi var mı kontrol et
        // FIX: isStaffUser async bir fonksiyon — await eksikti, bu yüzden
        // canBypass her zaman "doluymuş gibi" (çözülmemiş bir Promise objesi,
        // JSON.stringify sonrası {} = truthy) dönüyordu.
        const canBypass = maintenance ? await isStaffUser(request, db) : false;

        return NextResponse.json({ maintenance, canBypass }, {
            headers: { 'Cache-Control': 'no-store' }
        });
    } catch {
        return NextResponse.json({ maintenance: false, canBypass: false }, {
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}