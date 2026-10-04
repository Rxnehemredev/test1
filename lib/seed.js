import crypto from 'crypto';
import { hashPassword, verifyPassword } from './auth.js';
import { realEnv } from './envGuard.js';

// ══════════════════════════════════════════════════════════════════════════
// VERİTABANI İLK KURULUM (seed)
//
// ESKİ DAVRANIŞ (kaldırıldı): Veritabanında hiç seri yoksa herkesin bildiği
// "admin / admin123" hesabı ve demo içerik otomatik oluşturuluyordu. Canlı
// sitede bu, yönetici paneline şifresiz denecek kadar açık bir kapıydı.
//
// YENİ DAVRANIŞ:
//  1) Yönetici hesabı SADECE Vercel ortam değişkenlerinden oluşturulur:
//       ADMIN_EMAIL, ADMIN_PASSWORD (en az 10 karakter), ADMIN_USERNAME (ops.)
//  2) Demo içerik (örnek seri/bölüm/yorum) varsayılan olarak KAPALI.
//     Denemek istersen SEED_DEMO_DATA=1 ekle.
// ══════════════════════════════════════════════════════════════════════════

const MIN_ADMIN_PASSWORD_LENGTH = 10;

// Yönetici olacak e-postalar. E-posta gizli bilgi değil, koda yazılabilir.
// ŞİFRE ise ASLA koda/depoya yazılmaz: Vercel'deki ADMIN_PASSWORD değişkeninden okunur.
const BUILTIN_ADMIN_EMAILS = [
    'zsuleymanov43@gmail.com',
    'tinercibossko@gmail.com',
    'hrne15816@gmail.com',
];

/**
 * Yönetici hesaplarını oluşturur. Kaynaklar:
 *   • BUILTIN_ADMIN_EMAILS (yukarıdaki liste)
 *   • ADMIN_EMAIL / ADMIN_EMAIL_2 / ADMIN_EMAILS ortam değişkenleri (ek yöneticiler, virgülle ayrılmış)
 * Şifre: ADMIN_PASSWORD (en az 10 karakter, .env.example'daki örnek değer kabul edilmez).
 *
 * Her e-posta için İLK çalıştırmada hesap oluşturulur; e-postayla zaten bir hesap varsa
 * yönetici yapılır ve şifresi ADMIN_PASSWORD olarak ayarlanır. Sonra o e-posta için işlem
 * "yapıldı" diye işaretlenir (app_settings) ve bir daha DOKUNULMAZ — yani kullanıcı
 * profilinden şifresini değiştirirse bir sonraki açılışta geri alınmaz.
 * ADMIN_RESET_PASSWORD=1 bu işareti yok sayıp herkesi yeniden ayarlar (şifre unutulursa;
 * işin bitince değişkeni sil).
 * Hata verirse siteyi düşürmez, sadece loglar.
 */
function usernameFromEmail(email) {
    let base = email.split('@')[0].replace(/[^a-zA-Z0-9_çÇğĞıİşŞüÜöÖ]/g, '_').slice(0, 30);
    if (base.length < 3) base = `admin_${base}`.slice(0, 30);
    return base;
}

async function ensureOneAdmin(db, email, password, usernameHint) {
    const existing = await db.prepare('SELECT id, role, password_hash FROM users WHERE lower(email) = ?').get(email);

    if (existing) {
        const passwordMatches = verifyPassword(password, existing.password_hash);
        if (existing.role === 'admin' && passwordMatches) return;
        await db.prepare("UPDATE users SET role = 'admin', password_hash = ?, banned_until = NULL WHERE id = ?")
            .run(passwordMatches ? existing.password_hash : hashPassword(password), existing.id);
        console.log(`[admin] mevcut hesap yönetici yapıldı: ${email}`);
        return;
    }

    let username = usernameHint || usernameFromEmail(email);
    const taken = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (taken) username = `${username.slice(0, 25)}_${crypto.randomBytes(2).toString('hex')}`;

    await db.prepare(
        'INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashPassword(password), 'admin');
    console.log(`[admin] yönetici hesabı oluşturuldu: ${email}`);
}

export async function ensureAdminFromEnv(db) {
    const password = realEnv('ADMIN_PASSWORD');
    const single = realEnv('ADMIN_EMAIL').trim().toLowerCase();
    const second = realEnv('ADMIN_EMAIL_2').trim().toLowerCase();
    const many = realEnv('ADMIN_EMAILS').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
    const emails = [...new Set([...BUILTIN_ADMIN_EMAILS, single, second, ...many].filter(Boolean))];

    if (!password) {
        if (process.env.ADMIN_PASSWORD) {
            console.warn('[admin] ADMIN_PASSWORD boş ya da örnek değerde — yönetici hesapları oluşturulmadı.');
        }
        return;
    }
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
        console.warn(`[admin] ADMIN_PASSWORD en az ${MIN_ADMIN_PASSWORD_LENGTH} karakter olmalı — yönetici hesapları oluşturulmadı.`);
        return;
    }

    const forceReset = process.env.ADMIN_RESET_PASSWORD === '1';
    const hint = (process.env.ADMIN_USERNAME || '').trim();
    for (const email of emails) {
        try {
            // E-posta açıkta durmasın diye işaret anahtarı e-postanın özetinden üretilir
            const key = 'admin_boot_' + crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
            if (!forceReset) {
                const done = await db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(key);
                if (done) continue;
            }
            await ensureOneAdmin(db, email, password, email === single ? hint : '');
            await db.prepare(
                "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value"
            ).run(key);
        } catch (err) {
            console.error(`[admin] ${email} için yönetici hesabı oluşturulamadı:`, err);
        }
    }
}

