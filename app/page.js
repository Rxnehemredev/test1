import { headers } from 'next/headers';
import HomeClient from '@/components/HomeClient';

// Ana sayfa artık sunucu tarafında (SSR) ilk veriyi çekip HTML'e gömüyor.
// Önceden bu sayfa tamamen client-side'dı: tarayıcı boş bir sayfa alıp
// JS yüklendikten sonra 6 ayrı API isteği atıyordu (ilk yükleme için yavaş,
// SEO için de dezavantajlı). Artık ilk paint zaten dolu geliyor; client
// tarafındaki mevcut interaktiflik (sayfalama, 18+ filtre, top periyot vb.)
// olduğu gibi çalışmaya devam ediyor.
export const dynamic = 'force-dynamic';

// GÜVENLİK: Host başlığı istemci tarafından değiştirilebilir. Sunucu kendi API'sine giderken bu
// başlığa güvenirse saldırgan sunucuyu kendi adresine istek atmaya (SSRF) ve sayfaya sahte veri
// basmaya zorlayabilir. Bu yüzden önce sabit ortam değişkenleri kullanılır; Host yalnızca
// yerel geliştirmede (localhost) kabul edilir.
async function getBaseUrl() {
    const configured = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    if (configured) return configured.replace(/\/+$/, '');
    const h = await headers();
    const host = h.get('host') || '';
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
    throw new Error('NEXT_PUBLIC_BASE_URL tanımlı değil');
}

export default async function Page() {
    let initialData = null;
    try {
        const baseUrl = await getBaseUrl();
        const [popRes, updRes, trendRes, edRes, annRes, settRes, topRes] = await Promise.all([
            // Bu 7 istek daha önce `cache: 'no-store'` ile tamamen önbelleksizdi —
            // yani SITEYE GELEN HER TEK ZİYARETÇİ için ana sayfa 7 ayrı DB sorgusu
            // tetikliyordu. Kısa süreli (30-300sn) revalidate cache'i eklemek,
            // verinin kullanıcı için "an be an güncel" hissini bozmadan sunucu
            // yükünü ve gecikmeyi ciddi ölçüde azaltır: aynı pencere içindeki tüm
            // ziyaretçiler, DB'ye tekrar gitmeden aynı önbellekten hızlıca yanıt alır.
            fetch(`${baseUrl}/api/series?sort=popular&limit=5`, { next: { revalidate: 30, tags: ['series'] } }),
            fetch(`${baseUrl}/api/series/latest-updates?page=1&adult=0`, { next: { revalidate: 15, tags: ['series'] } }),
            fetch(`${baseUrl}/api/series/trending`, { next: { revalidate: 30, tags: ['series'] } }),
            fetch(`${baseUrl}/api/series/editor-pick`, { next: { revalidate: 60, tags: ['series'] } }),
            fetch(`${baseUrl}/api/announcements?active=true`, { next: { revalidate: 30 } }),
            fetch(`${baseUrl}/api/settings`, { next: { revalidate: 10, tags: ['settings'] } }),
            // "En Çok Okunanlar" widget'ı önceden SADECE client tarafında,
            // sayfa mount olduktan SONRA fetch ediliyordu — bu yüzden ilk açılışta
            // boş/yarım görünüp bir anlık gecikmeyle "geç düşüyordu". Diğer
            // widget'lar gibi artık SSR'da (varsayılan period: daily) çekiliyor.
            fetch(`${baseUrl}/api/series/top?period=daily`, { next: { revalidate: 60, tags: ['series'] } }),
        ]);

        const [popData, updData, trendData, edData, annData, settData, topData] = await Promise.all([
            popRes.json(), updRes.json(), trendRes.json(), edRes.json(), annRes.json(), settRes.json(), topRes.json()
        ]);

        initialData = {
            popularSeries: popData.series || [],
            latestUpdates: updData.updates || [],
            updatesTotalPages: updData.totalPages || 1,
            updatesTotal: updData.total || 0,
            trending: trendData.series || [],
            editorPicks: Array.isArray(edData.series) ? edData.series : (edData.series ? [edData.series] : []),
            announcements: annData.announcements || [],
            appSettings: settData.success ? (settData.settings || {}) : {},
            topSeries: topData.series || [],
            topPeriod: 'daily',
        };
    } catch (err) {
        // SSR fetch başarısız olursa sessizce client-side fallback'e düşer
        // (HomeClient initialData=null olduğunda kendi fetch'ini eskisi gibi yapar)
        console.error('Homepage SSR fetch failed, falling back to client-side fetch:', err);
        initialData = null;
    }

    return <HomeClient initialData={initialData} />;
}
