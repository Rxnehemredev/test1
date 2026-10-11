/**
 * ---------------------------------------------------------------------------
 * Turso (libSQL) uyum katmanı
 * ---------------------------------------------------------------------------
 * better-sqlite3, senkron ve yerel bir dosyaya yazıyordu — Vercel'in stateless
 * serverless fonksiyonlarında bu kalıcı değildi. Bunun yerine Turso (uzak,
 * SQLite uyumlu, ücretsiz katmanlı bir veritabanı) kullanıyoruz.
 *
 * Turso ağ üzerinden (HTTP) çalıştığı için her sorgu ASENKRON olmak zorunda.
 * Bu yüzden aşağıdaki wrapper, eski `db.prepare(sql).get()/.all()/.run()`
 * imzasını korur ama artık hepsi Promise döner — kodun geri kalanında
 * `await db.prepare(...)` şeklinde kullanılır.
 * ---------------------------------------------------------------------------
 */

export function normalizeArgs(args) {
  // better-sqlite3 hem .get(a, b, c) hem de .get([a, b, c]) destekler.
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

export function rowsToObjects(result) {
  const cols = result.columns;
  return result.rows.map((row) => {
    const obj = {};
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = row[i];
    return obj;
  });
}

export function wrapClient(client) {
  return {
    prepare(sql) {
      return {
        async get(...args) {
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          const objs = rowsToObjects(result);
          return objs[0];
        },
        async all(...args) {
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return rowsToObjects(result);
        },
        async run(...args) {
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return {
            lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined,
            changes: result.rowsAffected,
          };
        },
      };
    },
    async exec(sql) {
      // Birden fazla ';' ile ayrılmış statement içerebilir (CREATE TABLE bloklarında olduğu gibi)
      await client.executeMultiple(sql);
    },
    // Birden fazla sorguyu TEK ağ round-trip'inde (tek HTTP isteğiyle), atomik bir
    // transaction içinde çalıştırır. Turso uzak bir veritabanı olduğu için her
    // ayrı .get()/.run() çağrısı kendi başına bir network gidiş-dönüşü demek —
    // art arda 5-7 tane ayrı çağrı yapmak (ör. aviator start/cashout) saniyeler
    // sürebiliyor. batch() bunları tek istekte birleştirir.
    // items: [{ sql, args }, ...] — sonuç, her item için { rows, lastInsertRowid, changes } dizisi.
    async batch(items) {
      const stmts = items.map((i) => ({ sql: i.sql, args: normalizeArgs(i.args || []) }));
      const results = await client.batch(stmts, 'write');
      return results.map((result) => ({
        rows: rowsToObjects(result),
        lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : undefined,
        changes: result.rowsAffected,
      }));
    },
    // Eski better-sqlite3 çağrılarıyla uyumluluk için no-op / basit karşılık.
    // Turso'da WAL/cache/mmap gibi dosya bazlı pragmalar geçersizdir; sadece
    // gerçekten anlamlı olan foreign_keys pragmasını iletiyoruz.
    async pragma(stmt) {
      if (/foreign_keys/i.test(stmt)) {
        await client.execute('PRAGMA foreign_keys = ON');
      }
      // diğerleri (journal_mode, cache_size, mmap_size, synchronous, temp_store,
      // busy_timeout) Turso'nun kendi sunucu tarafında yönetilir, sessizce atlanır.
    },
    // better-sqlite3'teki db.transaction(fn) API'sinin basitleştirilmiş karşılığı.
    // Gerçek BEGIN/COMMIT/ROLLBACK atomikliği yerine, fonksiyonu olduğu gibi
    // (ardışık await'lerle) çalıştırır. Hobi ölçekli bir webtoon sitesi için
    // yeterlidir; finansal/kritik atomiklik gerektiren bir senaryo değildir.
    transaction(fn) {
      return async (...args) => fn(...args);
    },
  };
}
