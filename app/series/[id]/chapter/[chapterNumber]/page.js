'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { ReaderContent } from '@/app/read/[chapterId]/page';

// SEO-friendly reader URL: /series/[seriesSlug]/chapter/[chapterNumber]
// Resolves and displays the internal reader inline
export default function SEOReaderPage() {
    const { id: seriesSlug, chapterNumber } = useParams();
    const router = useRouter();
    const [chapterId, setChapterId] = useState(null);
    const [resolving, setResolving] = useState(true);

    useEffect(() => {
        async function resolveChapter() {
            try {
                // /api/series/[id] accepts both numeric IDs and slugs
                const res = await fetch(`/api/series/${encodeURIComponent(seriesSlug)}`);
                if (!res.ok) { router.replace('/seri'); return; }

                const data = await res.json();
                const chapters = data.chapters || [];
                const num = parseFloat(chapterNumber);
                const chapter = chapters.find(
                    c => c.chapter_number === num || String(c.chapter_number) === String(chapterNumber)
                );

                if (!chapter) {
                    // Chapter not found – go back to series page
                    router.replace(`/seri/${seriesSlug}`);
                    return;
                }

                setChapterId(chapter.id);
            } catch {
                router.replace('/series');
            } finally {
                setResolving(false);
            }
        }
        resolveChapter();
    }, [seriesSlug, chapterNumber, router]);

    if (resolving || !chapterId) {
        return (
            <div className="page-loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
            <ReaderContent chapterId={chapterId} />
        </Suspense>
    );
}