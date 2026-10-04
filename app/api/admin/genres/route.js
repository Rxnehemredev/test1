import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess, getUserFromRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


// Varsayılan türler listesi (admin paneldeki GENRE_TR ile senkron tutulmalı)
export const DEFAULT_GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Historical',
    'Horror', 'Isekai', 'Martial Arts', 'Mystery', 'Reincarnation', 'Romance',
    'School', 'Sci-Fi', 'Supernatural', 'Thriller',
    'Ecchi', 'Harem', 'Josei', 'Mature', 'Mecha', 'Psychological',
    'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Sports', 'Tragedy',
    'Webtoon', 'Manhwa', 'Manhua',
];

export const GENRE_TR_MAP = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim', 'Ecchi': 'Ecchi', 'Harem': 'Harem',
    'Josei': 'Josei', 'Mature': 'Yetişkin', 'Mecha': 'Mecha', 'Psychological': 'Psikolojik',
    'Seinen': 'Seinen', 'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua',
};

// GET: Tüm türleri listele (varsayılan + özel, silinmiş hariç)
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();

        // Public erişim için auth kontrolü isteğe bağlı
        let isAdminUser = false;
        if (getUserFromRequest(request)) {
            try {
                const result = await getVerifiedUser(request, db);
                isAdminUser = !result.error && await hasAdminPanelAccess(result.user, db);
            } catch {}
        }

        // Silinmiş varsayılan türleri al
        const deletedDefaultSet = new Set(
            await (db.prepare('SELECT name FROM deleted_default_genres').all()).map(r => r.name)
        );

        // Özel türleri al
        const customGenres = await db.prepare('SELECT * FROM custom_genres ORDER BY name ASC').all();

        // Her türün kaç seride kullanıldığını hesapla
        const allSeries = await db.prepare("SELECT genres FROM series WHERE published = 1").all();
        const usageCounts = {};
        for (const s of allSeries) {
            try {
                const gs = JSON.parse(s.genres || '[]');
                for (const g of gs) {
                    usageCounts[g] = (usageCounts[g] || 0) + 1;
                }
            } catch {}
        }

        // Aktif varsayılan türler
        const activeDefaults = DEFAULT_GENRES
            .filter(g => !deletedDefaultSet.has(g))
            .map(g => ({
                id: `default_${g}`,
                name: g,
                name_tr: GENRE_TR_MAP[g] || g,
                slug: g.toLowerCase().replace(/\s+/g, '-'),
                isDefault: true,
                usageCount: usageCounts[g] || 0,
            }));

        // Özel türler
        const customList = customGenres.map(g => ({
            ...g,
            name_tr: g.name_tr || g.name,
            isDefault: false,
            usageCount: usageCounts[g.name] || 0,
        }));

        // Silinmiş varsayılan türler (sadece admin görsün)
        const deletedDefaults = isAdminUser
            ? DEFAULT_GENRES
                .filter(g => deletedDefaultSet.has(g))
                .map(g => ({
                    id: `deleted_${g}`,
                    name: g,
                    name_tr: GENRE_TR_MAP[g] || g,
                    isDefault: true,
                    isDeleted: true,
                    usageCount: 0,
                }))
            : [];

        return NextResponse.json({
            success: true,
            genres: [...activeDefaults, ...customList],
            deletedDefaults,
            usageCounts,
        });
    } catch (error) {
        console.error('Genres GET error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST: Tür ekle, sil veya geri yükle
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user } = result;
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        const body = await request.json();
        const { action, name, id } = body;

        // ── Tür Ekle ──────────────────────────────────────────
        if (action === 'add') {
            if (!name || !name.trim()) return NextResponse.json({ error: 'Tür adı gerekli' }, { status: 400 });
            const cleanName = name.trim();
            const slug = cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            try {
                await db.prepare('INSERT INTO custom_genres (name, slug) VALUES (?, ?)').run(cleanName, slug);
                try {
                    await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                        user.id, user.username, 'add_genre', `Tür eklendi: ${cleanName}`
                    );
                } catch {}
                return NextResponse.json({ success: true, message: `"${cleanName}" türü eklendi` });
            } catch (e) {
                if (e.message?.includes('UNIQUE')) {
                    return NextResponse.json({ error: 'Bu tür zaten mevcut' }, { status: 409 });
                }
                throw e;
            }
        }

        // ── Tür Sil ──────────────────────────────────────────
        if (action === 'delete') {
            // Varsayılan tür silme (id = "default_Genre Name")
            if (id && String(id).startsWith('default_')) {
                const genreName = String(id).replace('default_', '');
                if (!DEFAULT_GENRES.includes(genreName)) {
                    return NextResponse.json({ error: 'Geçersiz varsayılan tür' }, { status: 400 });
                }

                // Silinmiş varsayılan türler tablosuna ekle
                await db.prepare('INSERT OR IGNORE INTO deleted_default_genres (name) VALUES (?)').run(genreName);

                // Tüm serilerden bu türü kaldır
                const allSeries = await db.prepare("SELECT id, genres FROM series").all();
                const tx = db.transaction(async () => {
                    for (const s of allSeries) {
                        try {
                            const gs = JSON.parse(s.genres || '[]');
                            const updated = gs.filter(g => g !== genreName);
                            if (updated.length !== gs.length) {
                                await db.prepare('UPDATE series SET genres = ? WHERE id = ?').run(JSON.stringify(updated), s.id);
                            }
                        } catch {}
                    }
                });
                await tx();

                try {
                    await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                        user.id, user.username, 'delete_default_genre', `Varsayılan tür silindi: ${genreName}`
                    );
                } catch {}
                return NextResponse.json({ success: true, message: `"${genreName}" varsayılan türü silindi` });
            }

            // Özel tür silme
            if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
            const genre = await db.prepare('SELECT * FROM custom_genres WHERE id = ?').get(id);
            if (!genre) return NextResponse.json({ error: 'Tür bulunamadı' }, { status: 404 });

            const allSeries = await db.prepare("SELECT id, genres FROM series").all();
            const removeGenre = db.transaction(async (genreName) => {
                for (const s of allSeries) {
                    try {
                        const gs = JSON.parse(s.genres || '[]');
                        const updated = gs.filter(g => g !== genreName);
                        if (updated.length !== gs.length) {
                            await db.prepare('UPDATE series SET genres = ? WHERE id = ?').run(JSON.stringify(updated), s.id);
                        }
                    } catch {}
                }
            });
            await removeGenre(genre.name);
            await db.prepare('DELETE FROM custom_genres WHERE id = ?').run(id);

            try {
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    user.id, user.username, 'delete_genre', `Tür silindi: ${genre.name}`
                );
            } catch {}
            return NextResponse.json({ success: true, message: `"${genre.name}" türü silindi` });
        }

        // ── Varsayılan Türü Geri Yükle ───────────────────────
        if (action === 'restore') {
            if (!name) return NextResponse.json({ error: 'name gerekli' }, { status: 400 });
            await db.prepare('DELETE FROM deleted_default_genres WHERE name = ?').run(name);
            try {
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    user.id, user.username, 'restore_genre', `Varsayılan tür geri yüklendi: ${name}`
                );
            } catch {}
            return NextResponse.json({ success: true, message: `"${name}" türü geri yüklendi` });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('Genres POST error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
