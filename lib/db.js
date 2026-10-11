import { seedDatabase } from './seed.js';
import { createClient } from '@libsql/client';
import { wrapClient } from './db/client.js';
import { runMigrations } from './db/migrations.js';
import { generateSlug } from './db/slug.js';

let dbPromise = null;

async function initDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL ortam değişkeni tanımlı değil. Vercel proje ayarlarından ' +
      'Environment Variables kısmına TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN eklemelisin.'
    );
  }

  // Yanlış veritabanı adresi girilmişse (ör. Supabase/Postgres) net bir mesaj ver.
  if (/^(postgres(ql)?|mysql):\/\//i.test(url) || /supabase\.(co|com)/i.test(url)) {
    throw new Error(
      'TURSO_DATABASE_URL yanlış: bu proje Supabase/Postgres DEĞİL, Turso (libSQL) kullanıyor. ' +
      'Değer libsql://veritabani-adin.turso.io biçiminde olmalı.'
    );
  }
  if (/SENIN[-_]DB[-_]ADIN/i.test(url) || /^SENIN_/i.test(authToken || '')) {
    throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN hâlâ .env.example içindeki ÖRNEK değerde. Vercel → Environment Variables kısmında Turso panelinden aldığın gerçek değerleri gir ve Redeploy yap.');
  }
  if (!/^(libsql|https?|wss?|file):/i.test(url)) {
    throw new Error('TURSO_DATABASE_URL geçersiz biçimde. Beklenen: libsql://veritabani-adin.turso.io');
  }
  if (/^libsql:|^https?:|^wss?:/i.test(url) && !authToken) {
    throw new Error('TURSO_AUTH_TOKEN tanımlı değil. Turso panelinden token oluşturup Vercel env değişkenlerine ekle.');
  }

  const client = createClient({ url: url.trim(), authToken: authToken?.trim(), intMode: 'number' });
  const db = wrapClient(client);

  await runMigrations(db);
  // seedDatabase zaten kendi hızlı çıkış kontrolüne sahip (tek sorgu, seri
  // varsa hemen döner) — her istekte çalışması ucuz, versiyon şartına bağlamaya gerek yok.
  await seedDatabase(db);

  return db;
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = initDb().catch((err) => {
      // Başarısız init'i cache'leme — bir sonraki istekte tekrar denesin
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export { generateSlug };
export default getDb;
