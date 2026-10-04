'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { getCultivationData } from '@/lib/gamification';
import BadgeIcon from './BadgeIcon';

const POLL_MS = 12000;
const MAX_LEN = 500;

// ── GIF mesajları ──────────────────────────────────────────────────────────
// GIF, sohbette `![gif](https://media*.giphy.com/...)` biçiminde düz metin olarak saklanır
// (yorumlardaki biçimle aynı). Yalnızca GIPHY alan adları kabul edilir — böylece sohbete
// rastgele harici görsel/izleyici gömülemez. Sorgu parametreleri (?cid=...) atılır.
const GIF_HOST = /^(media\d*|i)\.giphy\.com$/i;
function cleanGifUrl(raw) {
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:' || !GIF_HOST.test(u.hostname)) return null;
        if (!/^[A-Za-z0-9_.\-\/]+$/.test(u.pathname)) return null;
        return `https://${u.hostname}${u.pathname}`;
    } catch { return null; }
}
function parseGifMessage(text) {
    const m = /^!\[gif\]\((https:\/\/[^\s)]+)\)$/.exec((text || '').trim());
    return m ? cleanGifUrl(m[1]) : null;
}

function timeAgo(d) {
    if (!d) return '';
    const utcStr = typeof d === 'string' && !d.endsWith('Z') ? d.replace(' ', 'T') + 'Z' : d;
    const m = Math.floor((Date.now() - new Date(utcStr).getTime()) / 60000);
    if (m < 1) return 'az önce';
    if (m < 60) return `${m} dakika`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} saat`;
    return `${Math.floor(h / 24)} gün`;
}

// Rütbe ikonu — havacılık/gökyüzü rütbe seti — profile sayfasındaki RankIcon ile aynı ikon seti
function RankIcon({ icon, size = 12, color = 'currentColor' }) {
    const s = { width: size, height: size, flexShrink: 0 };
    if (icon === 'rocket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
    );
    if (icon === 'comet') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3l1.4 3.3L24 8l-3.6 1.7L19 13l-1.4-3.3L14 8l3.6-1.7L19 3z" fill={color} stroke="none" />
            <path d="M2 20c4-6.5 9.5-9.5 15-11" />
        </svg>
    );
    if (icon === 'radar') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} />
            <path d="M12 3v2" /><path d="M12 19v2" /><path d="M3 12h2" /><path d="M19 12h2" />
        </svg>
    );
    if (icon === 'wings') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c-1.4 4-4.8 6-10 6 2.3 3.6 6 5 10 3.6" />
            <path d="M12 3c1.4 4 4.8 6 10 6-2.3 3.6-6 5-10 3.6" />
            <path d="M12 12.6V21" />
        </svg>
    );
    if (icon === 'compass') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
    );
    if (icon === 'headset') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-6a9 9 0 1 1 18 0v6a1 1 0 0 1-1 1h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
        </svg>
    );
    if (icon === 'ticket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
        </svg>
    );
    return null;
}

const MENTION_RENDER_REGEX = /@([a-zA-Z0-9_çÇğĞıİşŞüÜöÖ]{3,30})/g;

// Kullanıcının sohbette sahip olduğu özel rozetleri (admin panelinden atanan
// VIP/Çevirmen/Yükleyici vb. ya da admin'in oluşturduğu özel rozetler) küçük
// pill'ler halinde gösterir. API artık rozetleri tam nesne (id/label/icon/color)
// olarak gönderiyor, bu yüzden burada BadgeIcon ile gerçek ikon çiziliyor.
function ChatUserBadges({ badges }) {
    if (!badges || badges.length === 0) return null;
    // API rozetleri önem sırasına göre (en önemli önce) gönderiyor;
    // sohbette kalabalık olmasın diye yalnızca en önemli rozet gösterilir.
    const b = badges[0];
    const c = b.color || '#888';
    return (
        <span key={b.id} title={b.label} className="gchat-badge-pill" style={{
            color: c,
            borderColor: `color-mix(in srgb, ${c} 65%, transparent)`,
            background: `color-mix(in srgb, ${c} 32%, var(--bg-secondary))`,
        }}>
            <BadgeIcon name={b.icon} size={10} color={c} />
            {b.label}
        </span>
    );
}

// Mesaj metnini @kullaniciadi parçalarını vurgulayarak render eder.
// Kendi kullanıcı adını etiketleyen mesajlarda vurgu daha belirgin olur.
function renderMessageWithMentions(text, currentUsername) {
    const parts = [];
    let lastIndex = 0;
    let match;
    MENTION_RENDER_REGEX.lastIndex = 0;
    let key = 0;
    while ((match = MENTION_RENDER_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }
        const isMe = currentUsername && match[1].toLowerCase() === currentUsername.toLowerCase();
        parts.push(
            <span key={key++} className={`gchat-mention${isMe ? ' gchat-mention-me' : ''}`}>@{match[1]}</span>
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }
    return parts;
}

export default function GlobalChat() {
    const { user, authFetch } = useAuth();
    const [messages, setMessages] = useState([]);
    const [canModerate, setCanModerate] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const listRef = useRef(null);
    const lastIdRef = useRef(0);
    const pollRef = useRef(null);
    const inputRef = useRef(null);

    // @-etiket autocomplete state'i
    const [mentionQuery, setMentionQuery] = useState(null); // null = aktif değil, string = "@" sonrası yazılan
    const [mentionStart, setMentionStart] = useState(-1); // input içinde "@" karakterinin index'i
    const [mentionResults, setMentionResults] = useState([]);
    const [mentionActiveIdx, setMentionActiveIdx] = useState(0);
    const mentionDebounceRef = useRef(null);
    const mentionReqIdRef = useRef(0);

    // Input değiştikçe imlecin hemen solundaki "@kelime" parçasını tespit eder.
    // Bulursa autocomplete modunu açar (mentionQuery state'ine kelimeyi yazar).
    function handleInputChange(e) {
        const value = e.target.value;
        const cursor = e.target.selectionStart ?? value.length;
        setInput(value);

        const uptoCursor = value.slice(0, cursor);
        const m = uptoCursor.match(/(?:^|\s)@([a-zA-Z0-9_çÇğĞıİşŞüÜöÖ]{0,30})$/);
        if (m) {
            setMentionStart(cursor - m[1].length - 1); // "@" karakterinin index'i
            setMentionQuery(m[1]);
            setMentionActiveIdx(0);
        } else {
            setMentionQuery(null);
            setMentionResults([]);
        }
    }

    // Debounce'lu kullanıcı arama isteği — mentionQuery değiştikçe tetiklenir
    useEffect(() => {
        if (mentionQuery === null) return;
        if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);

        if (mentionQuery.length === 0) {
            setMentionResults([]);
            return;
        }

        mentionDebounceRef.current = setTimeout(async () => {
            const reqId = ++mentionReqIdRef.current;
            try {
                const res = await authFetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`);
                const data = await res.json();
                if (reqId !== mentionReqIdRef.current) return; // eski istek — yok say
                setMentionResults(data.users || []);
            } catch {
                if (reqId === mentionReqIdRef.current) setMentionResults([]);
            }
        }, 200);

        return () => clearTimeout(mentionDebounceRef.current);
    }, [mentionQuery, authFetch]);

    // Öneri listesinden bir kullanıcı seçildiğinde "@kelime" parçasını "@username " ile değiştirir
    function selectMention(username) {
        if (mentionStart < 0) return;
        const cursor = inputRef.current?.selectionStart ?? input.length;
        const before = input.slice(0, mentionStart);
        const after = input.slice(cursor);
        const next = `${before}@${username} ${after}`;
        setInput(next);
        setMentionQuery(null);
        setMentionResults([]);
        requestAnimationFrame(() => {
            const pos = (before + '@' + username + ' ').length;
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(pos, pos);
        });
    }

    // Öneri açıkken yukarı/aşağı ok + Enter/Tab ile seçim, Esc ile kapatma
    function handleInputKeyDown(e) {
        if (mentionQuery === null || mentionResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMentionActiveIdx(i => (i + 1) % mentionResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMentionActiveIdx(i => (i - 1 + mentionResults.length) % mentionResults.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectMention(mentionResults[mentionActiveIdx].username);
        } else if (e.key === 'Escape') {
            setMentionQuery(null);
            setMentionResults([]);
        }
    }

    const scrollToBottom = useCallback((smooth) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // İlk yükleme
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/chat/messages');
                const data = await res.json();
                if (cancelled) return;
                if (data.success) {
                    setMessages(data.messages);
                    setCanModerate(!!data.canModerate);
                    if (data.messages.length > 0) lastIdRef.current = data.messages[data.messages.length - 1].id;
                }
            } catch {}
            if (!cancelled) { setLoaded(true); setTimeout(() => scrollToBottom(false), 50); }
        })();
        return () => { cancelled = true; };
    }, [scrollToBottom]);

    // Polling — yeni mesajları belli aralıkla kontrol et
    useEffect(() => {
        pollRef.current = setInterval(async () => {
            if (document.hidden) return; // sekme arka plandaysa isteği hiç atma — Edge Request tasarrufu
            try {
                const res = await fetch(`/api/chat/messages?after=${lastIdRef.current}`);
                const data = await res.json();
                if (data.success && data.messages.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const fresh = data.messages.filter(m => !existingIds.has(m.id));
                        if (fresh.length === 0) return prev;
                        return [...prev, ...fresh].slice(-100);
                    });
                    lastIdRef.current = data.messages[data.messages.length - 1].id;
                    const el = listRef.current;
                    const nearBottom = el && (el.scrollHeight - el.scrollTop - el.clientHeight < 120);
                    if (nearBottom) setTimeout(() => scrollToBottom(true), 30);
                }
                if (data.success && data.canModerate !== undefined) setCanModerate(!!data.canModerate);
            } catch {}
        }, POLL_MS);
        return () => clearInterval(pollRef.current);
    }, [scrollToBottom]);

    // "Msg" (manage_chat izinli) özel rol veya admin/manager için mesaj silme —
    // buton yalnızca canModerate=true iken görünür, ama gerçek yetki kontrolü
    // SUNUCUDA (DELETE /api/chat/messages) yapılır; bu fonksiyon yalnızca
    // isteği atar ve başarılıysa mesajı yerel listeden kaldırır.
    async function deleteMessage(id) {
        if (deletingId) return;
        if (!window.confirm('Bu mesajı silmek istediğine emin misin?')) return;
        setDeletingId(id);
        try {
            const res = await authFetch('/api/chat/messages', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: id }),
            });
            const data = await res.json();
            if (data.success || res.status === 404) {
                // 404: mesaj zaten silinmiş (başka bir yetkili silmiş olabilir) — yine de listeden kaldır
                setMessages(prev => prev.filter(m => m.id !== id));
            } else {
                setError(data.error || 'Mesaj silinemedi');
            }
        } catch {
            setError('Bir hata oluştu');
        }
        setDeletingId(null);
    }

    async function sendMessage(e) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || sending) return;
        setError('');
        setSending(true);
        try {
            const res = await authFetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message].slice(-100);
                });
                lastIdRef.current = data.message.id;
                setInput('');
                setMentionQuery(null);
                setMentionResults([]);
                setTimeout(() => scrollToBottom(true), 30);
            } else {
                setError(data.error || 'Mesaj gönderilemedi');
            }
        } catch {
            setError('Bir hata oluştu');
        }
        setSending(false);
    }

    return (
        <>
            <div className="section-header">
                <h2 className="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Sohbet
                </h2>
                <span className="gchat-live-badge">
                    <span className="gchat-live-dot" />
                    Canlı
                </span>
            </div>

            <div className="glass-panel gchat-card">
            <div className="gchat-list" ref={listRef}>
                {!loaded && <div className="gchat-empty">Yükleniyor…</div>}
                {loaded && messages.length === 0 && <div className="gchat-empty">Henüz mesaj yok — ilk mesajı sen at!</div>}
                {messages.map(m => {
                    const cult = getCultivationData(m.yomi_points);
                    const shownName = m.display_name || m.username;
                    return (
                        <div className="gchat-row" key={m.id}>
                            <Link href={`/user/${m.username}`} className="gchat-avatar-wrap" title={`@${m.username}`}>
                                {m.avatar_url && m.avatar_url !== '/default-avatar.png' ? (
                                    <img
                                        src={m.avatar_url}
                                        alt={shownName}
                                        className="gchat-avatar-img"
                                        width={36}
                                        height={36}
                                        decoding="async"
                                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <div className="gchat-avatar-fallback">{shownName?.[0]?.toUpperCase() || '?'}</div>
                                )}
                            </Link>
                            <div className="gchat-body">
                                <div className="gchat-meta">
                                    <Link href={`/user/${m.username}`} className="gchat-username" title={m.display_name ? `@${m.username}` : undefined}>{shownName}</Link>
                                    <span className="gchat-rank-pill" style={{ color: cult.color, borderColor: `color-mix(in srgb, ${cult.color} 65%, transparent)`, background: `color-mix(in srgb, ${cult.color} 32%, var(--bg-secondary))` }}>
                                        {cult.icon && <RankIcon icon={cult.icon} size={11} color={cult.color} />}
                                        {cult.title}
                                    </span>
                                    <ChatUserBadges badges={m.badges} />
                                    <span className="gchat-time">{timeAgo(m.created_at)}</span>
                                    {canModerate && (
                                        <button
                                            type="button"
                                            className="gchat-delete-btn"
                                            onClick={() => deleteMessage(m.id)}
                                            disabled={deletingId === m.id}
                                            title="Mesajı sil"
                                            aria-label="Mesajı sil"
                                            style={{
                                                marginLeft: 'auto', background: 'none', border: 'none', cursor: deletingId === m.id ? 'default' : 'pointer',
                                                color: 'var(--text-muted)', opacity: deletingId === m.id ? 0.4 : 0.7, fontSize: '0.78rem', padding: '2px 4px', lineHeight: 1,
                                            }}
                                        >
                                            🗑
                                        </button>
                                    )}
                                </div>
                                {(() => {
                                    const gifUrl = parseGifMessage(m.message);
                                    return gifUrl ? (
                                        <img
                                            src={gifUrl}
                                            alt="GIF"
                                            className="gchat-gif"
                                            loading="lazy"
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="gchat-text">{renderMessageWithMentions(m.message, user?.username)}</div>
                                    );
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {user ? (
                <form className="gchat-input-row" onSubmit={sendMessage}>
                    <div className="gchat-input-wrap">
                        {mentionQuery !== null && mentionResults.length > 0 && (
                            <div className="gchat-mention-dropdown">
                                {mentionResults.map((u, i) => (
                                    <button
                                        type="button"
                                        key={u.id}
                                        className={`gchat-mention-opt${i === mentionActiveIdx ? ' active' : ''}`}
                                        onMouseDown={(e) => { e.preventDefault(); selectMention(u.username); }}
                                        onMouseEnter={() => setMentionActiveIdx(i)}
                                    >
                                        {u.avatar_url && u.avatar_url !== '/default-avatar.png' ? (
                                            <img
                                                src={u.avatar_url}
                                                alt={u.username}
                                                className="gchat-mention-avatar"
                                                width={24}
                                                height={24}
                                                style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                                            />
                                        ) : (
                                            <span className="gchat-mention-avatar gchat-mention-avatar-fallback">
                                                {u.username?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        )}
                                        <span className="gchat-mention-uname">{u.display_name || u.username}</span>
                                        {u.display_name && <span className="gchat-mention-handle">@{u.username}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            className="form-input"
                            value={input}
                            maxLength={MAX_LEN}
                            placeholder="Bir mesaj yaz… (@ ile birini etiketle)"
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                            disabled={sending}
                        />
                    </div>
                    <span className="gchat-counter">{input.length}/{MAX_LEN}</span>
                    <button type="submit" className="btn btn-primary gchat-send-btn" disabled={sending || !input.trim()} aria-label="Gönder">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                </form>
            ) : (
                <div className="gchat-login-cta">
                    <Link href="/login">Giriş yap</Link> ve sohbete katıl
                </div>
            )}
            {error && <div className="gchat-error">{error}</div>}
            </div>

            <style jsx global>{`
                .gchat-card {
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                .gchat-gif {
                    display: block;
                    max-width: min(260px, 100%);
                    max-height: 200px;
                    width: auto; height: auto;
                    border-radius: 10px;
                    margin-top: 2px;
                    background: rgba(255,255,255,0.04);
                }
                .gchat-gif-btn {
                    flex-shrink: 0;
                    height: 38px; padding: 0 10px;
                    font-size: 0.74rem; font-weight: 800; letter-spacing: 0.04em;
                    color: var(--text-secondary);
                    background: var(--bg-tertiary, rgba(255,255,255,0.06));
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 8px; cursor: pointer;
                    transition: color .15s, border-color .15s, background .15s;
                }
                .gchat-gif-btn:hover, .gchat-gif-btn.active {
                    color: var(--accent); border-color: var(--accent);
                }
                .gchat-gif-btn:disabled { opacity: .5; cursor: not-allowed; }
                .gchat-gif-panel {
                    position: absolute;
                    left: 10px; right: 10px;
                    bottom: 66px;
                    z-index: 25;
                    display: flex; flex-direction: column; gap: 8px;
                    padding: 10px;
                    background: var(--bg-secondary, #1a1a2e);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.45);
                }
                .gchat-gif-head { display: flex; gap: 8px; align-items: center; }
                .gchat-gif-head :global(.form-input) { flex: 1; padding: 8px 10px; font-size: 0.85rem; }
                .gchat-gif-close {
                    width: 30px; height: 30px; flex-shrink: 0;
                    border: none; border-radius: 8px; cursor: pointer;
                    background: rgba(255,255,255,0.06); color: var(--text-secondary);
                }
                .gchat-gif-grid {
                    height: 240px; overflow-y: auto;
                    display: grid; grid-template-columns: repeat(3, 1fr);
                    gap: 6px; align-content: start;
                }
                .gchat-gif-item {
                    padding: 0; border: none; cursor: pointer;
                    border-radius: 8px; overflow: hidden;
                    background: rgba(255,255,255,0.05);
                    aspect-ratio: 1 / 1;
                }
                .gchat-gif-item img { width: 100%; height: 100%; object-fit: contain; display: block; }
                .gchat-gif-item:hover { outline: 2px solid var(--accent); }
                .gchat-gif-msg {
                    grid-column: 1 / -1; text-align: center;
                    padding: 24px 8px; font-size: 0.85rem; color: var(--text-muted);
                }
                .gchat-gif-powered { font-size: 0.68rem; color: var(--text-muted); text-align: right; }
                .gchat-live-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    font-size: 0.78rem; font-weight: 700; color: var(--success);
                    background: rgba(45,206,137,0.12);
                    border: 1px solid rgba(45,206,137,0.3);
                    border-radius: 20px;
                    padding: 4px 12px;
                }
                .gchat-live-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: var(--success);
                    box-shadow: 0 0 0 0 rgba(45,206,137,0.5);
                    animation: gchat-pulse 2s infinite;
                }
                @keyframes gchat-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(45,206,137,0.5); }
                    70% { box-shadow: 0 0 0 7px rgba(45,206,137,0); }
                    100% { box-shadow: 0 0 0 0 rgba(45,206,137,0); }
                }
                .gchat-list {
                    height: 380px;
                    overflow-y: auto;
                    padding: 14px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .gchat-empty {
                    margin: auto;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }
                .gchat-row { display: flex; gap: 10px; align-items: flex-start; isolation: isolate; }
                .gchat-avatar-wrap {
                    position: relative;
                    display: block;
                    width: 36px; height: 36px;
                    flex-shrink: 0;
                    text-decoration: none;
                }
                .gchat-avatar-img, .gchat-avatar-fallback {
                    width: 100%; height: 100%; border-radius: 50%;
                    object-fit: cover;
                }
                .gchat-avatar-fallback {
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-tertiary);
                    border: 1.5px solid rgba(255,255,255,0.18);
                    box-shadow: 0 0 0 2px var(--bg-secondary);
                    font-weight: 800; color: var(--text-primary);
                }
                .gchat-body { flex: 1; min-width: 0; }
                .gchat-meta {
                    display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
                    margin-bottom: 3px;
                }
                .gchat-username {
                    font-weight: 700; font-size: 0.9rem;
                    color: inherit; text-decoration: none;
                }
                .gchat-username:hover { text-decoration: underline; }
                .gchat-rank-pill {
                    display: inline-flex; align-items: center; gap: 4px;
                    font-size: 0.68rem; font-weight: 700;
                    padding: 1px 8px; border-radius: 20px;
                    border: 1px solid;
                }
                .gchat-badge-pill {
                    display: inline-flex; align-items: center; gap: 3px;
                    font-size: 0.66rem; font-weight: 700;
                    padding: 1px 7px; border-radius: 20px;
                    border: 1px solid;
                    white-space: nowrap;
                }
                .gchat-time { font-size: 0.72rem; color: var(--text-muted); margin-left: auto; }
                .gchat-text {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    word-break: break-word;
                    white-space: pre-wrap;
                }
                .gchat-text :global(.gchat-mention) {
                    color: var(--accent);
                    font-weight: 700;
                    background: rgba(var(--accent-rgb, 99, 102, 241), 0.12);
                    border-radius: 4px;
                    padding: 0 3px;
                }
                .gchat-text :global(.gchat-mention-me) {
                    background: rgba(255, 193, 7, 0.18);
                    color: #ffc107;
                }
                .gchat-input-row {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .gchat-input-wrap {
                    position: relative;
                    flex: 1;
                    min-width: 0;
                }
                .gchat-input-row :global(.form-input) {
                    width: 100%;
                    padding: 10px 12px;
                    font-size: 0.88rem;
                }
                .gchat-mention-dropdown {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    max-height: 220px;
                    overflow-y: auto;
                    background: var(--bg-secondary, #1a1a2e);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                    padding: 6px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    z-index: 20;
                }
                .gchat-mention-opt {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 6px 8px;
                    background: none;
                    border: none;
                    border-radius: 7px;
                    cursor: pointer;
                    text-align: left;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }
                .gchat-mention-opt.active,
                .gchat-mention-opt:hover {
                    background: rgba(255, 255, 255, 0.08);
                }
                .gchat-mention-avatar {
                    width: 24px; height: 24px;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                .gchat-mention-avatar-fallback {
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-tertiary);
                    font-weight: 800; font-size: 0.7rem;
                }
                .gchat-mention-uname { font-weight: 700; }
                .gchat-mention-handle { color: var(--text-muted); font-size: 0.75rem; }
                .gchat-counter { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
                .gchat-send-btn {
                    width: 38px; height: 38px; padding: 0; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .gchat-login-cta {
                    padding: 14px 18px;
                    text-align: center;
                    font-size: 0.88rem;
                    color: var(--text-muted);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .gchat-login-cta a { color: var(--accent); font-weight: 700; }
                .gchat-error {
                    padding: 8px 18px;
                    font-size: 0.8rem;
                    color: var(--danger);
                }
                @media (max-width: 640px) {
                    .gchat-list { height: 300px; }
                }
            `}</style>
        </>
    );
}
