import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRateLimiter } from '@/lib/ratelimit';
import { getRawSettingsCache, setRawSettingsCache, SETTINGS_CACHE_TTL } from '@/lib/settings-cache';

export const dynamic = 'force-dynamic';

const settingsRateLimit = createRateLimiter(30, 60 * 1000); // 30 istek/dk

export async function GET(request) {
    try {
        // Rate limit kontrolü
        const rl = await settingsRateLimit(request);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        // SettingsProvider bu endpoint'i her sayfada, tüm ziyaretçiler için
        // 30 saniyede bir çağırıyor — önceden her çağrı doğrudan DB'ye
        // gidiyordu. Artık layout.js/admin route ile paylaşılan aynı
        // in-memory cache kullanılıyor (admin ayar kaydettiğinde zaten
        // invalidate ediliyor, yani bakım modu gibi kritik değişiklikler
        // hâlâ anında yansıyor — sadece tekrarlanan DB okumaları azalıyor).
        const { cache: cached, cacheAt } = getRawSettingsCache();
        if (cached && Date.now() - cacheAt < SETTINGS_CACHE_TTL) {
            return NextResponse.json({ success: true, settings: cached }, {
                headers: {
                    'Cache-Control': 'no-cache, must-revalidate',
                }
            });
        }

        const db = await getDb();
        const rows = await db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value });
        // Bu endpoint herkese açık (giriş gerekmez) — admin panelinden girilen gizli anahtarlar,
        // tarayıcıya gitmesin. (turnstile_site_key gibi *_site_key
        // değerleri zaten herkese açıktır ve süzülmez.)
        // GÜVENLİK DÜZELTMESİ: eskiden sadece 'api_key'/'apikey' yakalanıyordu —
        // ileride eklenecek yalın "..._key" isimli bir ayar (ör. openai_key,
        // resend_key) bu listeye takılmadan sızabilirdi. Artık "key" geçen HER
        // ayar, açıkça güvenli olduğu bilinen *_site_key / *_public_key
        // dışında varsayılan olarak gizleniyor (blocklist yerine "aksi
        // ispatlanmadıkça gizli" mantığı).
        const PRIVATE_KEY = /(secret|token|password|passwd|private|service_role|webhook|smtp)/i;
        const PUBLIC_KEY_SUFFIX = /_site_key$|_public_key$/i;
        for (const k of Object.keys(settings)) {
            const looksLikeKeyButNotPublic = /key/i.test(k) && !PUBLIC_KEY_SUFFIX.test(k);
            if (PRIVATE_KEY.test(k) || looksLikeKeyButNotPublic) delete settings[k];
        }
        setRawSettingsCache(settings);

        return NextResponse.json({ success: true, settings }, {
            headers: {
                // 30 saniyelik client cache — admin kaydettiğinde zaten sayfayı yeniler
                // no-store yerine kısa TTL: her mount'ta network isteği yapmak yerine
                // tarayıcı cache'i kullanılır, gereksiz DB sorgusu azalır
                'Cache-Control': 'no-cache, must-revalidate',
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
    }
}
