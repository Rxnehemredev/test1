import React from 'react';
import Link from 'next/link';

export default function NavbarSearchOverlay({
    isOpen,
    onClose,
    searchQuery,
    handleSearch,
    handleSearchChange,
    liveResults,
    liveLoading,
    parseGenres,
}) {
    if (!isOpen) return null;

    return (
        <div className="search-overlay">
            <div className="search-bar-container">
                <form onSubmit={handleSearch} className="search-bar-expanded">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Manga serisi ara..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        autoFocus
                    />
                    <button type="button" onClick={onClose} className="search-close">✕</button>
                </form>
                {liveResults.length > 0 && (
                    <div className="live-search-dropdown">
                        {liveResults.map(s => (
                            <Link
                                key={s.id}
                                href={`/seri/${s.slug || s.id}`}
                                className="live-search-item"
                                onClick={onClose}
                            >
                                <img src={s.cover_url || '/demo/cover1.jpg'} alt={`${s.title || 'Seri'} kapak görseli`} decoding="async" />
                                <div className="ls-info">
                                    <span className="ls-title">{s.title}</span>
                                    <span className="ls-meta">{parseGenres(s.genres).slice(0, 2).join(', ')} · {s.chapterCount || 0} bölüm</span>
                                </div>
                            </Link>
                        ))}
                        <Link
                            href={`/seri?search=${encodeURIComponent(searchQuery)}`}
                            className="live-search-item"
                            style={{ justifyContent: 'center', fontWeight: 600, color: 'var(--primary)' }}
                            onClick={onClose}
                        >
                            Tüm sonuçları görüntüle →
                        </Link>
                    </div>
                )}
                {liveLoading && searchQuery.trim() && (
                    <div className="live-search-dropdown" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aranıyor...
                    </div>
                )}
            </div>
        </div>
    );
}
