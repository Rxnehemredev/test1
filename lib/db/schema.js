/**
 * ══════════════════════════════════════════════════════════════════════════
 * BASELINE DATABASE SCHEMA (initializeDatabase)
 * ══════════════════════════════════════════════════════════════════════════
 */

export async function initializeDatabase(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT DEFAULT '/default-avatar.png',
      role TEXT DEFAULT 'user',
      yomi_points INTEGER DEFAULT 0,
      last_daily_login DATETIME DEFAULT NULL,
      last_avatar_update DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      cover_url TEXT,
      author TEXT,
      artist TEXT,
      status TEXT DEFAULT 'ongoing',
      genres TEXT DEFAULT '[]',
      rating REAL DEFAULT 0,
      views INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      type TEXT DEFAULT 'manga',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      chapter_number REAL NOT NULL,
      title TEXT,
      content TEXT DEFAULT NULL,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      page_number INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS upload_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_upload_chunks_file ON upload_chunks(file_id);

    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      language_code TEXT NOT NULL,
      translated_image_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      UNIQUE(page_id, language_code)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chapter_id INTEGER DEFAULT NULL,
      series_id INTEGER DEFAULT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      paragraph_index INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      comment_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      UNIQUE(user_id, comment_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      series_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
      UNIQUE(user_id, series_id)
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      page_number INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      UNIQUE(user_id, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      service TEXT NOT NULL DEFAULT 'torii',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS series_views_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      viewer_hash TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      link_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bug_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT
    );
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_enabled', '0');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('donation_text', 'Support us to keep the servers alive!');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('paypal_url', '');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('kofi_url', '');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_enabled', '0');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('discord_url', '');
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('bug_report_enabled', '0');

    -- Performance indices
    CREATE INDEX IF NOT EXISTS idx_chapters_series ON chapters(series_id);
    CREATE INDEX IF NOT EXISTS idx_pages_chapter ON pages(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_translations_page ON translations(page_id);
    CREATE INDEX IF NOT EXISTS idx_translations_lang ON translations(page_id, language_code);
    CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_comments_series ON comments(series_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_series ON favorites(series_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id);
    CREATE INDEX IF NOT EXISTS idx_series_published ON series(published);
    CREATE INDEX IF NOT EXISTS idx_series_views_log_series ON series_views_log(series_id);
    CREATE INDEX IF NOT EXISTS idx_series_views_log_date ON series_views_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_series_created_at ON series(created_at);
    CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);
    CREATE INDEX IF NOT EXISTS idx_chapters_series_id ON chapters(series_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_created_at ON chapters(created_at);
    CREATE INDEX IF NOT EXISTS idx_chapters_chapter_number ON chapters(chapter_number);
    CREATE INDEX IF NOT EXISTS idx_comments_series_id ON comments(series_id);
    CREATE INDEX IF NOT EXISTS idx_comments_chapter_id ON comments(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

    -- Ek performans index'leri
    CREATE INDEX IF NOT EXISTS idx_series_published_views ON series(published, views DESC);
    CREATE INDEX IF NOT EXISTS idx_series_type_status ON series(type, status, published);
    CREATE INDEX IF NOT EXISTS idx_comments_chapter_parent ON comments(chapter_id, parent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_series_parent ON comments(series_id, parent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);
    -- Bileşik index: ana seri listesi WHERE published=1 ORDER BY created_at DESC için
    CREATE INDEX IF NOT EXISTS idx_series_published_created ON series(published, created_at DESC);
    -- Bileşik index: latest-updates MAX(ch.created_at) GROUP BY series_id için
    CREATE INDEX IF NOT EXISTS idx_chapters_series_created ON chapters(series_id, created_at DESC);
    -- Bileşik index: seri detail yorum sayısı JOIN sorgusu için
    CREATE INDEX IF NOT EXISTS idx_comments_chapter_notNull ON comments(chapter_id) WHERE chapter_id IS NOT NULL;
  `);

  // Migration: deleted_default_genres table (tracks which built-in genres were removed)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS deleted_default_genres (
      name TEXT PRIMARY KEY,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add login_streak to users
  const userColsStreak = await db.prepare("PRAGMA table_info(users)").all();
  if (!userColsStreak.find(c => c.name === 'login_streak')) {
      await db.exec("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0");
  }
  if (!userColsStreak.find(c => c.name === 'last_streak_date')) {
      await db.exec("ALTER TABLE users ADD COLUMN last_streak_date TEXT");
  }

  // admin_logs tablosu
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_username TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
  `);

  // Feature: Çark (wheel of fortune) — tek seferlik anlık çevirme, geçmiş kaydı.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wheel_spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      segment_index INTEGER NOT NULL,
      multiplier REAL NOT NULL,
      payout INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_wheel_spins_user ON wheel_spins(user_id);
  `);

  // Feature: XOX (tic-tac-toe vs bot) — kullanıcı başına 1 aktif tur.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS xox_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      board TEXT NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]',
      status TEXT NOT NULL DEFAULT 'active',
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_xox_rounds_user ON xox_rounds(user_id, status);
  `);

  // Feature: Mayın Tarlası (mines) — 6x6 (36 kare), varsayılan 6 mayın.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS mines_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      grid_size INTEGER NOT NULL DEFAULT 36,
      mine_count INTEGER NOT NULL DEFAULT 6,
      mine_positions TEXT NOT NULL,
      revealed TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_mines_rounds_user ON mines_rounds(user_id, status);
  `);

  // Feature: Slot 777 — tek seferlik anlık çevirme, geçmiş kaydı.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS slot_spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      symbols TEXT NOT NULL,
      payout INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_slot_spins_user ON slot_spins(user_id);
  `);

  // Feature: Blackjack (21) — kullanıcı başına 1 aktif tur, sunucu destesi gizli tutar.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      deck TEXT NOT NULL,
      player_hand TEXT NOT NULL,
      dealer_hand TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      payout INTEGER DEFAULT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_blackjack_rounds_user ON blackjack_rounds(user_id, status);
  `);

  // Feature: Ana sayfadaki genel sohbet — kullanıcıların birbirleriyle canlı
  // (kısa aralıklı polling ile) yazışabildiği tek genel oda.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(id);
  `);
}
