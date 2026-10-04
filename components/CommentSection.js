'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';
import { getCultivationData } from '@/lib/gamification';
import BadgeIcon from './BadgeIcon';
import { getAppSettings } from '@/lib/settingsCache';
import { isAllowedImageUrl, ALLOWED_HOSTS_LABEL } from '@/lib/commentImages';

// GIPHY GIF search — proxied via /api/gif to avoid CORS/rate-limit issues

const DEFAULT_SERIES_EMOJIS = [
    { icon: '👍', label: 'Beğen' },
    { icon: '😂', label: 'Komik' },
    { icon: '❤️', label: 'Sevgi' },
    { icon: '😲', label: 'Şaşkın' },
    { icon: '😠', label: 'Kızgın' },
    { icon: '😢', label: 'Üzgün' },
];
const REPORT_REASONS = ['Spam veya yanıltıcı', 'Taciz veya zorbalık', 'Nefret söylemi', 'Uygunsuz içerik', 'Uyarısız spoiler', 'Diğer'];

const ThumbUpIcon = ({ filled }) => <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" /></svg>;
const ThumbDownIcon = ({ filled }) => <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" /></svg>;
const ReplyIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>;
const MoreIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>;
const EditIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const FlagIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
const BoldIcon = () => <span style={{fontWeight:'900', fontFamily:'serif', fontSize:'13px', lineHeight:1}}>B</span>;
const ItalicIcon = () => <span style={{fontStyle:'italic', fontFamily:'serif', fontSize:'13px', lineHeight:1}}>I</span>;
const StrikeIcon = () => <span style={{textDecoration:'line-through', fontSize:'13px', lineHeight:1}}>S</span>;
// InlineSpoilerIcon = pipes icon for ||spoiler||
const InlineSpoilerIcon = () => (
    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '12px', letterSpacing: '-2px', lineHeight: 1 }}>||</span>
);
// SpoilerTagIcon = eye-off for whole-comment spoiler tag
const SpoilerTagIcon = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>
    </svg>
);
const GifIcon = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="3"/>
        <path d="M8 12h4M10 10v4"/>
        <path d="M15 12h1.5a1.5 1.5 0 0 0 0-3H15v6"/>
        <text x="4" y="16" fontSize="8" fill="currentColor" stroke="none" fontWeight="900">GIF</text>
    </svg>
);
const PinIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>;

function UserBadges({ badges }) {
    if (!badges || badges.length === 0) return null;
    // API rozetleri önem sırasına göre (en önemli önce) gönderiyor;
    // yorumlarda kalabalık olmasın diye yalnızca en önemli rozet gösterilir.
    const b = badges[0];
    return (
        <>
            <span key={b.id} title={b.label} style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '0.72rem', padding: '1px 6px',
                borderRadius: 4,
                background: b.color ? `${b.color}18` : 'var(--bg-tertiary)',
                border: `1px solid ${b.color ? b.color + '55' : 'var(--border-color)'}`,
                color: b.color || 'var(--text-primary)',
                fontWeight: 600,
                gap: 3,
            }}>
                <BadgeIcon name={b.icon} size={11} color={b.color || 'currentColor'} />
                {b.label}
            </span>
        </>
    );
}
const ShieldIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;

