/**
 * IndexNow bildirim modülü.
 * Bing, Yandex, Seznam ve Naver gibi arama motorlarına yeni/güncellenen
 * URL'leri anında bildirir (Google Indexing API'nin aksine OAuth gerekmez,
 * tek bir "anahtar" ve o anahtarı doğrulayan bir /{key}.txt dosyası yeterli).
 *
 * Doğrulama dosyası: public/{INDEXNOW_KEY}.txt — içeriği de aynı anahtar.
 * Anahtarı .env üzerinden değiştirmek isterseniz INDEXNOW_KEY ortam
 * değişkenini tanımlayın ve public/ altındaki dosyayı da o anahtarla
 * yeniden adlandırın/oluşturun.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '0cac60a888cd09a766252eb5a6b00835';

// IndexNow protokolünü destekleyen ana uç nokta — hangi motora gönderilirse
// gönderilsin, IndexNow'u destekleyen diğer tüm motorlara da otomatik yayılır
// (Bing, Yandex, Seznam.cz, Naver vb. ortak bir havuzu paylaşır).
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function toAbsoluteUrl(url) {
    if (/^https?:\/\//i.test(url)) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Tek bir URL'yi IndexNow'a bildirir. Non-throwing — arka planda "fire and
 * forget" kullanım için tasarlandı (bkz. notifyGoogleIndexing kullanım şekli).
 */
export async function notifyIndexNow(url) {
    const result = await notifyIndexNowWithDetail([url]);
    return result.success;
}

/**
 * Birden fazla URL'yi tek istekte bildirir (IndexNow tek istekte en fazla
 * 10.000 URL kabul eder). { success, message, error } döner.
 */
export async function notifyIndexNowWithDetail(urls) {
    const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean).map(toAbsoluteUrl);
    if (list.length === 0) {
        return { success: false, error: 'Bildirilecek URL yok.' };
    }

    const host = new URL(BASE_URL).host;
    const body = {
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: list,
    };

    try {
        const res = await fetch(INDEXNOW_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(body),
        });

        // IndexNow başarı durumunda 200 veya 202 döner, gövde boş olabilir.
        if (res.ok || res.status === 202) {
            console.log(`[IndexNow] ${list.length} URL bildirildi (HTTP ${res.status})`);
            return { success: true, message: `${list.length} URL IndexNow'a bildirildi (HTTP ${res.status})` };
        }

        const text = await res.text().catch(() => '');
        console.error(`[IndexNow] Hata (HTTP ${res.status}):`, text);
        return { success: false, error: `IndexNow hatası (HTTP ${res.status}): ${text || 'detay yok'}` };
    } catch (err) {
        console.error('[IndexNow] İstek başarısız:', err.message);
        return { success: false, error: `IndexNow isteği başarısız: ${err.message}` };
    }
}
