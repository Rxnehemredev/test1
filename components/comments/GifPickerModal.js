import React from 'react';
import { createPortal } from 'react-dom';
import { GifIcon } from '@/components/icons/CommentIcons';

export default function GifPickerModal({
    isOpen,
    onClose,
    gifSearch,
    setGifSearch,
    gifResults,
    gifLoading,
    searchGifs,
    onSelectGif,
    searchRef,
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal gif-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '95vw' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <GifIcon />
                    GIF Ekle
                </h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                        ref={searchRef}
                        type="text"
                        className="form-input"
                        placeholder="GIPHY ile GIF ara..."
                        value={gifSearch}
                        onChange={e => setGifSearch(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                searchGifs(gifSearch);
                            }
                        }}
                        style={{ flex: 1 }}
                    />
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => searchGifs(gifSearch)}
                        disabled={gifLoading}
                    >
                        {gifLoading ? '...' : 'Ara'}
                    </button>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gridAutoRows: '100px',
                    gap: 8,
                    maxHeight: 320,
                    overflowY: 'auto',
                    borderRadius: 8,
                    padding: '4px'
                }}>
                    {gifLoading ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : gifResults.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            GIF bulunamadı. Farklı bir arama deneyin.
                        </div>
                    ) : gifResults.map(gif => {
                        const media = gif.media_formats?.gif || gif.media_formats?.tinygif;
                        if (!media) return null;
                        const preview = gif.media_formats?.tinygif || gif.media_formats?.nanogif || media;
                        return (
                            <button
                                key={gif.id}
                                onClick={() => onSelectGif(media.url)}
                                style={{
                                    border: '2px solid transparent',
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    background: 'var(--bg-secondary)',
                                    padding: 0,
                                    height: '100%',
                                    width: '100%',
                                    transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <img
                                    src={preview.url}
                                    alt={gif.content_description || 'gif'}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                        );
                    })}
                </div>
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>İptal</button>
                </div>
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    GIPHY tarafından desteklenmektedir
                </div>
            </div>
        </div>,
        document.body
    );
}
