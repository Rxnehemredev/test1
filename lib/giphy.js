/**
 * GIPHY GIF arama yardımcı fonksiyonu — sunucu tarafında kullanılır.
 *
 * Tenor artık üçüncü taraf uygulamalara kolayca API anahtarı vermiyor
 * (Google Cloud Console üzerinden ayrı bir proje kurulmasını zorunlu kılıyor
 * ve süreç sürekli değişiyor), bu yüzden GIF arama GIPHY'ye taşındı.
 *
 * Anahtar önceliği:
 *   1) Admin panelinden girilen anahtar (fonksiyona `apiKey` olarak geçilir)
 *   2) Vercel / ortam değişkeni olarak tanımlanan GIPHY_API_KEY
 *   3) GIPHY'nin herkese açık "beta" test anahtarı (düşük hacimli kullanım
 *      için GIPHY'nin kendisinin sağladığı, imzasız bir anahtar) — böylece
 *      site hiç yapılandırma yapılmadan da GIF aramasıyla birlikte çalışır.
 *
 * Üretimde https://developers.giphy.com adresinden ücretsiz kendi anahtarını
 * alıp admin panelinden ya da Vercel ortam değişkeninden tanımlamak daha
 * sağlıklı olur (daha yüksek rate limit).
 */

import { realEnv } from './envGuard';

const GIPHY_BETA_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

export async function fetchGifs({ apiKey, query = '', limit = 24, rating = 'pg-13', lang = 'tr' } = {}) {
    // envGuard.realEnv(): Vercel projeyi içe aktarırken .env.example'daki
    // örnek/placeholder değerleri gerçek env değişkeni sanıp getirebiliyor —
    // realEnv bu tür sahte değerleri eler.
    const key = (apiKey && String(apiKey).trim())
        || realEnv('GIPHY_API_KEY')
        || GIPHY_BETA_KEY;
    const q = String(query || '').trim();

    const params = new URLSearchParams({
        api_key: key,
        limit: String(Math.min(Math.max(parseInt(limit, 10) || 24, 1), 50)),
        rating,
        lang,
    });

    let endpoint;
    if (q) {
        params.set('q', q);
        endpoint = `${GIPHY_BASE}/search?${params.toString()}`;
    } else {
        endpoint = `${GIPHY_BASE}/trending?${params.toString()}`;
    }

    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `GIPHY isteği başarısız: ${res.status}`);
    }
    const data = await res.json();

    return (data.data || []).map(item => {
        const images = item.images || {};
        const full = images.original || images.fixed_height || images.downsized;
        const preview = images.fixed_height_small || images.preview_gif || images.fixed_height_downsampled || full;
        if (!full?.url) return null;
        return {
            id: item.id,
            url: full.url,
            preview: preview?.url || full.url,
            width: Number(full.width) || 200,
            height: Number(full.height) || 200,
        };
    }).filter(Boolean);
}
