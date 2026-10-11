import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { isDefaultTitle } from '@/lib/utils/titles';

export default function ReaderHud({
    mounted,
    hudVisible,
    seriesSlug,
    series,
    chapter,
    appSettings,
    openBugModal,
    activePanel,
    togglePanel,
    isNovelMode,
    isMangaMode,
    // Novel settings
    novelTheme,
    setNovelTheme,
    novelFontFamily,
    setNovelFontFamily,
    novelFontSize,
    setNovelFontSize,
    novelTextAlign,
    setNovelTextAlign,
    novelLineHeight,
    setNovelLineHeight,
    ttsPlaying,
    ttsPaused,
    toggleTts,
    stopTts,
    ttsRate,
    setTtsRate,
    // Manga/Webtoon settings
    setReadingMode,
    mangaDirection,
    setMangaDirection,
    fontSize,
    setFontSize,
    brightness,
    setBrightness,
    seamlessMode,
    setSeamlessMode,
    tapToScroll,
    setTapToScroll,
    theaterMode,
    setTheaterMode,
    updateSetting,
    // Chapters
    allChapters,
    chapterId,
    navigateTo,
    // Progress & nav
    readingProgress,
    prevChapter,
    nextChapter,
    currentPageIndex,
    pages,
}) {
    if (!mounted) return null;

    return createPortal(
        <div className={`reader-hud ${hudVisible ? 'visible' : 'hidden'}`}>
            
            {/* Top Bar */}
            <div className="rh-topbar">
                <div className="rh-title-group">
                    <Link href={`/seri/${seriesSlug}`} className="rh-back-btn" title="Seriye Dön">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </Link>
                    <div className="rh-title-text">
                        <h1 className="rh-series-title" title={series?.title}>{series?.title}</h1>
                        <h2 className="rh-chapter-title">
                            {appSettings?.lang_chapter_prefix || 'Bölüm'} {chapter?.chapter_number}
                            {chapter?.title && !isDefaultTitle(chapter.title, chapter.chapter_number) ? ` — ${chapter.title}` : ''}
                        </h2>
                    </div>
                </div>
                <div className="rh-nav-group">
                    <button className="rh-btn" onClick={openBugModal} title="Hata Bildir">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Hata Bildir</span>
                    </button>
                    <button className={`rh-btn ${activePanel === 'settings' ? 'active' : ''}`} onClick={() => togglePanel('settings')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>Ayarlar</span>
                    </button>
                </div>
            </div>

            {/* Panels */}
            <div className={`rh-panel ${activePanel === 'settings' ? 'open' : ''}`}>
                <div className="rh-panel-title">Okuyucu Ayarları</div>

                {isNovelMode ? (
                    <>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Tema</span>
                            <div className="rh-mode-toggle">
                                <button className={`rh-mode-btn ${novelTheme === 'dark' ? 'active' : ''}`} onClick={() => updateSetting('novel_theme', 'dark', setNovelTheme)}>Koyu</button>
                                <button className={`rh-mode-btn ${novelTheme === 'light' ? 'active' : ''}`} onClick={() => updateSetting('novel_theme', 'light', setNovelTheme)}>Açık</button>
                                <button className={`rh-mode-btn ${novelTheme === 'sepia' ? 'active' : ''}`} onClick={() => updateSetting('novel_theme', 'sepia', setNovelTheme)}>Sepya</button>
                            </div>
                        </div>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Yazı Tipi</span>
                            <div className="rh-mode-toggle">
                                <button className={`rh-mode-btn ${novelFontFamily === 'sans-serif' ? 'active' : ''}`} onClick={() => updateSetting('novel_font', 'sans-serif', setNovelFontFamily)}>Sans-Serif</button>
                                <button className={`rh-mode-btn ${novelFontFamily === 'serif' ? 'active' : ''}`} onClick={() => updateSetting('novel_font', 'serif', setNovelFontFamily)}>Serif</button>
                            </div>
                        </div>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Metin Boyutu</span>
                            <div className="rh-setting-control">
                                <input type="range" min="14" max="36" step="1" value={novelFontSize} onChange={e => updateSetting('novel_fontsize', Number(e.target.value), setNovelFontSize)} className="rh-slider" />
                                <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{novelFontSize}px</span>
                            </div>
                        </div>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Hizalama</span>
                            <div className="rh-mode-toggle">
                                <button className={`rh-mode-btn ${novelTextAlign === 'left' ? 'active' : ''}`} onClick={() => updateSetting('novel_textalign', 'left', setNovelTextAlign)}>Sola</button>
                                <button className={`rh-mode-btn ${novelTextAlign === 'justify' ? 'active' : ''}`} onClick={() => updateSetting('novel_textalign', 'justify', setNovelTextAlign)}>İki Yana</button>
                            </div>
                        </div>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Satır Aralığı</span>
                            <div className="rh-mode-toggle">
                                <button className={`rh-mode-btn ${novelLineHeight === 1.5 ? 'active' : ''}`} onClick={() => updateSetting('novel_lineheight', 1.5, setNovelLineHeight)}>Dar</button>
                                <button className={`rh-mode-btn ${novelLineHeight === 1.8 ? 'active' : ''}`} onClick={() => updateSetting('novel_lineheight', 1.8, setNovelLineHeight)}>Normal</button>
                                <button className={`rh-mode-btn ${novelLineHeight === 2.2 ? 'active' : ''}`} onClick={() => updateSetting('novel_lineheight', 2.2, setNovelLineHeight)}>Geniş</button>
                            </div>
                        </div>
                        <div className="rh-setting-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                            <span className="rh-setting-label">Sesli Okuma (TTS)</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button className="btn btn-sm btn-primary" onClick={toggleTts}>
                                    {ttsPlaying && !ttsPaused ? 'Duraklat' : 'Oynat'}
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={stopTts} disabled={!ttsPlaying}>Durdur</button>
                            </div>
                        </div>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Okuma Hızı</span>
                            <div className="rh-setting-control">
                                <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} onChange={e => updateSetting('tts_rate', Number(e.target.value), setTtsRate)} className="rh-slider" />
                                <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{ttsRate}x</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Okuma Modu</span>
                            <div className="rh-mode-toggle">
                                <button className={`rh-mode-btn ${!isMangaMode ? 'active' : ''}`} onClick={() => updateSetting('reading_mode', 'webtoon', setReadingMode)}>Webtoon</button>
                                <button className={`rh-mode-btn ${isMangaMode ? 'active' : ''}`} onClick={() => updateSetting('reading_mode', 'manga', setReadingMode)}>Manga</button>
                            </div>
                        </div>

                        {isMangaMode && (
                            <div className="rh-setting-row">
                                <span className="rh-setting-label">Yön</span>
                                <div className="rh-mode-toggle">
                                    <button className={`rh-mode-btn ${mangaDirection === 'rtl' ? 'active' : ''}`} onClick={() => updateSetting('manga_dir', 'rtl', setMangaDirection)}>Sağdan Sola</button>
                                    <button className={`rh-mode-btn ${mangaDirection === 'ltr' ? 'active' : ''}`} onClick={() => updateSetting('manga_dir', 'ltr', setMangaDirection)}>Soldan Sağa</button>
                                </div>
                            </div>
                        )}

                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Resim Genişliği</span>
                            <div className="rh-setting-control">
                                <input type="range" min="50" max="100" step="5" value={fontSize} onChange={e => updateSetting('font_size', Number(e.target.value), setFontSize)} className="rh-slider" />
                                <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{fontSize}%</span>
                            </div>
                        </div>

                        <div className="rh-setting-row">
                            <span className="rh-setting-label">Parlaklık</span>
                            <div className="rh-setting-control">
                                <input type="range" min="30" max="100" step="5" value={brightness} onChange={e => updateSetting('brightness', Number(e.target.value), setBrightness)} className="rh-slider" />
                                <span style={{ fontSize: '0.8rem', color: '#fff', width: 30 }}>{brightness}%</span>
                            </div>
                        </div>

                        {!isMangaMode && (
                            <div className="rh-setting-row">
                                <span className="rh-setting-label">Boşluksuz Mod</span>
                                <button className={`rsp-toggle ${seamlessMode ? 'on' : ''}`} onClick={() => updateSetting('seamless_mode', !seamlessMode, setSeamlessMode)}>
                                    <span className="rsp-toggle-knob" />
                                </button>
                            </div>
                        )}

                        {!isMangaMode && (
                            <div className="rh-setting-row">
                                <span className="rh-setting-label">Dokunarak Kaydır</span>
                                <button className={`rsp-toggle ${tapToScroll ? 'on' : ''}`} onClick={() => updateSetting('tap_to_scroll', !tapToScroll, setTapToScroll)}>
                                    <span className="rsp-toggle-knob" />
                                </button>
                            </div>
                        )}
                    </>
                )}

                <div className="rh-setting-row">
                    <span className="rh-setting-label">Sinema Modu (Koyu)</span>
                    <button className={`rsp-toggle ${theaterMode ? 'on' : ''}`} onClick={() => updateSetting('theater_mode', !theaterMode, setTheaterMode)}>
                        <span className="rsp-toggle-knob" />
                    </button>
                </div>
            </div>

            <div className={`rh-panel ${activePanel === 'chapters' ? 'open' : ''}`}>
                <div className="rh-panel-title">Bölüm Seçici</div>
                <div className="rh-chapter-list">
                    {[...allChapters].sort((a,b) => b.chapter_number - a.chapter_number).map(ch => (
                        <button key={ch.id} className={`rh-chapter-item ${String(ch.id) === String(chapterId) ? 'current' : ''}`} onClick={() => navigateTo(ch)}>
                            {appSettings?.lang_chapter_prefix || 'Bölüm'} {ch.chapter_number}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{ position: 'relative' }}>
                <div className="hud-progress-container">
                    <div className="hud-progress-bar" style={{ width: `${readingProgress}%` }} />
                </div>
                <div className="rh-bottombar">
                    <button className="rh-btn" onClick={() => navigateTo(prevChapter)} disabled={!prevChapter} title="Önceki Bölüm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        <span>Önceki</span>
                    </button>
                    
                    <button className="rh-chapter-selector" onClick={() => togglePanel('chapters')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        Bölüm {chapter?.chapter_number}
                        {isMangaMode && <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: 4 }}>({currentPageIndex + 1}/{pages?.length || 0})</span>}
                    </button>

                    <button className="rh-btn" onClick={() => navigateTo(nextChapter)} disabled={!nextChapter} title="Sonraki Bölüm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        <span>Sonraki</span>
                    </button>
                </div>
            </div>

        </div>,
        document.body
    );
}
