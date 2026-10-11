import React from 'react';
import { GifIcon, SpoilerTagIcon } from '@/components/icons/CommentIcons';

const BoldIcon = () => <span style={{ fontWeight: '900', fontFamily: 'serif', fontSize: '13px', lineHeight: 1 }}>B</span>;
const ItalicIcon = () => <span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: '13px', lineHeight: 1 }}>I</span>;
const StrikeIcon = () => <span style={{ textDecoration: 'line-through', fontSize: '13px', lineHeight: 1 }}>S</span>;
const InlineSpoilerIcon = () => (
    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '12px', letterSpacing: '-2px', lineHeight: 1 }}>||</span>
);

export default function CommentToolbar({
    onBold,
    onItalic,
    onStrike,
    onInlineSpoiler,
    isSpoilerTag,
    onToggleSpoilerTag,
    charCount,
    maxChars,
    onSubmit,
    submitLabel,
    disabled,
    onCancel,
    onGif,
}) {
    return (
        <div className="asura-comment-toolbar">
            <div className="asura-toolbar-left">
                <button type="button" className="asura-toolbar-btn" title="Kalın" onClick={onBold}><BoldIcon /></button>
                <button type="button" className="asura-toolbar-btn" title="İtalik" onClick={onItalic}><ItalicIcon /></button>
                <button type="button" className="asura-toolbar-btn" title="Üstü Çizili" onClick={onStrike}><StrikeIcon /></button>
                <button
                    type="button"
                    className="asura-toolbar-btn"
                    title="Satır içi spoiler (||metin||)"
                    onClick={onInlineSpoiler}
                    style={{ fontFamily: 'monospace', letterSpacing: '-1px', fontWeight: 800, fontSize: '13px' }}
                >
                    <InlineSpoilerIcon />
                </button>
                {onGif && (
                    <button type="button" className="asura-toolbar-btn" title="GIF Ekle" onClick={onGif}>
                        <GifIcon />
                    </button>
                )}
                <div style={{ width: 1, background: 'var(--border)', margin: '0 4px', alignSelf: 'stretch' }} />
                <button
                    type="button"
                    className="asura-toolbar-btn"
                    title="Yorumun tamamını spoiler olarak işaretle"
                    onClick={onToggleSpoilerTag}
                    style={isSpoilerTag ? {
                        color: 'var(--warning, #f59e0b)',
                        background: 'rgba(245,158,11,0.15)',
                        borderRadius: 4,
                    } : {}}
                >
                    <SpoilerTagIcon />
                    <span style={{
                        fontSize: '0.7rem',
                        marginLeft: 3,
                        color: isSpoilerTag ? 'var(--warning, #f59e0b)' : 'var(--text-muted)',
                        fontWeight: isSpoilerTag ? 700 : 400,
                    }}>
                        {isSpoilerTag ? 'Spoiler ✓' : 'Spoiler'}
                    </span>
                </button>
            </div>
            <div className="asura-toolbar-right">
                {maxChars && charCount > 0 && <span className="asura-char-count">{charCount}/{maxChars}</span>}
                {onCancel && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} style={{ fontSize: '0.75rem' }}>İptal</button>
                )}
                <button
                    type="button"
                    className="asura-btn-post"
                    disabled={disabled}
                    onClick={(e) => { e.preventDefault(); if (onSubmit) onSubmit(e); }}
                    onMouseDown={(e) => { e.preventDefault(); if (onSubmit) onSubmit(e); }}
                >
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}