export default function CommentSection({ chapterId, seriesId }) {
    const contextId = chapterId || seriesId;
    const { user, authFetch } = useAuth();
    const router = useRouter();
    const [appSettings, setAppSettings] = useState({});

    // Derive emoji list from saved settings (admin-editable) or fall back to defaults
    const seriesEmojis = (() => {
        try {
            const saved = appSettings.comment_emojis ? JSON.parse(appSettings.comment_emojis) : null;
            if (saved && Array.isArray(saved) && saved.length > 0) return saved;
        } catch {}
        return DEFAULT_SERIES_EMOJIS;
    })();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [paragraphIndex, setParagraphIndex] = useState(null);
    const [isSpoilerComment, setIsSpoilerComment] = useState(false);
    const [isSpoilerReply, setIsSpoilerReply] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [openMenu, setOpenMenu] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [sortBy, setSortBy] = useState('best');
    const [deleteModal, setDeleteModal] = useState(null);
    const [reportModal, setReportModal] = useState(null);
    const [reportReason, setReportReason] = useState('');
    // Comment report cooldown (60 seconds between reports)
    const [reportCooldown, setReportCooldown] = useState({});
    const [reportCooldownEnd, setReportCooldownEnd] = useState(null);
    const [reportDetails, setReportDetails] = useState('');
    const [toast, setToast] = useState('');
    const [mounted, setMounted] = useState(false);
    const [imageUrlModal, setImageUrlModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    // GIF modal state
    const [gifModal, setGifModal] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifResults, setGifResults] = useState([]);
    const [gifLoading, setGifLoading] = useState(false);
    const [gifTarget, setGifTarget] = useState('main'); // 'main' | 'reply'
    const gifSearchRef = useRef(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalComments, setTotalComments] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [customRoles, setCustomRoles] = useState([]);

    // Series Reactions Widget
    const [seriesReactCounts, setSeriesReactCounts] = useState({});
    const [activeReaction, setActiveReaction] = useState(null);
    const [shownReplies, setShownReplies] = useState(new Set());

    const menuRef = useRef(null);
    const newCommentRef = useRef(null);
    const replyContentRef = useRef(null);

    // GIF search function — routed through /api/gif (GIPHY) proxy
    const searchGifs = useCallback(async (query) => {
        setGifLoading(true);
        try {
            const url = query.trim()
                ? `/api/gif?q=${encodeURIComponent(query.trim())}&limit=20`
                : `/api/gif?limit=20`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('GIPHY fetch failed');
            const data = await res.json();
            setGifResults(data.results || []);
        } catch {
            setGifResults([]);
        }
        setGifLoading(false);
    }, []);

    useEffect(() => {
        if (gifModal) {
            searchGifs('');
            setTimeout(() => gifSearchRef.current?.focus(), 100);
        }
    }, [gifModal, searchGifs]);

    // Live search debounce for GIF modal
    useEffect(() => {
        if (gifModal && gifSearch !== undefined) {
            const delayDebounceFn = setTimeout(() => {
                searchGifs(gifSearch);
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [gifSearch, gifModal, searchGifs]);

    function openGifModal(target) {
        setGifTarget(target);
        setGifSearch('');
        setGifModal(true);
    }

    function insertGif(gifUrl) {
        const markdown = `\n![gif](${gifUrl})\n`;
        if (gifTarget === 'reply') {
            setReplyContent(prev => prev + markdown);
        } else {
            setNewComment(prev => prev + markdown);
        }
        setGifModal(false);
    }

    useEffect(() => {
        getAppSettings().then(settings => setAppSettings(settings)).catch(() => {});
    }, []);

    useEffect(() => {
        fetch('/api/admin/users?action=list-custom-roles', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.roles) setCustomRoles(data.roles); })
            .catch(() => {});
    }, []);

useEffect(() => {
        fetchComments(1, false);
        if (seriesId) fetchSeriesReactions();
        if (seriesId && typeof window !== 'undefined') {
            // Bölüm bazlı anahtar: her bölüm kendi tepkisini bağımsız saklar
            const storageKey = chapterId
                ? `chapter_reaction_${chapterId}`
                : `series_reaction_${seriesId}`;
            const stored = localStorage.getItem(storageKey);
            if (stored && !user) setActiveReaction(stored);
        }
    }, [contextId, seriesId, sortBy]);

    useEffect(() => {
        setMounted(true);
        const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
        
        const handleInlineComment = (e) => {
            if (e.detail?.paragraphIndex !== undefined) {
                setParagraphIndex(e.detail.paragraphIndex);
                if (newCommentRef.current) {
                    newCommentRef.current.focus();
                }
            }
        };

        document.addEventListener('mousedown', handleClick);
        window.addEventListener('inline-comment', handleInlineComment);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('inline-comment', handleInlineComment);
        };
    }, []);

    async function fetchSeriesReactions() {
        if (!seriesId) return;
        try {
            const params = chapterId
                ? `seriesId=${seriesId}&chapterId=${chapterId}`
                : `seriesId=${seriesId}`;
            const res = await authFetch(`/api/series-reactions?${params}`);
            if (!res) return;
            const data = await res.json();
            if (data.success) {
                setSeriesReactCounts(data.counts || {});
                if (data.userReactions && data.userReactions.length > 0) {
                    setActiveReaction(data.userReactions[0]);
                }
            }
        } catch(err) { console.error(err); }
    }

    async function toggleSeriesReaction(emoji) {
        const currentlyActive = activeReaction === emoji;
        const previousReaction = activeReaction;
        // Her bölüm/seri için ayrı localStorage anahtarı
        const storageKey = chapterId
            ? `chapter_reaction_${chapterId}`
            : `series_reaction_${seriesId}`;

        if (!user) {
            if (currentlyActive) {
                setActiveReaction(null);
                localStorage.removeItem(storageKey);
                setSeriesReactCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
            } else {
                setActiveReaction(emoji);
                localStorage.setItem(storageKey, emoji);
                setSeriesReactCounts(prev => {
                    const next = { ...prev };
                    if (previousReaction) next[previousReaction] = Math.max(0, (next[previousReaction] || 0) - 1);
                    next[emoji] = (next[emoji] || 0) + 1;
                    return next;
                });
            }
            return;
        }

        if (currentlyActive) {
            setActiveReaction(null);
            setSeriesReactCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
        } else {
            setActiveReaction(emoji);
            setSeriesReactCounts(prev => {
                const next = { ...prev };
                if (previousReaction) next[previousReaction] = Math.max(0, (next[previousReaction] || 0) - 1);
                next[emoji] = (next[emoji] || 0) + 1;
                return next;
            });
        }

        try {
            await authFetch('/api/series-reactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seriesId, chapterId: chapterId || null, emoji })
            });
        } catch(err) { console.error(err); }
    }

    async function fetchComments(pageNum = 1, append = false) {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        try {
            const param = chapterId ? `chapterId=${chapterId}` : `seriesId=${seriesId}`;
            const res = await fetch(`/api/comments?${param}&page=${pageNum}&limit=20&sort=${sortBy}`);
            const data = await res.json();
            if (data.comments) {
                if (append) setComments(prev => [...prev, ...data.comments]);
                else setComments(data.comments);
                setHasMore(data.hasMore);
                setTotalComments(data.total);
                setPage(pageNum);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); setLoadingMore(false); }
    }

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!newComment.trim()) { showToast('Yorum boş!'); return; }
        if (!user) { showToast('Giriş yapmalısınız!'); return; }
        if (submitting) return;
        setSubmitting(true);
        try {
            const body = { content: newComment.trim(), isSpoiler: isSpoilerComment };
            if (paragraphIndex !== null) body.paragraphIndex = paragraphIndex;
            if (chapterId) body.chapterId = chapterId; else body.seriesId = seriesId;
            const res = await authFetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.comment) { 
                setComments([data.comment, ...comments]); 
                setNewComment(''); 
                setIsSpoilerComment(false); 
                setParagraphIndex(null);
            } else {
                showToast(data.error || 'Yorum gönderilemedi');
            }
        } catch (err) { showToast('Bir hata oluştu: ' + err.message); console.error(err); }
        finally { setSubmitting(false); }
    }

    async function handleReply(parentId) {
        if (!replyContent.trim() || !user || replySubmitting) return;
        setReplySubmitting(true);
        try {
            const body = { content: replyContent.trim(), parentId, isSpoiler: isSpoilerReply };
            if (chapterId) body.chapterId = chapterId; else body.seriesId = seriesId;
            const res = await authFetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.comment) {
                setComments(comments.map(c => c.id === parentId
                    ? { ...c, replies: [...(Array.isArray(c.replies) ? c.replies : []), { ...data.comment, reactions: [] }] }
                    : c
                ));
                setReplyTo(null); setReplyContent(''); setIsSpoilerReply(false);
            } else {
                showToast(data.error || 'Yanıtlama başarısız');
            }
        } catch (err) { showToast('Bir hata oluştu: ' + err.message); console.error(err); }
        finally { setReplySubmitting(false); }
    }
    async function handleReaction(commentId, emoji) {
        if (!user) { showToast('Yorumlara tepki vermek için giriş yapmalısınız'); return; }
        try {
            const res = await authFetch(`/api/comments/${commentId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) });
            const data = await res.json();
            if (data.reactions !== undefined) {
                setComments(comments.map(c => {
                    if (c.id === commentId) return { ...c, reactions: data.reactions };
                    if (c.replies) return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, reactions: data.reactions } : r) };
                    return c;
                }));
            }
        } catch (err) { console.error(err); }
    }

    async function saveEdit(commentId) {
        if (!editContent.trim()) return;
        try {
            await authFetch(`/api/comments/${commentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editContent.trim() }),
            });
            setComments(comments.map(x => {
                if (x.id === commentId) return { ...x, content: editContent.trim() };
                if (x.replies) return { ...x, replies: x.replies.map(r => r.id === commentId ? { ...r, content: editContent.trim() } : r) };
                return x;
            }));
            setEditingComment(null);
            showToast('Yorum güncellendi.');
        } catch (err) { showToast('Düzenleme kaydedilemedi.'); console.error(err); }
    }

    async function handleDeleteConfirm() {
        if (!deleteModal) return;
        try { await authFetch(`/api/comments/${deleteModal}`, { method: 'DELETE' }); } catch (err) { console.error('Delete failed:', err); }
        setComments(comments.filter(c => c.id !== deleteModal).map(c => ({ ...c, replies: c.replies ? c.replies.filter(r => r.id !== deleteModal) : [] })));
        setDeleteModal(null); showToast('Yorum silindi.');
    }

    async function handlePin(commentId) {
        const builtinCanPin = user && (user.role === 'admin' || user.role === 'manager');
        const customCanPin = user && customRoles.some(r => r.name === user.role);
        if (!user || (!builtinCanPin && !customCanPin)) return;
        try {
            const res = await authFetch(`/api/comments/${commentId}/pin`, { method: 'PUT' });
            const data = await res.json();
            if (data.success) {
                // Functional update ile stale closure önlendi
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: data.is_pinned } : c));
                showToast(data.is_pinned ? 'Yorum sabitlendi.' : 'Sabitleme kaldırıldı.');
            } else {
                showToast(data.error || 'Sabitleme başarısız.');
            }
        } catch (err) { console.error(err); showToast('Sabitleme başarısız oldu.'); }
    }

    function handleReportSubmit() {
        if (!reportReason) return;
        if (!user) { router.push('/login'); return; }

        const now = Date.now();
        const lastReport = reportCooldownEnd;
        if (lastReport && now < lastReport) {
            const remaining = Math.ceil((lastReport - now) / 1000);
            showToast(`Lütfen ${remaining} saniye bekleyin.`);
            return;
        }

        // Set cooldown (60 seconds)
        setReportCooldownEnd(now + 60000);

        // Submit to API (authFetch ile token gönder)
        authFetch('/api/reports/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentId: reportModal, reason: reportReason, details: reportDetails })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast('Bildirim gönderildi. Teşekkürler.');
            } else {
                showToast(data.error || 'Bildirim gönderilemedi.');
            }
        })
        .catch(() => {
            showToast('Bildirim gönderilemedi.');
        });

        setReportModal(null); setReportReason('');
    }

    function timeAgo(d) {
        if (!d) return '';
        const utcStr = typeof d === 'string' && !d.endsWith('Z') ? d + 'Z' : (typeof d === 'string' ? d : String(d));
        const m = Math.floor((Date.now() - new Date(utcStr).getTime()) / 60000);
        if (m < 60) return `${Math.max(1,m)}dk önce`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}sa önce`;
        return `${Math.floor(h / 24)}g önce`;
    }

    function getCount(c, emoji) { const r = (c.reactions || []).find(x => x.emoji === emoji); return r ? r.count : 0; }
    function isActive(c, emoji) { const r = (c.reactions || []).find(x => x.emoji === emoji); return r && user && r.user_ids?.split(',').includes(String(user.id)); }

    // Insert format into main comment textarea
    function insertFormat(prefix, suffix = '') {
        const textarea = newCommentRef.current;
        if (!textarea) { setNewComment(prev => prev + prefix + 'text' + suffix); return; }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end) || 'text';
        const newVal = textarea.value.substring(0, start) + prefix + selected + suffix + textarea.value.substring(end);
        setNewComment(newVal);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 0);
    }

    // Insert format into reply textarea
    function insertReplyFormat(prefix, suffix = '') {
        const textarea = replyContentRef.current;
        if (!textarea) { setReplyContent(prev => prev + prefix + 'text' + suffix); return; }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end) || 'text';
        const newVal = textarea.value.substring(0, start) + prefix + selected + suffix + textarea.value.substring(end);
        setReplyContent(newVal);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 0);
    }

    function renderMarkdown(rawText) {
        if (!rawText) return null;
        // GÜVENLİK: & < > " ' hepsi escape edilir (attribute'tan çıkıp event handler
        // enjekte etmeyi engeller). Ayrıca görseller, ** * ~~ || biçimlendirmelerinden ÖNCE
        // placeholder'a alınır: aksi halde URL/alt içindeki ||..|| veya *..* HTML üretip
        // src/alt attribute'unu bozabiliyordu. Görsel etiketi en son, güvenli biçimde kurulur.
        const images = [];
        let html = String(rawText)
            .replace(/\u0000/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/!\[([^\]]*)\]\(([^)\s]*)\)/g, (match, alt, url) => {
                // GÜVENLİK / GİZLİLİK: Yalnızca izin listesindeki servislerin (GIPHY, imgbb)
                // https görselleri gösterilir. Rastgele bir siteye istek atan görsel (IP logger)
                // yorumu açan herkesin IP'sini o siteye sızdırırdı. İzin verilmeyen görseller
                // yüklenmez; yerine kısa bir uyarı gösterilir (eski yorumlar da bu kurala tabidir).
                if (!isAllowedImageUrl(url.replace(/&amp;/g, '&'))) {
                    images.push('<em style="opacity:0.6;font-size:0.85em;">[izin verilmeyen görsel kaldırıldı]</em>');
                    return `\u0000IMG${images.length - 1}\u0000`;
                }
                const safeAlt = alt.replace(/[|*~]/g, '');
                images.push(`<img src="${url}" alt="${safeAlt}" referrerpolicy="no-referrer" style="max-width:100%; display:block; border-radius:4px; margin-top:8px;" decoding="async" loading="lazy" />`);
                return `\u0000IMG${images.length - 1}\u0000`;
            })
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/\|\|(.*?)\|\|/g, '<span class="spoiler-text" onclick="this.classList.toggle(&#39;revealed&#39;)" title="Click to reveal spoiler">$1</span>')
            .replace(/\n/g, '<br />')
            .replace(/\u0000IMG(\d+)\u0000/g, (m, i) => images[Number(i)] || '');
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }

    function getRankBadgeParams(rank) {
        if (!rank) return null;
        if (rank === 1)  return { class: 'asura-badge-1',    rank };
        if (rank <= 3)   return { class: 'asura-badge-top3', rank };
        if (rank <= 10)  return { class: 'asura-badge-top',  rank };
        if (rank <= 50)  return { class: 'asura-badge-mid',  rank };
        return null;
    }

    function toggleReplies(commentId) {
        const newSet = new Set(shownReplies);
        if (newSet.has(commentId)) newSet.delete(commentId);
        else newSet.add(commentId);
        setShownReplies(newSet);
    }

    // Shared toolbar component for both new comment and reply
    function CommentToolbar({ onBold, onItalic, onStrike, onInlineSpoiler, isSpoilerTag, onToggleSpoilerTag, charCount, maxChars, onSubmit, submitLabel, disabled, onCancel, onGif }) {
        return (
            <div className="asura-comment-toolbar">
                <div className="asura-toolbar-left">
                    <button type="button" className="asura-toolbar-btn" title="Kalın" onClick={onBold}><BoldIcon/></button>
                    <button type="button" className="asura-toolbar-btn" title="İtalik" onClick={onItalic}><ItalicIcon/></button>
                    <button type="button" className="asura-toolbar-btn" title="Üstü Çizili" onClick={onStrike}><StrikeIcon/></button>
                    <button
                        type="button"
                        className="asura-toolbar-btn"
                        title="Satır içi spoiler (||metin||)"
                        onClick={onInlineSpoiler}
                        style={{ fontFamily: 'monospace', letterSpacing: '-1px', fontWeight: 800, fontSize: '13px' }}
                    >
                        <InlineSpoilerIcon/>
                    </button>
                    {onGif && (
                        <button type="button" className="asura-toolbar-btn" title="GIF Ekle" onClick={onGif}>
                            <GifIcon/>
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
                        <SpoilerTagIcon/>
                        <span style={{
                            fontSize: '0.7rem',
                            marginLeft: 3,
                            color: isSpoilerTag ? 'var(--warning, #f59e0b)' : 'var(--text-muted)',
                            fontWeight: isSpoilerTag ? 700 : 400
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
                    <button type="button" className="asura-btn-post" disabled={disabled} onClick={(e) => { e.preventDefault(); if (onSubmit) onSubmit(e); }} onMouseDown={(e) => { e.preventDefault(); if (onSubmit) onSubmit(e); }}>
                        {submitLabel}
                    </button>
                </div>
            </div>
        );
    }

    function renderComment(c, isReply = false) {
        const isOwner = user && c.user_id === user.id;
        const isAdmin = user && (user.role === 'admin' || user.role === 'manager' || customRoles.some(r => r.name === user.role));
        const badge = getRankBadgeParams(c.leaderboard_rank);
        const replyCount = c.replies ? c.replies.length : c.reply_count;
        const isShown = shownReplies.has(c.id);
        const cultivation = getCultivationData(c.yomi_points || 0);
        const userAvatar = (!c.avatar_url || c.avatar_url === '/default-avatar.png') ? null : c.avatar_url;
        const isRevealed = revealedSpoilers.has(c.id);
        const builtinOfficialRoles = ['admin', 'manager'];
        const isCustomOfficial = customRoles.some(r => r.name === c.role);
        const isOfficial = builtinOfficialRoles.includes(c.role) || isCustomOfficial;
        const officialLabel = isCustomOfficial
            ? (customRoles.find(r => r.name === c.role)?.label || 'Yetkili')
            : 'Yetkili';

        return (
            <div key={c.id} className={`${isReply ? "asura-reply-row" : "asura-comment-row"} ${isOfficial ? "official-comment" : ""} ${c.is_pinned ? "pinned-comment" : ""}`}>
                <div className="asura-comment-avatar-wrapper">
                    <Link href={`/user/${encodeURIComponent(c.username)}`} style={{ display: 'block', textDecoration: 'none' }} title={`@${c.username}`}>
                    {userAvatar ? (
                        <img src={userAvatar} alt={c.username} className="asura-comment-avatar" decoding="async" />
                    ) : (
                        <div className="asura-comment-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem' }}>
                            {c.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    </Link>
                    {badge && (
                        <div className={`asura-avatar-badge ${badge.class}`}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ flexShrink: 0 }}>
                                <path d="M2 19h20l-2-10-5 5-3-8-3 8-5-5L2 19z"/>
                                <rect x="2" y="20" width="20" height="2" rx="1"/>
                            </svg>
                            <span>#{badge.rank}</span>
                        </div>
                    )}
                </div>

                <div className="asura-comment-content">
                    <div className="asura-comment-meta" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Link href={`/user/${encodeURIComponent(c.username)}`} style={{ textDecoration: 'none' }}>
                            <span className="asura-comment-username" style={{ cursor: 'pointer', ...(isOfficial ? { color: '#ffd700', textShadow: '0 0 5px rgba(255, 215, 0, 0.3)' } : {}) }}>
                                {c.username}
                            </span>
                        </Link>
                                            <UserBadges badges={c.badges} />
                                            {isOfficial && (
                                <span className="official-badge" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: '0.65rem', fontWeight: 800,
                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                    <ShieldIcon />
                                    {officialLabel}
                                </span>
                            )}
                            {!!c.is_pinned && (
                                <span className="pinned-badge">
                                    <PinIcon /> Sabitlendi
                                </span>
                            )}
                            <span className="asura-comment-time">{timeAgo(c.created_at)}</span>
                            {c.paragraph_index !== null && c.paragraph_index !== undefined && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: '0.65rem', fontWeight: 600,
                                    color: 'var(--accent-light, #9ca3af)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 4, padding: '1px 5px',
                                }}>
                                    Paragraf {c.paragraph_index + 1}
                                </span>
                            )}
                            {!!c.is_spoiler && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: '0.65rem', fontWeight: 700,
                                    color: 'var(--warning, #f59e0b)',
                                    background: 'rgba(245,158,11,0.1)',
                                    border: '1px solid rgba(245,158,11,0.25)',
                                    borderRadius: 4, padding: '1px 5px',
                                    textTransform: 'uppercase', letterSpacing: '0.4px'
                                }}>
                                    <SpoilerTagIcon/>
                                    Spoiler
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: cultivation.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {cultivation.title}
                        </span>
                    </div>

                    {editingComment === c.id ? (
                        <div style={{ marginBottom: 12 }}>
                            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                className="asura-comment-textarea"
                                style={{ minHeight: 60, padding: '8px', border: '1px solid #444', borderRadius: '4px' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c.id); }
                                    if (e.key === 'Escape') setEditingComment(null);
                                }}
                                autoFocus />
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                <button className="asura-btn-post" onClick={() => saveEdit(c.id)}>Kaydet</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingComment(null)}>İptal</button>
                            </div>
                        </div>
                    ) : (
                        /* Spoiler: only blur the text, click to reveal */
                        <div
                            className="asura-comment-text"
                            style={c.is_spoiler && !isRevealed ? {
                                filter: 'blur(6px)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'filter 0.25s ease',
                                WebkitUserSelect: 'none',
                            } : {
                                transition: 'filter 0.25s ease',
                            }}
                            onClick={c.is_spoiler && !isRevealed ? () => setRevealedSpoilers(prev => new Set([...prev, c.id])) : undefined}
                            title={c.is_spoiler && !isRevealed ? 'Spoileri görmek için tıklayın' : undefined}
                        >
                            {renderMarkdown(c.content)}
                        </div>
                    )}

                    {/* Hide spoiler button after revealing */}
                    {!!c.is_spoiler && isRevealed && editingComment !== c.id && (
                        <button
                            onClick={() => setRevealedSpoilers(prev => { const n = new Set(prev); n.delete(c.id); return n; })}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                marginTop: 2, fontSize: '0.72rem',
                                color: 'var(--text-muted)', background: 'none',
                                border: 'none', cursor: 'pointer',
                                padding: '2px 4px', borderRadius: 4, opacity: 0.7,
                            }}
                        >
                            <SpoilerTagIcon/> {appSettings.lang_hide_spoiler || 'Spoileri gizle'}
                        </button>
                    )}

                    <div className="asura-comment-actions">
                        {!c.is_deleted && (
                            <>
                                <button className={`asura-action-btn ${isActive(c, '👍') ? 'active' : ''}`} onClick={() => handleReaction(c.id, '👍')} title="Beğen">
                                    <ThumbUpIcon filled={isActive(c, '👍')} /> {getCount(c, '👍') > 0 && <span>{getCount(c, '👍')}</span>}
                                </button>
                                <button className={`asura-action-btn ${isActive(c, '👎') ? 'active' : ''}`} onClick={() => handleReaction(c.id, '👎')} title="Beğenme">
                                    <ThumbDownIcon filled={isActive(c, '👎')} /> {getCount(c, '👎') > 0 && <span>{getCount(c, '👎')}</span>}
                                </button>
                                {!isReply && user && (
                                    <button className="asura-action-btn" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setIsSpoilerReply(false); setReplyContent(''); }}>
                                        <ReplyIcon /> {appSettings.lang_reply || 'Yanıtla'}
                                    </button>
                                )}
                            </>
                        )}
                        {user && (
                            <div style={{position: 'relative'}} ref={openMenu === c.id ? menuRef : null}>
                                <button className="asura-action-btn" onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}><MoreIcon /></button>
                                {openMenu === c.id && (
                                    <div className="comment-menu" style={{ left: 0, right: 'auto', minWidth: 160 }}>
                                        {isAdmin && (
                                            <>
                                                <button className="comment-menu-item" onClick={() => { handlePin(c.id); setOpenMenu(null); }}>
                                                    <PinIcon /> {c.is_pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                                                </button>
                                                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}></div>
                                            </>
                                        )}
                                        {!c.is_deleted && (isOwner || isAdmin) && (
                                            <>
                                                <button className="comment-menu-item" onClick={() => { setEditingComment(c.id); setEditContent(c.content); setOpenMenu(null); }}><EditIcon /> {appSettings.lang_edit || 'Düzenle'}</button>
                                                <button className="comment-menu-item danger" onClick={() => { setDeleteModal(c.id); setOpenMenu(null); }}><TrashIcon /> {appSettings.lang_delete || 'Sil'}</button>
                                            </>
                                        )}
                                        {!c.is_deleted && !isOwner && <button className="comment-menu-item danger" onClick={() => { setReportModal(c.id); setOpenMenu(null); }}><FlagIcon /> {appSettings.lang_report || 'Bildir'}</button>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reply Input — now has full toolbar with formatting + spoiler toggle */}
                    {replyTo === c.id && (
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div className="asura-comment-avatar-wrapper" style={{ flexShrink: 0, width: 32, height: 32 }}>
                                    {(!user.avatar_url || user.avatar_url === '/default-avatar.png') ? (
                                        <div className="asura-comment-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem', width: 32, height: 32 }}>
                                            {user.username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    ) : (
                                        <img src={user.avatar_url} alt={user.username} className="asura-comment-avatar" style={{ width: 32, height: 32 }} decoding="async" />
                                    )}
                                </div>
                                <div className="asura-comment-input-container" style={{ flexGrow: 1 }}>
                                    <textarea
                                        ref={replyContentRef}
                                        className="asura-comment-textarea"
                                        placeholder={appSettings.lang_reply_to || 'Yanıtınızı yazın...'}
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply(c.id)}
                                        autoFocus
                                    />
                                    <CommentToolbar
                                        onBold={() => insertReplyFormat('**', '**')}
                                        onItalic={() => insertReplyFormat('*', '*')}
                                        onStrike={() => insertReplyFormat('~~', '~~')}
                                        onInlineSpoiler={() => insertReplyFormat('||', '||')}
                                        onGif={chapterId ? () => openGifModal('reply') : undefined}
                                        isSpoilerTag={isSpoilerReply}
                                        onToggleSpoilerTag={() => setIsSpoilerReply(v => !v)}
                                        submitLabel={appSettings.lang_reply || 'Yanıtla'}
                                        disabled={!replyContent.trim()}
                                        onSubmit={() => handleReply(c.id)}
                                        onCancel={() => { setReplyTo(null); setReplyContent(''); setIsSpoilerReply(false); }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Replies Section */}
                    {replyCount > 0 && !isReply && (
                        <>
                            <button className="asura-replies-toggle" onClick={() => toggleReplies(c.id)}>
                                {!isShown ? (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg> {appSettings.lang_show_replies || 'Göster'} {replyCount} {appSettings.lang_replies_label || 'yanıt'}</>
                                ) : (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg> {appSettings.lang_hide_replies || 'Gizle'} {replyCount} {appSettings.lang_replies_label || 'yanıt'}</>
                                )}
                            </button>
                            {isShown && c.replies && c.replies.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                    {c.replies.map(r => renderComment(r, true))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '40px' }} className={`comment-section-wrapper ${appSettings.comment_design || 'comment_style1'}`}>
            <style dangerouslySetInnerHTML={{ __html: `
                /* Global Comment Enhancements */
                .asura-comment-row, .asura-reply-row {
                    position: relative;
                    z-index: 1;
                }
                .asura-comment-row:hover, .asura-reply-row:hover {
                    z-index: 40;
                }

                /* ==============================
                   Sabitlenmiş Yorum — Yeniden Tasarım
                   ============================== */
                .pinned-comment {
                    border: 2px solid rgba(var(--accent-rgb, 94,114,228), 0.5) !important;
                    background: linear-gradient(160deg,
                        rgba(var(--accent-rgb, 94,114,228), 0.12) 0%,
                        rgba(var(--accent-rgb, 94,114,228), 0.04) 50%,
                        transparent 100%) !important;
                    box-shadow: 0 0 0 1px rgba(var(--accent-rgb, 94,114,228), 0.15),
                                0 4px 20px rgba(0,0,0,0.25),
                                0 0 20px rgba(var(--accent-rgb, 94,114,228), 0.1) !important;
                    position: relative;
                    border-radius: 12px !important;
                    padding: 16px !important;
                    margin: 12px 0 !important;
                }
                /* Sabitlenmiş rozeti — ismin yanında, satır içi */
                .pinned-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 0.62rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #fff;
                    background: var(--accent);
                    border: none;
                    padding: 2px 7px;
                    border-radius: 8px;
                    flex-shrink: 0;
                    white-space: nowrap;
                    vertical-align: middle;
                    line-height: 1.5;
                }
                /* Sabitlenmiş yorumda içerik alanı */
                .pinned-comment .asura-comment-content { 
                    position: relative;
                }
                .comment_style5 .pinned-comment .asura-comment-content {
                    border-color: var(--accent) !important;
                    box-shadow: none !important;
                }
                
                /* ==============================
                   Style 1: Classic
                   ============================== */
                .comment_style1 .official-comment {
                    background: linear-gradient(145deg, rgba(220, 38, 38, 0.06), rgba(220, 38, 38, 0.02)) !important;
                    border: 1px solid rgba(220, 38, 38, 0.2) !important;
                    border-radius: 12px !important;
                    padding: 16px 20px !important;
                    margin: 8px 0 !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 15px rgba(220, 38, 38, 0.03) !important;
                }
                .comment_style1 .official-badge {
                    color: #ef4444;
                    background: rgba(220, 38, 38, 0.12);
                    padding: 2px 8px;
                    border-radius: 6px;
                    border: 1px solid rgba(220, 38, 38, 0.2);
                    text-shadow: none;
                    letter-spacing: 0.5px;
                }
                .comment_style1 .official-comment .asura-comment-username {
                    color: #ef4444 !important;
                    text-shadow: 0 0 8px rgba(220, 38, 38, 0.3) !important;
                }
                .comment_style1 .pinned-badge { color: #fff; background: var(--accent); border-radius: 4px; padding: 1px 6px; }

                /* ==============================
                   Mobile Responsiveness 
                   ============================== */
                @media (max-width: 768px) {
                    /* Style 1 */
                    .comment_style1 .asura-comment-row, .comment_style1 .asura-reply-row { padding: 12px; }
                    .comment_style1 .asura-reply-row { margin-left: 12px; }
                    .comment_style1 .asura-comment-avatar-wrapper, .comment_style1 .asura-comment-avatar { width: 36px; height: 36px; }
                }
            `}} />
            {/* 1. Series Reaction Bar Widget — her bölüm/seri kendi bağımsız tepkisini saklar */}
            {seriesId && (
                <div className="series-reaction-widget">
                    <div className="series-reaction-title">{appSettings.lang_series_reaction_title || 'Ne düşünüyorsun?'}</div>
                        <div className="series-reaction-subtitle">
                            {Object.values(seriesReactCounts).reduce((a,b)=>a+b, 0)} {appSettings.lang_reactions || 'tepki'}
                        </div>
                    <div className="reaction-emoji-row">
                        {seriesEmojis.map(se => (
                                <button
                                    key={se.icon}
                                    className={`reaction-emoji-btn ${activeReaction === se.icon ? 'active' : ''}`}
                                    onClick={() => toggleSeriesReaction(se.icon)}
                                >
                                    <span className="emoji-icon">{se.icon}</span>
                                    <span className="emoji-count">{seriesReactCounts[se.icon] || 0}</span>
                                    <span className="emoji-label">{se.label}</span>
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* 2. Comments Header & Sorters */}
            <div className="asura-comment-header">
                <div className="asura-comment-title">{totalComments} {appSettings.lang_comments || 'Yorum'}</div>
                    <div className="asura-comment-sort">
                        <button className={sortBy === 'best' ? 'active' : ''} onClick={() => setSortBy('best')}>{appSettings.lang_sort_best || 'En İyi'}</button>
                        <button className={sortBy === 'newest' ? 'active' : ''} onClick={() => setSortBy('newest')}>{appSettings.lang_newest || 'En Yeni'}</button>
                        <button className={sortBy === 'oldest' ? 'active' : ''} onClick={() => setSortBy('oldest')}>{appSettings.lang_oldest || 'En Eski'}</button>
                    </div>
            </div>

            {toast && <div className="alert alert-success" style={{ marginBottom: 14 }}>{toast}</div>}

            {/* 3. Global Comment Input */}
            {user ? (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div className="asura-comment-avatar-wrapper" style={{ flexShrink: 0 }}>
                        {(!user.avatar_url || user.avatar_url === '/default-avatar.png') ? (
                            <div className="asura-comment-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem' }}>
                                {user.username?.[0]?.toUpperCase() || '?'}
                            </div>
                        ) : (
                            <img src={user.avatar_url} alt={user.username} className="asura-comment-avatar" decoding="async" />
                        )}
                    </div>
                    <div className="asura-comment-input-container" style={{ flexGrow: 1, margin: 0 }}>
                        {paragraphIndex !== null && (
                            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--accent)' }}>
                                <span>Paragraf {paragraphIndex + 1} için yorum yapılıyor</span>
                                <button type="button" onClick={() => setParagraphIndex(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>İptal</button>
                            </div>
                        )}
                        <textarea
                            ref={newCommentRef}
                            className="asura-comment-textarea"
                            placeholder={appSettings.lang_write_comment || 'Bir yorum yaz...'}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            maxLength={2000}
                        />
                        <CommentToolbar
                            onBold={() => insertFormat('**', '**')}
                            onItalic={() => insertFormat('*', '*')}
                            onStrike={() => insertFormat('~~', '~~')}
                            onInlineSpoiler={() => insertFormat('||', '||')}
                            onGif={chapterId ? () => openGifModal('main') : undefined}
                            isSpoilerTag={isSpoilerComment}
                            onToggleSpoilerTag={() => setIsSpoilerComment(v => !v)}
                            charCount={newComment.length}
                            maxChars={2000}
                            submitLabel={appSettings.lang_post_comment || 'Gönder'}
                            disabled={!newComment.trim()}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </div>
            ) : (
                <div className="login-prompt">{appSettings.lang_login_to_comment_prompt || 'Yorum yazmak için lütfen'} <a href="/login">{appSettings.lang_login_link || 'giriş yapın'}</a>{appSettings.lang_to_comment || '.'}</div>
            )}

            {/* 4. Comments Loop */}
            {loading ? (
                <div className="comments-loading"><div className="skeleton-comment" /><div className="skeleton-comment" /></div>
            ) : comments.length === 0 ? (
                <div className="empty-comments">{appSettings.lang_no_comments || 'Henüz yorum yapılmamış. İlk yorumu siz yapın!'}</div>
            ) : (
                <>
                    <div>{comments.map(c => renderComment(c))}</div>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => fetchComments(page + 1, true)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? (appSettings.lang_loading || 'Yükleniyor...') : (appSettings.lang_load_more_comments || 'Daha Fazla Yorum Yükle')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Delete Modal — Portal to body so position:fixed works correctly */}
            {mounted && deleteModal && createPortal(
                <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3><TrashIcon /> Yorumu Sil</h3>
                        <p>Emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteModal(null)}>İptal</button>
                            <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm}>Sil</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Report Modal — Portal to body */}
            {mounted && reportModal && createPortal(
                <div className="modal-overlay" onClick={() => setReportModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3><FlagIcon /> Yorumu Bildir</h3>
                        <p>Bu yorumu neden bildiriyorsunuz?</p>
                        <div className="form-group">
                            <select className="form-input" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                                <option value="">Bir neden seçin...</option>
                                {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Detaylar (isteğe bağlı)</label>
                            <textarea className="form-input" rows={2} placeholder="Daha fazla detay..." value={reportDetails} onChange={e => setReportDetails(e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => setReportModal(null)}>İptal</button>
                            <button className="btn btn-danger btn-sm" onClick={handleReportSubmit} disabled={!reportReason}>Gönder</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* GIF Modal — Portal to body */}
            {mounted && gifModal && createPortal(
                <div className="modal-overlay" onClick={() => setGifModal(false)}>
                    <div className="modal gif-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '95vw' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <GifIcon />
                            GIF Ekle
                        </h3>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <input
                                ref={gifSearchRef}
                                type="text"
                                className="form-input"
                                placeholder="GIPHY ile GIF ara..."
                                value={gifSearch}
                                onChange={e => setGifSearch(e.target.value)}
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
                                        onClick={() => insertGif(media.url)}
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
                                            loading="lazy" decoding="async" />
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: 12, textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setGifModal(false)}>İptal</button>
                        </div>
                        <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            GIPHY tarafından desteklenmektedir
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Image URL Modal — Portal to body */}
            {mounted && imageUrlModal && createPortal(
                <div className="modal-overlay" onClick={() => setImageUrlModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            Resim Ekle
                        </h3>
                        <div className="form-group">
                            <input
                                type="url"
                                className="form-input"
                                placeholder="https://i.ibb.co/.../resim.png"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && isAllowedImageUrl(imageUrl.trim())) {
                                        setNewComment(prev => prev + `\n![image](${imageUrl.trim()})`);
                                        setImageUrl(''); setImageUrlModal(false);
                                    }
                                }}
                            />
                            <p style={{ marginTop: 8, fontSize: '0.8rem', color: imageUrl.trim() && !isAllowedImageUrl(imageUrl.trim()) ? '#ef4444' : 'var(--text-muted)' }}>
                                {imageUrl.trim() && !isAllowedImageUrl(imageUrl.trim())
                                    ? `Bu adres kabul edilmiyor. Yalnızca ${ALLOWED_HOSTS_LABEL} bağlantıları eklenebilir.`
                                    : `Güvenlik için yalnızca ${ALLOWED_HOSTS_LABEL} bağlantıları eklenebilir.`}
                            </p>
                        </div>
                        {isAllowedImageUrl(imageUrl.trim()) && (
                            <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', maxHeight: 200 }}>
                                <img src={imageUrl.trim()} alt="Önizleme" referrerPolicy="no-referrer" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} decoding="async" onError={e => e.target.style.display='none'} />
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => { setImageUrl(''); setImageUrlModal(false); }}>İptal</button>
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                if (isAllowedImageUrl(imageUrl.trim())) {
                                    setNewComment(prev => prev + `\n![image](${imageUrl.trim()})`);
                                    setImageUrl(''); setImageUrlModal(false);
                                }
                            }} disabled={!isAllowedImageUrl(imageUrl.trim())}>Ekle</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Global Glassmorphism Styles for Comments */}
            <style jsx global>{`
                .asura-comment-row {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .asura-comment-row:hover {
                    border-color: rgba(255,255,255,0.15);
                }
                .asura-comment-row.official-comment {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
                }
                .asura-comment-row.official-comment:hover {
                    border-color: rgba(239, 68, 68, 0.5);
                }
                .asura-reply-row {
                    background: rgba(255, 255, 255, 0.015);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 12px;
                    margin-top: 8px;
                    margin-bottom: 8px;
                    margin-left: 20px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                }
                .asura-reply-row.official-comment {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .asura-comment-input-container {
                    background: rgba(20, 20, 25, 0.6) !important;
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    border-radius: 12px !important;
                    overflow: hidden;
                }
                .asura-comment-textarea {
                    background: transparent !important;
                    border: none !important;
                    color: #fff !important;
                }
            `}</style>
        </div>
    );
}
