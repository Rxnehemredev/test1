import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess, hasPermission } from '@/lib/auth';
import { assertSafeIdentifier } from '@/lib/security/sqlWhitelist';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);

// Yedekleme; tüm site verisini (kullanıcı e-postaları dahil) dışa aktardığı için
// hasAdminPanelAccess (herhangi bir personel rolü) yeterli değil — sadece
// admin/manager veya 'manage_settings' iznine sahip özel roller erişebilmeli.
// (İstemci tarafında da 'backup' sekmesi zaten manage_settings iznine göre
// gizleniyor — app/admin-panel/page.js içindeki `backup: () => ...manage_settings`
// kontrolü. Ama API bunu doğrulamıyordu; bir moderator/team_member doğrudan bu
// endpoint'e istek atarak tüm veritabanını indirebiliyordu.)
async function canManageBackups(user, db) {
    if (['admin', 'manager'].includes(user.role)) return true;
    return await hasPermission(user, 'manage_settings', db);
}

const MAX_BACKUPS = 7; // Keep last 7 backups
const BACKUP_COOLDOWN_MS = 60_000; // 60 saniye — burst koruma

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// data.<field> -> gerçek tablo adı. Sabit bir whitelist — kullanıcı girdisi
// asla doğrudan SQL tablo adına gitmez (injection koruması).
const RESTORABLE_TABLES = {
    series: 'series',
    chapters: 'chapters',
    comments: 'comments',
    favorites: 'favorites',
    readingLists: 'reading_lists',
    announcements: 'announcements',
    appSettings: 'app_settings',
    userRatings: 'user_ratings',
};

// Bir tabloyu satır satır INSERT OR REPLACE ile geri yükler.
// Sütunlar backup'taki ilk satırdan çıkarılır (backup zaten SELECT * ile alındığı için tam sütun seti).
// GÜVENLİK DÜZELTMESİ — SQL injection: `cols` değerleri yüklenen backup
// JSON'undaki alan adlarından geliyordu ve SQL string'ine DOĞRUDAN
// (parametre değil, ham metin olarak) ekleniyordu. `table` zaten
// RESTORABLE_TABLES whitelist'inden geldiği için güvenliydi, ama bir
// saldırgan/bozuk bir backup dosyası kolon adı yerine
// `foo); DROP TABLE users; --` gibi bir alan adı taşırsa bu sorguya
// enjekte edilebiliyordu (restore admin/manager yetkisi gerektirse de,
// yetkisi çalınmış/kötüye kullanılmış bir hesap ya da kurcalanmış bir
// backup dosyası ile tetiklenebilir). Artık her kolon adı, gerçek
// tablo şemasındaki (PRAGMA table_info) izin verilen kolon adları
// listesine karşı doğrulanıyor; eşleşmeyenler sessizce atlanıyor.
async function getTableColumns(db, table) {
    try {
        // `table` RESTORABLE_TABLES beyaz listesinden gelir; yine de tanımlayıcı olarak doğrulanır.
        const rows = await db.prepare(`PRAGMA table_info(${assertSafeIdentifier(table)})`).all();
        return new Set(rows.map((r) => r.name));
    } catch {
        return new Set();
    }
}

