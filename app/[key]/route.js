import { INDEXNOW_KEY } from '@/lib/indexNow';
import { safeEqual } from '@/lib/security/safeEqual';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

// IndexNow anahtarları yalnızca 8-128 karakterlik alfanümerik dize ve opsiyonel .txt uzantısı olabilir
const VALID_INDEXNOW_PARAM_REGEX = /^[0-9a-zA-Z]{8,128}(\.txt)?$/;

/**
 * IndexNow arama motoru doğrulama route'u (Bing, Yandex, Seznam vb.).
 * Arama motorları sahiplik doğrulaması için /{key}.txt (veya /{key}) adresini sorgular.
 * Yalnızca tanımlı INDEXNOW_KEY ile birebir eşleşen anahtar için cevap döner;
 * diğer tüm isteklerde 404 Not Found verir.
 */
export async function GET(request, { params }) {
    const rawParams = await params;
    const rawKey = rawParams?.key;

    if (!rawKey || typeof rawKey !== 'string') {
        notFound();
    }

    let decodedKey;
    try {
        decodedKey = decodeURIComponent(rawKey);
    } catch {
        notFound();
    }

    // Biçim doğrulaması: Alfanümerik olmayan veya .txt haricinde uzantı taşıyan istekler hemen 404
    if (!VALID_INDEXNOW_PARAM_REGEX.test(decodedKey)) {
        notFound();
    }

    const activeKey = (process.env.INDEXNOW_KEY || INDEXNOW_KEY || '').trim();
    if (!activeKey || typeof activeKey !== 'string') {
        notFound();
    }

    // Sadece geçerli anahtar eşleşmesi için (timing-safe) cevap ver
    const expectedWithExt = `${activeKey}.txt`;
    const isMatch = safeEqual(decodedKey, expectedWithExt) || safeEqual(decodedKey, activeKey);

    if (isMatch) {
        return new Response(activeKey, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, immutable',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    }

    notFound();
}
