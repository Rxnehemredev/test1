import { generateSlug } from './slug.js';

/**
 * v3 tek seferlik temizlik: Mağaza kaldırıldı — eski çerçeve/unvan/rozet
 * tablolarını ve kullanıcılardaki kuşanım referanslarını sil.
 */
export async function removeShopFeature(db) {
  try { await db.exec('DROP TABLE IF EXISTS shop_items'); } catch (e) { console.error(e.message); }
  try { await db.exec('DROP TABLE IF EXISTS user_purchases'); } catch (e) { console.error(e.message); }
  try {
    await db.prepare('UPDATE users SET equipped_frame_id = NULL, equipped_title_id = NULL, equipped_badge_id = NULL').run();
  } catch (e) { console.error(e.message); }
}

export async function migrateDatabase(db) {
  // FIX: users tablosundaki kritik kolonlar (özellikle activity_points) artık
  // fonksiyonun EN BAŞINDA, KENDİ try/catch'i içinde çalışıyor. Önceden bu blok
  // fonksiyonun ortasındaydı ve tek bir dış try/catch tüm migration'ı sarıyordu;
  // yukarıdaki (comments/series) adımlardan biri hata fırlatırsa buraya hiç
  // ulaşılmadan migration sessizce kesiliyor, ama schema_meta yine de "tamamlandı"
  // olarak işaretleniyordu — bu yüzden activity_points hiç eklenmemiş olabiliyordu.
  try {
    const userCols = await db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.find(c => c.name === 'yomi_points')) {
      await db.exec('ALTER TABLE users ADD COLUMN yomi_points INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'last_daily_login')) {
      await db.exec('ALTER TABLE users ADD COLUMN last_daily_login DATETIME DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'last_avatar_update')) {
      await db.exec('ALTER TABLE users ADD COLUMN last_avatar_update DATETIME DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'cover_url')) {
      await db.exec('ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'last_cover_update')) {
      await db.exec('ALTER TABLE users ADD COLUMN last_cover_update DATETIME DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'avatar_changes_today')) {
      await db.exec('ALTER TABLE users ADD COLUMN avatar_changes_today INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'cover_changes_today')) {
      await db.exec('ALTER TABLE users ADD COLUMN cover_changes_today INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'display_name')) {
      await db.exec('ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT NULL');
    }
    // FIX: /api/users/[username] route'u bio kolonunu sorguluyordu ama bu kolon
    // hiçbir yerde (ne CREATE TABLE'da ne eski migration'larda) oluşturulmamıştı.
    // Sonuç: HER kullanıcı profil sayfası "no such column: bio" hatasıyla 500
    // dönüyor ve "Profil yüklenemedi" mesajı çıkıyordu.
    if (!userCols.find(c => c.name === 'bio')) {
      await db.exec('ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL');
    }

    // Migration: 2FA (TOTP) kolonları — madde 12 (admin panel açık erişim) önlemi.
    // totp_secret: authenticator app'e bağlanan gizli anahtar (base32).
    // totp_enabled: 1 ise kullanıcı girişte 2. adım (6 haneli kod) sorulur.
    // totp_backup_codes: JSON dizi halinde sha256 hash'lenmiş tek kullanımlık yedek kodlar.
    if (!userCols.find(c => c.name === 'totp_secret')) {
      await db.exec('ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL');
    }
    if (!userCols.find(c => c.name === 'totp_enabled')) {
      await db.exec('ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0');
    }
    if (!userCols.find(c => c.name === 'totp_backup_codes')) {
      await db.exec('ALTER TABLE users ADD COLUMN totp_backup_codes TEXT DEFAULT NULL');
    }

    // Migration: Activity Points (rütbe puanı) — yomi_points'ten AYRI.
    // yomi_points = kumar oyunlarında kazanılıp/harcanan bahis bakiyesi (şans faktörü var).
    // activity_points = SADECE düzenli, gerçek katılımdan artan puan (günlük giriş, görev, bölüm okuma, yorum).
    // Kumar oyunları activity_points'e ASLA dokunmaz; rütbe/liderlik tablosu şansla değil sürekli katılımla belirlenir.
    if (!userCols.find(c => c.name === 'activity_points')) {
      await db.exec('ALTER TABLE users ADD COLUMN activity_points INTEGER DEFAULT 0');
      // Tek seferlik adil geriye dönük doldurma: mevcut kullanıcıların (kumar hariç) geçmiş
      // katkılarını yaklaşık olarak activity_points'e aktar, herkesi sıfırdan başlatma.
      try {
        await db.exec(`
          UPDATE users SET activity_points = (
            COALESCE((SELECT COUNT(*) FROM read_history WHERE read_history.user_id = users.id), 0) * 2
            + COALESCE(users.login_streak, 0) * 10
            + COALESCE((SELECT COUNT(*) FROM comments WHERE comments.user_id = users.id), 0) * 5
          )
        `);
      } catch (e) { /* read_history/comments tabloları henüz yoksa sessizce geç */ }
    }
  } catch (e) {
    console.error('KRİTİK: users kolon migration hatası (activity_points dahil):', e.message);
  }

  // AI Blog sistemi: seri eklendiğinde otomatik SEO blog yazısı oluşturmak için
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER,
        chapter_id INTEGER DEFAULT NULL,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        cover_url TEXT,
        meta_description TEXT,
        status TEXT DEFAULT 'published',
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
      )
    `);
    await db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_series ON blogs(series_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug)');

    // Migration: chapter_id — bölüm-özel blog yazıları için (madde: "genel blog otomasyonu")
    try {
      await db.exec('ALTER TABLE blogs ADD COLUMN chapter_id INTEGER DEFAULT NULL');
    } catch (e) { /* kolon zaten varsa yoksay */ }
    await db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_chapter ON blogs(chapter_id)');

    // Migration: blog_queue — arka planda, oran limitine takılmadan yavaş yavaş
    // (cron ile) işlenecek blog üretim kuyruğu. kind: 'series' | 'chapter' | 'topic'.
    await db.exec(`
      CREATE TABLE IF NOT EXISTS blog_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        series_id INTEGER DEFAULT NULL,
        chapter_id INTEGER DEFAULT NULL,
        topic TEXT DEFAULT NULL,
        status TEXT DEFAULT 'pending',
        error TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME DEFAULT NULL
      )
    `);
    await db.exec('CREATE INDEX IF NOT EXISTS idx_blog_queue_status ON blog_queue(status, created_at)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_status_created ON blogs(status, created_at)');

    // Migration: blog_tags + blog_tag_map — etiket (tag) sistemi.
    // /etiket/[slug] sayfaları hem SEO hem de keyword targeting için kritik.
    // ragnarscans.net/tag/[...] yaklaşımının Next.js karşılığı.
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS blog_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug)');

      await db.exec(`
        CREATE TABLE IF NOT EXISTS blog_tag_map (
          blog_id INTEGER NOT NULL,
          tag_id  INTEGER NOT NULL,
          PRIMARY KEY (blog_id, tag_id),
          FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id)  REFERENCES blog_tags(id) ON DELETE CASCADE
        )
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_blog_tag_map_tag ON blog_tag_map(tag_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_blog_tag_map_blog ON blog_tag_map(blog_id)');
    } catch (e) {
      console.error('blog_tags migration hatası:', e.message);
    }
  } catch (e) {
    console.error('blogs tablosu migration hatası:', e.message);
  }

  try {
    const cols = await db.prepare("PRAGMA table_info(comments)").all();
    const hasSeries = cols.find(c => c.name === 'series_id');
    const chapterCol = cols.find(c => c.name === 'chapter_id');

    // Need full table recreation if chapter_id is NOT NULL or series_id missing
    if (!hasSeries || (chapterCol && chapterCol.notnull)) {
      await db.exec(`
                CREATE TABLE IF NOT EXISTS comments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    chapter_id INTEGER DEFAULT NULL,
                    series_id INTEGER DEFAULT NULL,
                    content TEXT NOT NULL,
                    parent_id INTEGER DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
                    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
                    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
                );
                INSERT OR IGNORE INTO comments_new (id, user_id, chapter_id, content, parent_id, created_at)
                    SELECT id, user_id, chapter_id, content, parent_id, created_at FROM comments;
                DROP TABLE comments;
                ALTER TABLE comments_new RENAME TO comments;
            `);
    }

    // Migration: add published and slug columns to series
    const seriesCols = await db.prepare("PRAGMA table_info(series)").all();
    if (!seriesCols.find(c => c.name === 'published')) {
      await db.exec('ALTER TABLE series ADD COLUMN published INTEGER DEFAULT 1');
    }
    if (!seriesCols.find(c => c.name === 'type')) {
      await db.exec("ALTER TABLE series ADD COLUMN type TEXT DEFAULT 'manga'");
    }
    if (!seriesCols.find(c => c.name === 'slug')) {
      await db.exec('ALTER TABLE series ADD COLUMN slug TEXT DEFAULT NULL');
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_series_slug ON series(slug)');
      // Backfill slugs for existing series
      const allSeries = await db.prepare('SELECT id, title FROM series').all();
      for (const s of allSeries) {
        let base = generateSlug(s.title);
        if (!base) base = `series-${s.id}`;
        let slug = base;
        let counter = 1;
        while (await db.prepare('SELECT id FROM series WHERE slug = ? AND id != ?').get(slug, s.id)) {
          slug = `${base}-${counter++}`;
        }
        await db.prepare('UPDATE series SET slug = ? WHERE id = ?').run(slug, s.id);
      }
    }

    // Migration: create series_views_log table if it doesn't exist (without viewer_hash — added below)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS series_views_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_series_views_log_series ON series_views_log(series_id);
      CREATE INDEX IF NOT EXISTS idx_series_views_log_date ON series_views_log(created_at);
    `);

    // Migration: add viewer_hash column to series_views_log if missing (MUST be separate — table may already exist without it)
    const viewsLogCols = await db.prepare("PRAGMA table_info(series_views_log)").all();
    if (!viewsLogCols.find(c => c.name === 'viewer_hash')) {
      await db.exec('ALTER TABLE series_views_log ADD COLUMN viewer_hash TEXT DEFAULT NULL');
    }
    // Create viewer index only AFTER ensuring column exists
    await db.exec('CREATE INDEX IF NOT EXISTS idx_series_views_log_viewer ON series_views_log(series_id, viewer_hash, created_at)');

    // Migration: create announcements table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        link_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Read History (to prevent farming points from same chapter)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS read_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        UNIQUE(user_id, chapter_id)
      );
    `);

    // Reading History (tracks last-read chapter per user for "Continue Reading")
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reading_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        UNIQUE(user_id, chapter_id)
      );
    `);

    // Server-Side Series Reactions
    await db.exec(`
      CREATE TABLE IF NOT EXISTS series_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id, emoji)
      );
    `);

    // Notifications table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'reply',
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    `);

    // Quest progress tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS quest_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quest_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        quest_date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, quest_id, quest_date)
      );
    `);

    // Global App Settings
    await db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
      );
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_enabled', '0');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_text', 'Support us to keep the servers alive!');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('paypal_url', '');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('kofi_url', '');
    `);

    // Scraper system tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS scraper_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        source_url TEXT NOT NULL,
        source_site TEXT,
        last_checked DATETIME DEFAULT NULL,
        auto_sync INTEGER DEFAULT 1,
        last_chapter_found REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS scraper_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        source_url TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        chapters_found INTEGER DEFAULT 0,
        chapters_imported INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS scraper_pending_chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        job_id INTEGER,
        chapter_number REAL NOT NULL,
        chapter_title TEXT,
        source_url TEXT,
        pages_json TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_scraper_pending_series ON scraper_pending_chapters(series_id, status);
      CREATE INDEX IF NOT EXISTS idx_scraper_sources_series ON scraper_sources(series_id);
    `);

    // Migration: add language column to scraper_sources
    const scraperSourceCols = await db.prepare("PRAGMA table_info(scraper_sources)").all();
    if (!scraperSourceCols.find(c => c.name === 'language')) {
      await db.exec("ALTER TABLE scraper_sources ADD COLUMN language TEXT DEFAULT 'en'");
    }

    // Feature: Reading List (Okuma Listesi) — Okuyorum / Bitti / Plan
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reading_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        series_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'plan',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        UNIQUE(user_id, series_id)
      );
      CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON reading_lists(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_reading_lists_series ON reading_lists(series_id);
    `);

    // Feature: User Badges / Achievements
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_id TEXT NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, badge_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
    `);

    // Feature: add is_spoiler column to comments
    const commentCols2 = await db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols2.find(c => c.name === 'is_spoiler')) {
      await db.exec('ALTER TABLE comments ADD COLUMN is_spoiler INTEGER DEFAULT 0');
    }

    // Feature: soft-delete and edit tracking for comments
    const commentCols3 = await db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols3.find(c => c.name === 'is_deleted')) {
      await db.exec('ALTER TABLE comments ADD COLUMN is_deleted INTEGER DEFAULT 0');
    }
    if (!commentCols3.find(c => c.name === 'edited_at')) {
      await db.exec('ALTER TABLE comments ADD COLUMN edited_at TEXT');
    }

    // Performance: clean up old series_views_log entries (keep only last 7 days)
    // This prevents the table from growing indefinitely and slowing down the trending query
    try {
      await db.prepare("DELETE FROM series_views_log WHERE created_at < datetime('now', '-7 days')").run();
    } catch {}

    // Fix: remove duplicate scraper_pending_chapters (keep the one with lowest id per series+chapter_number)
    try {
      await db.exec(`
        DELETE FROM scraper_pending_chapters
        WHERE id NOT IN (
          SELECT MIN(id) FROM scraper_pending_chapters
          GROUP BY series_id, chapter_number
        )
      `);
    } catch {}

    // Custom Pages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS custom_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        show_in_footer INTEGER DEFAULT 1,
        show_in_navbar INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Default menu settings
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('navbar_menu', '[{"label":"Ana Sayfa","url":"/"},{"label":"Göz At","url":"/series"},{"label":"Sıralama","url":"/ranking"},{"label":"İstekler","url":"/requests"}]');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('footer_menu', '[{"label":"Gizlilik Politikası","url":"/privacy"},{"label":"Kullanım Koşulları","url":"/terms"},{"label":"Göz At","url":"/series"}]');
    `);
    // Daha önce İngilizce varsayılanlarla oluşturulmuş menü kayıtlarını da
    // Türkçeleştir; yönetici tarafından özelleştirilmiş menülere dokunma.
    await db.prepare(
      `UPDATE app_settings SET setting_value = ?
       WHERE setting_key = 'navbar_menu'
         AND setting_value = '[{"label":"Home","url":"/"},{"label":"Browse","url":"/series"},{"label":"Ranking","url":"/ranking"},{"label":"Requests","url":"/requests"}]'`
    ).run('[{"label":"Ana Sayfa","url":"/"},{"label":"Göz At","url":"/series"},{"label":"Sıralama","url":"/ranking"},{"label":"İstekler","url":"/requests"}]');
    await db.prepare(
      `UPDATE app_settings SET setting_value = ?
       WHERE setting_key = 'footer_menu'
         AND setting_value = '[{"label":"Privacy Policy","url":"/privacy"},{"label":"Terms & Conditions","url":"/terms"},{"label":"Browse","url":"/series"}]'`
    ).run('[{"label":"Gizlilik Politikası","url":"/privacy"},{"label":"Kullanım Koşulları","url":"/terms"},{"label":"Göz At","url":"/series"}]');

    // Seed built-in pages (Privacy Policy & Terms) into custom_pages so admin can edit them
    const privacyContent = '<h2>1. Information We Collect</h2><p>When you create an account, we collect your username, email address, and an encrypted version of your password. We do not store passwords in plain text.</p><h2>2. How We Use Your Information</h2><p>We use your information to provide and maintain your account, enable you to save favorites and reading progress, and improve our services.</p><h2>3. Data Storage &amp; Security</h2><p>Your data is stored securely. Passwords are hashed using bcrypt, authentication uses JWT tokens with 7-day expiry, and all connections are encrypted via HTTPS in production.</p><h2>4. Cookies &amp; Local Storage</h2><p>We use browser local storage to maintain your login session. We do not use tracking cookies or third-party analytics.</p><h2>5. Your Rights</h2><p>You may access, update, or request deletion of your personal data by contacting the administrator.</p><h2>6. Contact</h2><p>If you have questions about this privacy policy, please contact the site administrator.</p>';
    const termsContent = '<h2>1. Acceptance of Terms</h2><p>By accessing and using this site, you agree to be bound by these Terms and Conditions.</p><h2>2. User Accounts</h2><ul><li>You must provide accurate information when creating an account</li><li>You are responsible for maintaining the security of your account credentials</li><li>You must be at least 13 years old to create an account</li></ul><h2>3. Acceptable Use</h2><p>You agree not to upload infringing content, use the service for illegal purposes, or abuse other users.</p><h2>4. Comments &amp; Community</h2><p>We reserve the right to remove any comments that violate our acceptable use policy.</p><h2>5. Limitation of Liability</h2><p>The service is provided as-is without warranties. We are not liable for any damages arising from use of the service.</p><h2>6. Contact</h2><p>For questions about these terms, please contact the site administrator.</p>';

    try {
      await db.prepare("INSERT OR IGNORE INTO custom_pages (slug, title, content, is_active, show_in_footer, show_in_navbar) VALUES ('privacy', 'Privacy Policy', ?, 1, 1, 0)").run(privacyContent);
      await db.prepare("INSERT OR IGNORE INTO custom_pages (slug, title, content, is_active, show_in_footer, show_in_navbar) VALUES ('terms', 'Terms & Conditions', ?, 1, 1, 0)").run(termsContent);
    } catch {}

    // Migration: banned_until kolonu — SQLite ALTER TABLE IF NOT EXISTS desteklemez, try/catch kullan
    try {
      await db.exec(`ALTER TABLE users ADD COLUMN banned_until TEXT DEFAULT NULL`);
    } catch (e) {
      // Kolon zaten varsa hata görmezden gel
    }

    // Migration: is_adult kolonu — yetişkin içerik işaretlemesi
    try {
      await db.exec(`ALTER TABLE series ADD COLUMN is_adult INTEGER DEFAULT 0`);
    } catch (e) {
      // Kolon zaten varsa hata görmezden gel
    }

    // Migration: /tur/[genre] sayfaları için indeks. `genres LIKE '%"X"%'`
    // baştan joker (%) içerdiğinden bir B-tree indeksi tam kullanamaz,
    // ama (published, id) composite'i WHERE published=1 filtresini ve
    // ORDER BY id DESC'i hızlandırır — sorgunun LIKE kısmı hariç geri
    // kalanı index-only'e yakın çalışır. Seri sayısı büyüyüp gerçek
    // fayda gerekirse ayrı bir series_genres junction tablosuna
    // geçilebilir (şimdilik gerekli değil).
    try {
      await db.exec('CREATE INDEX IF NOT EXISTS idx_series_published_id ON series(published, id DESC)');
    } catch (e) { /* yoksay */ }

    // Migration: bug_reports table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Migration: add content column to chapters (for novels)
    const chapterCols = await db.prepare("PRAGMA table_info(chapters)").all();
    if (!chapterCols.find(c => c.name === 'content')) {
      await db.exec('ALTER TABLE chapters ADD COLUMN content TEXT DEFAULT NULL');
    }

    // Migration: add views column to chapters
    if (!chapterCols.find(c => c.name === 'views')) {
      await db.exec('ALTER TABLE chapters ADD COLUMN views INTEGER DEFAULT 0');
    }

    // Migration: create chapter_views_log table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chapter_views_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_id INTEGER NOT NULL,
        viewer_hash TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chapter_views_log_chapter ON chapter_views_log(chapter_id, viewer_hash, created_at);
    `);

    // Migration: add paragraph_index column to comments (for novel inline comments)
    const commentCols = await db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols.find(c => c.name === 'paragraph_index')) {
      await db.exec('ALTER TABLE comments ADD COLUMN paragraph_index INTEGER DEFAULT NULL');
    }

    // Feature: add is_pinned column to comments (for admin pinning)
    if (!commentCols.find(c => c.name === 'is_pinned')) {
      await db.exec('ALTER TABLE comments ADD COLUMN is_pinned INTEGER DEFAULT 0');
    }

    // Seed default settings for Discord and Bug Report
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_enabled', '0');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_url', '');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('bug_report_enabled', '0');
    `);

    // Migration: series_reactions tablosuna chapter_id eklendi — bölüm bazlı bağımsız tepkiler
    // Eski UNIQUE(series_id, user_id, emoji) kısıtı chapter bazlı kayıtları engelliyor;
    // tabloyu yeniden oluşturarak doğru kısıtı uyguluyoruz.
    try {
      const srCols = await db.prepare("PRAGMA table_info(series_reactions)").all();
      if (!srCols.find(c => c.name === 'chapter_id')) {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS series_reactions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            series_id INTEGER NOT NULL,
            chapter_id INTEGER DEFAULT NULL,
            user_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(series_id, chapter_id, user_id)
          );
          INSERT OR IGNORE INTO series_reactions_new (id, series_id, chapter_id, user_id, emoji, created_at)
            SELECT id, series_id, NULL, user_id, emoji, created_at FROM series_reactions;
          DROP TABLE series_reactions;
          ALTER TABLE series_reactions_new RENAME TO series_reactions;
        `);
      }
    } catch (e) { console.error('series_reactions migration error:', e.message); }

    // Feature: User Ratings — kullanıcılar seriye 1-10 puan verebilir
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_ratings_series ON user_ratings(series_id);
      CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id);
    `);

    // Migration: publish_at — zamanlayıcılı bölüm yayınlama
    const chapterColsCheck = await db.prepare("PRAGMA table_info(chapters)").all();
    if (!chapterColsCheck.find(c => c.name === 'publish_at')) {
      await db.exec('ALTER TABLE chapters ADD COLUMN publish_at DATETIME DEFAULT NULL');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_chapters_publish_at ON chapters(publish_at)');
    }
    // Bu index publish_at sütununa bağımlı olduğu için sütun kesin var olduktan sonra oluşturuluyor
    await db.exec('CREATE INDEX IF NOT EXISTS idx_chapters_series_publish ON chapters(series_id, publish_at, chapter_number DESC)');

    // Migration: user_activity_log — kullanıcı etkinlik takibi
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id, created_at);
    `);

    // Migration: site_traffic_log — site trafik izleme
    await db.exec(`
      CREATE TABLE IF NOT EXISTS site_traffic_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        visitor_hash TEXT,
        referrer TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_traffic_created ON site_traffic_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_traffic_path ON site_traffic_log(path, created_at);
    `);

    // Migration: known_visitors — bir IP'nin siteye daha önce hiç girip girmediğini
    // kalıcı olarak takip eder (site_traffic_log 7 günde bir temizlendiği için ona
    // güvenilemez). "İlk kez giren kullanıcıya hoş geldin ekranı" özelliği bunu kullanır.
    await db.exec(`
      CREATE TABLE IF NOT EXISTS known_visitors (
        ip_hash TEXT PRIMARY KEY,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: custom_genres — özel tür yönetimi
    await db.exec(`
      CREATE TABLE IF NOT EXISTS custom_genres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed: show_stats_bar default setting
    await db.exec(`INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('show_stats_bar', '1')`);

    // Migration: add chapter_id and series_id to bug_reports for chapter-level reporting
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN chapter_id INTEGER DEFAULT NULL`);
    } catch { /* column already exists */ }
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN series_id INTEGER DEFAULT NULL`);
    } catch { /* column already exists */ }

    // Migration: add type and comment_id columns to bug_reports for comment reports
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN type TEXT DEFAULT 'bug'`);
    } catch { /* column already exists */ }
    try {
      await db.exec(`ALTER TABLE bug_reports ADD COLUMN comment_id INTEGER DEFAULT NULL`);
    } catch { /* column already exists */ }

    // Migration: Okuyucu Destek Kartı ayarları
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_enabled', '0');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_text', 'Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor. Keyif aldıysan, küçük bir desteğin yeni bölümlerin gelmesine katkı sağlar.');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_url', '#');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reader_support_button_text', 'Destek Ol');
    `);

    // Migration: Son Güncellemeler sayfalama ayarı
    await db.exec(`INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('updates_per_page', '16')`);

    // Migration: Bölüm thumbnail desteği
    try { await db.exec(`ALTER TABLE chapters ADD COLUMN thumbnail_url TEXT DEFAULT NULL`); } catch {}
    await db.exec(`INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('chapter_thumbnails_enabled', '0')`);

    // Migration: Dış bağlantılı (URL) bölüm desteği — başka bir ekip tarafından yapılmış
    // bölümleri sayfa yüklemeden, sadece yönlendirme olarak eklemek için
    try { await db.exec(`ALTER TABLE chapters ADD COLUMN external_url TEXT DEFAULT NULL`); } catch {}
    try { await db.exec(`ALTER TABLE chapters ADD COLUMN external_note TEXT DEFAULT NULL`); } catch {}
    await db.exec(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('external_redirect_message', 'Bu bölüm başka bir ekip tarafından hazırlanmıştır. Onları desteklemek için ilgili siteye yönlendiriliyorsunuz. Eğer ekibin sitesi kapandıysa, en az reklam barındıran alternatif bir kaynağa yönlendiriliyorsunuz.');
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('external_redirect_button_text', 'Siteye Git');
    `);

    // ── Aşama 3: Veri Temizliği / Data Retention ──────────────────────────
    // notifications: 90 günden eski bildirimleri sil
    try {
      await db.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-90 days')").run();
    } catch {}

    // quest_progress: 30 günden eski görev kayıtlarını sil
    try {
      await db.prepare("DELETE FROM quest_progress WHERE quest_date < date('now', '-30 days')").run();
    } catch {}

    // chapter_views_log: 7 günden eski görüntüleme loglarını sil (series_views_log gibi)
    try {
      await db.prepare("DELETE FROM chapter_views_log WHERE created_at < datetime('now', '-7 days')").run();
    } catch {}

    // user_activity_log: 30 günden eski aktivite loglarını sil
    try {
      await db.prepare("DELETE FROM user_activity_log WHERE created_at < datetime('now', '-30 days')").run();
    } catch {}

    // site_traffic_log: 7 günden eski trafik loglarını sil
    try {
      await db.prepare("DELETE FROM site_traffic_log WHERE created_at < datetime('now', '-7 days')").run();
    } catch {}

    // ── Aşama 3.5: backups tablosu ───────────────────────────────────────
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          created_at DATETIME NOT NULL,
          size INTEGER DEFAULT 0,
          series_count INTEGER DEFAULT 0,
          chapters_count INTEGER DEFAULT 0,
          users_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          data TEXT NOT NULL
        )
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at)');
    } catch (e) { console.error('backups tablosu oluşturulamadı:', e.message); }

    // ── Aşama 4: SQLite WAL checkpoint — Turso'da anlamsız, no-op ───────────
    try {
      await db.pragma('wal_checkpoint(TRUNCATE)');
    } catch {}

  } catch (e) { console.error('Migration error:', e.message); }
}