async function restoreTable(db, table, rows) {
    if (!Array.isArray(rows) || rows.length === 0) return 0;
    const validColumns = await getTableColumns(db, table);
    const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    const cols = Object.keys(rows[0]).filter(
        (c) => c !== undefined && IDENT_RE.test(c) && validColumns.has(c)
    );
    if (cols.length === 0) return 0;
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${assertSafeIdentifier(table)} (${cols.map(assertSafeIdentifier).join(', ')}) VALUES (${placeholders})`;

    let restored = 0;
    const CHUNK = 50; // tek seferde çok büyük batch göndermemek için
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK).map((row) => ({
            sql,
            args: cols.map((c) => (row[c] === undefined ? null : row[c])),
        }));
        try {
            await db.batch(chunk);
            restored += chunk.length;
        } catch (e) {
            console.error(`restoreTable(${table}) batch hatası:`, e.message);
        }
    }
    return restored;
}

// Get all backups — meta bilgiyi döner, büyük 'data' kolonunu çekmez
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!tokenUser || !await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        if (!await canManageBackups(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim: yedekleme yönetimi izniniz yok' }, { status: 403 });
        }

        const rows = await db.prepare(
            `SELECT id, created_at, size, series_count, chapters_count, users_count, comments_count
             FROM backups ORDER BY created_at DESC`
        ).all();

        const backups = rows.map((row) => ({
            id: row.id,
            name: `${row.id}.json`,
            createdAt: row.created_at,
            size: row.size,
            sizeFormatted: formatBytes(row.size || 0),
            seriesCount: row.series_count || 0,
            chaptersCount: row.chapters_count || 0,
            usersCount: row.users_count || 0,
            commentsCount: row.comments_count || 0,
        }));

        return NextResponse.json({ backups });
    } catch (error) {
        console.error('GET /api/admin/backup error:', error);
        return NextResponse.json({ error: 'Yedekler getirilemedi' }, { status: 500 });
    }
}

// Create new backup, or import/restore one
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!tokenUser || !await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        if (!await canManageBackups(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim: yedekleme yönetimi izniniz yok' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'create') {
            // Rate limiting: son backup'tan bu yana BACKUP_COOLDOWN_MS geçmiş mi?
            try {
                const latest = await db.prepare('SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1').get();
                if (latest?.created_at && Date.now() - new Date(latest.created_at).getTime() < BACKUP_COOLDOWN_MS) {
                    return NextResponse.json(
                        { error: `Lütfen ${Math.ceil(BACKUP_COOLDOWN_MS / 1000)} saniye bekleyip tekrar deneyin.` },
                        { status: 429 }
                    );
                }
            } catch {}

            // Export all data
            const backupId = `backup_${Date.now()}`;
            const timestamp = new Date().toISOString();

            // Helper to safely query a table (returns [] if table doesn't exist)
            async function safeQuery(sql) {
                try { return await db.prepare(sql).all(); } catch { return []; }
            }

            // Get all data from database — şifre/token alanları hariç
            const series = await safeQuery('SELECT * FROM series');
            const chapters = await safeQuery('SELECT * FROM chapters');
            const users = await safeQuery('SELECT id, username, email, role, yomi_points, created_at FROM users');
            const comments = await safeQuery('SELECT * FROM comments');
            const favorites = await safeQuery('SELECT * FROM favorites');
            const readingLists = await safeQuery('SELECT * FROM reading_lists');
            const announcements = await safeQuery('SELECT * FROM announcements');
            const appSettings = await safeQuery('SELECT * FROM app_settings');
            const userRatings = await safeQuery('SELECT * FROM user_ratings');

            const backupData = {
                version: '1.0',
                createdAt: timestamp,
                data: {
                    series,
                    chapters,
                    users,
                    comments,
                    favorites,
                    readingLists,
                    announcements,
                    appSettings,
                    userRatings,
                }
            };

            // Pretty-print olmadan yaz — %20-30 daha küçük dosya
            const jsonContent = JSON.stringify(backupData);
            const size = Buffer.byteLength(jsonContent, 'utf-8');

            await db.prepare(
                `INSERT INTO backups (id, created_at, size, series_count, chapters_count, users_count, comments_count, data)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(backupId, timestamp, size, series.length, chapters.length, users.length, comments.length, jsonContent);

            // Clean up old backups (keep only MAX_BACKUPS)
            try {
                await db.prepare(
                    `DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY created_at DESC LIMIT ?)`
                ).run(MAX_BACKUPS);
            } catch (e) { console.error('Eski yedekler temizlenemedi:', e.message); }

            return NextResponse.json({
                success: true,
                message: 'Yedek başarıyla oluşturuldu',
                backup: {
                    id: backupId,
                    name: `${backupId}.json`,
                    createdAt: timestamp,
                    size,
                    sizeFormatted: formatBytes(size),
                    seriesCount: series.length,
                    chaptersCount: chapters.length,
                    usersCount: users.length,
                    commentsCount: comments.length,
                }
            });
        }

        if (action === 'import') {
            let payload;
            try {
                payload = await request.json();
            } catch {
                return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
            }

            const data = payload?.data;
            if (!data || typeof data !== 'object') {
                return NextResponse.json({ error: 'Geçersiz yedek dosyası: "data" alanı bulunamadı' }, { status: 400 });
            }

            const restored = {};
            for (const [field, table] of Object.entries(RESTORABLE_TABLES)) {
                restored[field] = await restoreTable(db, table, data[field]);
            }

            // Kullanıcılar: yedekte password_hash YOK (kasıtlı olarak dışarıda bırakıldı,
            // güvenlik gereği). Bu yüzden kullanıcı satırlarını tamamen değiştirmek
            // herkesi hesabından atar. Sadece mevcut kullanıcılardaki rol ve puan
            // bilgisini güvenle geri yüklüyoruz; yeni kullanıcı satırı oluşturmuyoruz.
            let usersUpdated = 0;
            if (Array.isArray(data.users)) {
                for (const u of data.users) {
                    if (!u?.id) continue;
                    try {
                        const r = await db.prepare('UPDATE users SET role = ?, yomi_points = ? WHERE id = ?')
                            .run(u.role ?? 'user', u.yomi_points ?? 0, u.id);
                        if (r.changes) usersUpdated++;
                    } catch (e) { console.error('Kullanıcı geri yükleme hatası:', e.message); }
                }
            }
            restored.users = usersUpdated;

            return NextResponse.json({
                success: true,
                message: 'Veriler başarıyla içe aktarıldı (kullanıcı şifreleri güvenlik gereği yedekte olmadığından yalnızca rol/puan bilgisi güncellendi; yeni kullanıcı oluşturulmadı)',
                restored,
            });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('POST /api/admin/backup error:', error);
        return NextResponse.json({ error: 'Yedekleme başarısız' }, { status: 500 });
    }
}

// Delete backup
export async function DELETE(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { user: tokenUser } = result;

        if (!tokenUser || !await hasAdminPanelAccess(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        if (!await canManageBackups(tokenUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz erişim: yedekleme yönetimi izniniz yok' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const backupId = searchParams.get('id');

        if (action === 'delete' && backupId) {
            // Güvenlik: yalnızca beklenen formattaki id'lere izin ver
            if (!/^backup_\d+$/.test(backupId)) {
                return NextResponse.json({ error: 'Geçersiz yedek ID' }, { status: 400 });
            }
            const r = await db.prepare('DELETE FROM backups WHERE id = ?').run(backupId);
            if (r.changes) {
                return NextResponse.json({ success: true, message: 'Yedek silindi' });
            }
            return NextResponse.json({ error: 'Yedek bulunamadı' }, { status: 404 });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('DELETE /api/admin/backup error:', error);
        return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
    }
}