/**
 * Eski sürümün seed'i herkesin bildiği hesaplar oluşturuyordu (admin@aerotoon.vercel.app / admin123 ve
 * user@aerotoon.vercel.app / user123). Veritabanı daha önce bu eski kodla ilk kez çalıştırıldıysa bu
 * hesaplar hâlâ orada duruyor olabilir. Şifresi HÂLÂ o bilinen değerse hesabı kilitler: şifreyi rastgele
 * yapar, yönetici yetkisini alır ve e-postasını değiştirir. Şifresini sen değiştirmişsen dokunmaz.
 */
async function lockLegacyDefaultAccounts(db) {
    const legacy = [
        ['admin@aerotoon.vercel.app', 'admin123'],
        ['user@aerotoon.vercel.app', 'user123'],
        // .env.example'daki örnek yönetici bilgileri (yanlışlıkla olduğu gibi deploy edildiyse)
        ['senin-eposta@ornek.com', 'EN_AZ_10_KARAKTERLIK_GUCLU_BIR_SIFRE'],
    ];
    for (const [email, knownPassword] of legacy) {
        try {
            const row = await db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
            if (!row || !verifyPassword(knownPassword, row.password_hash)) continue;
            await db.prepare("UPDATE users SET password_hash = ?, role = 'user', email = ? WHERE id = ?")
                .run(hashPassword(crypto.randomBytes(24).toString('hex')), `kilitli-${row.id}@disabled.invalid`, row.id);
            console.warn(`[admin] eski varsayılan hesap kilitlendi: ${email}`);
        } catch (err) {
            console.error('[admin] eski varsayılan hesap kontrolü başarısız:', err);
        }
    }
}

