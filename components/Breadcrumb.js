import Link from 'next/link';

/**
 * Breadcrumb — sayfa üstünde görünen, GERÇEK <a> linkli navigasyon.
 *
 * Neden önemli: Sitede zaten JSON-LD BreadcrumbList structured data vardı
 * (bkz. app/series/[id]/layout.js, app/seri/[id]/bolum/[chapterNumber]/layout.js)
 * ama bu sadece arama sonuçlarında zengin breadcrumb göstermek için —
 * gerçek bir <a href> linki değil, yani Google'ın sayfalar arası link
 * grafiğini (internal linking / PageRank akışı) güçlendirmiyordu.
 * Bu bileşen aynı hiyerarşiyi GERÇEK linklerle tekrarlıyor: hem kullanıcıya
 * gezinme kolaylığı sağlıyor hem de her sayfaya (özellikle seri sayfalarına)
 * siteye yayılmış gerçek internal link akışı kazandırıyor.
 *
 * items: [{ label: string, href?: string }] — href yoksa (son eleman)
 * tıklanamaz "mevcut sayfa" olarak render edilir.
 */
export default function Breadcrumb({ items }) {
    if (!items || items.length === 0) return null;

    return (
        <nav className="breadcrumb-nav" aria-label="breadcrumb">
            <ol className="breadcrumb-list">
                {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li key={i} className="breadcrumb-item">
                            {!isLast && item.href ? (
                                <Link href={item.href} className="breadcrumb-link">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="breadcrumb-current" aria-current="page">
                                    {item.label}
                                </span>
                            )}
                            {!isLast && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
