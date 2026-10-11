import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EndChapterCard({
    series,
    seriesSlug,
    nextChapter,
    navigateTo,
    appSettings,
    goPrevPage
}) {
    const [navigating, setNavigating] = useState(false);
    const router = useRouter();

    return (
        <div className="reader-end-card">
            <div className="rec-bg" style={{ backgroundImage: `url(${series?.cover_url || '/demo/cover1.jpg'})` }} />
            <div className="rec-content">
                {nextChapter ? (
                    <>
                        <div className="rec-label">{appSettings?.lang_next_up || 'SIRADAKİ BÖLÜM'}</div>
                        <div className="rec-title">{appSettings?.lang_chapter_prefix || 'Bölüm'} {nextChapter.chapter_number}</div>
                        <button 
                            className="rec-btn" 
                            disabled={navigating}
                            onClick={(e) => { 
                                e.stopPropagation();
                                setNavigating(true);
                                try { navigateTo(nextChapter); }
                                catch (err) { console.error('Bölüm navigasyon hatası:', err); setNavigating(false); }
                            }}
                        >
                            {navigating ? (
                                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                            ) : (
                                <>
                                    {appSettings?.lang_read_chapter || 'Hemen Oku'}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="rec-label" style={{ color: 'var(--success)' }}>{appSettings?.lang_up_to_date || 'GÜNCELSİNİZ'}</div>
                        <div className="rec-title">{appSettings?.lang_no_more_chapters || 'Şimdilik Başka Bölüm Yok'}</div>
                    </>
                )}

                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                    <Link
                        href={`/seri/${seriesSlug}`}
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.12)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.18)',
                            textDecoration: 'none', padding: '7px 16px',
                            borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                            backdropFilter: 'blur(4px)', transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        {appSettings?.lang_back_to_series || 'Seriye Dön'}
                    </Link>
                    <button
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            textDecoration: 'none', padding: '7px 16px',
                            borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                            backdropFilter: 'blur(4px)', transition: 'all 0.2s',
                            whiteSpace: 'nowrap', cursor: 'pointer',
                        }}
                        onClick={e => { e.stopPropagation(); window.scrollTo(0, 0); router.push('/'); }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        {appSettings?.lang_go_home || 'Ana Sayfa'}
                    </button>
                </div>

                {goPrevPage && (
                    <button style={{ marginTop: 8, color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => { e.stopPropagation(); goPrevPage(); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg> Önceki Sayfaya Dön
                    </button>
                )}
            </div>
        </div>
    );
}
