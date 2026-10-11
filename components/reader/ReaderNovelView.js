import React, { Suspense, lazy } from 'react';
import { sanitizeBlogHtml } from '@/lib/sanitize-html';
import ReaderSupportCard from './ReaderSupportCard';
import EndChapterCard from './EndChapterCard';

const CommentSection = lazy(() => import('@/components/CommentSection'));

export default function ReaderNovelView({
    novelTheme,
    novelFontFamily,
    novelFontSize,
    novelLineHeight,
    novelTextAlign,
    brightness,
    handleReaderTap,
    paragraphs,
    appSettings,
    series,
    seriesSlug,
    nextChapter,
    navigateTo,
    chapterId,
}) {
    return (
        <div 
            className={`novel-mode-container novel-theme-${novelTheme}`}
            style={{ 
                fontFamily: novelFontFamily === 'serif' ? 'Georgia, serif' : 'Inter, system-ui, sans-serif',
                fontSize: `${novelFontSize}px`,
                lineHeight: novelLineHeight,
                textAlign: novelTextAlign,
                filter: brightness < 100 ? `brightness(${brightness}%)` : undefined,
                minHeight: '100vh',
                paddingBottom: 100,
            }}
        >
            <div className="novel-content" onClick={handleReaderTap}>
                {paragraphs.map((pText, i) => (
                    <div key={i} id={`p-${i}`} className="novel-paragraph" style={{ position: 'relative' }}>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(pText) }} />
                        <button 
                            className="inline-comment-btn" 
                            title="Bu paragrafa yorum yap"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                window.dispatchEvent(new CustomEvent('inline-comment', { detail: { paragraphIndex: i } }));
                                const sec = document.getElementById('comments-section');
                                if (sec) sec.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 60, padding: '0 20px', maxWidth: 800, margin: '60px auto 0' }}>
                <ReaderSupportCard appSettings={appSettings} />
                <EndChapterCard series={series} seriesSlug={seriesSlug} nextChapter={nextChapter} navigateTo={navigateTo} appSettings={appSettings} />
            </div>
            <div id="comments-section" className="page-container" style={{ marginTop: 40, maxWidth: 800, margin: '40px auto 0', paddingBottom: 120 }}>
                <Suspense fallback={<div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Yorumlar yükleniyor...</div>}>
                    <CommentSection chapterId={chapterId} seriesId={series?.id} />
                </Suspense>
            </div>
        </div>
    );
}
