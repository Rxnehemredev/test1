import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getChapterDataForSSR } from '@/lib/chapterData';
import { ReaderContent } from '@/app/read/[chapterId]/page';

// Türkçe SEO URL: /seri/[slug]/bolum/[chapterNumber]
// Bu, bölüm/sayfa verisini SSR'da (server component olarak) çekip ilk HTML'e
// gömen bir Server Component'tir. Önceden bu sayfa tamamen client-side
// render ediliyordu — ilk HTML'de sadece layout.js'in <head> meta/JSON-LD'si
// vardı, gövde içeriği (metin/görseller) YOK'tu; Google JS çalıştırıp
// render edebiliyordu ama bu hem yavaştı hem risksiz değildi (network
// şelalesi, fetch hataları indexlemeyi bozabiliyordu). Artık chapter'ların
// CANONICAL URL'i (Google'ın asıl indekslemesi gereken adres) ilk yanıtta
// gerçek içerik içeriyor. Bkz. DEVAM-NOTU.md "ÖNEMLİ BULGU".
export default async function SEOReaderPageTR({ params }) {
    const { id: seriesSlug, chapterNumber } = await params;
    const result = await getChapterDataForSSR(seriesSlug, chapterNumber);

    // Seri bulunamadı → seri listesine, bölüm bulunamadı/henüz yayınlanmadı
    // → seri detayına yönlendir. Bu, eski client-side davranışla (router.replace)
    // aynı kullanıcı deneyimini korur.
    if (result?.error === 'series_not_found') {
        redirect('/seri');
    }
    if (result?.error === 'chapter_not_found') {
        redirect(`/seri/${seriesSlug}`);
    }

    return (
        <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
            <ReaderContent chapterId={result.chapter.id} initialData={result} />
        </Suspense>
    );
}
