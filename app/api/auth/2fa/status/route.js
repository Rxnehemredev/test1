import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, getAdminPanelAccessStatus } from '@/lib/auth';

// GET /api/auth/2fa/status — profil sayfasındaki 2FA kartı ve admin panelindeki
// "2FA gerekli" uyarısı için kullanılır.
export async function GET(request) {
    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user } = result;

        const dbUser = await db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id);
        const access = await getAdminPanelAccessStatus(user, db);

        let adminRow;
        try {
            adminRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'admin_2fa_required'").get();
        } catch {}

        return NextResponse.json({
            enabled: !!dbUser?.totp_enabled,
            adminPanelAccess: access.allowed,
            adminPanelBlockedByMissing2FA: access.reason === '2fa_required',
            admin2FARequiredSitewide: adminRow?.setting_value === '1',
        });
    } catch (error) {
        console.error('GET /api/auth/2fa/status error:', error);
        return NextResponse.json({ error: 'Durum alınamadı.' }, { status: 500 });
    }
}
