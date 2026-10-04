'use client';
import { useState, useEffect, useRef } from 'react';

const LANGUAGES = [
    // European
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
    { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'bg', name: 'Български', flag: '🇧🇬' },
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
    { code: 'sr', name: 'Srpski', flag: '🇷🇸' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    // Middle East / Africa
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
    // Asia
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文(简)', flag: '🇨🇳' },
    { code: 'zt', name: '中文(繁)', flag: '🇹🇼' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
];

export default function LanguageSelector({ selectedLang, onSelect, disabled, availableLanguages }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropRight, setDropRight] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const containerRef = useRef(null);

    const current = LANGUAGES.find(l => l.code === selectedLang);

    const filtered = search.trim()
        ? LANGUAGES.filter(l =>
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.code.includes(search.toLowerCase())
          )
        : LANGUAGES;

    // Close on outside mousedown — fires BEFORE click, no race condition
    useEffect(() => {
        function handleOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    function handleToggle(e) {
        // Stop the event from reaching parent handlers (e.g. tap zones in reader)
        e.stopPropagation();
        if (disabled) return;

        if (!open) {
            // Calculate dropdown position before opening
            const rect = e.currentTarget.getBoundingClientRect();
            setDropRight(rect.left + 230 > window.innerWidth - 16);
            setDropUp(rect.bottom + 340 > window.innerHeight - 16);
            setOpen(true);
        } else {
            setOpen(false);
            setSearch('');
        }
    }

    function handleSelect(code) {
        onSelect(code);
        setOpen(false);
        setSearch('');
    }

    // Position style for the dropdown
    const dropdownStyle = {};
    if (dropRight) {
        dropdownStyle.left = 'auto';
        dropdownStyle.right = 0;
    }
    if (dropUp) {
        dropdownStyle.bottom = '100%';
        dropdownStyle.top = 'auto';
        dropdownStyle.marginBottom = 4;
        dropdownStyle.marginTop = 0;
    }

    return (
        <div className="language-selector" ref={containerRef}>
            <button
                className={`lang-btn ${open ? 'active' : ''}`}
                onClick={handleToggle}
                disabled={disabled}
                style={{ maxWidth: 160, overflow: 'hidden' }}
                type="button"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {current ? `${current.flag} ${current.name}` : 'Original'}
                </span>
                <svg
                    width="12" height="12"
                    className={`chevron ${open ? 'rotated' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ flexShrink: 0 }}
                >
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </button>

            {open && (
                <div
                    className="lang-dropdown"
                    style={dropdownStyle}
                    onMouseDown={e => e.stopPropagation()} // prevent outside handler from firing on scroll
                >
                    <div className="lang-dropdown-header">Translate to</div>
                    <div style={{ padding: '6px 10px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search language..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                            style={{ padding: '6px 10px', fontSize: '0.82rem', height: 32 }}
                        />
                    </div>
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {!search && (
                            <button
                                type="button"
                                className={`lang-option ${!selectedLang ? 'selected' : ''}`}
                                onClick={() => handleSelect('')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                </svg>
                                Original
                            </button>
                        )}
                        {filtered.map(lang => (
                            <button
                                key={lang.code}
                                type="button"
                                className={`lang-option ${selectedLang === lang.code ? 'selected' : ''}`}
                                onClick={() => handleSelect(lang.code)}
                            >
                                <span>{lang.flag}</span>
                                {lang.name}
                                {availableLanguages?.includes(lang.code) && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success, #10b981)" strokeWidth="2.5" style={{ marginLeft: 'auto' }}>
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                )}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                No languages found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
