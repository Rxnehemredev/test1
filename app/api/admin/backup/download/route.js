import { NextResponse } from 'next/server';
import { getVerifiedUser, hasAdminPanelAccess, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);

async function canManageBackups(user, db) {
    if (['admin', 'manager'].includes(user.role)) return true;
    return await hasPermission(user, 'manage_settings', db);
}

export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 });
        }
        if (!await canManageBackups(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erisim: yedekleme yönetimi izniniz yok' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('file');

        if (!filename) {
            return NextResponse.json({ error: 'Dosya adi gerekli' }, { status: 400 });
        }

        // filename formatı: backup_<timestamp>.json — buradan id çıkarılır.
        const match = /^(backup_\d+)\.json$/.exec(filename);
        if (!match) {
            return NextResponse.json({ error: 'Gecersiz dosya adi' }, { status: 400 });
        }
        const backupId = match[1];

        const row = await db.prepare('SELECT data FROM backups WHERE id = ?').get(backupId);
        if (!row) {
            return NextResponse.json({ error: 'Dosya bulunamadi' }, { status: 404 });
        }

        return new NextResponse(row.data, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${backupId}.json"`,
                'Content-Length': String(Buffer.byteLength(row.data, 'utf-8')),
            },
        });
    } catch (error) {
        console.error('GET /api/admin/backup/download error:', error);
        return NextResponse.json({ error: 'Indirme basarisiz' }, { status: 500 });
    }
}