export async function seedDatabase(db) {
    await lockLegacyDefaultAccounts(db);
    await ensureAdminFromEnv(db);

    // Demo içerik yalnızca isteyen açar ve yalnızca hiç seri yokken eklenir.
    if (process.env.SEED_DEMO_DATA !== '1') return;

    const existingSeries = await db.prepare('SELECT COUNT(*) as count FROM series').get();
    if (existingSeries.count > 0) return;

    // Demo kullanıcılar — şifreleri rastgele, kimse bu hesaplarla giriş yapamaz
    const demoUsers = [
        ['manga_lover', 'manga_lover@demo.invalid'],
        ['demo_reader', 'demo_reader@demo.invalid'],
    ];
    const demoIds = [];
    for (const [username, email] of demoUsers) {
        const hash = hashPassword(crypto.randomBytes(24).toString('hex'));
        await db.prepare(
            'INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
        ).run(username, email, hash, 'user');
        const row = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (row) demoIds.push(row.id);
    }

    // Insert demo series
    const seriesData = [
        {
            title: 'Shadow Ronin',
            description: 'In a war-torn feudal land, a disgraced samurai known only as "The Shadow" walks the path of redemption. After losing everything — his clan, his honor, and the woman he loved — he picks up his broken blade one last time. Each enemy he faces mirrors a piece of his fractured soul. This is not a story of glory, but of a man who must confront the darkness within to find a reason to keep fighting.',
            cover_url: '/demo/cover1.jpg',
            author: 'Takeshi Yamamoto',
            artist: 'Yuki Tanaka',
            status: 'ongoing',
            genres: '["Action", "Drama", "Historical"]',
            rating: 4.8,
            views: 128500
        },
        {
            title: 'Neon Abyss',
            description: 'In the sprawling cyberpunk megacity of Neo-Osaka, a teenage hacker named Rei discovers a hidden layer of the internet where forgotten AIs have built their own civilization. When a mega-corporation threatens to erase this digital world, Rei must jack in, form alliances with sentient programs, and fight to protect a consciousness born from code.',
            cover_url: '/demo/cover2.jpg',
            author: 'Hiroshi Sato',
            artist: 'Mika Aoyama',
            status: 'ongoing',
            genres: '["Sci-Fi", "Action", "Thriller"]',
            rating: 4.6,
            views: 95200
        },
        {
            title: 'Bloom of the Forgotten',
            description: 'Every spring, a mysterious cherry blossom tree blooms in the courtyard of an abandoned shrine. Those who see it in full bloom are shown the memories of spirits trapped between worlds. A quiet shrine maiden named Hana takes it upon herself to listen to these spirits and help them find peace — but each story she uncovers brings her closer to a tragic secret about her own family.',
            cover_url: '/demo/cover3.jpg',
            author: 'Sakura Mishima',
            artist: 'Ren Fujimoto',
            status: 'completed',
            genres: '["Fantasy", "Drama", "Supernatural"]',
            rating: 4.9,
            views: 204300
        },
        {
            title: 'Titan Academy',
            description: 'In a world where ancient beast bloodlines resurface in select teenagers, the government gathers these "Hybrids" into an elite academy. Kaito, a quiet loner, discovers he carries the bloodline of the mythical Raijū — the thunder beast. At the academy, alliances form, rivalries ignite, and a conspiracy threatens to weaponize the students for war.',
            cover_url: '/demo/cover4.jpg',
            author: 'Kenji Morita',
            artist: 'Akira Hayashi',
            status: 'ongoing',
            genres: '["Action", "School", "Supernatural"]',
            rating: 4.5,
            views: 76800
        },
        {
            title: 'Void Walker',
            description: 'After a failed experiment tears a hole between dimensions, physicist Dr. Sora Ito is pulled into the Void — a realm between realities. There, she discovers fragments of destroyed worlds and the remnants of their civilizations. To find her way home, she must piece together the truth about the catastrophe and face the entity that devours worlds.',
            cover_url: '/demo/cover5.jpg',
            author: 'Naomi Kuroda',
            artist: 'Daichi Suzuki',
            status: 'ongoing',
            genres: '["Sci-Fi", "Mystery", "Adventure"]',
            rating: 4.7,
            views: 112400
        },
        {
            title: 'The Last Alchemist',
            description: 'In a medieval kingdom where alchemy was once the foundation of civilization, the art has been outlawed after a catastrophic event known as "The Great Transmutation." The last living alchemist, a young woman named Elara, must hide her abilities while searching for the Philosopher\'s Stone — the only thing that can undo the damage and restore the balance of the world.',
            cover_url: '/demo/cover6.jpg',
            author: 'Yui Nakamura',
            artist: 'Kenta Ogawa',
            status: 'ongoing',
            genres: '["Fantasy", "Adventure", "Mystery"]',
            rating: 4.4,
            views: 67900
        }
    ];

    for (const s of seriesData) {
        const result = await db.prepare(
            'INSERT INTO series (title, description, cover_url, author, artist, status, genres, rating, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(s.title, s.description, s.cover_url, s.author, s.artist, s.status, s.genres, s.rating, s.views);

        // Add demo chapters for each series
        const chapterCount = Math.floor(Math.random() * 5) + 3;
        for (let i = 1; i <= chapterCount; i++) {
            await db.prepare(
                'INSERT INTO chapters (series_id, chapter_number, title) VALUES (?, ?, ?)'
            ).run(result.lastInsertRowid, i, `Chapter ${i}`);
        }
    }

    // Add some demo comments
    const chapters = await db.prepare('SELECT id FROM chapters LIMIT 3').all();
    if (chapters.length > 0 && demoIds.length > 0) {
        const [userA, userB = demoIds[0]] = demoIds;
        const demoComments = [
            { userId: userB, content: 'This manga is absolutely incredible! The art style is breathtaking 🔥' },
            { userId: userA, content: 'The translation quality is so good, feels like reading the original!' },
            { userId: userB, content: 'Can\'t wait for the next chapter, this cliffhanger is killing me 😭' },
        ];

        for (const comment of demoComments) {
            const commentResult = await db.prepare(
                'INSERT INTO comments (user_id, chapter_id, content) VALUES (?, ?, ?)'
            ).run(comment.userId, chapters[0].id, comment.content);

            await db.prepare(
                'INSERT OR IGNORE INTO reactions (user_id, comment_id, emoji) VALUES (?, ?, ?)'
            ).run(userA, commentResult.lastInsertRowid, '❤️');
            await db.prepare(
                'INSERT OR IGNORE INTO reactions (user_id, comment_id, emoji) VALUES (?, ?, ?)'
            ).run(userB, commentResult.lastInsertRowid, '👍');
        }
    }

    console.log('✅ Database seeded with demo data');
}
