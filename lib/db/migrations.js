import { initializeDatabase } from './schema.js';
import { migrateDatabase, removeShopFeature } from './legacyMigrations.js';

// ══════════════════════════════════════════════════════════════════════════
// VERSIYONLU MIGRATION SİSTEMİ (schema_migrations)
//
// Eski yapı: tek satırlık `schema_meta(version)` + initializeDatabase/migrateDatabase
// içinde 100+ idempotent CREATE/ALTER/PRAGMA kontrolü. Bu kontroller yalnızca
// schema_meta.version < 8 iken çalışıyordu (yani sıcak yolda PRAGMA introspection
// zaten yoktu) ama yeni bir şema değişikliği eklemek "SCHEMA_VERSION'ı artır + 100
// kontrolün TAMAMINI yeniden çalıştır" demekti.
//
// Yeni yapı:
//  • `schema_migrations(version PK, name, applied_at)` — uygulanan her migration bir satır.
//  • v8 = "legacy_baseline": mevcut initializeDatabase + migrateDatabase zinciri TEK
//    BİR migration olarak kabul edilir (içeriği değişmedi; yalnızca bir kez çalışır).
//    Rollback uyumu için `schema_meta` da v8 olarak yazılmaya devam eder.
//  • v9+ : MIGRATIONS dizisindeki küçük, sıralı, tek-seferlik adımlar. Yeni şema
//    değişikliği = dizinin sonuna bir kayıt ekle; PRAGMA introspection yok.
//  • Soğuk başlangıçta (cold start) maliyet: TEK sorgu (`SELECT version FROM
//    schema_migrations`). Hepsi uygulanmışsa başka hiçbir şey çalışmaz.
//  • Eşzamanlı cold start'lar güvenli: migration'lar idempotent yazılır, kayıt
//    `INSERT OR IGNORE` ile yapılır.
//  • Bir migration `false` döndürürse "tamamlanamadı, sonraki başlangıçta tekrar dene"
//    anlamına gelir (kayıt yazılmaz); hata fırlatırsa getDb() reddedilir ve bir sonraki
//    istekte yeniden denenir.
// ══════════════════════════════════════════════════════════════════════════
export const LEGACY_BASELINE_VERSION = 8; // v8: backups tablosu eklendi — yedekler artık dosya sistemine değil Turso'ya yazılıyor

export async function getSchemaVersion(db) {
  // LEGACY: schema_meta (rollback uyumu + eski kurulumların baseline tespiti için)
  try {
    const row = await db.prepare('SELECT version FROM schema_meta LIMIT 1').get();
    return row?.version || 0;
  } catch {
    return 0; // tablo henüz yok — hiç migrate edilmemiş demek
  }
}

export async function setSchemaVersion(db, version) {
  try {
    await db.exec('CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)');
    await db.prepare('DELETE FROM schema_meta').run();
    await db.prepare('INSERT INTO schema_meta (version) VALUES (?)').run(version);
  } catch (e) { console.error('schema_meta yazılamadı:', e.message); }
}

export async function tableExists(db, name) {
  const row = await db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  return Boolean(row);
}

/** `ALTER TABLE ... ADD COLUMN` — kolon zaten varsa (eşzamanlı cold start / yeniden deneme) sessizce geçer. */
export async function addColumnIfMissing(db, table, columnDef) {
  try {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch (e) {
    if (!/duplicate column/i.test(String(e?.message))) throw e;
  }
}

// Sıralı migration listesi. `version` benzersiz ve artan olmalı (8 = legacy baseline, rezerve).
export const MIGRATIONS = [
  {
    version: 9,
    name: 'users_totp_lockout_columns',
    // Hesap bazlı 2FA deneme sayacı (rate limiter'dan bağımsız). totp_locked_until: epoch ms.
    async up(db) {
      await addColumnIfMissing(db, 'users', 'totp_failed_attempts INTEGER NOT NULL DEFAULT 0');
      await addColumnIfMissing(db, 'users', 'totp_locked_until INTEGER DEFAULT NULL');
      return true;
    },
  },
  {
    version: 10,
    name: 'unique_purchases_and_single_active_round',
    // • user_purchases(user_id, item_id) UNIQUE: aynı öğenin çift satın alınmasını DB seviyesinde engeller.
    //   (Mağaza özelliği removeShopFeature ile kaldırıldıysa tablo yoktur → yapılacak iş yok.)
    // • Oyun turları: kullanıcı başına TEK aktif tur (kısmi UNIQUE index) → eşzamanlı
    //   /start istekleriyle birden fazla aktif tur açma yarışı DB seviyesinde kapanır.
    // Mevcut veride çakışma varsa index oluşturulamaz → false döner, her cold start'ta tekrar denenir.
    async up(db) {
      let complete = true;
      const stmts = [];
      if (await tableExists(db, 'user_purchases')) {
        stmts.push(['idx_user_purchases_unique', 'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_purchases_unique ON user_purchases(user_id, item_id)']);
      }
      for (const t of ['blackjack_rounds', 'mines_rounds', 'xox_rounds']) {
        if (await tableExists(db, t)) {
          stmts.push([`idx_${t}_one_active`, `CREATE UNIQUE INDEX IF NOT EXISTS idx_${t}_one_active ON ${t}(user_id) WHERE status = 'active'`]);
        }
      }
      for (const [name, sql] of stmts) {
        try {
          await db.exec(sql);
        } catch (e) {
          complete = false;
          console.error(`[migration 10] ${name} oluşturulamadı (muhtemelen mevcut yinelenen satırlar): ${e.message}. ` +
            'Çakışan kayıtları temizleyin; sonraki başlangıçta otomatik yeniden denenecek.');
        }
      }
      return complete;
    },
  },
];

export async function getAppliedMigrations(db) {
  try {
    const rows = await db.prepare('SELECT version FROM schema_migrations').all();
    return new Set(rows.map((r) => Number(r.version)));
  } catch {
    return null; // tablo yok → hiç migration kaydı yok
  }
}

export async function recordMigration(db, version, name) {
  await db.prepare('INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)').run(version, name);
}

export async function runMigrations(db) {
  let applied = await getAppliedMigrations(db);
  if (applied === null) {
    await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    applied = new Set();
  }

  // v8: legacy baseline (eski initializeDatabase + migrateDatabase zinciri)
  if (!applied.has(LEGACY_BASELINE_VERSION)) {
    const legacyVersion = await getSchemaVersion(db);
    if (legacyVersion < LEGACY_BASELINE_VERSION) {
      await initializeDatabase(db);
      await migrateDatabase(db);
      if (legacyVersion < 3) await removeShopFeature(db);
      await setSchemaVersion(db, LEGACY_BASELINE_VERSION);
    }
    await recordMigration(db, LEGACY_BASELINE_VERSION, 'legacy_baseline');
    applied.add(LEGACY_BASELINE_VERSION);
  }

  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    const done = await m.up(db);
    if (done !== false) await recordMigration(db, m.version, m.name);
  }
}
