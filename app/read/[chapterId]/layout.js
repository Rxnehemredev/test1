import { getDb } from '@/lib/db';
import { permanentRedirect } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

// Madde 6: /read/[chapterId] sayfaları için noindex + canonical
// Bu sayfalar /series/[slug]/chapter/[num] URL'sine canonical yönlendirir
export async function generateMetadata({ params }) {
    const { chapterId } = await params;
    try {
        const db = await getDb();
        const chapter = await db.prepare(`
            SELECT ch.id, ch.chapter_number, ch.title,
                   s.id as series_id, s.title as series_title, s.slug as series_slug
            FROM chapters ch
            JOIN series s ON s.id = ch.series_id
            WHERE ch.id = ? AND s.published = 1
        `).get(chapterId);

        const siteNameRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'site_name'").get();
        const siteName = siteNameRow?.setting_value || 'Asteria Scans';

        if (!chapter) {
            return {
                title: `${siteName} — Türkçe Manga Oku`,
                robots: { index: false, follow: false },
            };
        }

        const slug = chapter.series_slug || chapter.series_id;
        const canonicalUrl = `${BASE_URL}/seri/${slug}/bolum/${chapter.chapter_number}`;
        const chTitle = chapter.title ? ` — ${chapter.title}` : '';
        const title = `${chapter.series_title} Bölüm ${chapter.chapter_number}${chTitle} | ${siteName}`;
        const description = `${chapter.series_title} Bölüm ${chapter.chapter_number}${chTitle} online oku. Yapay zeka destekli Türkçe çeviri ile mangayı ücretsiz ve kaliteli okuyun.`;

        return {
            title,
            description,
            robots: {
                index: false,
                follow: true,
            },
            alternates: {
                canonical: canonicalUrl,
            },
        };
    } catch {
        try {
            const db2 = await getDb();
            const row = await db2.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'site_name'").get();
            const siteName = row?.setting_value || 'Asteria Scans';
            return { title: `${siteName} — Türkçe Manga Oku`, robots: { index: false, follow: false } };
        } catch {
            return { title: 'Manga Oku', robots: { index: false, follow: false } };
        }
    }
}

export default async function ReadLayout({ children, params }) {
    const { chapterId } = await params;
    try {
        const db = await getDb();
        const chapter = await db.prepare(`
            SELECT ch.chapter_number,
                   s.id as series_id, s.slug as series_slug
            FROM chapters ch
            JOIN series s ON s.id = ch.series_id
            WHERE ch.id = ? AND s.published = 1
        `).get(chapterId);

        if (chapter) {
            const slug = chapter.series_slug || chapter.series_id;
            permanentRedirect(`/seri/${slug}/bolum/${chapter.chapter_number}`);
        }
    } catch (err) {
        if (err.digest?.startsWith('NEXT_REDIRECT')) {
            throw err;
        }
        console.error('ReadLayout redirect error:', err);
    }
    return children;
}