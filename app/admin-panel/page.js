'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { BADGE_OPTIONS } from '@/lib/badges';
import { safeHref } from '@/lib/security/safeUrl';
import { invalidateAppSettingsCache } from '@/lib/settingsCache';

/* ── Icons ───────────────────────────────────────────────────── */
const I = { w: 16, h: 16 };
const DashIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>;
const KeyIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>;
const BookIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
const UsersIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const MsgIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const GearIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const BlogIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.55.83L4 4z" /><path d="M4 4v16a1 1 0 0 0 1 1h13" /><line x1="8" y1="9" x2="14" y2="9" /><line x1="8" y1="13" x2="14" y2="13" /></svg>;
const GlobeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const LockIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const RocketIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></svg>;
const PlusIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const BackIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>;
const UploadIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const EyeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const ImageIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const MegaphoneIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 6h4l5-4v14l-5-4h-4v7h-2z" /><path d="M4 8h2v8H4z" /></svg>;

const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SyncIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>;
const LinkIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;

const BackupIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const PaletteIcon = () => <svg width={I.w} height={I.h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;

const TrafficIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const TagIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AuditIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const AdsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M8 12h4m-2-2v4"/><path d="M16 10l-2 4"/><path d="M14 10l2 4"/></svg>;
const GiftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;

/* ── Badge SVG Icons ─────────────────────────────────────────── */
const BADGE_ICON_OPTIONS = [
    { id: 'star',      label: 'Yıldız' },
    { id: 'globe',     label: 'Küre' },
    { id: 'upload',    label: 'Yükle' },
    { id: 'heart',     label: 'Kalp' },
    { id: 'trophy',    label: 'Kupa' },
    { id: 'check',     label: 'Onay' },
    { id: 'shield',    label: 'Kalkan' },
    { id: 'zap',       label: 'Şimşek' },
    { id: 'crown',     label: 'Taç' },
    { id: 'flame',     label: 'Alev' },
    { id: 'gem',       label: 'Mücevher' },
    { id: 'rocket',    label: 'Roket' },
    { id: 'award',     label: 'Ödül' },
    { id: 'pencil',    label: 'Kalem' },
    { id: 'eye',       label: 'Göz' },
    { id: 'lock',      label: 'Kilit' },
    { id: 'users',     label: 'Kullanıcılar' },
    { id: 'message',   label: 'Mesaj' },
    { id: 'tag',       label: 'Etiket' },
    { id: 'bookmark',  label: 'Yer İmi' },
];

function BadgeIcon({ name, size = 14, color = 'currentColor' }) {
    const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (name) {
        case 'star':     return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
        case 'globe':    return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
        case 'upload':   return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
        case 'heart':    return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
        case 'trophy':   return <svg {...p}><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1c0 2.76 2.24 5 5 5h2M17 4h3a2 2 0 0 1 2 2v1c0 2.76-2.24 5-5 5h-2"/><rect x="7" y="2" width="10" height="9" rx="2"/></svg>;
        case 'check':    return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
        case 'shield':   return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
        case 'zap':      return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
        case 'crown':    return <svg {...p}><path d="M2 20h20M5 20V10l7-7 7 7v10"/><path d="M9 20v-6h6v6"/></svg>;
        case 'flame':    return <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
        case 'gem':      return <svg {...p}><polygon points="6 3 18 3 22 9 12 22 2 9"/><polyline points="2 9 12 22 22 9"/><line x1="6" y1="3" x2="2" y2="9"/><line x1="18" y1="3" x2="22" y2="9"/></svg>;
        case 'rocket':   return <svg {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>;
        case 'award':    return <svg {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;
        case 'pencil':   return <svg {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
        case 'eye':      return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
        case 'lock':     return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
        case 'users':    return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
        case 'message':  return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
        case 'tag':      return <svg {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
        case 'bookmark': return <svg {...p}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>;
        default:         return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    }
}

const NAVS = [
    { id: 'announcements', label: 'Duyurular', icon: MegaphoneIcon },
    { id: 'overview', label: 'Genel Bakış', icon: DashIcon },
    { id: 'traffic', label: 'Site Trafiği', icon: TrafficIcon },
    { id: 'series', label: 'Seriler', icon: BookIcon },
    { id: 'blogs', label: 'Blog Yönetimi', icon: BlogIcon, external: '/admin-panel/blogs' },
    { id: 'scraper', label: 'Bot (Scraper)', icon: DownloadIcon },
    { id: 'media', label: 'Medya', icon: ImageIcon },
    { id: 'api-key', label: 'Güvenlik', icon: KeyIcon },
    { id: 'users', label: 'Kullanıcılar', icon: UsersIcon },
    { id: 'comments', label: 'Yorumlar', icon: MsgIcon },
    { id: 'requests', label: 'İstekler', icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
    { id: 'bug-reports', label: 'Hata Bildirimleri', icon: ShieldIcon },
    { id: 'audit-log', label: 'Denetim Kaydı', icon: AuditIcon },
    { id: 'pages', label: 'Sayfalar & Menüler', icon: GlobeIcon },
    { id: 'backup', label: 'Yedekleme', icon: BackupIcon },
    { id: 'ads', label: 'Reklamlar', icon: AdsIcon },
    { id: 'settings', label: 'Ayarlar', icon: GearIcon },
    { id: 'customize', label: 'Özelleştirme', icon: PaletteIcon },
];

const REQ_STATUSES = [
    { value: 'pending',   label: 'Beklemede',   color: '#f59e0b' },
    { value: 'reviewing', label: 'İnceleniyor', color: '#6366f1' },
    { value: 'approved',  label: 'Onaylandı',  color: '#22c55e' },
    { value: 'rejected',  label: 'Reddedildi',  color: '#ef4444' },
    { value: 'added',     label: 'Eklendi ✓',   color: '#14b8a6' },
];

const GENRE_TR = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim',
    'Ecchi': 'Ecchi', 'Harem': 'Harem', 'Josei': 'Josei', 'Mature': 'Yetişkin',
    'Mecha': 'Mecha', 'Psychological': 'Psikolojik', 'Seinen': 'Seinen',
    'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon',
    'Manhwa': 'Manhwa', 'Manhua': 'Manhua',
};

// ── IntersectionObserver ile gerçek lazy load — sadece görünür olunca img yüklenir ──
function LazyMediaCard({ m, onPreview, onDelete, selectionMode, selected, onToggleSelect }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { rootMargin: '120px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const isUserImage = m.category === 'user_images';
    return (
        <div ref={ref} className="admin-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', outline: selected ? '2px solid var(--accent)' : 'none', outlineOffset: '-2px' }}>
            {selectionMode && (
                <div
                    style={{ position: 'absolute', top: 6, left: 6, zIndex: 10, cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); onToggleSelect(m.path); }}
                >
                    <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: selected ? 'var(--accent)' : 'rgba(0,0,0,0.55)',
                        border: '2px solid ' + (selected ? 'var(--accent)' : '#fff'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {selected && <CheckIcon />}
                    </div>
                </div>
            )}
            <div
                style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => selectionMode ? onToggleSelect(m.path) : (visible && onPreview(m))}
            >
                {visible ? (
                    <img
                        src={m.path}
                        alt={m.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)', backgroundSize: '200% 100%', animation: 'mediaSkeletonShimmer 1.4s infinite' }} />
                )}
            </div>
            <div style={{ padding: '8px 10px' }}>
                {/* Kullanıcı adı — user_images için önce göster */}
                {m.username && (
                    <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--accent-light)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        @{m.username}
                    </div>
                )}
                <div style={{ fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>{m.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.sizeFormatted || '—'}</span>
                    <span style={{
                        fontSize: '0.60rem', padding: '1px 5px', borderRadius: 4,
                        background: m.imageType === 'avatar' ? 'rgba(99,102,241,0.15)' : m.imageType === 'cover' ? 'rgba(16,185,129,0.12)' : m.imageType === 'orphan' ? 'rgba(245,158,11,0.15)' : 'rgba(155,44,44,0.1)',
                        color: m.imageType === 'avatar' ? '#818cf8' : m.imageType === 'cover' ? '#34d399' : m.imageType === 'orphan' ? '#fbbf24' : 'var(--accent-light)'
                    }}>
                        {m.imageType === 'avatar' ? 'Avatar' : m.imageType === 'cover' ? 'Kapak' : m.imageType === 'orphan' ? 'Sahipsiz' : m.category}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <a
                        href={safeHref(m.path)}
                        download={m.name}
                        className="btn btn-sm"
                        style={{ flex: 1, fontSize: '0.7rem', padding: '4px 8px', textAlign: 'center', textDecoration: 'none', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <DownloadIcon /> İndir
                    </a>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: '0.7rem', padding: '4px 8px' }} onClick={onDelete}>
                        <TrashIcon /> Sil
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Yeniden kullanılabilir sayfalama bileşeni ──
function AdminPager({ page, total, pageSize, onPageChange }) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {total} kayıttan {from}–{to} gösteriliyor
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === 1 ? 'transparent' : 'var(--bg-tertiary)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem' }}
                >«</button>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === 1 ? 'transparent' : 'var(--bg-tertiary)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem' }}
                >‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                        <button key={p} onClick={() => onPageChange(p)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === p ? 'var(--accent)' : 'var(--bg-tertiary)', color: page === p ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: page === p ? 700 : 400 }}
                        >{p}</button>
                    );
                })}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === totalPages ? 'transparent' : 'var(--bg-tertiary)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem' }}
                >›</button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === totalPages ? 'transparent' : 'var(--bg-tertiary)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem' }}
                >»</button>
            </div>
        </div>
    );
}

export default function AdminPanelPage() {
    const { user, loading: authLoading, authFetch } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [msg, setMsg] = useState('');
    const [msgType, setMsgType] = useState('success');
    const [confirmModal, setConfirmModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null); // { src, title }
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Media management
    const [mediaFiles, setMediaFiles] = useState([]);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaFilter, setMediaFilter] = useState('all');
    const [mediaPage, setMediaPage] = useState(1);
    const [mediaTotal, setMediaTotal] = useState(0);
    const [mediaHasMore, setMediaHasMore] = useState(false);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaUploadCategory, setMediaUploadCategory] = useState('covers');
    const mediaUploadRef = useRef(null);
    // Media selection mode
    const [mediaSelectMode, setMediaSelectMode] = useState(false);
    const [mediaSelected, setMediaSelected] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    // Media folder browser (seri bazlı)
    const [mediaView, setMediaView] = useState('flat'); // 'flat' | 'folders' | 'user-folders'
    const [mediaFolders, setMediaFolders] = useState([]);
    const [mediaFoldersLoading, setMediaFoldersLoading] = useState(false);
    const [selectedMediaSeries, setSelectedMediaSeries] = useState(null); // { seriesId, title, coverUrl }
    const [seriesChapterFolders, setSeriesChapterFolders] = useState(null); // { series, chapters }
    const [seriesChaptersLoading, setSeriesChaptersLoading] = useState(false);
    const [selectedMediaChapter, setSelectedMediaChapter] = useState(null); // { chapterId, ... }
    const [chapterPages, setChapterPages] = useState(null); // { chapter, pages }
    const [chapterPagesLoading, setChapterPagesLoading] = useState(false);
    // Kullanıcı klasörleri
    const [userFolders, setUserFolders] = useState([]);
    const [userFoldersLoading, setUserFoldersLoading] = useState(false);
    const [selectedUserFolder, setSelectedUserFolder] = useState(null); // { userId, username, ... }
    const [userFolderDetail, setUserFolderDetail] = useState(null); // { user, files }
    const [userFolderDetailLoading, setUserFolderDetailLoading] = useState(false);
    const [userFolderSearch, setUserFolderSearch] = useState('');

    // Site asset upload (logo, favicon, og-image)
    const [assetUploading, setAssetUploading] = useState('');
    const logoUploadRef = useRef(null);
    const faviconUploadRef = useRef(null);
    const ogImageUploadRef = useRef(null);

    // Backup management
    const [backups, setBackups] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);

    // Custom roles for admin panel access check
    const [customRoles, setCustomRoles] = useState([]);
    const [customRolesLoaded, setCustomRolesLoaded] = useState(false);

    async function loadBackups() {
        setLoadingBackups(true);
        try {
            const res = await authFetch('/api/admin/backup');
            const data = await res.json();
            if (data.backups) setBackups(data.backups);
        } catch {} finally { setLoadingBackups(false); }
    }

    async function loadTrafficData(range = trafficRange) {
        setTrafficLoading(true);
        try {
            const res = await authFetch(`/api/admin/traffic?range=${range}`);
            const data = await res.json();
            if (data.success) setTrafficData(data);
        } catch {} finally { setTrafficLoading(false); }
    }

    async function loadGenres() {
        setGenresLoading(true);
        try {
            const res = await authFetch('/api/admin/genres');
            const data = await res.json();
            if (data.success) {
                setGenres(data.genres || []);
                setDeletedDefaultGenres(data.deletedDefaults || []);
            }
        } catch {} finally { setGenresLoading(false); }
    }

    async function addGenre() {
        if (!newGenreName.trim()) return;
        try {
            const res = await authFetch('/api/admin/genres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', name: newGenreName.trim() })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            setNewGenreName('');
            await loadGenres();
        } catch (e) { show(e.message, 'error'); }
    }

    async function deleteGenre(id, name) {
        if (!window.confirm(`"${name}" türünü silmek istediğinize emin misiniz? Bu tür tüm serilerden kaldırılacak!`)) return;
        try {
            const res = await authFetch('/api/admin/genres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            await loadGenres();
        } catch (e) { show(e.message, 'error'); }
    }

    async function restoreGenre(name) {
        try {
            const res = await authFetch('/api/admin/genres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore', name })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            await loadGenres();
        } catch (e) { show(e.message, 'error'); }
    }

    async function loadAuditLogs() {
        setAuditLoading(true);
        try {
            const res = await authFetch('/api/admin/audit-log');
            const data = await res.json();
            if (data.success) setAuditLogs(data.logs || []);
        } catch {} finally { setAuditLoading(false); }
    }

    async function loadUserActivity(userId) {
        setUserActivityLoading(true);
        try {
            const res = await authFetch(`/api/admin/users?userId=${userId}&action=activity`);
            const data = await res.json();
            if (data.success) {
                setViewingUser(data);
                loadUserBadges(userId);
            }
        } catch {} finally { setUserActivityLoading(false); }
    }

    async function handleResetPassword(userId) {
        if (!resetPwdValue || resetPwdValue.length < 6) return show('Şifre en az 6 karakter olmalı', 'error');
        setResetPwdSubmitting(true);
        try {
            const res = await authFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset-password', userId, newPassword: resetPwdValue })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            setResetPwdUserId(null);
            setResetPwdValue('');
        } catch (e) { show(e.message, 'error'); }
        finally { setResetPwdSubmitting(false); }
    }

    async function createBackup() {
        setSubmitting(true);
        try {
            const res = await authFetch('/api/admin/backup?action=create', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show('Yedek başarıyla oluşturuldu!');
            await loadBackups();
        } catch (err) { show(err.message, 'error'); }
        finally { setSubmitting(false); }
    }

    async function deleteBackup(backupId) {
        if (!confirm('Bu yedeği silmek istediğinizden emin misiniz?')) return;
        setSubmitting(true);
        try {
            const res = await authFetch(`/api/admin/backup?action=delete&id=${backupId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show('Yedek silindi');
            await loadBackups();
        } catch (err) { show(err.message, 'error'); }
        finally { setSubmitting(false); }
    }

    function downloadBackup(backup) {
        const filename = backup.name;
        fetch(`/api/admin/backup/download?file=${encodeURIComponent(filename)}`)
            .then(res => { if (!res.ok) throw new Error('Download failed'); return res.blob(); })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            })
            .catch(() => show('İndirme başarısız', 'error'));
    }

    async function importData(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm('Mevcut verilerin üzerine yazılacak! Emin misiniz?')) { e.target.value = ''; return; }
        setSubmitting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await authFetch('/api/admin/backup?action=import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            show('Veriler başarıyla içe aktarıldı!');
        } catch (err) { show(err.message, 'error'); }
        finally { setSubmitting(false); e.target.value = ''; }
    }

    async function loadMedia(pageNum = 1, append = false, category = mediaFilter) {
        setMediaLoading(true);
        try {
            const res = await authFetch(`/api/admin?action=list-media&page=${pageNum}&limit=24&category=${category}`);
            const data = await res.json();
            if (append) {
                setMediaFiles(prev => [...prev, ...(data.media || [])]);
            } else {
                setMediaFiles(data.media || []);
            }
            setMediaTotal(data.total || 0);
            setMediaHasMore(data.hasMore || false);
            setMediaPage(pageNum);
        } catch (err) { console.error(err); }
        finally { setMediaLoading(false); }
    }

    async function handleMediaUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setMediaUploading(true);
        let successCount = 0;
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append('action', 'upload-media');
            fd.append('file', file);
            fd.append('category', mediaUploadCategory);
            try {
                const res = await authFetch('/api/admin', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.success) successCount++;
            } catch {}
        }
        setMediaUploading(false);
        if (mediaUploadRef.current) mediaUploadRef.current.value = '';
        if (successCount > 0) {
            alert(`${successCount} dosya başarıyla yüklendi.`);
            loadMedia(1, false, mediaUploadCategory === mediaFilter ? mediaFilter : mediaFilter);
        }
    }

    function toggleMediaSelect(path) {
        setMediaSelected(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }

    function toggleMediaSelectAll() {
        const allLoaded = !mediaHasMore;
        if (mediaSelected.size === mediaFiles.length && mediaFiles.length > 0) {
            setMediaSelected(new Set());
        } else {
            setMediaSelected(new Set(mediaFiles.map(m => m.path)));
        }
        if (!allLoaded) {
            show('Yalnızca yüklü dosyalar seçildi. Tümünü seçmek için "Daha Fazla Medya Yükle"ye tıklayın.', 'info');
        }
    }

    function exitSelectMode() {
        setMediaSelectMode(false);
        setMediaSelected(new Set());
    }

    async function handleBulkDownload() {
        const paths = Array.from(mediaSelected);
        if (paths.length === 0) return;
        // Sequential download via anchor clicks
        for (const p of paths) {
            const file = mediaFiles.find(m => m.path === p);
            if (!file) continue;
            const a = document.createElement('a');
            a.href = p;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // small delay to avoid browser blocking multiple downloads
            await new Promise(r => setTimeout(r, 300));
        }
    }

    async function handleBulkDelete() {
        const paths = Array.from(mediaSelected);
        if (paths.length === 0) return;
        if (!window.confirm(`Seçili ${paths.length} dosyayı silmek istediğinize emin misiniz?`)) return;
        setBulkDeleting(true);
        const results = await Promise.allSettled(
            paths.map(filePath => {
                const fd = new FormData();
                fd.append('action', 'delete-media');
                fd.append('filePath', filePath);
                return authFetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() }).then(r => r.json());
            })
        );
        const deleted = results.filter(r => r.status === 'fulfilled' && !r.value?.error).length;
        setBulkDeleting(false);
        exitSelectMode();
        show(`${deleted} / ${paths.length} dosya silindi.`);
        loadMedia(1, false, mediaFilter);
    }

    // ── Seri Klasör Tarayıcısı Fonksiyonları ──
    async function loadMediaFolders() {
        setMediaFoldersLoading(true);
        try {
            const res = await authFetch('/api/admin?action=list-media-folders');
            const data = await res.json();
            setMediaFolders(data.folders || []);
        } catch (err) { console.error(err); }
        finally { setMediaFoldersLoading(false); }
    }

    async function openMediaSeriesFolder(folder) {
        setSelectedMediaSeries(folder);
        setSelectedMediaChapter(null);
        setChapterPages(null);
        setSeriesChaptersLoading(true);
        try {
            const res = await authFetch(`/api/admin?action=list-media-series-chapters&mediaSeriesId=${folder.seriesId}`);
            const data = await res.json();
            setSeriesChapterFolders(data);
        } catch (err) { console.error(err); }
        finally { setSeriesChaptersLoading(false); }
    }

    async function openMediaChapterFolder(chapter) {
        setSelectedMediaChapter(chapter);
        setChapterPagesLoading(true);
        try {
            const res = await authFetch(`/api/admin?action=list-media-chapter-pages&mediaChapterId=${chapter.chapterId}`);
            const data = await res.json();
            setChapterPages(data);
        } catch (err) { console.error(err); }
        finally { setChapterPagesLoading(false); }
    }

    function mediaFolderBreadcrumb() {
        const items = [{ label: 'Seri Klasörleri', onClick: () => { setSelectedMediaSeries(null); setSelectedMediaChapter(null); setChapterPages(null); setSeriesChapterFolders(null); } }];
        if (selectedMediaSeries) items.push({ label: selectedMediaSeries.title, onClick: () => { setSelectedMediaChapter(null); setChapterPages(null); openMediaSeriesFolder(selectedMediaSeries); } });
        if (selectedMediaChapter) items.push({ label: `Bölüm ${selectedMediaChapter.chapterNumber}`, onClick: null });
        return items;
    }

    // ── Kullanıcı Klasör Tarayıcısı Fonksiyonları ──
    async function loadUserFolders() {
        setUserFoldersLoading(true);
        try {
            const res = await authFetch('/api/admin?action=list-user-folders');
            const data = await res.json();
            setUserFolders(data.folders || []);
        } catch (err) { console.error(err); }
        finally { setUserFoldersLoading(false); }
    }

    async function openUserFolder(folder) {
        setSelectedUserFolder(folder);
        setUserFolderDetailLoading(true);
        try {
            const res = await authFetch(`/api/admin?action=list-user-folder-detail&mediaUserId=${folder.userId}`);
            const data = await res.json();
            setUserFolderDetail(data);
        } catch (err) { console.error(err); }
        finally { setUserFolderDetailLoading(false); }
    }

    function userFolderBreadcrumb() {
        const items = [{ label: 'Kullanıcı Klasörleri', onClick: () => { setSelectedUserFolder(null); setUserFolderDetail(null); } }];
        if (selectedUserFolder) items.push({ label: selectedUserFolder.username, onClick: null });
        return items;
    }

    async function handleSiteAssetUpload(e, assetType, urlKey) {
        const file = e.target.files?.[0];
        if (!file) return;
        setAssetUploading(assetType);
        const fd = new FormData();
        fd.append('action', 'upload-site-asset');
        fd.append('file', file);
        fd.append('assetType', assetType);
        try {
            const res = await authFetch('/api/admin', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success && data.path) {
                setCustomize(prev => ({ ...prev, [urlKey]: data.path }));
                // Otomatik olarak app_settings'e kaydet — kullanıcının ayrıca "Kaydet" butonuna basması gerekmesin
                try {
                    await authFetch('/api/admin/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ [urlKey]: data.path }),
                    });
                    show(`${assetType === 'favicon' ? 'Favicon' : assetType === 'logo' ? 'Logo' : 'Görsel'} yüklendi ve kaydedildi!`);
                } catch {
                    show('Görsel yüklendi fakat kaydedilemedi. Lütfen "Özelleştirmeyi Kaydet" butonuna basın.', 'error');
                }
            } else {
                show('Yükleme hatası: ' + (data.error || 'Bilinmeyen hata'), 'error');
            }
        } catch (err) {
            show('Yükleme başarısız: ' + err.message, 'error');
        }
        setAssetUploading('');
        e.target.value = '';
    }

    // Announcements
    const [announcements, setAnnouncements] = useState([]);
    const [annMsg, setAnnMsg] = useState('');
    const [annLink, setAnnLink] = useState('');

    // Mağaza (Shop)
    const [shopItems, setShopItems] = useState([]);
    const [shopLoading, setShopLoading] = useState(false);
    const [shopFilterType, setShopFilterType] = useState('badge');
    const [shopModalOpen, setShopModalOpen] = useState(false);
    const [editingShopItem, setEditingShopItem] = useState(null);
    const [shopForm, setShopForm] = useState({ type: 'badge', name: '', price: 100, image_url: '', title_color: '#f59e0b' });
    const [shopImageUploading, setShopImageUploading] = useState(false);

    // Series Requests
    const [seriesRequests, setSeriesRequests] = useState([]);
    const [reqLoading, setReqLoading] = useState(false);
    const [reqFilter, setReqFilter] = useState('all');
    const [editingReq, setEditingReq] = useState(null); // { id, status, admin_note }

    // Sub-views
    const [subView, setSubView] = useState(null); // 'create' | 'detail' | null
    const [detailSeries, setDetailSeries] = useState(null);
    const [detailChapters, setDetailChapters] = useState([]);
    const [openingSeriesId, setOpeningSeriesId] = useState(null);
    const [chapterPage, setChapterPage] = useState(1);
    const CHAPTERS_PER_PAGE = 20;
    const [editMode, setEditMode] = useState(false);

    // Series form
    const [sTitle, setSTitle] = useState('');
    const [sDesc, setSDesc] = useState('');
    const [sAuthor, setSAuthor] = useState('');
    const [sArtist, setSArtist] = useState('');
    const [sStatus, setSStatus] = useState('ongoing');
    const [sType, setSType] = useState('manga');
    const [sGenres, setSGenres] = useState([]);
    const [sCustomGenreInput, setSCustomGenreInput] = useState('');
    const [sCover, setSCover] = useState(null);
    const [sCoverPreview, setSCoverPreview] = useState('');
    const [sRating, setSRating] = useState('0');
    const [sAltNames, setSAltNames] = useState('');
    const [sIsAdult, setSIsAdult] = useState(false);

    // Chapter add
    const [cNum, setCNum] = useState('');
    const [cTitle, setCTitle] = useState('');
    const [cContent, setCContent] = useState('');
    const [cFiles, setCFiles] = useState(null);
    const [cThumbUrl, setCThumbUrl] = useState('');
    const [cThumbMode, setCThumbMode] = useState('none'); // 'none' | 'upload' | 'auto'
    const [cThumbFile, setCThumbFile] = useState(null);
    const [cIsExternal, setCIsExternal] = useState(false); // dış bağlantılı (URL) bölüm modu
    const [cExternalUrl, setCExternalUrl] = useState('');
    const [cExternalNote, setCExternalNote] = useState('');
    const cFileInputRef = useRef(null);
    const cThumbFileRef = useRef(null);

    // Upload pages
    const [uploadChapterId, setUploadChapterId] = useState(null);
    const [uFiles, setUFiles] = useState(null);

    // Edit chapter
    const [editingChapterId, setEditingChapterId] = useState(null);
    const [editChapNum, setEditChapNum] = useState('');
    const [editChapTitle, setEditChapTitle] = useState('');
    const [editChapContent, setEditChapContent] = useState('');
    const [editChapThumb, setEditChapThumb] = useState('');
    const [editChapThumbFile, setEditChapThumbFile] = useState(null);
    const [editChapIsExternal, setEditChapIsExternal] = useState(false);
    const [editChapExternalUrl, setEditChapExternalUrl] = useState('');
    const [editChapExternalNote, setEditChapExternalNote] = useState('');
    const editChapThumbFileRef = useRef(null);
    const [autoThumbLoading, setAutoThumbLoading] = useState(false);
    
    // ── Rich Text Helpers ────────────────────────────────────────────────────
    const insertFormat = (tag, stateSetter, stateValue, textareaId) => {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sel = stateValue.substring(start, end);
        let replacement = '';
        if (tag === 'bold') replacement = `<b>${sel || 'Kalın Metin'}</b>`;
        else if (tag === 'italic') replacement = `<i>${sel || 'Eğik Metin'}</i>`;
        else if (tag === 'h2') replacement = `<h2>${sel || 'Başlık'}</h2>`;
        else if (tag === 'h3') replacement = `<h3>${sel || 'Alt Başlık'}</h3>`;
        else if (tag === 'quote') replacement = `<blockquote>${sel || 'Alıntı'}</blockquote>`;
        else if (tag === 'br') replacement = `${sel}<br />`;
        
        const newText = stateValue.substring(0, start) + replacement + stateValue.substring(end);
        stateSetter(newText);
        setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + replacement.length, start + replacement.length); }, 0);
    };

    // Bölüm sayfaları için imgbb / Vercel Blob / Supabase Storage depolama tercihi seçici — toplu ve normal
    // yükleme formlarının hepsinde aynı, paylaşılan tercihi gösterir.
    const VercelUploadToggle = ({ style }) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', ...style }}>
            <span>Depolama:</span>
            <select
                value={uploadProvider}
                onChange={e => setUploadProviderPref(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: 4, cursor: 'pointer' }}
            >
                <option value="imgbb">imgbb</option>
                <option value="vercel">Vercel Blob</option>
                <option value="supabase">Supabase Storage</option>
            </select>
            {uploadProvider !== 'imgbb' && <span style={{ color: '#10b981' }}>✓ aktif</span>}
        </label>
    );

    const FormatToolbar = ({ stateSetter, stateValue, textareaId }) => (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', background: 'var(--bg-tertiary)', padding: '5px', borderRadius: '4px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('bold', stateSetter, stateValue, textareaId)}><b>B</b></button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('italic', stateSetter, stateValue, textareaId)}><i>I</i></button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('h2', stateSetter, stateValue, textareaId)}><b>H2</b></button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('h3', stateSetter, stateValue, textareaId)}><b>H3</b></button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('quote', stateSetter, stateValue, textareaId)}>" "</button>
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('br', stateSetter, stateValue, textareaId)}>Satır</button>
        </div>
    );
    
    // Sayfa/bölüm yükleme ilerleme popup'ı — { current, total, fileName, percent, label }
    const [uploadProgress, setUploadProgress] = useState(null);

    // Bölüm sayfalarını imgbb yerine Vercel Blob veya Supabase Storage'a yükleme tercihi
    // (imgbb rate limit sorununu aşmak için eklendi).
    // Toplu ve normal (tekli) bölüm/sayfa yükleme formlarının hepsi bu tercihi paylaşır.
    // Tercih tarayıcıda saklanır, böylece her yüklemede tekrar seçmek gerekmez.
    const [uploadProvider, setUploadProvider] = useState('imgbb'); // 'imgbb' | 'vercel' | 'supabase'
    useEffect(() => {
        try {
            const saved = localStorage.getItem('adm_upload_provider');
            if (saved === 'vercel' || saved === 'supabase') setUploadProvider(saved);
        } catch {}
    }, []);
    function setUploadProviderPref(value) {
        const provider = (value === 'vercel' || value === 'supabase') ? value : 'imgbb';
        setUploadProvider(provider);
        try { localStorage.setItem('adm_upload_provider', provider); } catch {}
    }


    // Bulk chapter upload
    const [bulkFiles, setBulkFiles] = useState(null);
    const [bulkStatus, setBulkStatus] = useState('');
    const [bulkThumbMode, setBulkThumbMode] = useState('none'); // 'none' | 'upload' | 'auto'
    const [bulkThumbFile, setBulkThumbFile] = useState(null);
    const bulkThumbFileRef = useRef(null);

    // Edit chapter thumbnail mode
    const [editChapThumbMode, setEditChapThumbMode] = useState('none'); // 'none' | 'upload' | 'auto'

    // ── Scraper state ────────────────────────────────────────────────────────
    const [scraperUrl, setScraperUrl] = useState('');
    const [scraperLang, setScraperLang] = useState('en');
    const [scraperFetchLoading, setScraperFetchLoading] = useState(false);
    const [scraperFetchResult, setScraperFetchResult] = useState(null);
    const [scraperImporting, setScraperImporting] = useState(false);
    const [scraperPublishMode, setScraperPublishMode] = useState('stage'); // 'stage' | 'publish'
    const [scraperSources, setScraperSources] = useState([]);
    const [scraperPending, setScraperPending] = useState([]);
    const [scraperJobs, setScraperJobs] = useState([]);
    const [scraperSourcesLoading, setScraperSourcesLoading] = useState(false);
    const [scraperSelectedPending, setScraperSelectedPending] = useState([]);
    const [scraperPublishing, setScraperPublishing] = useState(false);
    const [scraperSyncLoading, setScraperSyncLoading] = useState(false);
    // For the global Scraper tab
    const [allScraperSources, setAllScraperSources] = useState([]);
    const [allScraperSourcesLoading, setAllScraperSourcesLoading] = useState(false);
    // Create series from scratch via scrape
    const [scrapeNewUrl, setScrapeNewUrl] = useState('');
    const [scrapeNewLang, setScrapeNewLang] = useState('en');
    const [scrapeNewLoading, setScrapeNewLoading] = useState(false);
    const [scrapeNewPreview, setScrapeNewPreview] = useState(null);

    // View pages panel
const [viewPagesChapterId, setViewPagesChapterId] = useState(null);
    const [viewPages, setViewPages] = useState([]);
    const [viewPagesLoading, setViewPagesLoading] = useState(false);
    const [reorderMode, setReorderMode] = useState(false);
    const [reorderSaving, setReorderSaving] = useState(false);

    async function openChapterPages(chapterId) {
        if (viewPagesChapterId === chapterId) { setViewPagesChapterId(null); setViewPages([]); setReorderMode(false); return; }
        setViewPagesChapterId(chapterId);
        setReorderMode(false);
        setViewPagesLoading(true);
        try {
            const res = await fetch(`/api/chapters/${chapterId}`);
            const data = await res.json();
            const sorted = (data.pages || []).slice().sort((a, b) => a.page_number - b.page_number);
            setViewPages(sorted);
        } catch {}
        setViewPagesLoading(false);
    }

    async function deleteChapterPage(pageId) {
        if (!window.confirm('Bu sayfayı silmek istediğinize emin misiniz?')) return;
        try {
            const fd = new FormData();
            fd.append('action', 'delete-page');
            fd.append('pageId', pageId);
            const res = await authFetch('/api/admin', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.message && data.error) throw new Error(data.error);
            setViewPages(prev => prev.filter(p => p.id !== pageId));
            show('Sayfa silindi');
        } catch (e) { show(e.message || 'Silinemedi', 'error'); }
    }

    function movePageUp(index) {
        if (index === 0) return;
        setViewPages(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next.map((p, i) => ({ ...p, page_number: i + 1 }));
        });
    }

    function movePageDown(index) {
        setViewPages(prev => {
            if (index >= prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next.map((p, i) => ({ ...p, page_number: i + 1 }));
        });
    }

    function updatePageNumber(index, newNum) {
        setViewPages(prev => {
            const next = [...prev];
            next[index] = { ...next[index], page_number: Number(newNum) };
            return next;
        });
    }

    async function savePageOrder() {
        setReorderSaving(true);
        try {
            const fd = new FormData();
            fd.append('action', 'reorder-pages');
            fd.append('pages', JSON.stringify(viewPages.map(p => ({ id: p.id, page_number: p.page_number }))));
            const res = await authFetch('/api/admin', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Sıralama kaydedilemedi');
            // Re-sort locally after save
            setViewPages(prev => [...prev].sort((a, b) => a.page_number - b.page_number));
            setReorderMode(false);
            show('Sayfa sıralaması kaydedildi');
        } catch (e) { show(e.message || 'Kaydedilemedi', 'error'); }
        setReorderSaving(false);
    }

    // API Key


    // Turnstile
    const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
    const [turnstileSecretKey, setTurnstileSecretKey] = useState('');
    const [turnstileLoaded, setTurnstileLoaded] = useState(false);

    // Global Settings (Donations + Maintenance + Discord + Bug Reports)
    const [settings, setSettings] = useState({ 
        donation_enabled: '0', 
        donation_text: '', 
        paypal_url: '', 
        kofi_url: '',
        kreosus_url: '',
        donation_goal_enabled: '0',
        donation_goal_current: '0',
        donation_goal_target: '1000',
        donation_goal_label: 'Sunucu Maliyeti',
        donation_goal_currency: '₺',
        donation_goal_pct: '0',
        donation_goal_deadline: '',
        admin_2fa_required: '0',
        maintenance_mode: '0', 
        maintenance_message: '',
        maintenance_mode_design: 'default',
        discord_enabled: '0',
        discord_url: '',
bug_report_enabled: '0',
        show_new_chapter_badge: '1',
        updates_per_page: '16',
        chapter_thumbnails_enabled: '0',
        show_stats_bar: '1',
        auth_subtitle_login: 'Okumaya devam etmek için giriş yapın',
        auth_subtitle_register: 'dilediğiniz dilde manga okuyun',
        points_name: 'Asteria Yıldızı',
        points_short: 'YP',
        reader_support_enabled: '0',
        reader_support_text: 'Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor. Keyif aldıysan, küçük bir desteğin yeni bölümlerin gelmesine katkı sağlar.',
        reader_support_url: '#',
        reader_support_button_text: 'Destek Ol',
        external_redirect_message: 'Bu bölüm başka bir ekip tarafından hazırlanmıştır. Onları desteklemek için ilgili siteye yönlendiriliyorsunuz. Eğer ekibin sitesi kapandıysa, en az reklam barındıran alternatif bir kaynağa yönlendiriliyorsunuz.',
        external_redirect_button_text: 'Siteye Git',
        welcome_screen_enabled: '1',
        ddos_gate_enabled: '0',
        welcome_screen_title: 'Hoş geldin!',
        welcome_screen_message: 'Sitemize ilk kez uğruyorsun — bulunduğun için çok mutluyuz. Binlerce bölüm, canlı sohbet ve daha fazlası seni bekliyor.',
        welcome_screen_button_text: 'Keşfetmeye Başla',
        welcome_screen_slides: '[]',
    });

    // ── Hoş Geldin Ekranı — çoklu slayt yardımcıları ──
    const DEFAULT_WELCOME_SLIDES = [
        { title: 'Aramıza hoş geldin! 👋', message: 'Sitemize ilk kez uğruyorsun — bulunduğun için çok mutluyuz. Seni burada tutacak birkaç şeyi hızlıca gösterelim.', image: '' },
        { title: 'Binlerce bölüm 📚', message: 'Aksiyon, romantizm, fantastik ve daha fazla türde yüzlerce seriyi düzenli olarak güncelliyoruz. Beğendiğin türleri keşfet, favorilerine ekle.', image: '' },
        { title: 'Canlı sohbet 💬', message: 'Diğer okuyucularla anlık olarak sohbet edip son bölümleri ilk anda tartışabilirsin. Topluluğumuza katıl!', image: '' },
        { title: 'Takipte kal 🔔', message: 'Favori serilerine bildirim aç, yeni bölüm geldiğinde ilk sen haberdar ol. Hiçbir güncellemeyi kaçırma.', image: '' },
        { title: 'Hazırsın! 🚀', message: 'Artık keşfe çıkabilirsin. İyi okumalar dileriz!', image: '' },
    ];

    function getWelcomeSlides() {
        try {
            const parsed = JSON.parse(settings.welcome_screen_slides || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function setWelcomeSlides(slides) {
        setSettings(s => ({ ...s, welcome_screen_slides: JSON.stringify(slides) }));
    }

    function loadDefaultWelcomeSlides() {
        setWelcomeSlides(DEFAULT_WELCOME_SLIDES);
    }

    function addWelcomeSlide() {
        setWelcomeSlides([...getWelcomeSlides(), { title: '', message: '', image: '', buttonText: '' }]);
    }

    function updateWelcomeSlide(index, field, value) {
        const slides = getWelcomeSlides().slice();
        slides[index] = { ...slides[index], [field]: value };
        setWelcomeSlides(slides);
    }

    function removeWelcomeSlide(index) {
        const slides = getWelcomeSlides().slice();
        slides.splice(index, 1);
        setWelcomeSlides(slides);
    }

    function moveWelcomeSlide(index, dir) {
        const slides = getWelcomeSlides().slice();
        const target = index + dir;
        if (target < 0 || target >= slides.length) return;
        [slides[index], slides[target]] = [slides[target], slides[index]];
        setWelcomeSlides(slides);
    }

    // Customization / Tema Ayarları
    const [customize, setCustomize] = useState({
        site_name: '',
        site_description: '',
        logo_url: '',
        favicon_url: '',
        accent_color: '#6366f1',
        button_color: '',
        button_hover_color: '',
        button_text_color: '',
        link_color: '',
        link_hover_color: '',
        navbar_bg_color: '',
        reader_bg_color: '',
        announcement_bg_color: '',
        footer_text: '',
        contact_email: '',
        discord_url: '',
        reddit_url: '',
        twitter_url: '',
        instagram_url: '',
        tiktok_url: '',
        youtube_url: '',
        facebook_url: '',
        og_image_url: '',
        google_analytics_id: '',
        google_tag_manager_id: '',
        google_site_verification: '',
        custom_css: '',
        custom_head_scripts: '',
        custom_body_js: '',
        seo_title_home: '',
        seo_desc_home: '',
        seo_title_series: '',
        seo_title_chapter: '',
        latest_updates_design: 'style4',
        comment_design: 'comment_style1',
        latest_updates_title_color: '',
        latest_updates_card_bg: '',
        latest_updates_card_border: '',
        latest_updates_badge_bg: '',
        latest_updates_badge_text: '',
        latest_updates_hover_bg: '',
    });
    const [customizeSubmitting, setCustomizeSubmitting] = useState(false);

    // Comment Settings (Emojis & Report Reasons)
    const [commentEmojis, setCommentEmojis] = useState([]);
    const [reportReasons, setReportReasons] = useState([]);
    const [newEmojiIcon, setNewEmojiIcon] = useState('');
    const [newEmojiLabel, setNewEmojiLabel] = useState('');
    const [newReasonText, setNewReasonText] = useState('');

    // Bug Reports State
    const [bugReports, setBugReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);

    // Comment Reports State
    const [commentReports, setCommentReports] = useState([]);
    const [commentReportsLoading, setCommentReportsLoading] = useState(false);
    const [commentReportsLoaded, setCommentReportsLoaded] = useState(false);

    // ── Sayfalama State (Users / Comments / Requests / Bug Reports) ──
    const ADMIN_PAGE_SIZE = 20;
    const [usersPage, setUsersPage] = useState(1);
    const [commentsPage, setCommentsPage] = useState(1);
    const [commentSearch, setCommentSearch] = useState('');
    const [commentFilter, setCommentFilter] = useState('all');
    const [commentStatusTab, setCommentStatusTab] = useState('all');
    const [selectedComments, setSelectedComments] = useState(new Set());
    const [userSearch, setUserSearch] = useState('');
    const [requestsPage, setRequestsPage] = useState(1);
    const [reportsPage, setReportsPage] = useState(1);

    // Traffic Analytics State
    const [trafficData, setTrafficData] = useState(null);
    const [trafficLoading, setTrafficLoading] = useState(false);
    const [trafficRange, setTrafficRange] = useState('7');

    // Google Indexing API State
    const [gIndexingKey, setGIndexingKey] = useState({ exists: false, clientEmail: null, projectId: null });
    const [gIndexingLoading, setGIndexingLoading] = useState(false);
    const [gIndexingTestUrl, setGIndexingTestUrl] = useState('');
    const [gIndexingTestResult, setGIndexingTestResult] = useState(null);

    // Genre Management State
    const [genres, setGenres] = useState([]);
    const [deletedDefaultGenres, setDeletedDefaultGenres] = useState([]);
    const [genresLoading, setGenresLoading] = useState(false);
    const [newGenreName, setNewGenreName] = useState('');

    // Audit Log State
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditSearch, setAuditSearch] = useState('');
    const [auditActionFilter, setAuditActionFilter] = useState('all');

    // User Activity State
    const [viewingUser, setViewingUser] = useState(null); // { user, activities, stats, adminLogs }
    const [userActivityLoading, setUserActivityLoading] = useState(false);
    const [resetPwdUserId, setResetPwdUserId] = useState(null);
    const [resetPwdValue, setResetPwdValue] = useState('');
    const [resetPwdSubmitting, setResetPwdSubmitting] = useState(false);

// Badge Management State
    const [userBadges, setUserBadges] = useState([]); // badges for viewingUser
    const [badgeLoading, setBadgeLoading] = useState(false);
    // All available badges (built-in + custom), loaded from API
    const [allBadgeOptions, setAllBadgeOptions] = useState(BADGE_OPTIONS);
    // Custom badge creation form
    const [newBadgeId, setNewBadgeId] = useState('');
    const [newBadgeLabel, setNewBadgeLabel] = useState('');
    const [newBadgeIcon, setNewBadgeIcon] = useState('star');
    const [newBadgeColor, setNewBadgeColor] = useState('#6366f1');
    const [customBadgesLoading, setCustomBadgesLoading] = useState(false);
    const [badgeCreating, setBadgeCreating] = useState(false);
    const [badgeOrderDirty, setBadgeOrderDirty] = useState(false);
    const [badgeOrderSaving, setBadgeOrderSaving] = useState(false);

    // ── Custom Role Management ──────────────────────────────────
    const ALL_PERMISSIONS = [
        { id: 'manage_series',    label: 'Seri Ekle/Güncelle',      group: 'Seri' },
        { id: 'delete_series',    label: 'Seri Sil',                 group: 'Seri' },
        { id: 'manage_chapters',  label: 'Bölüm Yükle/Düzenle',     group: 'Seri' },
        { id: 'manage_users',     label: 'Kullanıcı Yönet',          group: 'Kullanıcı' },
        { id: 'ban_users',        label: 'Kullanıcı Banla',          group: 'Kullanıcı' },
        { id: 'view_users',       label: 'Kullanıcıları Görüntüle',  group: 'Kullanıcı' },
        { id: 'manage_comments',  label: 'Yorum Sil/Sabitle',        group: 'Yorum' },
        { id: 'view_comments',    label: 'Yorumları Görüntüle',      group: 'Yorum' },
        { id: 'manage_chat',      label: 'Canlı Sohbet Mesajı Sil',  group: 'Yorum' },
        { id: 'manage_media',     label: 'Medya Yönet',              group: 'Medya' },
        { id: 'manage_settings',  label: 'Site Ayarları',            group: 'Sistem' },
        { id: 'view_reports',     label: 'Hata Raporlarını Gör',     group: 'Sistem' },
        { id: 'manage_requests',  label: 'İstekleri Yönet',          group: 'Sistem' },
        { id: 'view_audit_log',   label: 'Denetim Kaydını Gör',      group: 'Sistem' },
        { id: 'manage_pages',     label: 'Sayfa/Menü Yönet',         group: 'Sistem' },
        { id: 'assign_badges',    label: 'Rozet At/Kaldır',          group: 'Kullanıcı' },
    ];
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleLabel, setNewRoleLabel] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#818cf8');
    const [newRolePerms, setNewRolePerms] = useState([]);
    const [roleCreating, setRoleCreating] = useState(false);
    const [showRoleForm, setShowRoleForm] = useState(false);

    async function loadAllBadgeOptions() {
        try {
            const res = await authFetch('/api/admin/user-badges');
            const data = await res.json();
            if (data.success) setAllBadgeOptions(data.badgeOptions || BADGE_OPTIONS);
        } catch {}
    }

    async function loadUserBadges(userId) {
        setBadgeLoading(true);
        try {
            const res = await authFetch(`/api/admin/user-badges?userId=${userId}`);
            const data = await res.json();
            if (data.success) {
                setUserBadges(data.badges || []);
                if (data.badgeOptions) setAllBadgeOptions(data.badgeOptions);
            }
        } catch {} finally { setBadgeLoading(false); }
    }

    async function addUserBadge(userId, badgeId) {
        try {
            const res = await authFetch('/api/admin/user-badges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', userId, badgeId }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            await loadUserBadges(userId);
        } catch (e) { show(e.message, 'error'); }
    }

    async function removeUserBadge(userId, badgeId) {
        try {
            const res = await authFetch(`/api/admin/user-badges?userId=${userId}&badgeId=${badgeId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            await loadUserBadges(userId);
        } catch (e) { show(e.message, 'error'); }
    }

    async function createCustomBadge() {
        if (!newBadgeId.trim() || !newBadgeLabel.trim() || !newBadgeIcon.trim()) {
            return show('ID, etiket ve ikon zorunludur', 'error');
        }
        setBadgeCreating(true);
        try {
            const res = await authFetch('/api/admin/custom-badges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newBadgeId.trim(), label: newBadgeLabel.trim(), icon: newBadgeIcon.trim(), color: newBadgeColor }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            setNewBadgeId(''); setNewBadgeLabel(''); setNewBadgeIcon('🏅'); setNewBadgeColor('#6366f1');
            await loadAllBadgeOptions();
        } catch (e) { show(e.message, 'error'); }
        finally { setBadgeCreating(false); }
    }

    async function deleteCustomBadge(id, label) {
        if (!window.confirm(`"${label}" rozetini ve tüm kullanıcılardan kaldırmak istediğinize emin misiniz?`)) return;
        try {
            const res = await authFetch(`/api/admin/custom-badges?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message);
            await loadAllBadgeOptions();
        } catch (e) { show(e.message, 'error'); }
    }

    async function deleteBuiltinBadge(id, label) {
        if (!window.confirm(`"${label}" yerleşik rozetini silmek istediğinize emin misiniz? Bu rozet tüm kullanıcılardan kaldırılır.`)) return;
        try {
            const res = await authFetch(`/api/admin/custom-badges?id=${encodeURIComponent(id)}&builtin=1`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message || 'Rozet silindi');
            await loadAllBadgeOptions();
        } catch (e) { show(e.message, 'error'); }
    }

    // Rozet önem sırasını yukarı/aşağı taşır (yalnızca yerel state, kaydetmek için
    // ayrıca "Sıralamayı Kaydet"e basmak gerekir).
    function moveBadgePriority(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= allBadgeOptions.length) return;
        const next = [...allBadgeOptions];
        [next[index], next[newIndex]] = [next[newIndex], next[index]];
        setAllBadgeOptions(next);
        setBadgeOrderDirty(true);
    }

    async function saveBadgeOrder() {
        setBadgeOrderSaving(true);
        try {
            const res = await authFetch('/api/admin/badge-priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: allBadgeOptions.map(b => b.id) }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show('Rozet sıralaması kaydedildi ✓');
            setBadgeOrderDirty(false);
        } catch (e) { show(e.message, 'error'); }
        finally { setBadgeOrderSaving(false); }
    }

    async function loadCustomRoles() {
        try {
            const res = await authFetch('/api/admin/users?action=list-custom-roles');
            const data = await res.json();
            if (data.success) setCustomRoles(data.roles || []);
        } catch {}
    }

    async function createCustomRole() {
        if (!newRoleName.trim() || !newRoleLabel.trim()) return show('Rol adı ve etiketi zorunludur', 'error');
        if (newRolePerms.length === 0) return show('En az bir yetki seçilmelidir', 'error');
        setRoleCreating(true);
        try {
            const res = await authFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create-custom-role',
                    name: newRoleName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                    label: newRoleLabel.trim(),
                    color: newRoleColor,
                    permissions: newRolePerms,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(data.message || 'Rol oluşturuldu');
            setNewRoleName(''); setNewRoleLabel(''); setNewRoleColor('#818cf8'); setNewRolePerms([]);
            setShowRoleForm(false);
            await loadCustomRoles();
        } catch (e) { show(e.message, 'error'); }
        finally { setRoleCreating(false); }
    }

    async function deleteCustomRole(id, label) {
        if (!window.confirm(`"${label}" rolünü silmek istediğinize emin misiniz?`)) return;
        try {
            const res = await authFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete-custom-role', roleId: id }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show('Rol silindi');
            await loadCustomRoles();
        } catch (e) { show(e.message, 'error'); }
    }

    async function assignCustomRole(userId, roleName) {
        try {
            const res = await authFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change-user-role', userId, role: roleName }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show('Rol atandı');
            // Hedef kullanıcı kendisi ise kullanıcı bilgilerini yenile
            if (userId === user?.id) {
                if (typeof window !== 'undefined' && window.location) {
                    window.location.reload();
                }
            }
            fetchStats();
        } catch (e) { show(e.message, 'error'); }
    }

    // Scheduled chapter state
    const [cPublishAt, setCPublishAt] = useState('');

    // Watermark State
    const [watermark, setWatermark] = useState({
        enabled: '0',
        path: '',
        position: 'bottom-right',
        opacity: '60',
        scale: '15',
    });
    const [watermarkFile, setWatermarkFile] = useState(null);
    const [watermarkUploading, setWatermarkUploading] = useState(false);
    const [watermarkMsg, setWatermarkMsg] = useState('');

    // Bölüm Sonu Görseli State
    const [chapterEndImage, setChapterEndImage] = useState({
        enabled: '0',
        path: '',
    });
    const [chapterEndImageFile, setChapterEndImageFile] = useState(null);
    const [chapterEndImageUploading, setChapterEndImageUploading] = useState(false);
    const [chapterEndImageMsg, setChapterEndImageMsg] = useState('');

    // Bölüm Başı Görseli State
    const [chapterStartImage, setChapterStartImage] = useState({
        enabled: '0',
        path: '',
    });
    const [chapterStartImageFile, setChapterStartImageFile] = useState(null);
    const [chapterStartImageUploading, setChapterStartImageUploading] = useState(false);
    const [chapterStartImageMsg, setChapterStartImageMsg] = useState('');

    // Ad Settings State
    const [adSettings, setAdSettings] = useState({
        ad_popup_enabled: '0', ad_popup_code: '',
        ad_header_enabled: '0', ad_header_code: '',
        ad_sidebar_enabled: '0', ad_sidebar_code: '',
        ad_between_chapters_enabled: '0', ad_between_chapters_code: '',
        ad_footer_enabled: '0', ad_footer_code: '',
    });
    const [adSettingsSubmitting, setAdSettingsSubmitting] = useState(false);
    const [adPreview, setAdPreview] = useState(null); // placement key being previewed

    // Popup Alert (Uyard Kutusu) State
    const [alertPopup, setAlertPopup] = useState({
        alert_popup_enabled: '0',
        alert_popup_type: 'custom',
        alert_popup_title: '',
        alert_popup_message: '',
        alert_popup_skip_delay: '5',
        alert_popup_skip_label: 'Gec',
        alert_popup_link_url: '',
        alert_popup_link_label: 'Devam Et',
        alert_popup_link_new_tab: '1',
        alert_popup_show_once: '1',
        alert_popup_bg_color: '',
        alert_popup_icon: '',
        alert_popup_interval: 'session',
    });
    const [alertPopupSubmitting, setAlertPopupSubmitting] = useState(false);
    // Pages & Menus State
    const [customPages, setCustomPages] = useState([]);
    const [pagesLoading, setPagesLoading] = useState(false);
    const [editingPage, setEditingPage] = useState(null); // null | 'new' | { id, title, ... }
    const [pageForm, setPageForm] = useState({ title: '', slug: '', content: '', is_active: true, show_in_footer: true, show_in_navbar: false });
    const [navbarMenu, setNavbarMenu] = useState([]);
    const [footerMenu, setFooterMenu] = useState([]);
    const [menuSaving, setMenuSaving] = useState(false);

    // Load custom roles on mount (needed for access check)
    useEffect(() => {
        async function loadAccessRoles() {
            try {
                const res = await authFetch('/api/admin/users?action=list-custom-roles');
                const data = await res.json();
                if (data.roles) {
                    setCustomRoles(data.roles);
                }
                setCustomRolesLoaded(true);
            } catch {
                setCustomRolesLoaded(true);
            }
        }
        loadAccessRoles();
    }, [authFetch]);

    useEffect(() => {
        if (authLoading || !customRolesLoaded) return;
        const builtinRoles = ['admin', 'manager', 'moderator', 'team_member'];
        const customRoleNames = customRoles.map(r => r.name);
        const allAllowedRoles = [...builtinRoles, ...customRoleNames];
        if (!user || !allAllowedRoles.includes(user.role)) { router.push('/'); return; }
        if (user) fetchStats();
    }, [user, authLoading, customRoles, customRolesLoaded]);

    // Load all badge options (built-in + custom) + custom roles when users tab opens
    useEffect(() => {
        if (tab !== 'users' || !user) return;
        loadAllBadgeOptions();
        loadCustomRoles();
    }, [tab, user]);

    // Load series requests when switching to requests tab
    useEffect(() => {
        if (tab !== 'requests' || !user) return;
        setReqLoading(true);
        authFetch('/api/series-requests?admin=1')
            .then(r => r.json())
            .then(d => setSeriesRequests(d.requests || []))
            .catch(() => {})
            .finally(() => setReqLoading(false));
    }, [tab, user]);

    // Load bug reports when switching to bug-reports tab
    useEffect(() => {
        if (tab !== 'bug-reports' || !user) return;
        setReportsLoading(true);
        authFetch('/api/admin/reports')
            .then(r => r.json())
            .then(d => { if (d.success) setBugReports(d.reports || []); })
            .catch(() => {})
            .finally(() => setReportsLoading(false));
    }, [tab, user]);

    // Load comment reports when switching to comments tab
    useEffect(() => {
        if (tab !== 'comments' || !user) return;
        setCommentReportsLoading(true);
        authFetch('/api/reports/comments')
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    console.log('[Admin] Yorum şikayetleri yüklendi:', (d.reports || []).length, 'rapor');
                    setCommentReports(d.reports || []);
                } else {
                    console.error('[Admin] Yorum şikayetleri yüklenemedi:', d.error);
                    setCommentReports([]);
                }
                setCommentReportsLoaded(true);
            })
            .catch(err => {
                console.error('[Admin] Yorum şikayetleri fetch hatası:', err);
                setCommentReports([]);
            })
            .finally(() => setCommentReportsLoading(false));
    }, [tab, user]);

    // Load pages & menus when switching to pages tab
    useEffect(() => {
        if (tab !== 'pages' || !user) return;
        loadCustomPages();
        loadMenuSettings();
    }, [tab, user]);

    // Load shop items when switching to shop tab
    useEffect(() => {
        if (tab !== 'shop' || !user) return;
        loadShopItems();
    }, [tab, user]);

    async function loadShopItems() {
        setShopLoading(true);
        try {
            const res = await authFetch('/api/admin/shop');
            const data = await res.json();
            if (data.success) setShopItems(data.items || []);
        } catch (e) { console.error(e); }
        setShopLoading(false);
    }

    function openShopCreateModal(type) {
        setEditingShopItem(null);
        setShopForm({ type, name: '', price: 100, image_url: '', title_color: '#f59e0b' });
        setShopModalOpen(true);
    }

    function openShopEditModal(item) {
        setEditingShopItem(item);
        setShopForm({
            type: item.type,
            name: item.name,
            price: item.price,
            image_url: item.image_url || '',
            title_color: item.title_color || '#f59e0b',
        });
        setShopModalOpen(true);
    }

    async function uploadShopItemImage(file) {
        setShopImageUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await authFetch('/api/admin/shop/upload-image', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                setShopForm(prev => ({ ...prev, image_url: data.url }));
                show('Görsel yüklendi', 'success');
            } else {
                show(data.error || 'Görsel yüklenemedi', 'error');
            }
        } catch (e) {
            show('Görsel yüklenemedi', 'error');
        }
        setShopImageUploading(false);
    }

    async function saveShopItem() {
        if (!shopForm.name.trim()) { show('İsim gerekli', 'error'); return; }
        if ((shopForm.type === 'badge' || shopForm.type === 'frame') && !shopForm.image_url) {
            show('Bu tür için görsel yüklemelisiniz', 'error'); return;
        }
        try {
            const method = editingShopItem ? 'PUT' : 'POST';
            const body = editingShopItem
                ? { id: editingShopItem.id, name: shopForm.name, price: shopForm.price, image_url: shopForm.image_url, title_color: shopForm.title_color }
                : { type: shopForm.type, name: shopForm.name, price: shopForm.price, image_url: shopForm.image_url, title_color: shopForm.title_color };
            const res = await authFetch('/api/admin/shop', {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                show(data.message, 'success');
                setShopModalOpen(false);
                loadShopItems();
            } else {
                show(data.error || 'Bir hata oluştu', 'error');
            }
        } catch (e) { show('Bir hata oluştu', 'error'); }
    }

    async function toggleShopItemActive(item) {
        try {
            const res = await authFetch('/api/admin/shop', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, is_active: item.is_active ? 0 : 1 })
            });
            const data = await res.json();
            if (data.success) loadShopItems();
        } catch (e) {}
    }

    async function deleteShopItem(item) {
        if (!window.confirm(`"${item.name}" mağazadan silinsin mi? Bunu satın almış kullanıcılardan da kaldırılacak.`)) return;
        try {
            const res = await authFetch(`/api/admin/shop?id=${item.id}`, { method: 'DELETE' });
            const data = await res.json();
            show(data.message || data.error, data.success ? 'success' : 'error');
            if (data.success) loadShopItems();
        } catch (e) { show('Bir hata oluştu', 'error'); }
    }

    // Load Google Indexing key status when switching to customize tab
    useEffect(() => {
        if (tab !== 'customize' || !user) return;
        authFetch('/api/admin/google-indexing')
            .then(r => r.json())
            .then(d => setGIndexingKey(d))
            .catch(() => {});
    }, [tab, user]);

    async function loadCustomPages() {
        setPagesLoading(true);
        try {
            const res = await authFetch('/api/admin/pages');
            const data = await res.json();
            if (data.success) setCustomPages(data.pages || []);
        } catch {}
        finally { setPagesLoading(false); }
    }

    async function loadMenuSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            const s = data.settings || {};
            try { setNavbarMenu(JSON.parse(s.navbar_menu || '[]')); } catch { setNavbarMenu([]); }
            try { setFooterMenu(JSON.parse(s.footer_menu || '[]')); } catch { setFooterMenu([]); }
        } catch {}
    }

    async function savePage() {
        try {
            const isNew = !editingPage?.id;
            const body = isNew
                ? { ...pageForm }
                : { action: 'update', id: editingPage.id, ...pageForm };
            const res = await authFetch('/api/admin/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show(isNew ? 'Sayfa oluşturuldu' : 'Sayfa güncellendi');
            setEditingPage(null);
            setPageForm({ title: '', slug: '', content: '', is_active: true, show_in_footer: true, show_in_navbar: false });
            loadCustomPages();
        } catch (e) { show(e.message, 'error'); }
    }

    async function deletePage(id) {
        if (!window.confirm('Bu sayfayı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await authFetch('/api/admin/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show('Sayfa silindi');
            loadCustomPages();
        } catch (e) { show(e.message, 'error'); }
    }

    async function saveMenus() {
        setMenuSaving(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    navbar_menu: JSON.stringify(navbarMenu),
                    footer_menu: JSON.stringify(footerMenu)
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            show('Menüler kaydedildi');
        } catch (e) { show(e.message, 'error'); }
        finally { setMenuSaving(false); }
    }

    function addMenuItem(menuSetter) {
        menuSetter(prev => [...prev, { label: '', url: '' }]);
    }

    function updateMenuItem(menuSetter, index, field, value) {
        menuSetter(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    }

    function removeMenuItem(menuSetter, index) {
        menuSetter(prev => prev.filter((_, i) => i !== index));
    }

    function moveMenuItem(menuSetter, index, dir) {
        menuSetter(prev => {
            const arr = [...prev];
            const target = index + dir;
            if (target < 0 || target >= arr.length) return arr;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
    }

    async function updateReportStatus(id, status) {
        try {
            const res = await authFetch('/api/admin/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            const data = await res.json();
            if (data.success) {
                setBugReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
                show('Bildirim durumu güncellendi');
            }
        } catch { show('İşlem başarısız', 'error'); }
    }

    async function deleteReport(id) {
        if (!window.confirm('Bu bildirim raporunu kalıcı olarak silmek istediğinize emin misiniz?')) return;
        try {
            const res = await authFetch(`/api/admin/reports?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setBugReports(prev => prev.filter(r => r.id !== id));
                show('Bildirim silindi');
            }
        } catch { show('Silme işlemi başarısız', 'error'); }
    }

    function show(text, type = 'success') { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 4000); }

    async function fetchStats() {
        try {
            const r = await authFetch('/api/admin');
            if (r.ok) setStats(await r.json());

            // Fetch server resource stats
            try {
                const statsRes = await authFetch('/api/admin/stats');
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(prev => ({
                        ...prev,
                        storage: statsData.storage || prev?.storage,
                        cpuUsage: statsData.cpuUsage !== undefined ? statsData.cpuUsage : (prev?.cpuUsage ?? '0'),
                        ramUsage: statsData.ramUsage !== undefined ? statsData.ramUsage : (prev?.ramUsage ?? '0'),
                        ramDetails: statsData.ramDetails || prev?.ramDetails,
                        database: statsData.database || prev?.database,
                    }));
                    if (statsData.backups) setBackups(statsData.backups);
                }
            } catch {}

            const a = await authFetch('/api/announcements');
            const aData = await a.json();
            setAnnouncements(aData.announcements || []);

            const s = await fetch('/api/settings');
            const sData = await s.json();
            if (sData.success) {
                 setSettings({
                      donation_enabled: sData.settings.donation_enabled || '0',
                      donation_text: sData.settings.donation_text || '',
paypal_url: sData.settings.paypal_url || '',
                       kofi_url: sData.settings.kofi_url || '',
                       kreosus_url: sData.settings.kreosus_url || '',
donation_goal_enabled: sData.settings.donation_goal_enabled || '0',
                        donation_goal_current: sData.settings.donation_goal_current || '0',
                        donation_goal_target: sData.settings.donation_goal_target || '1000',
                        donation_goal_label: sData.settings.donation_goal_label || 'Sunucu Maliyeti',
                        donation_goal_currency: sData.settings.donation_goal_currency || '₺',
                        donation_goal_pct: sData.settings.donation_goal_pct || '0',
                         donation_goal_deadline: sData.settings.donation_goal_deadline || '',
admin_2fa_required: sData.settings.admin_2fa_required || '0',
                       maintenance_mode: sData.settings.maintenance_mode || '0',
                       maintenance_message: sData.settings.maintenance_message || '',
                       maintenance_mode_design: sData.settings.maintenance_mode_design || 'default',
                       discord_enabled: sData.settings.discord_enabled || '0',
                      discord_url: sData.settings.discord_url || '',
bug_report_enabled: sData.settings.bug_report_enabled || '0',
show_new_chapter_badge: sData.settings.show_new_chapter_badge || '1',
                          updates_per_page: sData.settings.updates_per_page || '16',
                          chapter_thumbnails_enabled: sData.settings.chapter_thumbnails_enabled || '0',
                         show_stats_bar: sData.settings.show_stats_bar !== undefined ? sData.settings.show_stats_bar : '1',
auth_subtitle_login: sData.settings.auth_subtitle_login || 'Okumaya devam etmek için giriş yapın',
                          auth_subtitle_register: sData.settings.auth_subtitle_register || 'dilediğiniz dilde manga okuyun',
                          points_name: sData.settings.points_name || 'Asteria Yıldızı',
                          points_short: sData.settings.points_short || 'YP',
                          reader_support_enabled: sData.settings.reader_support_enabled || '0',
                          reader_support_text: sData.settings.reader_support_text || 'Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor. Keyif aldıysan, küçük bir desteğin yeni bölümlerin gelmesine katkı sağlar.',
                          reader_support_url: sData.settings.reader_support_url || '#',
                          reader_support_button_text: sData.settings.reader_support_button_text || 'Destek Ol',
                          external_redirect_message: sData.settings.external_redirect_message || 'Bu bölüm başka bir ekip tarafından hazırlanmıştır. Onları desteklemek için ilgili siteye yönlendiriliyorsunuz. Eğer ekibin sitesi kapandıysa, en az reklam barındıran alternatif bir kaynağa yönlendiriliyorsunuz.',
                          external_redirect_button_text: sData.settings.external_redirect_button_text || 'Siteye Git',
                          welcome_screen_enabled: sData.settings.welcome_screen_enabled !== undefined ? sData.settings.welcome_screen_enabled : '1',
                            ddos_gate_enabled: sData.settings.ddos_gate_enabled !== undefined ? sData.settings.ddos_gate_enabled : '0',
                          welcome_screen_title: sData.settings.welcome_screen_title || 'Hoş geldin!',
                          welcome_screen_message: sData.settings.welcome_screen_message || 'Sitemize ilk kez uğruyorsun — bulunduğun için çok mutluyuz. Binlerce bölüm, canlı sohbet ve daha fazlası seni bekliyor.',
                          welcome_screen_button_text: sData.settings.welcome_screen_button_text || 'Keşfetmeye Başla',
                          welcome_screen_slides: sData.settings.welcome_screen_slides || '[]',
                     });
                 setTurnstileSiteKey(sData.settings.turnstile_site_key || '');
                 // We never pre-fill the secret key for security
                 setTurnstileLoaded(true);

                 // Load customization settings
                 setCustomize({
                     site_name: sData.settings.site_name || '',
                     site_description: sData.settings.site_description || '',
                     logo_url: sData.settings.logo_url || '',
                     favicon_url: sData.settings.favicon_url || '',
                     accent_color: sData.settings.accent_color || '#6366f1',
                     button_color: sData.settings.button_color || '',
                     button_hover_color: sData.settings.button_hover_color || '',
                     button_text_color: sData.settings.button_text_color || '',
                     link_color: sData.settings.link_color || '',
                     link_hover_color: sData.settings.link_hover_color || '',
                     navbar_bg_color: sData.settings.navbar_bg_color || '',
                     reader_bg_color: sData.settings.reader_bg_color || '',
                     announcement_bg_color: sData.settings.announcement_bg_color || '',
                     footer_text: sData.settings.footer_text || '',
                     contact_email: sData.settings.contact_email || '',
                     discord_url: sData.settings.discord_url || '',
                     reddit_url: sData.settings.reddit_url || '',
                     twitter_url: sData.settings.twitter_url || '',
                     instagram_url: sData.settings.instagram_url || '',
                     tiktok_url: sData.settings.tiktok_url || '',
                     youtube_url: sData.settings.youtube_url || '',
                     facebook_url: sData.settings.facebook_url || '',
og_image_url: sData.settings.og_image_url || '',
google_analytics_id: sData.settings.google_analytics_id || '',
                       google_tag_manager_id: sData.settings.google_tag_manager_id || '',
                       google_site_verification: sData.settings.google_site_verification || '',
                      custom_css: sData.settings.custom_css || '',
                     custom_head_scripts: sData.settings.custom_head_scripts || '',
                     custom_body_js: sData.settings.custom_body_js || '',
                     seo_title_home: sData.settings.seo_title_home || '',
                     seo_desc_home: sData.settings.seo_desc_home || '',
                     seo_title_series: sData.settings.seo_title_series || '',
                     seo_title_chapter: sData.settings.seo_title_chapter || '',
                     latest_updates_design: sData.settings.latest_updates_design || 'style4',
                     most_read_design: sData.settings.most_read_design || 'mr_style1',
                     trending_design: sData.settings.trending_design || 'trend_style1',
                     hero_slider_design: sData.settings.hero_slider_design || 'hero_style1',
series_detail_design: sData.settings.series_detail_design || 'detail_style1',
                      sd_fullpage_bg: sData.settings.sd_fullpage_bg || '0',
                      sd_fullpage_bg_blur: sData.settings.sd_fullpage_bg_blur || '28',
                      sd_fullpage_bg_overlay: sData.settings.sd_fullpage_bg_overlay || '0.72',
                      comment_design: sData.settings.comment_design || 'comment_style1',
                      page_bg_home_color: sData.settings.page_bg_home_color || '',
                      page_bg_home_image: sData.settings.page_bg_home_image || '',
                      page_bg_home_blur: sData.settings.page_bg_home_blur || '0',
                      page_bg_archive_color: sData.settings.page_bg_archive_color || '',
                      page_bg_archive_image: sData.settings.page_bg_archive_image || '',
                      page_bg_archive_blur: sData.settings.page_bg_archive_blur || '0',
                      page_bg_requests_color: sData.settings.page_bg_requests_color || '',
                      page_bg_requests_image: sData.settings.page_bg_requests_image || '',
                      page_bg_requests_blur: sData.settings.page_bg_requests_blur || '0',
                      page_bg_profile_color: sData.settings.page_bg_profile_color || '',
                      page_bg_profile_image: sData.settings.page_bg_profile_image || '',
                      page_bg_profile_blur: sData.settings.page_bg_profile_blur || '0',
                      page_bg_ranking_color: sData.settings.page_bg_ranking_color || '',
                      page_bg_ranking_image: sData.settings.page_bg_ranking_image || '',
                      page_bg_ranking_blur: sData.settings.page_bg_ranking_blur || '0',
                      page_bg_global_color: sData.settings.page_bg_global_color || '',
                      page_bg_global_image: sData.settings.page_bg_global_image || '',
                      page_bg_global_blur: sData.settings.page_bg_global_blur || '0',
                      latest_updates_title_color: sData.settings.latest_updates_title_color || '',
                     latest_updates_card_bg: sData.settings.latest_updates_card_bg || '',
                     latest_updates_card_border: sData.settings.latest_updates_card_border || '',
                     latest_updates_badge_bg: sData.settings.latest_updates_badge_bg || '',
                     latest_updates_badge_text: sData.settings.latest_updates_badge_text || '',
                     latest_updates_hover_bg: sData.settings.latest_updates_hover_bg || '',
                 });
                 // Watermark ayarlarını yükle
                 setWatermark({
                     enabled: sData.settings.watermark_enabled || '0',
                     path: sData.settings.watermark_path || '',
                     position: sData.settings.watermark_position || 'bottom-right',
                     opacity: sData.settings.watermark_opacity || '60',
                     scale: sData.settings.watermark_scale || '15',
                 });
                 // Bölüm sonu görseli ayarlarını yükle
                 setChapterEndImage({
                     enabled: sData.settings.chapter_end_image_enabled || '0',
                     path: sData.settings.chapter_end_image_path || '',
                 });
// Bölüm başı görseli ayarlarını yükle
                  setChapterStartImage({
                      enabled: sData.settings.chapter_start_image_enabled || '0',
                      path: sData.settings.chapter_start_image_path || '',
                  });

                  // Reklam ayarlarını yükle
                  setAdSettings({
                      ad_popup_enabled: sData.settings.ad_popup_enabled || '0',
                      ad_popup_code: sData.settings.ad_popup_code || '',
                      ad_header_enabled: sData.settings.ad_header_enabled || '0',
                      ad_header_code: sData.settings.ad_header_code || '',
                      ad_sidebar_enabled: sData.settings.ad_sidebar_enabled || '0',
                      ad_sidebar_code: sData.settings.ad_sidebar_code || '',
                      ad_between_chapters_enabled: sData.settings.ad_between_chapters_enabled || '0',
                      ad_between_chapters_code: sData.settings.ad_between_chapters_code || '',
                      ad_footer_enabled: sData.settings.ad_footer_enabled || '0',
                      ad_footer_code: sData.settings.ad_footer_code || '',
                  });

                  // Popup Alert ayarlaru0131nu0131 yu00FCkle
                  setAlertPopup({
                      alert_popup_enabled: sData.settings.alert_popup_enabled || '0',
                      alert_popup_type: sData.settings.alert_popup_type || 'custom',
                      alert_popup_title: sData.settings.alert_popup_title || '',
                      alert_popup_message: sData.settings.alert_popup_message || '',
                      alert_popup_skip_delay: sData.settings.alert_popup_skip_delay || '5',
                      alert_popup_skip_label: sData.settings.alert_popup_skip_label || 'Ge\u00E7',
                      alert_popup_link_url: sData.settings.alert_popup_link_url || '',
                      alert_popup_link_label: sData.settings.alert_popup_link_label || 'Devam Et',
                      alert_popup_link_new_tab: sData.settings.alert_popup_link_new_tab || '1',
                      alert_popup_show_once: sData.settings.alert_popup_show_once || '1',
                      alert_popup_bg_color: sData.settings.alert_popup_bg_color || '',
                      alert_popup_icon: sData.settings.alert_popup_icon || '',
                      alert_popup_interval: sData.settings.alert_popup_interval || 'session',
                  });

                  let em = [];
                 try { em = sData.settings.comment_emojis ? JSON.parse(sData.settings.comment_emojis) : []; } catch(e) {}
                 if (!em || em.length === 0) {
                     em = [
                         { icon: '👍', label: 'Beğen' },
                         { icon: '😂', label: 'Komik' },
                         { icon: '❤️', label: 'Sevgi' },
                         { icon: '😲', label: 'Şaşkın' },
                         { icon: '😠', label: 'Kızgın' },
                         { icon: '😢', label: 'Üzgün' }
                     ];
                 }
                 setCommentEmojis(em);

                 let re = [];
                 try { re = sData.settings.comment_report_reasons ? JSON.parse(sData.settings.comment_report_reasons) : []; } catch(e) {}
                 if (!re || re.length === 0) {
                     re = ['Spam veya yanıltıcı', 'Taciz veya zorbalık', 'Nefret söylemi', 'Uygunsuz içerik', 'Uyarısız spoiler', 'Diğer'];
                 }
                 setReportReasons(re);
            }
        }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }

    async function addAnnouncement() {
        if (!annMsg.trim()) return;
        try {
            await authFetch('/api/announcements', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: annMsg, link_url: annLink })
            });
            setAnnMsg(''); setAnnLink(''); fetchStats();
        } catch (e) { console.error(e); }
    }
    
    async function toggleAnn(id, is_active) {
        await authFetch('/api/announcements', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle', id, is_active })
        });
        fetchStats();
    }
    
    async function deleteAnn(id) {
        await authFetch('/api/announcements', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id })
        });
        fetchStats();
    }

    // Oturum httpOnly cookie ile taşınır; Authorization header'ı gerekmez.
    function authHeaders() {
        return {};
    }

    async function doAction(action, body = {}) {
        const fd = new FormData(); fd.append('action', action);
        Object.entries(body).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
        const r = await fetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() }); const d = await r.json();
        if (!r.ok) throw new Error(d.error); return d;
    }

    async function confirmAction() {
        if (!confirmModal) return;
        try {
            // If action is a function (custom async), call it directly
            if (typeof confirmModal.action === 'function') {
                await confirmModal.action();
            } else {
                show((await doAction(confirmModal.action, confirmModal.body)).message);
                fetchStats();
                // Medya silme sonrası listeyi yenile
                if (confirmModal.action === 'delete-media') {
                    loadMedia(1, false, mediaFilter);
                }
                if (confirmModal.onDone) await confirmModal.onDone();
            }
        } catch (e) { show(e.message, 'error'); }
        setConfirmModal(null);
    }

    async function saveSettings(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (data.success) {
                show('Ayarlar başarıyla kaydedildi!');
            } else {
                show(data.error || 'Ayarlar kaydedilemedi', 'error');
            }
        } catch (err) {
            show('Sunucu hatası', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function saveCustomize(e) {
        e.preventDefault();
        setCustomizeSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customize)
            });
            const data = await res.json();
            if (data.success) {
                // Ayarlar kaydedildi — SeriesDetailClient ve diğer bileşenlerin
                // eski cache'ini hemen temizle, yeni ayarlar anında yansısın
                invalidateAppSettingsCache();
                show('Özelleştirme ayarları kaydedildi!');
            } else {
                show(data.error || 'Kaydedilemedi', 'error');
            }
        } catch (err) {
            show('Sunucu hatası', 'error');
        } finally {
            setCustomizeSubmitting(false);
        }
    }

    // Sayfa arka plan görseli yükle
    async function handlePageBgImageUpload(pageKey, file) {
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await authFetch(`/api/admin/page-bg-image?page=${pageKey}`, { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok && data.path) {
                setCustomize(prev => ({ ...prev, [`page_bg_${pageKey}_image`]: data.path }));
                invalidateAppSettingsCache();
                show(`${pageKey} arka plan görseli yüklendi!`);
            } else {
                show(data.error || 'Yükleme başarısız', 'error');
            }
        } catch { show('Sunucu hatası', 'error'); }
    }

    async function handlePageBgImageDelete(pageKey) {
        try {
            const res = await authFetch(`/api/admin/page-bg-image?page=${pageKey}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setCustomize(prev => ({ ...prev, [`page_bg_${pageKey}_image`]: '' }));
                invalidateAppSettingsCache();
                show(`${pageKey} arka plan görseli silindi.`);
            } else {
                show(data.error || 'Silinemedi', 'error');
            }
        } catch { show('Sunucu hatası', 'error'); }
    }

    async function handleWatermarkUpload() {
        if (!watermarkFile) { show('Lütfen bir watermark dosyası seçin', 'error'); return; }
        setWatermarkUploading(true);
        setWatermarkMsg('');
        try {
            const fd = new FormData();
            fd.append('watermark', watermarkFile);
            const res = await authFetch('/api/admin/watermark', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');
            setWatermark(prev => ({ ...prev, path: data.path }));
            setWatermarkMsg('✓ Watermark yüklendi');
            setWatermarkFile(null);
            show('Watermark başarıyla yüklendi!');
        } catch (e) {
            show(e.message, 'error');
        } finally {
            setWatermarkUploading(false);
        }
    }

    async function handleWatermarkDelete() {
        try {
            const res = await authFetch('/api/admin/watermark', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setWatermark(prev => ({ ...prev, path: '' }));
            show('Watermark silindi');
        } catch (e) { show(e.message, 'error'); }
    }

    async function saveWatermarkSettings() {
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    watermark_enabled: watermark.enabled,
                    watermark_position: watermark.position,
                    watermark_opacity: watermark.opacity,
                    watermark_scale: watermark.scale,
                })
            });
            const data = await res.json();
            if (data.success) show('Watermark ayarları kaydedildi!');
            else show(data.error || 'Kaydedilemedi', 'error');
        } catch { show('Sunucu hatası', 'error'); }
    }

    async function handleChapterEndImageUpload() {
        if (!chapterEndImageFile) { show('Lütfen bir görsel seçin', 'error'); return; }
        setChapterEndImageUploading(true);
        setChapterEndImageMsg('');
        try {
            const fd = new FormData();
            fd.append('chapter_end_image', chapterEndImageFile);
            const res = await authFetch('/api/admin/chapter-end-image', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');
            setChapterEndImage(prev => ({ ...prev, path: data.path }));
            setChapterEndImageMsg('✓ Görsel yüklendi');
            setChapterEndImageFile(null);
            show('Bölüm sonu görseli başarıyla yüklendi!');
        } catch (e) {
            show(e.message, 'error');
        } finally {
            setChapterEndImageUploading(false);
        }
    }

    async function handleChapterEndImageDelete() {
        try {
            const res = await authFetch('/api/admin/chapter-end-image', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setChapterEndImage(prev => ({ ...prev, path: '' }));
            show('Bölüm sonu görseli silindi');
        } catch (e) { show(e.message, 'error'); }
    }

    async function saveChapterEndImageSettings() {
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapter_end_image_enabled: chapterEndImage.enabled,
                })
            });
            const data = await res.json();
            if (data.success) show('Bölüm sonu görseli ayarları kaydedildi!');
            else show(data.error || 'Kaydedilemedi', 'error');
        } catch { show('Sunucu hatası', 'error'); }
    }

    async function handleChapterStartImageUpload() {
        if (!chapterStartImageFile) { show('Lütfen bir görsel seçin', 'error'); return; }
        setChapterStartImageUploading(true);
        setChapterStartImageMsg('');
        try {
            const fd = new FormData();
            fd.append('chapter_start_image', chapterStartImageFile);
            const res = await authFetch('/api/admin/chapter-start-image', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');
            setChapterStartImage(prev => ({ ...prev, path: data.path }));
            setChapterStartImageMsg('✓ Görsel yüklendi');
            setChapterStartImageFile(null);
            show('Bölüm başı görseli başarıyla yüklendi!');
        } catch (e) {
            show(e.message, 'error');
        } finally {
            setChapterStartImageUploading(false);
        }
    }

    async function handleChapterStartImageDelete() {
        try {
            const res = await authFetch('/api/admin/chapter-start-image', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setChapterStartImage(prev => ({ ...prev, path: '' }));
            show('Bölüm başı görseli silindi');
        } catch (e) { show(e.message, 'error'); }
    }

    async function saveChapterStartImageSettings() {
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapter_start_image_enabled: chapterStartImage.enabled,
                })
            });
            const data = await res.json();
            if (data.success) show('Bölüm başı görseli ayarları kaydedildi!');
            else show(data.error || 'Kaydedilemedi', 'error');
        } catch { show('Sunucu hatası', 'error'); }
    }

    async function saveAdsSettings() {
        setAdSettingsSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adSettings)
            });
            const data = await res.json();
            if (data.success) show('Reklam ayarları kaydedildi!');
            else show(data.error || 'Kaydedilemedi', 'error');
        } catch { show('Sunucu hatası', 'error'); }
        finally { setAdSettingsSubmitting(false); }
    }

    async function saveAlertPopupSettings() {
        setAlertPopupSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertPopup)
            });
            const data = await res.json();
            if (data.success) show('Uyaru0131 popup ayarlaru0131 kaydedildi!');
            else show(data.error || 'Kaydedilemedi', 'error');
        } catch { show('Sunucu hatasu0131', 'error'); }
        finally { setAlertPopupSubmitting(false); }
    }

    async function handleSaveEmojis(updatedEmojis) {
        setSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_emojis: JSON.stringify(updatedEmojis) })
            });
            const data = await res.json();
            if (data.success) {
                setCommentEmojis(updatedEmojis);
                show('Tepki emojileri başarıyla kaydedildi!');
            } else {
                show(data.error || 'Ayarlar kaydedilemedi', 'error');
            }
        } catch (err) {
            show('Sunucu hatası', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSaveReportReasons(updatedReasons) {
        setSubmitting(true);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_report_reasons: JSON.stringify(updatedReasons) })
            });
            const data = await res.json();
            if (data.success) {
                setReportReasons(updatedReasons);
                show('Bildirim nedenleri başarıyla kaydedildi!');
            } else {
                show(data.error || 'Ayarlar kaydedilemedi', 'error');
            }
        } catch (err) {
            show('Sunucu hatası', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    function addEmoji() {
        if (!newEmojiIcon.trim() || !newEmojiLabel.trim()) return;
        const nextEmojis = [...commentEmojis, { icon: newEmojiIcon.trim(), label: newEmojiLabel.trim() }];
        setCommentEmojis(nextEmojis);
        setNewEmojiIcon('');
        setNewEmojiLabel('');
    }

    function removeEmoji(index) {
        const nextEmojis = commentEmojis.filter((_, i) => i !== index);
        setCommentEmojis(nextEmojis);
    }

    function updateEmojiField(index, field, value) {
        const nextEmojis = commentEmojis.map((em, i) => {
            if (i === index) {
                return { ...em, [field]: value };
            }
            return em;
        });
        setCommentEmojis(nextEmojis);
    }

    function addReason() {
        if (!newReasonText.trim()) return;
        const nextReasons = [...reportReasons, newReasonText.trim()];
        setReportReasons(nextReasons);
        setNewReasonText('');
    }

    function removeReason(index) {
        const nextReasons = reportReasons.filter((_, i) => i !== index);
        setReportReasons(nextReasons);
    }

    function updateReasonText(index, value) {
        const nextReasons = reportReasons.map((re, i) => {
            if (i === index) return value;
            return re;
        });
        setReportReasons(nextReasons);
    }

    // ── Series detail ──
    // Kart tıklamasından çağrılır (liste görünümü). openSeriesDetail'in kendisi
    // aynı zamanda bölüm ekleme/silme sonrası "yenile" için de kullanıldığından,
    // kart üzerindeki dönen yükleme işaretini sadece ilk tıklamada göstermek için
    // ayrı bir wrapper kullanılıyor.
    async function handleOpenSeriesCard(id) {
        setOpeningSeriesId(id);
        try {
            await openSeriesDetail(id);
        } finally {
            setOpeningSeriesId(null);
        }
    }

    async function openSeriesDetail(id) {
        try {
            const r = await authFetch(`/api/admin?seriesId=${id}`);
            const d = await r.json();
            setDetailSeries(d.series);
            const chs = d.chapters || [];
            setDetailChapters(chs);
            setChapterPage(1);
            setSubView('detail');
            setEditMode(false);
            populateForm(d.series);
            // Load scraper data for this series
            loadScraperData(id);

            // Calculate next chapter number
            let nextNum = 1;
            if (chs.length > 0) {
                const maxNum = Math.max(...chs.map(c => Number(c.chapter_number) || 0));
                nextNum = maxNum >= 0 ? maxNum + 1 : 1;
            }
            setCNum(String(nextNum));
        } catch (e) { show(e.message, 'error'); }
    }

    function populateForm(s) {
        setSTitle(s.title); setSDesc(s.description || ''); setSAuthor(s.author || ''); setSArtist(s.artist || '');
        setSStatus(s.status || 'ongoing'); setSType(s.type || 'manga'); setSGenres(tryParseGenres(s.genres)); setSRating(String(s.rating || 0));
        setSCover(null); setSCoverPreview(s.cover_url || ''); setSAltNames(s.alt_names || '');
        setSIsAdult(!!s.is_adult);
    }

    function resetForm() {
        setSTitle(''); setSDesc(''); setSAuthor(''); setSArtist(''); setSStatus('ongoing'); setSType('manga');
        setSGenres([]); setSRating('0'); setSCover(null); setSCoverPreview(''); setSAltNames(''); setSIsAdult(false);
        setSCustomGenreInput('');
    }

    function tryParseGenres(g) { try { return JSON.parse(g || '[]'); } catch { return Array.isArray(g) ? g : []; } }
    function fDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

    async function compressCoverImage(file, maxDim = 1600, quality = 0.85) {
        try {
            if (!file.type || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
            const bitmap = await createImageBitmap(file);
            let { width, height } = bitmap;
            if (width > maxDim || height > maxDim) {
                const scale = maxDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, width, height);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
            if (!blob) return file;
            if (blob.size >= file.size) return file;
            return new File([blob], (file.name || 'cover').replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
        } catch (err) {
            console.error('Cover compress error:', err);
            return file;
        }
    }

    async function handleCoverSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type?.startsWith('image/')) {
            show('Lütfen bir görsel dosyası seçin.', 'error');
            e.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            show('Kapak dosyası en fazla 5MB olabilir.', 'error');
            e.target.value = '';
            return;
        }
        try {
            const preview = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('Kapak önizlemesi oluşturulamadı.'));
                reader.readAsDataURL(file);
            });
            setSCoverPreview(preview);
            const compressed = await compressCoverImage(file);
            setSCover(compressed);
        } catch (error) {
            show(error.message || 'Kapak görseli seçilemedi.', 'error');
            setSCover(null);
            setSCoverPreview('');
        } finally {
            e.target.value = '';
        }
    }

    async function safeJson(r) {
        const raw = await r.text();
        try {
            return JSON.parse(raw);
        } catch {
            if (r.status === 413 || /request entity too large/i.test(raw)) {
                throw new Error('Dosya cok buyuk. Lutfen daha kucuk boyutlu bir gorsel secin.');
            }
            throw new Error('Sunucu beklenmeyen bir yanit dondurdu (HTTP ' + r.status + '). Lutfen tekrar deneyin.');
        }
    }

    async function handleCreateSeries(published) {
        if (!sTitle.trim()) return show('Title is required', 'error');
        setSubmitting(true);
        try {
            const fd = new FormData(); fd.append('action', 'add-series');
            fd.append('title', sTitle); fd.append('description', sDesc); fd.append('author', sAuthor);
            fd.append('artist', sArtist); fd.append('status', sStatus); fd.append('rating', sRating);
            fd.append('type', sType);
            fd.append('genres', JSON.stringify(sGenres));
            fd.append('published', published ? '1' : '0');
            fd.append('alt_names', sAltNames);
            fd.append('is_adult', sIsAdult ? '1' : '0');
            if (sCover) fd.append('cover', sCover);
            const r = await fetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() });
            const d = await safeJson(r); if (!r.ok) throw new Error(d.error);
            show(d.message); fetchStats();
            openSeriesDetail(d.seriesId);
        } catch (e) { show(e.message, 'error'); }
        finally { setSubmitting(false); }
    }

    async function handleUpdateSeries(published) {
        if (!sTitle.trim()) return show('Title is required', 'error');
        setSubmitting(true);
        try {
            const fd = new FormData(); fd.append('action', 'update-series');
            fd.append('seriesId', detailSeries.id); fd.append('title', sTitle); fd.append('description', sDesc);
            fd.append('author', sAuthor); fd.append('artist', sArtist); fd.append('status', sStatus);
            fd.append('type', sType);
            fd.append('rating', sRating); fd.append('published', published !== undefined ? (published ? '1' : '0') : String(detailSeries.published));
            fd.append('genres', JSON.stringify(sGenres));
            fd.append('alt_names', sAltNames);
            fd.append('is_adult', sIsAdult ? '1' : '0');
            if (sCover) fd.append('cover', sCover);
            const r = await fetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() });
            const d = await safeJson(r); if (!r.ok) throw new Error(d.error);
            show(d.message); fetchStats(); openSeriesDetail(detailSeries.id);
        } catch (e) { show(e.message, 'error'); }
        finally { setSubmitting(false); }
    }

    const [selectedChapters, setSelectedChapters] = useState([]);
    const [selectedSeriesIds, setSelectedSeriesIds] = useState([]);
    const [bulkSeriesCoverFile, setBulkSeriesCoverFile] = useState(null);

    // Toplu dış bağlantılı (URL) bölüm ekleme
    const [bulkExtLines, setBulkExtLines] = useState('');
    const [bulkExtTemplate, setBulkExtTemplate] = useState('');
    const [bulkExtStart, setBulkExtStart] = useState('');
    const [bulkExtEnd, setBulkExtEnd] = useState('');
    const [bulkExtNote, setBulkExtNote] = useState('');
    const [bulkExtBusy, setBulkExtBusy] = useState(false);
    const [bulkExtStatus, setBulkExtStatus] = useState('');
    const [showBulkSeriesActions, setShowBulkSeriesActions] = useState(false);

    // Büyük görselleri sunucuya tek seferde göndermek yerine küçük parçalara bölüp
    // yüklüyoruz. Vercel'in sunucu fonksiyonları ~4.5MB üzeri istek gövdelerini
    // reddediyor; özellikle uzun webtoon şerit sayfaları bu sınırı kolayca aşıp
    // yüklemenin sessizce yarıda kesilmesine yol açıyordu. Sunucu tüm parçalar
    // geldiğinde orijinal dosyayı birleştirip normal şekilde işliyor (kalite kaybı yok).
    async function uploadFileInChunks(file, { chapterId, isLastFileInBatch, onChunkProgress, storageProvider }) {
        const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB — Vercel sınırının altında güvenli pay
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
        const fileId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        let lastResult = null;
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(file.size, start + CHUNK_SIZE);
            const chunkBlob = file.slice(start, end);
            const fd = new FormData();
            fd.append('action', 'upload-page-chunk');
            fd.append('chapterId', chapterId);
            fd.append('fileId', fileId);
            fd.append('chunkIndex', String(i));
            fd.append('totalChunks', String(totalChunks));
            fd.append('fileName', file.name || 'page');
            fd.append('isLastFileInBatch', (isLastFileInBatch && i === totalChunks - 1) ? '1' : '0');
            fd.append('storageProvider', (storageProvider === 'vercel' || storageProvider === 'supabase') ? storageProvider : 'imgbb');
            fd.append('chunk', chunkBlob, file.name || 'chunk');

            const r = await fetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() });
            let d; try { d = await r.json(); } catch { d = {}; }
            if (!r.ok) throw new Error(d?.error || `${file.name || 'dosya'}: parça ${i + 1}/${totalChunks} yüklenemedi`);
            lastResult = d;
            if (onChunkProgress) onChunkProgress(i + 1, totalChunks);
        }
        return lastResult;
    }

    async function handleBulkUpload(e) {
        e.preventDefault();
        if (!bulkFiles || !bulkFiles.length) return show('Öncelikle bir klasör seçin', 'error');

        // Filter for images only — also check extension because Windows often reports f.type="" for JPGs from folder picker
        const IMAGE_EXTS = /\.(jpe?g|jpg|png|webp|gif|avif|bmp)$/i;
        const imageFiles = Array.from(bulkFiles).filter(f =>
            (f.type && f.type.startsWith('image/')) || IMAGE_EXTS.test(f.name || '')
        );
        if (imageFiles.length === 0) return show('Seçilen klasörde görsel bulunamadı.', 'error');
        if (!window.confirm(`${imageFiles.length} görsel dosyası bulundu. Bölümlere gruplayıp yüklemek istiyor musunuz?`)) return;

        setSubmitting(true);
        setBulkStatus('Dosyalar analiz ediliyor...');

        try {
            const chapterGroups = {};
            for(let i=0; i<imageFiles.length; i++) {
                const f = imageFiles[i];
                const pathParts = f.webkitRelativePath.split('/');
                if(pathParts.length < 2) continue; // Must be inside some folder e.g. Chapter 1/page.jpg
                const chapFolderName = pathParts[pathParts.length - 2]; 
                if(!chapterGroups[chapFolderName]) chapterGroups[chapFolderName] = [];
                chapterGroups[chapFolderName].push(f);
            }

            const folders = Object.keys(chapterGroups);
            if(folders.length === 0) throw new Error('Geçerli bölüm klasörleri bulunamadı. Bölüm klasörleri içeren bir klasör seçtiğinizden emin olun (Örn: MangaKlasor / Bölüm 1 / 01.jpg)');

            // Sort folders naturally
            folders.sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));

            // Toplu yükleme için thumbnail'ı bir kez yükle
            let bulkResolvedThumb = bulkThumbMode === 'auto' ? (detailSeries?.cover_url || null) : null;
            if (bulkThumbMode === 'upload' && bulkThumbFile) {
                setBulkStatus('Thumbnail yükleniyor...');
                bulkResolvedThumb = await uploadThumbFile(bulkThumbFile);
            }

            let successCount = 0;
            for(let i=0; i<folders.length; i++) {
                const folderName = folders[i];
                const files = chapterGroups[folderName];
                
                const numMatch = folderName.match(/(\d+(\.\d+)?)/);
                const chapNum = numMatch ? parseFloat(numMatch[1]) : (i + 1);

                setBulkStatus(`Bölüm ${chapNum} yükleniyor (${i+1}/${folders.length})...`);

                const r1 = await doAction('add-chapter', { seriesId: detailSeries.id, chapterNumber: chapNum, title: folderName, thumbnailUrl: bulkResolvedThumb });
                const newChapId = r1.chapterId;
                
                if(!newChapId) throw new Error(`Bölüm ${chapNum} oluşturulamadı`);

                setUploadProgress({ current: 0, total: files.length, fileName: files[0]?.name || '', percent: 0, label: `Bölüm ${chapNum} yükleniyor (${i + 1}/${folders.length} bölüm)` });
                for (let k = 0; k < files.length; k++) {
                    const isLastFileInBatch = k === files.length - 1;
                    setUploadProgress(prev => prev ? { ...prev, current: k, fileName: files[k].name || `sayfa ${k + 1}` } : prev);
                    try {
                        await uploadFileInChunks(files[k], {
                            chapterId: newChapId, isLastFileInBatch,
                            storageProvider: uploadProvider,
                            onChunkProgress: (done, totalChunks) => {
                                setUploadProgress(prev => prev ? { ...prev, percent: Math.round(((k + done / totalChunks) / files.length) * 100) } : prev);
                            },
                        });
                        setUploadProgress(prev => prev ? { ...prev, current: k + 1, percent: Math.round(((k + 1) / files.length) * 100) } : prev);
                    } catch (fileErr) {
                        throw new Error(`Bölüm ${chapNum}, sayfa ${k + 1}: ${fileErr.message}`);
                    }
                }

                successCount++;
            }

            show(`Toplu yükleme tamamlandı! ${successCount} bölüm eklendi.`);
            setBulkFiles(null); setBulkStatus(''); setBulkThumbMode('none'); setBulkThumbFile(null);
            if (bulkThumbFileRef.current) bulkThumbFileRef.current.value = '';
            await openSeriesDetail(detailSeries.id); fetchStats();
        } catch(e) {
            show(e.message, 'error');
            setBulkStatus('Hata. Konsolu kontrol edin.');
            setTimeout(() => setBulkStatus(''), 3000);
            await openSeriesDetail(detailSeries.id); fetchStats();
        } finally {
            setSubmitting(false);
            setUploadProgress(null);
            if (document.getElementById('bulk-folder-input')) document.getElementById('bulk-folder-input').value = "";
        }
    }

    // Şablon URL ("{n}" bölüm no ile değişir) + başlangıç/bitiş no'suna göre satırları otomatik üret
    function generateBulkExtLines() {
        const start = parseFloat(bulkExtStart);
        const end = parseFloat(bulkExtEnd);
        if (!bulkExtTemplate.trim() || !bulkExtTemplate.includes('{n}')) {
            return show('Şablon URL içinde bölüm numarası için {n} kullanın. Örn: https://kaynaksite.com/seri/bolum-{n}', 'error');
        }
        if (isNaN(start) || isNaN(end) || start > end) {
            return show('Geçerli bir başlangıç/bitiş bölüm numarası girin', 'error');
        }
        const lines = [];
        for (let n = start; n <= end; n++) {
            lines.push(`${n}|${bulkExtTemplate.trim().replaceAll('{n}', n)}`);
        }
        setBulkExtLines(prev => (prev.trim() ? prev.trim() + '\n' : '') + lines.join('\n'));
        show(`${lines.length} satır oluşturuldu — göndermeden önce kontrol edebilirsiniz`);
    }

    // Yapıştırılan "bölümNo|URL|başlık(opsiyonel)" satırlarını tek tek bölüm olarak ekler
    async function handleBulkExternalSubmit() {
        const rawLines = bulkExtLines.split('\n').map(l => l.trim()).filter(Boolean);
        if (rawLines.length === 0) return show('Önce en az bir satır girin', 'error');

        const parsed = [];
        const badLines = [];
        for (const line of rawLines) {
            const parts = line.split('|').map(p => p.trim());
            const [numStr, url, title] = parts;
            const num = parseFloat(numStr);
            if (!numStr || isNaN(num) || !url || !/^https?:\/\//i.test(url)) {
                badLines.push(line);
                continue;
            }
            parsed.push({ num, url, title: title || `Bölüm ${num}` });
        }
        if (badLines.length > 0) {
            return show(`${badLines.length} satır hatalı biçimde (bölümNo|URL formatında olmalı, URL http(s):// ile başlamalı). Önce bunları düzeltin:\n${badLines.slice(0, 3).join('\n')}`, 'error');
        }
        if (!window.confirm(`${parsed.length} adet dış bağlantılı bölüm eklenecek. Devam edilsin mi?`)) return;

        setBulkExtBusy(true);
        let successCount = 0;
        const failed = [];
        try {
            for (let i = 0; i < parsed.length; i++) {
                const { num, url, title } = parsed[i];
                setBulkExtStatus(`Bölüm ${num} ekleniyor (${i + 1}/${parsed.length})...`);
                try {
                    await doAction('add-chapter', {
                        seriesId: detailSeries.id, chapterNumber: num, title,
                        externalUrl: url, externalNote: bulkExtNote.trim() || null,
                    });
                    successCount++;
                } catch (err) {
                    failed.push(`${num}: ${err.message}`);
                }
            }
            if (failed.length > 0) {
                show(`${successCount}/${parsed.length} bölüm eklendi. Başarısız olanlar: ${failed.slice(0, 5).join(', ')}`, 'error');
            } else {
                show(`${successCount} dış bağlantılı bölüm eklendi`);
            }
            setBulkExtLines(''); setBulkExtTemplate(''); setBulkExtStart(''); setBulkExtEnd(''); setBulkExtNote('');
            await openSeriesDetail(detailSeries.id); fetchStats();
        } finally {
            setBulkExtBusy(false);
            setBulkExtStatus('');
        }
    }

    async function uploadThumbFile(file) {
        if (!file) return null;
        const fd = new FormData();
        fd.append('action', 'upload-thumbnail');
        fd.append('thumbnailFile', file);
        const r = await fetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Thumbnail yüklenemedi');
        return d.thumbnailUrl || null;
    }

    async function handleAddChapter() {
        if (!cNum) return show('Bölüm numarası gerekli', 'error');
        if (cIsExternal && !cExternalUrl.trim()) return show('Dış bağlantı URL\'si gerekli', 'error');
        setSubmitting(true);
        try {
            let resolvedThumb = cThumbMode === 'auto' ? (detailSeries?.cover_url || null) : null;
            if (cThumbMode === 'upload' && cThumbFile) resolvedThumb = await uploadThumbFile(cThumbFile);
            // datetime-local yerel saat verir; UTC'ye çevirip saklıyoruz
            let publishAtUtc = null;
            if (cPublishAt) {
                const localDate = new Date(cPublishAt);
                if (!isNaN(localDate.getTime())) {
                    // SQLite'ın beklediği format: "YYYY-MM-DD HH:MM:SS"
                    publishAtUtc = localDate.toISOString().replace('T', ' ').slice(0, 19);
                }
            }
            const r1 = await doAction('add-chapter', {
                seriesId: detailSeries.id, chapterNumber: cNum, title: cTitle || `Bölüm ${cNum}`,
                content: cIsExternal ? null : cContent, publishAt: publishAtUtc, thumbnailUrl: resolvedThumb,
                externalUrl: cIsExternal ? cExternalUrl.trim() : null,
                externalNote: cIsExternal ? (cExternalNote.trim() || null) : null,
            });
            const newChapId = r1.chapterId;

            // Dış bağlantılı bölümlerde sayfa yüklenmez
            if (cIsExternal) {
                show('Dış bağlantılı bölüm eklendi');
            } else
            // Upload images if any were selected
            if (cFiles && cFiles.length > 0 && newChapId && detailSeries?.type !== 'novel') {
                const filesArr = Array.from(cFiles);
                let uploadErrors = 0;
                let uploadedCount = 0;
                const failedNames = [];
                setUploadProgress({ current: 0, total: filesArr.length, fileName: filesArr[0]?.name || '', percent: 0, label: `Bölüm ${cNum} sayfaları yükleniyor` });
                for (let k = 0; k < filesArr.length; k++) {
                    const isLastFileInBatch = k === filesArr.length - 1;
                    setUploadProgress(prev => prev ? { ...prev, current: k, fileName: filesArr[k].name || `sayfa ${k + 1}` } : prev);
                    try {
                        await uploadFileInChunks(filesArr[k], {
                            chapterId: newChapId, isLastFileInBatch,
                            storageProvider: uploadProvider,
                            onChunkProgress: (done, totalChunks) => {
                                setUploadProgress(prev => prev ? { ...prev, percent: Math.round(((k + done / totalChunks) / filesArr.length) * 100) } : prev);
                            },
                        });
                        uploadedCount++;
                        setUploadProgress(prev => prev ? { ...prev, current: k + 1, percent: Math.round(((k + 1) / filesArr.length) * 100) } : prev);
                    } catch (fileErr) {
                        uploadErrors++;
                        failedNames.push(filesArr[k].name || `sayfa ${k + 1}`);
                        console.error(fileErr);
                    }
                }
                setUploadProgress(null);
                if (uploadErrors > 0) {
                    show(`Bölüm ${cNum} eklendi. ${uploadedCount}/${filesArr.length} sayfa yüklendi. Başarısız: ${failedNames.join(', ')}`, 'error');
                } else {
                    show(`Bölüm ${cNum} eklendi ve ${uploadedCount} sayfa yüklendi`);
                }
            } else {
                show('Bölüm eklendi');
            }

            setCNum(''); setCTitle(''); setCFiles(null); setCContent(''); setCPublishAt(''); setCThumbUrl(''); setCThumbMode('none'); setCThumbFile(null);
            setCIsExternal(false); setCExternalUrl(''); setCExternalNote('');
            if (cFileInputRef.current) cFileInputRef.current.value = '';
            if (cThumbFileRef.current) cThumbFileRef.current.value = '';
            await openSeriesDetail(detailSeries.id); fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setSubmitting(false); setUploadProgress(null); }
    }

    async function handleUpdateChapter() {
        if (!editChapNum) return show('Bölüm numarası gerekli', 'error');
        if (editChapIsExternal && !editChapExternalUrl.trim()) return show('Dış bağlantı URL\'si gerekli', 'error');
        setSubmitting(true);
        try {
            let resolvedEditThumb = editChapThumbMode === 'auto' ? (detailSeries?.cover_url || null) : editChapThumbMode === 'none' ? null : editChapThumb.trim() || null;
            if (editChapThumbMode === 'upload' && editChapThumbFile) resolvedEditThumb = await uploadThumbFile(editChapThumbFile);
            await doAction('update-chapter', {
                chapterId: editingChapterId, chapterNumber: editChapNum, title: editChapTitle, content: editChapContent, thumbnailUrl: resolvedEditThumb,
                externalUrl: editChapIsExternal ? editChapExternalUrl.trim() : '',
                externalNote: editChapIsExternal ? (editChapExternalNote.trim() || '') : '',
            });
            show('Bölüm güncellendi'); setEditingChapterId(null); setEditChapNum(''); setEditChapTitle(''); setEditChapContent(''); setEditChapThumb(''); setEditChapThumbMode('none'); setEditChapThumbFile(null);
            setEditChapIsExternal(false); setEditChapExternalUrl(''); setEditChapExternalNote('');
            await openSeriesDetail(detailSeries.id); fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setSubmitting(false); }
    }

    async function handleAutoThumb(chapterId) {
        setAutoThumbLoading(true);
        try {
            const fd = new FormData();
            fd.append('action', 'auto-thumbnail');
            fd.append('chapterId', chapterId);
            const r = await fetch('/api/admin', { method: 'POST', body: fd, headers: authHeaders() });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Hata');
            show('Oto thumbnail ayarlandı');
            setEditChapThumb(d.thumbnailUrl || '');
            await openSeriesDetail(detailSeries.id);
        } catch (e) { show(e.message, 'error'); }
        finally { setAutoThumbLoading(false); }
    }

    async function handleUploadPages(e) {
        e.preventDefault();
        if (!uploadChapterId || !uFiles?.length) return show('Dosya seçin', 'error');
        setSubmitting(true);
        const uFilesArray = Array.from(uFiles);
        setUploadProgress({ current: 0, total: uFilesArray.length, fileName: uFilesArray[0]?.name || '', percent: 0, label: 'Sayfalar yükleniyor' });
        try {
            let errors = [];
            let totalUploaded = 0;
            for (let k = 0; k < uFilesArray.length; k++) {
                const isLastFileInBatch = k === uFilesArray.length - 1;
                setUploadProgress(prev => prev ? { ...prev, current: k, fileName: uFilesArray[k].name || `sayfa ${k + 1}` } : prev);
                try {
                    await uploadFileInChunks(uFilesArray[k], {
                        chapterId: uploadChapterId, isLastFileInBatch,
                        storageProvider: uploadProvider,
                        onChunkProgress: (done, totalChunks) => {
                            setUploadProgress(prev => prev ? { ...prev, percent: Math.round(((k + done / totalChunks) / uFilesArray.length) * 100) } : prev);
                        },
                    });
                    totalUploaded++;
                    setUploadProgress(prev => prev ? { ...prev, current: k + 1, percent: Math.round(((k + 1) / uFilesArray.length) * 100) } : prev);
                } catch (fileErr) {
                    errors.push(`${uFilesArray[k].name || `sayfa ${k + 1}`}: ${fileErr.message}`);
                }
            }
            if (errors.length > 0) {
                show(`Yüklenen sayfa sayısı: ${totalUploaded}/${uFilesArray.length}. Bazı hatalar oluştu: ${errors[0]}`, 'error');
            } else {
                show(`${totalUploaded} sayfa başarıyla yüklendi`);
            }
            setUFiles(null); setUploadChapterId(null);
            await openSeriesDetail(detailSeries.id); fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setSubmitting(false); setUploadProgress(null); }
    }

    // ── Scraper helpers ──────────────────────────────────────────────────────

    async function scraperFetch() {
        if (!scraperUrl.trim()) return show('Enter a URL first', 'error');
        setScraperFetchLoading(true);
        setScraperFetchResult(null);
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fetch-info', url: scraperUrl.trim(), language: scraperLang }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setScraperFetchResult(data);
        } catch (e) { show(e.message, 'error'); }
        finally { setScraperFetchLoading(false); }
    }

    async function scraperAddSource(seriesId, url) {
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add-source', series_id: seriesId, url, language: scraperLang }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show('Source linked ✓');
            await loadScraperData(seriesId);
        } catch (e) { show(e.message, 'error'); }
    }

    async function scraperDeleteSource(sourceId, seriesId) {
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete-source', source_id: sourceId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show('Source removed');
            await loadScraperData(seriesId);
        } catch (e) { show(e.message, 'error'); }
    }

    async function scraperImport(seriesId, url) {
        setScraperImporting(true);
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'import-chapters',
                    series_id: seriesId,
                    url,
                    language: scraperLang,
                    publish_immediately: scraperPublishMode === 'publish',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show(data.message);
            await loadScraperData(seriesId);
            fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setScraperImporting(false); }
    }

    async function scraperPublishPending(pendingIds, seriesId) {
        setScraperPublishing(true);
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish-pending', pending_ids: pendingIds }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show(data.message);
            setScraperSelectedPending([]);
            await loadScraperData(seriesId);
            fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setScraperPublishing(false); }
    }

    async function scraperPublishAllPending(seriesId) {
        setScraperPublishing(true);
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish-pending', series_id: seriesId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show(data.message);
            setScraperSelectedPending([]);
            await loadScraperData(seriesId);
            fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setScraperPublishing(false); }
    }

    async function loadScraperData(seriesId) {
        setScraperSourcesLoading(true);
        try {
            const res = await authFetch(`/api/admin/scrape?seriesId=${seriesId}`);
            const data = await res.json();
            setScraperSources(data.sources || []);
            setScraperPending(data.pending || []);
            setScraperJobs(data.jobs || []);
        } catch {}
        finally { setScraperSourcesLoading(false); }
    }

    async function loadAllScraperSources() {
        setAllScraperSourcesLoading(true);
        try {
            const res = await authFetch('/api/admin/scrape?action=all');
            const data = await res.json();
            setAllScraperSources(data.sources || []);
        } catch {}
        finally { setAllScraperSourcesLoading(false); }
    }

    async function scraperSyncAll() {
        setScraperSyncLoading(true);
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync-all' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show(`Sync complete: ${data.total_new} new chapters found across ${data.synced} sources`);
            await loadAllScraperSources();
            fetchStats();
        } catch (e) { show(e.message, 'error'); }
        finally { setScraperSyncLoading(false); }
    }

    async function handleCreateSeriesFromScrape() {
        if (!scrapeNewUrl.trim()) return show('Enter a URL', 'error');
        setScrapeNewLoading(true);
        try {
            const res = await authFetch('/api/admin/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-series-from-scrape', url: scrapeNewUrl.trim(), language: scrapeNewLang, publish_series: false }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show(`"${data.title}" created with ${data.chapters_staged} chapters staged`);
            setScrapeNewUrl('');
            setScrapeNewPreview(null);
            fetchStats();
            await loadAllScraperSources();
        } catch (e) { show(e.message, 'error'); }
        finally { setScrapeNewLoading(false); }
    }

    if (authLoading || loading) return <div className="page-loading"><div className="spinner" /></div>;
    const builtinStaffRoles = ['admin', 'manager', 'moderator', 'team_member'];
    const customRoleNames = customRoles.map(r => r.name);
    const isCustomRole = !builtinStaffRoles.includes(user?.role) && customRoleNames.includes(user?.role);
    const currentCustomRole = isCustomRole ? customRoles.find(r => r.name === user.role) : null;
    const currentCustomPerms = currentCustomRole?.permissions || [];

    if (!user || (!builtinStaffRoles.includes(user.role) && !isCustomRole)) return null;

    const allSeries = stats?.allSeries || [];

    // Permission → tab mapping for custom roles
    const PERM_TAB_MAP = {
        overview:      () => true,
        series:        () => currentCustomPerms.some(p => ['manage_series','delete_series','manage_chapters'].includes(p)),
        scraper:       () => currentCustomPerms.some(p => ['manage_series','manage_chapters'].includes(p)),
        media:         () => currentCustomPerms.includes('manage_media'),
        'api-key':     () => currentCustomPerms.includes('manage_settings'),
        users:         () => currentCustomPerms.some(p => ['manage_users','ban_users','view_users','assign_badges'].includes(p)),
        comments:      () => currentCustomPerms.some(p => ['manage_comments','view_comments'].includes(p)),
        requests:      () => currentCustomPerms.includes('manage_requests'),
        'bug-reports': () => currentCustomPerms.includes('view_reports'),
        'audit-log':   () => currentCustomPerms.includes('view_audit_log'),
        pages:         () => currentCustomPerms.includes('manage_pages'),
        backup:        () => currentCustomPerms.includes('manage_settings'),
        ads:           () => currentCustomPerms.includes('manage_settings'),
        settings:      () => currentCustomPerms.includes('manage_settings'),
        customize:     () => currentCustomPerms.includes('manage_settings'),
        traffic:       () => currentCustomPerms.includes('manage_settings'),
        announcements: () => currentCustomPerms.includes('manage_settings'),
    };

    return (
        <div className="admin-layout fade-in">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header"><h2><GearIcon /> Admin</h2></div>
                {NAVS.filter(n => {
                    if (user.role === 'admin' || user.role === 'manager') return true;
                    if (user.role === 'moderator' && (n.id === 'comments' || n.id === 'overview')) return true;
                    if (user.role === 'team_member' && ['series', 'scraper', 'media', 'overview'].includes(n.id)) return true;
                    if (isCustomRole) return (PERM_TAB_MAP[n.id] ? PERM_TAB_MAP[n.id]() : false);
                    return false;
                }).map(n => (
                    <button key={n.id} className={`admin-nav-item ${tab === n.id ? 'active' : ''}`}
                        onClick={() => {
                            if (n.external) { router.push(n.external); return; }
                            setTab(n.id); setSubView(null); setEditMode(false); setUsersPage(1); setCommentsPage(1); setRequestsPage(1); setReportsPage(1); if (n.id === 'backup') loadBackups(); if (n.id === 'traffic') loadTrafficData(); if (n.id === 'audit-log') loadAuditLogs(); if (n.id === 'series') loadGenres(); if (n.id === 'users') loadAllBadgeOptions();
                        }}
                    >
                        <n.icon /> {n.label}
                    </button>
                ))}
            </aside>

            {/* Content */}
            <main className="admin-content">
                {msg && <div className={`alert ${msgType === 'error' ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

                {/* ═══════════════ DASHBOARD ═══════════════ */}
                {tab === 'overview' && (
                    <>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Genel Bakış</h2>
                        <div className="stat-grid">
                            {[{ v: stats?.totalSeries || 0, l: 'Seri' }, { v: stats?.totalChapters || 0, l: 'Bölüm' },
                            { v: stats?.totalPages || 0, l: 'Sayfa' },
                            { v: stats?.totalUsers || 0, l: 'Kullanıcı' }, { v: stats?.totalComments || 0, l: 'Yorum' }].map(s => (
                                <div key={s.l} className="stat-card"><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
                            ))}
                        </div>
                        {/* Sunucu Kaynak Kullanımı */}
                        <div className="admin-card" style={{ marginBottom: 16 }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                                Sunucu Kaynak Kullanımı
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CPU Kullanımı</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8' }}>{stats?.cpuUsage ?? '0'}%</div>
                                    <div style={{ width: '100%', height: 4, background: 'rgba(129,140,248,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, parseInt(stats?.cpuUsage) || 0)}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #a78bfa)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>İşlemci yükü</div>
                                </div>
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 19v-3"/><path d="M10 19v-6"/><path d="M14 19v-9"/><path d="M18 19v-12"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RAM Kullanımı</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{stats?.ramUsage ?? '0'}%</div>
                                    <div style={{ width: '100%', height: 4, background: 'rgba(74,222,128,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, parseInt(stats?.ramUsage) || 0)}%`, height: '100%', background: 'linear-gradient(90deg, #4ade80, #22c55e)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{stats?.ramDetails ? `${stats.ramDetails.used} / ${stats.ramDetails.total}` : 'Bellek kullanımı'}</div>
                                </div>
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Depolama</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{stats?.storage?.total?.formatted || '0 B'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Toplam disk kullanımı</div>
                                </div>
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Yedekler</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc' }}>{stats?.storage?.backups?.formatted || '0 B'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{stats?.storage?.backups?.count || 0} yedek dosyası</div>
                                </div>
                            </div>
                        </div>
                        {/* Depolama Bilgisi */}
                        {stats?.storage && (
                            <div className="admin-card" style={{ marginBottom: 16 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                                    Depolama Kullanımı
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                                    {[
                                        { label: 'Yüklenen Bölüm Sayfaları', value: stats.storage?.uploads?.formatted || '0 B', icon: '🖼️' },
                                        { label: 'Veritabanı', value: stats.storage?.database?.formatted || '0 B', icon: '💾' },
                                        { label: 'Toplam', value: stats.storage?.total?.formatted || '0 B', icon: '📦', bold: true },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 14px', border: s.bold ? '1px solid var(--accent)' : '1px solid transparent' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1rem', color: s.bold ? 'var(--accent-light)' : 'var(--text-primary)' }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="admin-grid">
                            <div className="admin-card">
                                <h3><ShieldIcon /> Güvenlik</h3>
                                <ul style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', paddingLeft: 20, lineHeight: 2.2, listStyle: 'none' }}>
                                    <li>• Şifreler: bcrypt (12 turlu)</li>
                                    <li>• Yetkilendirme: JWT jetonları (7 günlük geçerlilik)</li>
                                    <li>• Oturumlar: HttpOnly SameSite cookie</li>
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════════════ DUYURULAR ═══════════════ */}
                {tab === 'announcements' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MegaphoneIcon /> Duyurular
                            </h2>
                        </div>
                        <div className="admin-card" style={{ marginBottom: 20 }}>
                            <h3>Yeni Duyuru Oluştur</h3>
                            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexDirection: 'column' }}>
                                <input type="text" className="form-input" placeholder="Duyuru mesajı... (örn. Discord sunucumuza katılın!)" value={annMsg} onChange={(e) => setAnnMsg(e.target.value)} />
                                <input type="url" className="form-input" placeholder="İsteğe Bağlı URL Bağlantısı..." value={annLink} onChange={(e) => setAnnLink(e.target.value)} />
                                <button className="btn btn-primary" onClick={addAnnouncement} style={{ width: 120 }}>Yayınla</button>
                            </div>
                        </div>
                        <div className="admin-card">
                            <h3>Aktif ve Geçmiş Duyurular</h3>
                            <table className="admin-table" style={{ marginTop: 15 }}>
                                <thead><tr><th>Mesaj</th><th>Bağlantı</th><th>Durum</th><th>İşlemler</th></tr></thead>
                                <tbody>
                                    {announcements.map(a => (
                                        <tr key={a.id}>
                                            <td>{a.message}</td>
                                            <td>{a.link_url ? <a href={safeHref(a.link_url)} target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-light)'}}>Bağlantı</a> : '-'}</td>
                                            <td>{a.is_active ? <span style={{color: 'var(--success)'}}>Aktif</span> : 'Gizli'}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm" onClick={() => toggleAnn(a.id, !a.is_active)}>
                                                    {a.is_active ? 'Gizle' : 'Göster'}
                                                </button>
                                                <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}} onClick={() => deleteAnn(a.id)}>Sil</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {announcements.length === 0 && <tr><td colSpan="4" style={{textAlign: 'center', color: 'var(--text-muted)'}}>Henüz duyuru yayınlanmamış</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ═══════════════ MAĞAZA (SHOP) ═══════════════ */}
                {tab === 'shop' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <GiftIcon /> Mağaza
                            </h2>
                            <button className="btn btn-primary btn-sm" onClick={() => openShopCreateModal(shopFilterType)}>
                                <PlusIcon /> Yeni Öğe
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {[
                                { id: 'badge', label: 'Rozetler' },
                                { id: 'frame', label: 'Avatar Çerçeveleri' },
                                { id: 'title', label: 'Unvanlar' },
                            ].map(t => (
                                <button key={t.id} className={`btn btn-sm ${shopFilterType === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShopFilterType(t.id)}>
                                    {t.label} ({shopItems.filter(i => i.type === t.id).length})
                                </button>
                            ))}
                        </div>

                        {shopLoading ? (
                            <div className="admin-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Yükleniyor...</div>
                        ) : shopItems.filter(i => i.type === shopFilterType).length === 0 ? (
                            <div className="admin-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Bu kategoride henüz öğe yok.</p>
                                <button className="btn btn-primary" onClick={() => openShopCreateModal(shopFilterType)}><PlusIcon /> İlk Öğeyi Oluştur</button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                                {shopItems.filter(i => i.type === shopFilterType).map(item => (
                                    <div key={item.id} className="admin-card" style={{ opacity: item.is_active ? 1 : 0.5 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                            {item.type === 'title' ? (
                                                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <TagIcon />
                                                </div>
                                            ) : (
                                                <div style={{ width: 48, height: 48, borderRadius: item.type === 'frame' ? '50%' : 8, background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} decoding="async" />}
                                                </div>
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: item.type === 'title' ? (item.title_color || undefined) : undefined }}>{item.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.price.toLocaleString()} puan</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openShopEditModal(item)}><EditIcon /> Düzenle</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => toggleShopItemActive(item)}>{item.is_active ? 'Gizle' : 'Göster'}</button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteShopItem(item)}><TrashIcon /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════ SERIES MANAGEMENT ═══════════════ */}
                {tab === 'series' && !subView && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BookIcon /> Seriler ({allSeries.length})
                            </h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {allSeries.length > 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => {
                                        if (selectedSeriesIds.length === allSeries.length) setSelectedSeriesIds([]);
                                        else setSelectedSeriesIds(allSeries.map(s => s.id));
                                    }}>
                                        {selectedSeriesIds.length === allSeries.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                    </button>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setSubView('create'); }}>
                                    <PlusIcon /> Yeni Seri
                                </button>
                            </div>
                        </div>
                        {/* Toplu işlem araç çubuğu */}
                        {selectedSeriesIds.length > 0 && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(94,114,228,0.1)', border: '1px solid rgba(94,114,228,0.3)', borderRadius: 10, marginBottom: 14 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>{selectedSeriesIds.length} seri seçildi</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                                        <input type="file" accept="image/*" style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    show('Kapak görselleri güncelleniyor...', 'info');
                                                    const compressed = await compressCoverImage(file);
                                                    const fd = new FormData();
                                                    fd.append('cover', compressed);
                                                    fd.append('seriesIds', JSON.stringify(selectedSeriesIds));
                                                    const res = await authFetch('/api/admin?action=bulk-update-cover', { method: 'POST', body: fd });
                                                    const data = await safeJson(res);
                                                    show(data.message || 'Kapak görselleri güncellendi!', res.ok ? 'success' : 'error');
                                                    if (res.ok) { setSelectedSeriesIds([]); loadStats(); }
                                                } catch (err) { show(err.message || 'Bir hata oluştu', 'error'); }
                                                e.target.value = '';
                                            }}
                                        />
                                        <span className="btn btn-ghost btn-sm"><ImageIcon /> Toplu Kapak Ayarla</span>
                                    </label>
                                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                        action: 'bulk-delete-series',
                                        body: { seriesIds: JSON.stringify(selectedSeriesIds) },
                                        text: `Seçili ${selectedSeriesIds.length} seriyi silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!`,
                                        onDone: async () => { setSelectedSeriesIds([]); loadStats(); }
                                    })}>
                                        <TrashIcon /> Seçilenleri Sil ({selectedSeriesIds.length})
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSeriesIds([])}>İptal</button>
                                </div>
                            </div>
                        )}
                        {allSeries.length === 0 ? (
                            <div className="admin-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Henüz seri yok. İlk seriyi oluşturun!</p>
                                <button className="btn btn-primary" onClick={() => { resetForm(); setSubView('create'); }}>
                                    <PlusIcon /> İlk Seriyi Oluştur
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                {allSeries.map(s => (
                                    <div key={s.id} className="admin-card"
                                        style={{ cursor: 'pointer', transition: 'transform 0.15s', outline: selectedSeriesIds.includes(s.id) ? '2px solid var(--accent)' : 'none', position: 'relative' }}
                                        onClick={(e) => {
                                            if (e.target.type === 'checkbox') return;
                                            if (selectedSeriesIds.length > 0) {
                                                setSelectedSeriesIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                                            } else {
                                                handleOpenSeriesCard(s.id);
                                            }
                                        }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                                        {openingSeriesId === s.id && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 5 }}>
                                                <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div style={{ position: 'relative', width: 60, height: 85, flexShrink: 0 }}>
                                                <div style={{ width: 60, height: 85, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                                                    <img src={s.cover_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='85'%3E%3Crect width='60' height='85' fill='%231a1a2e'/%3E%3Ctext x='30' y='45' text-anchor='middle' fill='%23555' font-size='22'%3E📖%3C/text%3E%3C/svg%3E"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                                </div>
                                                <input type="checkbox" checked={selectedSeriesIds.includes(s.id)}
                                                    onChange={(e) => { e.stopPropagation(); setSelectedSeriesIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)); }}
                                                    style={{ position: 'absolute', top: 4, left: 4, width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</h3>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                                    <span className={`admin-badge ${s.published ? 'admin-role' : 'user-role'}`}>{s.published ? 'Yayında' : 'Taslak'}</span>
                                                    <span className="admin-badge user-role">{s.status}</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {s.chapter_count || 0} bölüm · {(s.views || 0).toLocaleString()} görüntülenme · ★ {s.rating?.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════ CREATE SERIES ═══════════════ */}
                {tab === 'series' && subView === 'create' && (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSubView(null)} style={{ marginBottom: 16 }}>
                            <BackIcon /> Back to Series
                        </button>
                        <div className="admin-card" style={{ maxWidth: 620 }}>
                            <h3><PlusIcon /> Create New Series</h3>
                            {renderSeriesForm()}
                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                <button className="btn btn-primary" onClick={() => handleCreateSeries(true)} disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Publish'}
                                </button>
                                <button className="btn btn-ghost" onClick={() => handleCreateSeries(false)} disabled={submitting}>
                                    Save as Draft
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════════════ SERIES DETAIL ═══════════════ */}
                {tab === 'series' && subView === 'detail' && detailSeries && (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSubView(null); setEditMode(false); }} style={{ marginBottom: 16 }}>
                            <BackIcon /> Back to Series
                        </button>

                        {/* Series info card */}
                        <div className="admin-card" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ width: 120, height: 170, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)', cursor: 'pointer', position: 'relative' }}
                                    onClick={() => setPreviewImage({ src: sCoverPreview || detailSeries.cover_url || '', title: `${detailSeries.title} — Cover` })}
                                    title="Click to preview">
                                    <img src={sCoverPreview || detailSeries.cover_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='170'%3E%3Crect width='120' height='170' fill='%231a1a2e'/%3E%3Ctext x='60' y='90' text-anchor='middle' fill='%23555' font-size='32'%3E📖%3C/text%3E%3C/svg%3E"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ opacity: 0, transition: 'opacity 0.15s' }}
                                            onMouseOver={e => { e.currentTarget.style.opacity = '1'; }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    {!editMode ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                                <div>
                                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{detailSeries.title}</h2>
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                        <span className={`admin-badge ${detailSeries.published ? 'admin-role' : 'user-role'}`}>{detailSeries.published ? 'Published' : 'Draft'}</span>
                                                        <span className="admin-badge user-role">{detailSeries.status}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {detailSeries.id}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}><EditIcon /> Edit</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/seri/${detailSeries.slug || detailSeries.id}`, '_blank')}><EyeIcon /> View</button>
                                                    {(!isCustomRole || currentCustomPerms.includes('delete_series')) && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                                            action: 'delete-series', body: { seriesId: detailSeries.id },
                                                            text: `Delete "${detailSeries.title}" and all its chapters & pages?`,
                                                            onDone: () => { setSubView(null); }
                                                        })}><TrashIcon /></button>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>{detailSeries.description || 'No description'}</p>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                {detailSeries.author && <span>Author: <strong>{detailSeries.author}</strong></span>}
                                                {detailSeries.artist && <span>Artist: <strong>{detailSeries.artist}</strong></span>}
                                                <span>Rating: <strong>★ {(detailSeries.rating || 0).toFixed(1)}</strong></span>
                                                <span>Views: <strong>{(detailSeries.views || 0).toLocaleString()}</strong></span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {renderSeriesForm()}
                                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                                <button className="btn btn-primary" onClick={() => handleUpdateSeries()} disabled={submitting}>
                                                    {submitting ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                {!detailSeries.published && (
                                                    <button className="btn btn-ghost" onClick={() => handleUpdateSeries(true)} disabled={submitting}>Publish Now</button>
                                                )}
                                                {detailSeries.published === 1 && (
                                                    <button className="btn btn-ghost" onClick={() => handleUpdateSeries(false)} disabled={submitting}>Unpublish</button>
                                                )}
                                                <button className="btn btn-ghost" onClick={() => { setEditMode(false); populateForm(detailSeries); }}>Cancel</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chapters Section */}
                        <div className="admin-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ margin: 0 }}>Bölümler ({detailChapters.length})</h3>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {selectedChapters.length > 0 ? (
                                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                            action: 'delete-selected-chapters', body: { seriesId: detailSeries.id, chapterIds: JSON.stringify(selectedChapters) },
                                            text: `Seçili ${selectedChapters.length} bölümü ve sayfalarını silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!`,
                                            onDone: async () => { setSelectedChapters([]); await openSeriesDetail(detailSeries.id); }
                                        })}>
                                            <TrashIcon /> Seçilenleri Sil ({selectedChapters.length})
                                        </button>
                                    ) : (
                                        detailChapters.length > 0 && (
                                            <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                                action: 'delete-all-chapters', body: { seriesId: detailSeries.id },
                                                text: `Tüm ${detailChapters.length} bölümü ve sayfalarını silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!`,
                                                onDone: async () => { await openSeriesDetail(detailSeries.id); }
                                            })}>
                                                <TrashIcon /> Tümünü Sil
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Add chapter inline */}
                            <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <PlusIcon /> Tekli Bölüm Ekle
                                </h4>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer', color: '#38bdf8', fontWeight: 600, marginBottom: 10, padding: '8px 10px', background: 'rgba(56,189,248,0.06)', borderRadius: 6, border: '1px solid rgba(56,189,248,0.2)', width: 'fit-content' }}>
                                    <input type="checkbox" checked={cIsExternal} onChange={e => setCIsExternal(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                    Dış Bağlantılı Bölüm (sayfa yüklemeden, başka bir siteye yönlendir)
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ margin: 0, flex: '0 0 90px' }}>
                                        <label style={{ fontSize: '0.72rem' }}>Bölüm No</label>
                                        <input type="number" className="form-input" step="0.1" value={cNum} onChange={e => setCNum(e.target.value)} placeholder="1" />
                                    </div>
                                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                                        <label style={{ fontSize: '0.72rem' }}>Başlık (isteğe bağlı)</label>
                                        <input className="form-input" value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Bölüm başlığı" />
                                    </div>
                                    {cIsExternal ? (
                                        <div className="form-group" style={{ margin: 0, flex: '1 1 100%' }}>
                                            <label style={{ fontSize: '0.72rem' }}>Kaynak Bölüm URL'si *</label>
                                            <input
                                                type="url"
                                                className="form-input"
                                                value={cExternalUrl}
                                                onChange={e => setCExternalUrl(e.target.value)}
                                                placeholder="https://kaynak-site.com/seri/bolum-44"
                                                style={{ fontSize: '0.8rem' }}
                                            />
                                            <label style={{ fontSize: '0.72rem', marginTop: 6, display: 'block' }}>Bu bölüme özel uyarı metni (isteğe bağlı)</label>
                                            <textarea
                                                className="form-input"
                                                rows="2"
                                                value={cExternalNote}
                                                onChange={e => setCExternalNote(e.target.value)}
                                                placeholder="Boş bırakılırsa Ayarlar sayfasındaki varsayılan uyarı metni kullanılır"
                                                style={{ fontSize: '0.78rem', resize: 'vertical' }}
                                            />
                                        </div>
                                    ) : detailSeries?.type === 'novel' ? (
                                        <div className="form-group" style={{ margin: 0, flex: '1 1 100%' }}>
                                            <label style={{ fontSize: '0.72rem' }}>Bölüm Metni</label>
                                            <FormatToolbar stateSetter={setCContent} stateValue={cContent} textareaId="add-novel-content" />
                                            <textarea id="add-novel-content" className="form-input" rows="4" value={cContent} onChange={e => setCContent(e.target.value)} placeholder="Novel bölüm metnini buraya yapıştırın..." style={{ resize: 'vertical' }} />
                                        </div>
                                    ) : (
                                        <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                                            <label style={{ fontSize: '0.72rem' }}>
                                                Görseller (isteğe bağlı)
                                                {cFiles && cFiles.length > 0 && (
                                                    <span style={{ color: 'var(--accent-light)', marginLeft: 6 }}>
                                                        {cFiles.length} dosya seçildi
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                ref={cFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="form-input"
                                                style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                                                onChange={e => setCFiles(e.target.files)}
                                            />
                                            <VercelUploadToggle style={{ marginTop: 4 }} />
                                        </div>
                                    )}
                                    <div className="form-group" style={{ margin: 0, flex: '0 0 200px' }}>
                                        <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <ClockIcon /> Zamanlanmış Yayın (isteğe bağlı)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={cPublishAt}
                                            onChange={e => setCPublishAt(e.target.value)}
                                            style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                                        />
                                        {cPublishAt && <small style={{ color: '#fbbf24', fontSize: '0.68rem' }}>⏰ Zamanlanmış</small>}
                                    </div>
                                    <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                                        <label style={{ fontSize: '0.72rem' }}>Küçük Görsel (Thumbnail)</label>
                                        <select className="form-input" value={cThumbMode} onChange={e => setCThumbMode(e.target.value)} style={{ fontSize: '0.75rem', padding: '5px 8px', marginBottom: 4 }}>
                                            <option value="none">Yok</option>
                                            <option value="auto">Oto (seri kapağı)</option>
                                            <option value="upload">Dosya Yükle</option>
                                        </select>
                                        {cThumbMode === 'upload' && (
                                            <input
                                                ref={cThumbFileRef}
                                                type="file"
                                                accept="image/*"
                                                className="form-input"
                                                onChange={e => setCThumbFile(e.target.files?.[0] || null)}
                                                style={{ fontSize: '0.72rem', padding: '5px 8px' }}
                                            />
                                        )}
                                        {cThumbMode === 'auto' && <small style={{ color: '#10b981', fontSize: '0.68rem' }}>✓ Seri kapağı kullanılacak</small>}
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleAddChapter}
                                        disabled={submitting || !cNum}
                                        style={{ height: 38, whiteSpace: 'nowrap', flexShrink: 0 }}
                                    >
                                        {submitting ? '...' : <><PlusIcon /> {cPublishAt ? 'Zamanla' : 'Ekle'}</>}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Bulk Upload Section */}
                            <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16, border: '1px dashed var(--border)' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <UploadIcon /> Toplu Bölüm Yükle
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Her bölüm için alt klasörler barındıran bir ana klasör seçin (Örn: MangaKlasor / Bölüm 1 / 01.jpg).
                                </p>
                                <div style={{ marginBottom: 10 }}>
                                    <VercelUploadToggle />
                                </div>
                                <form onSubmit={handleBulkUpload} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="file"
                                        id="bulk-folder-input"
                                        webkitdirectory=""
                                        multiple
                                        onChange={e => setBulkFiles(e.target.files)}
                                        style={{ fontSize: '0.75rem', flex: '1 1 200px', minWidth: 0 }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Thumb:</span>
                                        <select value={bulkThumbMode} onChange={e => setBulkThumbMode(e.target.value)} style={{ fontSize: '0.75rem', padding: '5px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }}>
                                            <option value="none">Yok</option>
                                            <option value="auto">Oto (kapak)</option>
                                            <option value="upload">Dosya</option>
                                        </select>
                                        {bulkThumbMode === 'upload' && (
                                            <input
                                                ref={bulkThumbFileRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setBulkThumbFile(e.target.files?.[0] || null)}
                                                style={{ fontSize: '0.72rem', maxWidth: 160 }}
                                            />
                                        )}
                                        {bulkThumbMode === 'auto' && <small style={{ color: '#10b981', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>✓ seri kapağı</small>}
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !bulkFiles} style={{ flexShrink: 0 }}>
                                        {submitting ? 'Yükleniyor...' : 'Toplu Yükle'}
                                    </button>
                                    {bulkStatus && <span style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>{bulkStatus}</span>}
                                </form>
                            </div>

                            {/* Bulk External URL Chapters Section */}
                            <div style={{ padding: 12, background: 'rgba(56,189,248,0.06)', borderRadius: 8, marginBottom: 16, border: '1px dashed rgba(56,189,248,0.35)' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                    Toplu Dış Bağlantılı Bölüm Ekle
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                    Başka bir ekip tarafından yapılmış çok sayıda bölümü, sayfa yüklemeden sadece kaynak URL olarak ekleyin. Aşağıya her satıra bir bölüm gelecek şekilde <code>bölümNo|URL|başlık(opsiyonel)</code> formatında yapıştırın, ya da altındaki şablonla otomatik oluşturun.
                                </p>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, padding: 10, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={bulkExtTemplate}
                                        onChange={e => setBulkExtTemplate(e.target.value)}
                                        placeholder="https://kaynaksite.com/seri/bolum-{n}"
                                        style={{ flex: '1 1 260px', fontSize: '0.78rem' }}
                                    />
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-input"
                                        value={bulkExtStart}
                                        onChange={e => setBulkExtStart(e.target.value)}
                                        placeholder="Baş. no"
                                        style={{ width: 90, fontSize: '0.78rem' }}
                                    />
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="form-input"
                                        value={bulkExtEnd}
                                        onChange={e => setBulkExtEnd(e.target.value)}
                                        placeholder="Bit. no"
                                        style={{ width: 90, fontSize: '0.78rem' }}
                                    />
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={generateBulkExtLines}>
                                        Satırları Oluştur
                                    </button>
                                </div>

                                <textarea
                                    className="form-input"
                                    rows="6"
                                    value={bulkExtLines}
                                    onChange={e => setBulkExtLines(e.target.value)}
                                    placeholder={"1|https://kaynaksite.com/seri/bolum-1\n2|https://kaynaksite.com/seri/bolum-2|Özel Başlık\n3|https://kaynaksite.com/seri/bolum-3"}
                                    style={{ fontSize: '0.78rem', fontFamily: 'monospace', resize: 'vertical', marginBottom: 8 }}
                                />

                                <textarea
                                    className="form-input"
                                    rows="2"
                                    value={bulkExtNote}
                                    onChange={e => setBulkExtNote(e.target.value)}
                                    placeholder="Bu toplu ekleme için ortak uyarı metni (isteğe bağlı — boş bırakılırsa Ayarlar'daki varsayılan metin kullanılır)"
                                    style={{ fontSize: '0.78rem', resize: 'vertical', marginBottom: 10 }}
                                />

                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={bulkExtBusy || !bulkExtLines.trim()}
                                        onClick={handleBulkExternalSubmit}
                                    >
                                        {bulkExtBusy ? 'Ekleniyor...' : `Bölümleri Ekle (${bulkExtLines.split('\n').filter(l => l.trim()).length})`}
                                    </button>
                                    {bulkExtStatus && <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{bulkExtStatus}</span>}
                                </div>
                            </div>

                            {/* ── Auto Import (Scraper) Section ── */}
                            <div style={{ padding: 14, background: 'rgba(99,102,241,0.06)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(99,102,241,0.25)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-light)' }}>
                                    <DownloadIcon /> Auto Import (Scraper)
                                    {scraperSources.length > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 50, background: 'rgba(99,102,241,0.2)', color: 'var(--accent-light)' }}>
                                        {scraperSources.length} source{scraperSources.length !== 1 ? 's' : ''}
                                    </span>}
                                </h4>

                                {/* Existing sources */}
                                {scraperSources.map(src => (
                                    <div key={src.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                                        <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{src.source_site}</span>
                                        <span style={{ fontSize: '0.78rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={src.source_url}>{src.source_url}</span>
                                        {src.last_checked && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>checked {new Date(src.last_checked).toLocaleDateString()}</span>}
                                        {src.last_chapter_found > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>last: ch.{src.last_chapter_found}</span>}
                                        <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                                            disabled={scraperImporting}
                                            onClick={() => scraperImport(detailSeries.id, src.source_url)}>
                                            {scraperImporting ? <span className="spinner" style={{ width: 10, height: 10 }} /> : <><SyncIcon /> Check New</>}
                                        </button>
                                        <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem' }}
                                            onClick={() => setConfirmModal({ text: 'Remove this scraper source?', action: async () => { await scraperDeleteSource(src.id, detailSeries.id); show('Source removed'); } })}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}

                                {/* Add new source */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="Paste series URL (MangaDex, Comick, etc.)"
                                        value={scraperUrl}
                                        onChange={e => { setScraperUrl(e.target.value); setScraperFetchResult(null); }}
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                    />
                                    <select
                                        value={scraperLang}
                                        onChange={e => { setScraperLang(e.target.value); setScraperFetchResult(null); }}
                                        title="Language (MangaDex / Comick only)"
                                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', flexShrink: 0 }}>
                                        <option value="en">🇬🇧 English</option>
                                        <option value="tr">🇹🇷 Turkish</option>
                                        <option value="pt-br">🇧🇷 Portuguese (BR)</option>
                                        <option value="es">🇪🇸 Spanish</option>
                                        <option value="es-la">🇲🇽 Spanish (LA)</option>
                                        <option value="fr">🇫🇷 French</option>
                                        <option value="de">🇩🇪 German</option>
                                        <option value="it">🇮🇹 Italian</option>
                                        <option value="id">🇮🇩 Indonesian</option>
                                        <option value="ru">🇷🇺 Russian</option>
                                        <option value="ar">🇸🇦 Arabic</option>
                                        <option value="ja">🇯🇵 Japanese</option>
                                        <option value="ko">🇰🇷 Korean</option>
                                        <option value="zh">🇨🇳 Chinese (Simp.)</option>
                                        <option value="zh-hk">🇹🇼 Chinese (Trad.)</option>
                                    </select>
                                    <button className="btn btn-ghost btn-sm" onClick={scraperFetch} disabled={scraperFetchLoading || !scraperUrl}>
                                        {scraperFetchLoading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Preview'}
                                    </button>
                                </div>

                                {/* Preview result */}
                                {scraperFetchResult && (
                                    <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 10, fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                                            <strong style={{ color: 'var(--accent-light)' }}>{scraperFetchResult.meta?.title}</strong>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{scraperFetchResult.site}</span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{scraperFetchResult.chapters_count} chapters found</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                            <select value={scraperPublishMode} onChange={e => setScraperPublishMode(e.target.value)}
                                                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem' }}>
                                                <option value="stage">Stage for review (publish manually)</option>
                                                <option value="publish">Download &amp; publish immediately</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}
                                                onClick={async () => { await scraperAddSource(detailSeries.id, scraperUrl); await scraperImport(detailSeries.id, scraperUrl); setScraperUrl(''); setScraperFetchResult(null); }}
                                                disabled={scraperImporting}>
                                                {scraperImporting ? 'Importing...' : `Link & Import ${scraperFetchResult.chapters_count} Chapters`}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }} onClick={() => setScraperFetchResult(null)}>Cancel</button>
                                        </div>
                                    </div>
                                )}

                                {/* Pending chapters list */}
                                {scraperPending.filter(p => p.status === 'pending').length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                {scraperPending.filter(p => p.status === 'pending').length} bölüm inceleme bekliyor
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {scraperSelectedPending.length > 0 && (
                                                    <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem' }}
                                                        disabled={scraperPublishing}
                                                        onClick={() => scraperPublishPending(scraperSelectedPending, detailSeries.id)}>
                                                        {scraperPublishing ? 'Yayınlanıyor...' : `Seçilenleri Yayınla (${scraperSelectedPending.length})`}
                                                    </button>
                                                )}
                                                <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', background: 'var(--success)' }}
                                                    disabled={scraperPublishing}
                                                    onClick={() => scraperPublishAllPending(detailSeries.id)}>
                                                    {scraperPublishing ? 'Yayınlanıyor...' : 'Tümünü Yayınla'}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {scraperPending.filter(p => p.status === 'pending').map(p => (
                                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-tertiary)', borderRadius: 5, cursor: 'pointer', fontSize: '0.78rem' }}>
                                                    <input type="checkbox"
                                                        checked={scraperSelectedPending.includes(p.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) setScraperSelectedPending(prev => [...prev, p.id]);
                                                            else setScraperSelectedPending(prev => prev.filter(id => id !== p.id));
                                                        }}
                                                        style={{ width: 14, height: 14 }} />
                                                    <span style={{ color: 'var(--accent-light)', fontWeight: 700, minWidth: 40 }}>Bölüm {p.chapter_number}</span>
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{p.chapter_title}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {detailChapters.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                                    Henüz bölüm yok. Yukarıdan ilk bölümü ekleyin.
                                </p>
                            ) : (
                                <>
                                {/* Chapter search / filter */}
                                {detailChapters.length > CHAPTERS_PER_PAGE && (
                                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                        Toplam {detailChapters.length} bölüm · Sayfa başı {CHAPTERS_PER_PAGE} gösteriliyor
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {detailChapters.slice((chapterPage - 1) * CHAPTERS_PER_PAGE, chapterPage * CHAPTERS_PER_PAGE).map(ch => (
                                        <div key={ch.id}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, gap: 8, flexWrap: 'wrap'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedChapters.includes(ch.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedChapters(prev => [...prev, ch.id]);
                                                        else setSelectedChapters(prev => prev.filter(id => ch.id !== id));
                                                    }}
                                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                />
                                                {editingChapterId === ch.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <input 
                                                                type="number" 
                                                                step="any" 
                                                                value={editChapNum} 
                                                                onChange={e => setEditChapNum(e.target.value)} 
                                                                className="form-input" 
                                                                style={{ width: 80, padding: '4px 8px' }} 
                                                                placeholder="No"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={editChapTitle} 
                                                                onChange={e => setEditChapTitle(e.target.value)} 
                                                                className="form-input" 
                                                                style={{ flex: 1, padding: '4px 8px' }} 
                                                                placeholder="Bölüm Başlığı"
                                                            />
                                                        </div>
                                                        {detailSeries?.type === 'novel' && (
                                                            <>
                                                                <FormatToolbar stateSetter={setEditChapContent} stateValue={editChapContent} textareaId="edit-novel-content" />
                                                                <textarea 
                                                                    id="edit-novel-content"
                                                                    className="form-input" 
                                                                    rows="5" 
                                                                    value={editChapContent} 
                                                                    onChange={e => setEditChapContent(e.target.value)} 
                                                                    placeholder="Novel bölüm metni..." 
                                                                    style={{ padding: '8px', resize: 'vertical' }}
                                                                />
                                                            </>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Küçük Görsel (Thumbnail)</label>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                <select
                                                                    className="form-input"
                                                                    value={editChapThumbMode}
                                                                    onChange={e => {
                                                                        const m = e.target.value;
                                                                        setEditChapThumbMode(m);
                                                                        if (m === 'auto') setEditChapThumb(detailSeries?.cover_url || '');
                                                                        if (m === 'none') setEditChapThumb('');
                                                                    }}
                                                                    style={{ fontSize: '0.75rem', padding: '4px 8px', flex: '0 0 140px' }}
                                                                >
                                                                    <option value="none">Yok (sil)</option>
                                                                    <option value="auto">Oto (seri kapağı)</option>
                                                                    <option value="upload">Dosya Yükle</option>
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-sm"
                                                                    onClick={() => handleAutoThumb(editingChapterId)}
                                                                    disabled={autoThumbLoading}
                                                                    title="Bölüm sayfalarından thumbnail oluştur"
                                                                    style={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                                                                >
                                                                    {autoThumbLoading ? '...' : '⚡ 1. Sayfa'}
                                                                </button>
                                                            </div>
                                                            {editChapThumbMode === 'upload' && (
                                                                <input
                                                                    ref={editChapThumbFileRef}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="form-input"
                                                                    onChange={e => setEditChapThumbFile(e.target.files?.[0] || null)}
                                                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                                />
                                                            )}
                                                            {editChapThumbMode === 'auto' && <small style={{ color: '#10b981', fontSize: '0.68rem' }}>✓ Seri kapağı kullanılacak</small>}
                                                            {editChapThumbMode === 'none' && editChapThumb && <small style={{ color: '#f87171', fontSize: '0.68rem' }}>Mevcut thumbnail silinecek</small>}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px', background: 'rgba(56,189,248,0.06)', borderRadius: 6, border: '1px solid rgba(56,189,248,0.2)' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', color: '#38bdf8', fontWeight: 600 }}>
                                                                <input type="checkbox" checked={editChapIsExternal} onChange={e => setEditChapIsExternal(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                                                                Dış Bağlantılı Bölüm (başka bir ekibin sitesine yönlendir)
                                                            </label>
                                                            {editChapIsExternal && (
                                                                <>
                                                                    <input
                                                                        type="url"
                                                                        value={editChapExternalUrl}
                                                                        onChange={e => setEditChapExternalUrl(e.target.value)}
                                                                        className="form-input"
                                                                        placeholder="https://kaynak-site.com/seri/bolum-44"
                                                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                                    />
                                                                    <textarea
                                                                        value={editChapExternalNote}
                                                                        onChange={e => setEditChapExternalNote(e.target.value)}
                                                                        className="form-input"
                                                                        rows="2"
                                                                        placeholder="Bu bölüme özel uyarı metni (boş bırakılırsa Ayarlar'daki varsayılan metin kullanılır)"
                                                                        style={{ padding: '6px 8px', fontSize: '0.78rem', resize: 'vertical' }}
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-light)', minWidth: 40 }}>
                                                            #{ch.chapter_number}
                                                        </span>
                                                        <span style={{ fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {ch.title}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                {ch.external_url ? (
                                                    <span className="admin-badge" title={ch.external_url} style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                                        Dış Bağlantı
                                                    </span>
                                                ) : (
                                                    <span className="admin-badge user-role">{ch.page_count || 0} sayfa</span>
                                                )}
                                                {ch.translation_count > 0 && <span className="admin-badge admin-role">{ch.translation_count} dil</span>}
                                                {ch.publish_at && (() => { const ps = String(ch.publish_at).trim(); const pd = new Date(ps.includes('T') ? ps : ps.replace(' ', 'T') + 'Z'); return !isNaN(pd.getTime()) && pd > new Date(); })() && (
                                                    <button
                                                        title="Zamanlamayı iptal et (hemen yayınla)"
                                                        style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                                        onClick={async () => {
                                                            if (!confirm(`Bölüm ${ch.chapter_number} zamanlaması iptal edilsin mi? Bölüm hemen yayınlanacak.`)) return;
                                                            const fd = new FormData();
                                                            fd.append('action', 'update-chapter');
                                                            fd.append('chapterId', ch.id);
                                                            fd.append('chapterNumber', ch.chapter_number);
                                                            fd.append('title', ch.title || '');
                                                            fd.append('publishAt', '');
                                                            const res = await authFetch('/api/admin', { method: 'POST', body: fd });
                                                            const data = await res.json();
                                                            if (data.success) { show('Zamanlama iptal edildi, bölüm yayınlandı'); await openSeriesDetail(detailSeries.id); }
                                                            else show(data.error || 'Hata', 'error');
                                                        }}
                                                    >
                                                        <ClockIcon /> {(() => { const ps = String(ch.publish_at).trim(); return new Date(ps.includes('T') ? ps : ps.replace(' ', 'T') + 'Z').toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); })()} ✕
                                                    </button>
                                                )}

                                                {editingChapterId === ch.id ? (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-primary btn-sm" onClick={handleUpdateChapter} disabled={submitting}>
                                                            <CheckIcon /> Kaydet
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingChapterId(null)}>
                                                            İptal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => {
                                                            setEditingChapterId(ch.id);
                                                            setEditChapNum(ch.chapter_number);
                                                            setEditChapTitle(ch.title || '');
                                                            setEditChapContent(ch.content || '');
                                                            setEditChapThumb(ch.thumbnail_url || '');
                                                            setEditChapThumbMode(ch.thumbnail_url ? 'manual' : 'none');
                                                            setEditChapIsExternal(!!ch.external_url);
                                                            setEditChapExternalUrl(ch.external_url || '');
                                                            setEditChapExternalNote(ch.external_note || '');
                                                        }} title="Bölümü düzenle">
                                                            <EditIcon />
                                                        </button>

                                                        {uploadChapterId === ch.id ? (
                                                            <form onSubmit={handleUploadPages} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <input type="file" accept="image/*" multiple onChange={e => setUFiles(e.target.files)} style={{ width: 180, fontSize: '0.72rem' }} />
                                                                <VercelUploadToggle />
                                                                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                                                                    {submitting ? '...' : 'Yükle'}
                                                                </button>
                                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setUploadChapterId(null); setUFiles(null); }}>✕</button>
                                                            </form>
                                                        ) : (
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setUploadChapterId(ch.id)}
                                                                title="Sayfa yükle">
                                                                <UploadIcon />
                                                            </button>
                                                        )}

                                                        <button className="btn btn-ghost btn-sm"
                                                            onClick={() => openChapterPages(ch.id)}
                                                            title="Sayfaları görüntüle"
                                                            style={viewPagesChapterId === ch.id ? { background: 'var(--accent)', color: '#fff' } : {}}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                                        </button>

                                                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({
                                                            action: 'delete-chapter', body: { chapterId: ch.id },
                                                            text: `Bölüm ${ch.chapter_number} "${ch.title}" ve tüm sayfaları silinsin mi?`,
                                                            onDone: async () => { await openSeriesDetail(detailSeries.id); }
                                                        })}><TrashIcon /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
{/* Inline pages thumbnail panel */}
                                        {viewPagesChapterId === ch.id && (
                                            <div style={{ marginTop: 8, padding: '12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                {viewPagesLoading ? (
                                                    <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" /></div>
                                                ) : viewPages.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem', padding: 10 }}>Henüz sayfa yüklenmemiş.</p>
                                                ) : (
                                                    <>
                                                        {/* Toolbar */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{viewPages.length} sayfa — önizleme için tıklayın</p>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                {reorderMode ? (
                                                                    <>
                                                                        <button
                                                                            className="btn btn-sm btn-primary"
                                                                            onClick={savePageOrder}
                                                                            disabled={reorderSaving}
                                                                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                                        >
                                                                            {reorderSaving ? '...' : (
                                                                                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Kaydet</>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-ghost"
                                                                            onClick={async () => {
                                                                                // Reload original order from server
                                                                                setViewPagesLoading(true);
                                                                                try {
                                                                                    const res = await fetch(`/api/chapters/${ch.id}`);
                                                                                    const data = await res.json();
                                                                                    const sorted = (data.pages || []).slice().sort((a, b) => a.page_number - b.page_number);
                                                                                    setViewPages(sorted);
                                                                                } catch {}
                                                                                setViewPagesLoading(false);
                                                                                setReorderMode(false);
                                                                            }}
                                                                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                                        >
                                                                            İptal
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-sm btn-ghost"
                                                                        onClick={() => setReorderMode(true)}
                                                                        style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                                                                        title="Sıralamayı düzenle"
                                                                    >
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                                                                        Sırala
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {reorderMode ? (
                                                            /* Reorder mode: list view with up/down buttons and editable page numbers */
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {viewPages.map((p, idx) => (
                                                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', borderRadius: 6, padding: '4px 8px', border: '1px solid var(--border-color)' }}>
                                                                        {/* Thumbnail */}
                                                                        <div style={{ width: 36, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                                                                            <img src={p.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                                                                        </div>
                                                                        {/* Page number input */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                                                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Sıra No</span>
                                                                            <input
                                                                                type="number"
                                                                                value={p.page_number}
                                                                                min={1}
                                                                                onChange={e => updatePageNumber(idx, e.target.value)}
                                                                                style={{ width: 52, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'center' }}
                                                                            />
                                                                        </div>
                                                                        {/* File name */}
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {p.image_path ? p.image_path.split('/').pop() : '—'}
                                                                        </span>
                                                                        {/* Up / Down buttons */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                                                                            <button
                                                                                onClick={() => movePageUp(idx)}
                                                                                disabled={idx === 0}
                                                                                title="Yukarı taşı"
                                                                                style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border-color)', background: idx === 0 ? 'transparent' : 'var(--bg-secondary)', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                                            >
                                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => movePageDown(idx)}
                                                                                disabled={idx === viewPages.length - 1}
                                                                                title="Aşağı taşı"
                                                                                style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border-color)', background: idx === viewPages.length - 1 ? 'transparent' : 'var(--bg-secondary)', color: idx === viewPages.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: idx === viewPages.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                                            >
                                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            /* Normal mode: thumbnail grid */
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6 }}>
                                                                {viewPages.map(p => (
                                                                    <div key={p.id} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: '3/4', background: 'var(--bg-tertiary)' }}
                                                                        onMouseEnter={e => { const btn = e.currentTarget.querySelector('.pg-del-btn'); if (btn) btn.style.opacity='1'; }}
                                                                        onMouseLeave={e => { const btn = e.currentTarget.querySelector('.pg-del-btn'); if (btn) btn.style.opacity='0'; }}>
                                                                        <div style={{ width: '100%', height: '100%', cursor: 'pointer' }} onClick={() => setPreviewImage({ src: p.image_path, title: `Bölüm ${ch.chapter_number} — Sayfa ${p.page_number}` })}>
                                                                            <img src={p.image_path} alt={`Page ${p.page_number}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                                                                        </div>
                                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', fontSize: '0.6rem', color: '#fff', textAlign: 'center', padding: '2px 0' }}>
                                                                            {p.page_number}
                                                                        </div>
                                                                        <button className="pg-del-btn" onClick={e => { e.stopPropagation(); deleteChapterPage(p.id); }}
                                                                            style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.92)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', zIndex: 2, padding: 0 }}
                                                                            title="Sayfayı sil">
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        </div>
                                    ))}
                                </div>
                                {/* Chapter pagination */}
                                <AdminPager
                                    page={chapterPage}
                                    total={detailChapters.length}
                                    pageSize={CHAPTERS_PER_PAGE}
                                    onPageChange={p => { setChapterPage(p); setSelectedChapters([]); }}
                                />
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ═══════════════ TURNSTILE ═══════════════ */}
                {tab === 'api-key' && (
                    <div className="admin-card" style={{ maxWidth: 560, marginTop: 20 }}>
                        <h3>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Cloudflare Turnstile
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 16 }}>
                            Giriş ve kayıt sayfalarını botlardan korur. Devre dışı bırakmak için boş bırakın.{' '}
                            <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener" style={{ color: 'var(--accent-light)' }}>Cloudflare'den anahtarları edinin</a>
                            {turnstileLoaded && turnstileSiteKey && <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓ Aktif.</span>}
                        </p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const res = await authFetch('/api/admin/settings', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        turnstile_site_key: turnstileSiteKey,
                                        ...(turnstileSecretKey ? { turnstile_secret_key: turnstileSecretKey } : {}),
                                    }),
                                });
                                const d = await res.json();
                                if (!d.success) throw new Error(d.error || 'Failed');
                                show('Turnstile ayarları kaydedildi!');
                                setTurnstileSecretKey('');
                                fetchStats();
                            } catch (e) { show(e.message, 'error'); }
                        }}>
                            <div className="form-group">
                                <label>Site Anahtarı (Site Key - public)</label>
                                <input type="text" className="form-input" placeholder="0x4AAAAAAAxxxxxxxxxxxxxxxx" value={turnstileSiteKey} onChange={e => setTurnstileSiteKey(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Gizli Anahtar (Secret Key)</label>
                                <input type="password" className="form-input" placeholder="Mevcut gizli anahtarı korumak için boş bırakın" value={turnstileSecretKey} onChange={e => setTurnstileSecretKey(e.target.value)} />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Gizli anahtar sadece yazılabilir niteliktedir ve bir daha gösterilmez.</small>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="submit" className="btn btn-primary">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                    Turnstile Kaydet
                                </button>
                                {(turnstileSiteKey) && (
                                    <button type="button" className="btn btn-ghost" onClick={async () => {
                                        try {
                                            const res = await authFetch('/api/admin/settings', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ turnstile_site_key: '', turnstile_secret_key: '' }),
                                            });
                                            const d = await res.json();
                                            if (!d.success) throw new Error(d.error);
                                            setTurnstileSiteKey('');
                                            setTurnstileSecretKey('');
                                            show('Turnstile devre dışı bırakıldı.');
                                            fetchStats();
                                        } catch (e) { show(e.message, 'error'); }
                                    }}>
                                        Devre Dışı Bırak
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* ═══════════════ USERS ═══════════════ */}
                {tab === 'users' && (
                    <>
                        {/* ── Rol Açıklamaları ── */}
                        <div className="admin-card" style={{ marginBottom: 20 }}>
                            <h3 style={{ marginTop: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <UsersIcon /> Rol Açıklamaları ve Yetkileri
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                                {[
                                    { role: 'admin', label: 'Kurucu (Admin)', color: '#f59e0b', icon: '👑', perms: ['Tüm yetkilere sahip', 'Ayarları düzenleyebilir', 'Admin atayabilir', 'Rolleri değiştirebilir', 'Yedek alabilir', 'Seri/Bölüm/Kullanıcı silebilir'] },
                                    { role: 'manager', label: 'Yönetici (Manager)', color: '#818cf8', icon: '🛡️', perms: ['Admin dışı tüm roller üzerinde yetki', 'Seri ekleyebilir/silebilir', 'Bölüm yükleyebilir', 'Kullanıcı yönetebilir', 'Yorumları silebilir', 'İstekleri yönetebilir'] },
                                    { role: 'moderator', label: 'Moderatör', color: '#4ade80', icon: '🔨', perms: ['Yorumları silebilir', 'Hata bildirimlerini görebilir', 'Seri isteklerini görebilir', 'Yorum bölümüne erişebilir'] },
                                    { role: 'team_member', label: 'Yükleyici', color: '#38bdf8', icon: '📥', perms: ['Seri ekleyebilir/güncelleyebilir', 'Bölüm yükleyebilir', 'Medya yönetebilir'] },
                                    { role: 'user', label: 'Kullanıcı', color: '#94a3b8', icon: '👤', perms: ['Yorum yapabilir', 'Favorilere ekleyebilir', 'Okuma geçmişi tutulur', 'Asteria Scans puanı kazanabilir'] },
                                ].map(r => (
                                    <div key={r.role} style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, borderLeft: `3px solid ${r.color}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: r.color, padding: '2px 8px', background: `${r.color}22`, borderRadius: 4 }}>{r.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {r.perms.map((p, i) => (
                                                <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Özel Rozet Yönetimi ── */}
                        {(user.role === 'admin' || user.role === 'manager') && (
                        <div className="admin-card" style={{ marginBottom: 20 }}>
                            <h3 style={{ marginTop: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TagIcon /> Rozet Yönetimi
                            </h3>

                            {/* Mevcut tüm rozetler — sürükle yerine ok tuşlarıyla önem sırası belirlenir.
                                Sıradaki EN ÜSTTEKİ rozet, chat ve yorumlarda gösterilecek olandır. */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tüm Rozetler — Önem Sırası</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            En üstteki rozet, bir kullanıcının birden fazla rozeti olduğunda sohbette ve yorumlarda gösterilen rozettir. Ok tuşlarıyla sırala.
                                        </div>
                                    </div>
                                    {badgeOrderDirty && (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={saveBadgeOrder}
                                            disabled={badgeOrderSaving}
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            {badgeOrderSaving ? 'Kaydediliyor…' : 'Sıralamayı Kaydet'}
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {allBadgeOptions.map((opt, i) => (
                                        <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 18, textAlign: 'center', fontWeight: 700 }}>{i + 1}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <button
                                                    onClick={() => moveBadgePriority(i, -1)}
                                                    disabled={i === 0}
                                                    title="Yukarı taşı (daha önemli yap)"
                                                    style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', padding: 0, lineHeight: 1, opacity: i === 0 ? 0.35 : 1 }}
                                                ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg></button>
                                                <button
                                                    onClick={() => moveBadgePriority(i, 1)}
                                                    disabled={i === allBadgeOptions.length - 1}
                                                    title="Aşağı taşı (daha az önemli yap)"
                                                    style={{ background: 'none', border: 'none', cursor: i === allBadgeOptions.length - 1 ? 'default' : 'pointer', color: i === allBadgeOptions.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)', padding: 0, lineHeight: 1, opacity: i === allBadgeOptions.length - 1 ? 0.35 : 1 }}
                                                ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg></button>
                                            </div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: `${opt.color}20`, border: `1.5px solid ${opt.color}60`, fontSize: '0.8rem', fontWeight: 700, color: opt.color }}>
                                                <BadgeIcon name={opt.icon} size={13} color={opt.color} />
                                                <span>{opt.label}</span>
                                                {opt.custom ? (
                                                    <>
                                                        <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: `${opt.color}30`, opacity: 0.85 }}>özel</span>
                                                        <button
                                                            onClick={() => deleteCustomBadge(opt.id, opt.label)}
                                                            title="Bu rozeti sil"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '0 0 0 2px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                                                        ><TrashIcon /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: `${opt.color}20`, opacity: 0.75 }}>yerleşik</span>
                                                        <button
                                                            onClick={() => deleteBuiltinBadge(opt.id, opt.label)}
                                                            title="Bu yerleşik rozeti sil"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '0 0 0 2px', lineHeight: 1, display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                                        ><TrashIcon /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Yeni özel rozet oluştur */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Yeni Özel Rozet Oluştur</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px auto', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ID (a-z, 0-9, _)</label>
                                        <input
                                            className="form-input"
                                            value={newBadgeId}
                                            onChange={e => setNewBadgeId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                            placeholder="ornek_rozet"
                                            style={{ fontSize: '0.82rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Etiket</label>
                                        <input
                                            className="form-input"
                                            value={newBadgeLabel}
                                            onChange={e => setNewBadgeLabel(e.target.value)}
                                            placeholder="Örnek Rozet"
                                            style={{ fontSize: '0.82rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>İkon</label>
                                        <select
                                            className="form-input"
                                            value={newBadgeIcon}
                                            onChange={e => setNewBadgeIcon(e.target.value)}
                                            style={{ fontSize: '0.82rem' }}
                                        >
                                            {BADGE_ICON_OPTIONS.map(ico => (
                                                <option key={ico.id} value={ico.id}>{ico.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Renk</label>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <input
                                                type="color"
                                                value={newBadgeColor}
                                                onChange={e => setNewBadgeColor(e.target.value)}
                                                style={{ width: 38, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{newBadgeColor}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={createCustomBadge}
                                        disabled={badgeCreating || !newBadgeId || !newBadgeLabel}
                                        style={{ whiteSpace: 'nowrap', alignSelf: 'end' }}
                                    >
                                        {badgeCreating ? '...' : '+ Oluştur'}
                                    </button>
                                </div>
                                {/* Preview — seçilen renkle gösterilsin */}
                                {newBadgeLabel && (
                                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Önizleme:</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: `${newBadgeColor}20`, border: `1.5px solid ${newBadgeColor}60`, fontSize: '0.8rem', fontWeight: 700, color: newBadgeColor }}>
                                            <BadgeIcon name={newBadgeIcon} size={13} color={newBadgeColor} />
                                            {newBadgeLabel}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* ── Manuel Rol Yönetimi ── */}
                        {(user.role === 'admin' || user.role === 'manager') && (
                        <div className="admin-card" style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShieldIcon /> Özel Rol Yönetimi
                                </h3>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowRoleForm(v => !v)}>
                                    {showRoleForm ? '✕ İptal' : '+ Yeni Rol'}
                                </button>
                            </div>

                            {/* Mevcut özel roller */}
                            {customRoles.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                                    {customRoles.map(r => (
                                        <div key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: `${r.color || '#818cf8'}20`, border: `1.5px solid ${r.color || '#818cf8'}60`, fontSize: '0.8rem', fontWeight: 700, color: r.color || '#818cf8' }}>
                                            <ShieldIcon />
                                            <span>{r.label}</span>
                                            <span style={{ fontSize: '0.62rem', opacity: 0.75, fontWeight: 400 }}>({(r.permissions || []).length} yetki)</span>
                                            <button onClick={() => deleteCustomRole(r.id, r.label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '0 0 0 2px', lineHeight: 1, display: 'flex', alignItems: 'center', opacity: 0.8 }}><TrashIcon /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {customRoles.length === 0 && !showRoleForm && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 10px' }}>Henüz özel rol oluşturulmamış.</p>
                            )}

                            {/* Yeni rol oluşturma formu */}
                            {showRoleForm && (
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Yeni Özel Rol</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10, marginBottom: 14 }}>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Rol Adı (a-z, _)</label>
                                            <input className="form-input" value={newRoleName} onChange={e => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} placeholder="ornek_rol" style={{ fontSize: '0.82rem' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Görünen Ad</label>
                                            <input className="form-input" value={newRoleLabel} onChange={e => setNewRoleLabel(e.target.value)} placeholder="Örnek Rol" style={{ fontSize: '0.82rem' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Renk</label>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} style={{ width: 38, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer' }} />
                                                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{newRoleColor}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Yetki seçimi */}
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>Yetkiler</span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => setNewRolePerms(ALL_PERMISSIONS.map(p => p.id))}>Tümünü Seç</button>
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => setNewRolePerms([])}>Temizle</button>
                                            </div>
                                        </div>
                                        {/* Group yetkiler */}
                                        {['Seri', 'Kullanıcı', 'Yorum', 'Medya', 'Sistem'].map(group => (
                                            <div key={group} style={{ marginBottom: 10 }}>
                                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{group}</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => {
                                                        const isSelected = newRolePerms.includes(perm.id);
                                                        return (
                                                            <button key={perm.id}
                                                                onClick={() => setNewRolePerms(prev => isSelected ? prev.filter(x => x !== perm.id) : [...prev, perm.id])}
                                                                style={{
                                                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                                                                    background: isSelected ? `${newRoleColor}22` : 'var(--bg-tertiary)',
                                                                    border: `1px solid ${isSelected ? newRoleColor : 'var(--border-color)'}`,
                                                                    color: isSelected ? newRoleColor : 'var(--text-secondary)',
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                {isSelected && <span style={{ marginRight: 4 }}>✓</span>}
                                                                {perm.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Önizleme + Kaydet */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        {newRoleLabel && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: `${newRoleColor}20`, border: `1.5px solid ${newRoleColor}60`, fontSize: '0.8rem', fontWeight: 700, color: newRoleColor }}>
                                                <ShieldIcon />
                                                {newRoleLabel}
                                            </span>
                                        )}
                                        <button className="btn btn-primary btn-sm" onClick={createCustomRole} disabled={roleCreating || !newRoleName || !newRoleLabel} style={{ whiteSpace: 'nowrap' }}>
                                            {roleCreating ? '...' : '✓ Rolü Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Kullanıcı Aktivite Görüntüleme Paneli */}
                        {viewingUser && (
                            <div className="admin-card" style={{ marginBottom: 20, border: '1px solid var(--accent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <UsersIcon /> {viewingUser.user?.username} — Aktivite ve Log
                                    </h3>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setViewingUser(null)}>✕ Kapat</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
                                    {[
                                        { label: 'Rol', value: (() => { const bm = { admin: 'Kurucu', manager: 'Yönetici', moderator: 'Moderatör', team_member: 'Yükleyici', translator: 'Çevirmen', user: 'Kullanıcı' }; const cr = customRoles.find(r => r.name === viewingUser.user?.role); return bm[viewingUser.user?.role] || (cr ? cr.label : viewingUser.user?.role); })() },
                                        { label: 'Yorum', value: viewingUser.stats?.commentCount || 0 },
                                        { label: 'Favori', value: viewingUser.stats?.favoriteCount || 0 },
                                        { label: 'Okunan Bölüm', value: viewingUser.stats?.readCount || 0 },
                                        { label: settings.points_name || 'Puan', value: viewingUser.user?.yomi_points || 0 },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-light)' }}>{s.value}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Şifre Sıfırlama */}
                                {resetPwdUserId === viewingUser.user?.id ? (
                                    <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: '#f87171' }}>Yeni Şifre Belirle</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input type="password" className="form-input" value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)} placeholder="En az 6 karakter" style={{ flex: 1 }} />
                                            <button className="btn btn-danger btn-sm" onClick={() => handleResetPassword(viewingUser.user.id)} disabled={resetPwdSubmitting}>
                                                {resetPwdSubmitting ? '...' : 'Sıfırla'}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setResetPwdUserId(null); setResetPwdValue(''); }}>İptal</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                                        onClick={() => setResetPwdUserId(viewingUser.user?.id)}>
                                        🔑 Şifre Sıfırla
                                    </button>
                                )}

                                {/* Rozet Yönetimi */}
                                <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 12 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <TagIcon /> Rozetler
                                        {badgeLoading && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>yükleniyor...</span>}
                                    </div>
                                    {/* Active badges */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, minHeight: 28 }}>
                                        {!badgeLoading && userBadges.length === 0 && (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Henüz rozet yok</span>
                                        )}
                                        {userBadges.map(b => {
                                            const opt = allBadgeOptions.find(o => o.id === b.badge_id);
                                            if (!opt) return null;
                                            return (
                                                <span key={b.badge_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: `${opt.color}20`, border: `1.5px solid ${opt.color}60`, fontSize: '0.78rem', fontWeight: 700, color: opt.color }}>
                                                    <BadgeIcon name={opt.icon} size={12} color={opt.color} />
                                                    <span>{opt.label}</span>
                                                    {opt.custom && <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>özel</span>}
                                                    <button
                                                        onClick={() => removeUserBadge(viewingUser.user.id, b.badge_id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: opt.color, padding: '0 0 0 2px', lineHeight: 1, opacity: 0.7, display: 'flex', alignItems: 'center' }}
                                                        title="Rozeti kaldır"
                                                    ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {/* Add badge buttons — rengi doğru göster */}
                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Rozet ekle:</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {allBadgeOptions.filter(opt => !userBadges.find(b => b.badge_id === opt.id)).map(opt => (
                                                <button key={opt.id}
                                                    onClick={() => addUserBadge(viewingUser.user.id, opt.id)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        fontSize: '0.73rem', padding: '4px 10px', borderRadius: 20,
                                                        background: `${opt.color}12`, border: `1px solid ${opt.color}44`,
                                                        color: opt.color, cursor: 'pointer', fontWeight: 700,
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = `${opt.color}25`; e.currentTarget.style.borderColor = `${opt.color}70`; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = `${opt.color}12`; e.currentTarget.style.borderColor = `${opt.color}44`; }}
                                                >
                                                    <BadgeIcon name={opt.icon} size={11} color={opt.color} />
                                                    + {opt.label}
                                                </button>
                                            ))}
                                            {allBadgeOptions.filter(opt => !userBadges.find(b => b.badge_id === opt.id)).length === 0 && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tüm rozetler verilmiş ✓</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Son aktiviteler */}
                                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>Son Aktiviteler</div>
                                    {viewingUser.activities?.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aktivite kaydı yok</p>
                                    ) : viewingUser.activities?.slice(0, 20).map(a => (
                                        <div key={a.id} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('tr-TR')}</span>
                                            <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{a.action}</span>
                                            <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.details}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><UsersIcon /> Kullanıcılar ({stats?.users?.length || 0})</h2>
                            <div style={{ position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Kullanıcı adı veya e-posta ara..."
                                    value={userSearch}
                                    onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                                    style={{ paddingLeft: 32, width: 260, fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>
                        <div className="admin-card" style={{ overflow: 'auto' }}>
                            <table className="admin-table">
                                <thead><tr><th>Kullanıcı Adı</th><th>E-posta</th><th>Rol</th><th>{settings.points_short || 'YP'}</th><th>Katılım</th><th>İşlemler</th></tr></thead>
                                <tbody>
                                    {(() => {
                                        const q = userSearch.trim().toLowerCase();
                                        const filtered = q
                                            ? (stats?.users || []).filter(u =>
                                                u.username?.toLowerCase().includes(q) ||
                                                u.email?.toLowerCase().includes(q)
                                            )
                                            : (stats?.users || []);
                                        const paginated = filtered.slice((usersPage - 1) * ADMIN_PAGE_SIZE, usersPage * ADMIN_PAGE_SIZE);
                                        return paginated.length === 0
                                            ? <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Kullanıcı bulunamadı</td></tr>
                                            : paginated.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 600 }}>{u.username}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                                            <td>{(() => {
                                                const builtinMap = {admin: 'Kurucu', manager: 'Yönetici', moderator: 'Moderatör', team_member: 'Yükleyici', translator: 'Çevirmen', user: 'Kullanıcı'};
                                                const customRole = customRoles.find(r => r.name === u.role);
                                                const roleLabel = builtinMap[u.role] || (customRole ? customRole.label : u.role);
                                                const roleColor = customRole ? customRole.color : null;
                                                const isSpecial = u.role !== 'user';
                                                return (
                                                    <span className={`admin-badge ${isSpecial ? 'admin-role' : 'user-role'}`}
                                                        style={roleColor ? { background: `${roleColor}22`, color: roleColor, borderColor: `${roleColor}60`, border: '1px solid' } : {}}>
                                                        {roleLabel}
                                                    </span>
                                                );
                                            })()}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{u.yomi_points || 0}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fDate(u.created_at)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {(user.role === 'admin' || (user.role === 'manager' && u.role !== 'admin')) ? (
                                                        <select
                                                            value={u.role}
                                                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                                                            onChange={(e) => {
                                                                if (e.target.value === 'admin' && user.role !== 'admin') return show('Bu yetkiye sahip değilsiniz.', 'error');
                                                                setConfirmModal({ action: 'change-user-role', body: { userId: u.id, role: e.target.value }, text: `"${u.username}" kullanıcısının rolü "${e.target.value}" olarak değiştirilsin mi?` });
                                                            }}
                                                        >
                                                            <option value="user">Kullanıcı</option>
                                                            <option value="team_member">Yükleyici</option>
                                                            <option value="translator">Çevirmen</option>
                                                            <option value="moderator">Moderatör</option>
                                                            <option value="manager">Yönetici</option>
                                                            {user.role === 'admin' && <option value="admin">Kurucu</option>}
                                                            {/* Custom roles */}
                                                            {customRoles.map(r => (
                                                                <option key={r.name} value={r.name}>{r.label}</option>
                                                            ))}
                                                        </select>
                                                    ) : null}
                                                    <button className="btn btn-ghost btn-sm" title="Aktivite ve Log Görüntüle"
                                                        onClick={() => loadUserActivity(u.id)}
                                                        style={{ color: 'var(--accent-light)' }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" title="Şifre Sıfırla"
                                                        onClick={() => { setViewingUser({ user: u, activities: [], stats: {} }); setResetPwdUserId(u.id); }}
                                                        style={{ color: '#fbbf24' }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" title="Asteria Scans Puanlarını Sıfırla"
                                                        onClick={() => setConfirmModal({ action: 'reset-user-points', body: { userId: u.id }, text: `"${u.username}" için tüm Asteria Scans Puanları sıfırlansın mı?` })}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.83"/></svg>
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" title="Tüm Yorumları Sil"
                                                        onClick={() => setConfirmModal({ action: 'delete-all-user-comments', body: { userId: u.id }, text: `"${u.username}" tarafından yapılan TÜM yorumlar silinsin mi?` })}>
                                                        <MsgIcon />
                                                    </button>
                                                    {(user.role === 'admin' || (user.role === 'manager' && u.role !== 'admin')) && (
                                                        <button className="btn btn-danger btn-sm" title="Kullanıcıyı Sil"
                                                            onClick={() => setConfirmModal({ action: 'delete-user', body: { userId: u.id }, text: `"${u.username}" kullanıcısı kalıcı olarak silinsin mi?` })}>
                                                            <TrashIcon />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                    })()}
                                </tbody>
                            </table>
                            {(() => {
                                const q = userSearch.trim().toLowerCase();
                                const filteredCount = q
                                    ? (stats?.users || []).filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)).length
                                    : (stats?.users?.length || 0);
                                return <AdminPager page={usersPage} total={filteredCount} pageSize={ADMIN_PAGE_SIZE} onPageChange={p => setUsersPage(p)} />;
                            })()}
                        </div>
                    </>
                )}

                                {/* ═══════════════ YORUMLAR ═══════════════ */}
                {tab === 'comments' && (() => {
                    const allComments = stats?.recentComments || [];
                    const q = commentSearch.trim().toLowerCase();
                    const reportedCommentIds = new Set(commentReports.filter(r => r.status === 'open' || r.status === 'pending' || !r.status).map(r => r.comment_id));
                    
                    const filtered = allComments.filter(c => {
                        const matchQ = !q || c.content?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q) || c.series_title?.toLowerCase().includes(q);
                        const matchF = commentFilter === 'all' || (commentFilter === 'series' && !c.chapter_id) || (commentFilter === 'chapter' && !!c.chapter_id);
                        const matchStatus = commentStatusTab === 'all' || 
                                            (commentStatusTab === 'reported' && reportedCommentIds.has(c.id)) || 
                                            (commentStatusTab === 'approved' && !reportedCommentIds.has(c.id));
                        return matchQ && matchF && matchStatus;
                    });
                    
                    const paginated = filtered.slice((commentsPage - 1) * ADMIN_PAGE_SIZE, commentsPage * ADMIN_PAGE_SIZE);

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
                            {/* Modern Header Card */}
                            <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 32px', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(96, 165, 250, 0.05) 100%)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)', backdropFilter: 'blur(10px)' }}>
                                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)' }}>
                                        <MsgIcon />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                                            Yorum Yönetimi
                                        </h2>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '500' }}>
                                            Kullanıcı yorumlarını ve raporlarını modern arayüzle kolayca yönetin.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Table Card */}
                            <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                {/* Floating Tabs */}
                                <div style={{ display: 'flex', gap: '12px', padding: '24px 32px 20px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    {[
                                        { id: 'all', label: 'Tümü', icon: <MsgIcon />, count: allComments.length, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
                                        { id: 'pending', label: 'Bekleyen', icon: <ClockIcon />, count: 0, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
                                        { id: 'approved', label: 'Onaylı', icon: <CheckIcon />, count: allComments.length - reportedCommentIds.size, color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' },
                                        { id: 'reported', label: 'Şikayetli', icon: <ShieldIcon />, count: reportedCommentIds.size, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
                                        { id: 'deleted', label: 'Silinen', icon: <TrashIcon />, count: 0, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
                                    ].map(t => {
                                        const isActive = commentStatusTab === t.id;
                                        return (
                                            <button key={t.id} onClick={() => { setCommentStatusTab(t.id); setCommentsPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '14px', background: isActive ? t.bg : 'transparent', border: `1px solid ${isActive ? t.bg : 'rgba(255,255,255,0.05)'}`, color: isActive ? t.color : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none' }} onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isActive ? 1 : 0.7 }}>
                                                    {t.id !== 'all' && React.cloneElement(t.icon, { width: 16, height: 16 })}
                                                    {t.label}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'var(--bg-tertiary)', color: 'inherit', padding: '2px 10px', borderRadius: '12px', fontWeight: '800' }}>
                                                    {t.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Filters Row */}
                                <div style={{ padding: '20px 32px', display: 'flex', gap: '16px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.02)' }}>
                                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                                        <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                        <input
                                            type="text"
                                            placeholder="Kullanıcı, e-posta veya içerik ara..."
                                            style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px 12px 46px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                                            value={commentSearch}
                                            onChange={e => { setCommentSearch(e.target.value); setCommentsPage(1); }}
                                            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), inset 0 2px 4px rgba(0,0,0,0.05)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.05)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)'; }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        {['Tüm zamanlar', 'Min şikayet', 'En yeni'].map((txt, i) => (
                                            <select key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', padding: '12px 20px', outline: 'none', cursor: 'pointer', appearance: 'none', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                                                <option>{txt}</option>
                                            </select>
                                        ))}
                                        <select value={commentFilter} onChange={e => { setCommentFilter(e.target.value); setCommentsPage(1); }} style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', padding: '12px 20px', outline: 'none', cursor: 'pointer', appearance: 'none', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                                            <option value="all">Tüm seriler</option>
                                            <option value="series">Sadece Seri</option>
                                            <option value="chapter">Sadece Bölüm</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Modern Table */}
                                <div style={{ overflowX: 'auto', minHeight: '350px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                <th style={{ padding: '20px 32px', width: '40px', fontWeight: '700' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={paginated.length > 0 && paginated.every(c => selectedComments.has(c.id))}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedComments(prev => {
                                                                    const next = new Set(prev);
                                                                    paginated.forEach(c => next.add(c.id));
                                                                    return next;
                                                                });
                                                            } else {
                                                                setSelectedComments(prev => {
                                                                    const next = new Set(prev);
                                                                    paginated.forEach(c => next.delete(c.id));
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                    />
                                                </th>
                                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Kullanıcı</th>
                                                <th style={{ padding: '20px 16px', fontWeight: '700', width: '35%' }}>Yorum</th>
                                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Bağlantı</th>
                                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Reaksiyonlar</th>
                                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Tarih</th>
                                                <th style={{ padding: '20px 16px', fontWeight: '700' }}>Durum</th>
                                                <th style={{ padding: '20px 32px', fontWeight: '700', textAlign: 'right' }}>İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginated.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        <div style={{ display: 'inline-flex', padding: '24px', background: 'var(--bg-tertiary)', borderRadius: '50%', marginBottom: '20px' }}>
                                                            <MsgIcon />
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Eşleşen yorum bulunamadı</div>
                                                        <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>Farklı filtreler veya arama terimleri deneyin.</div>
                                                    </td>
                                                </tr>
                                            ) : paginated.map(c => {
                                                const commentUrl = c.series_slug ? (c.chapter_id && c.chapter_number != null) ? `/seri/${c.series_slug}/bolum/${c.chapter_number}#comment-${c.id}` : `/seri/${c.series_slug}#comment-${c.id}` : null;
                                                const initials = (c.username || '?').slice(0, 2).toUpperCase();
                                                const avatarColors = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#fb923c'];
                                                const avatarColor = avatarColors[(c.username || '').charCodeAt(0) % avatarColors.length];
                                                const rCount = commentReports.filter(r => r.comment_id === c.id).length;
                                                
                                                return (
                                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s', background: selectedComments.has(c.id) ? 'rgba(99,102,241,0.05)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = selectedComments.has(c.id) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = selectedComments.has(c.id) ? 'rgba(99,102,241,0.05)' : 'transparent'}>
                                                        <td style={{ padding: '20px 32px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedComments.has(c.id)}
                                                                onChange={() => {
                                                                    setSelectedComments(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(c.id)) next.delete(c.id);
                                                                        else next.add(c.id);
                                                                        return next;
                                                                    });
                                                                }}
                                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '20px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                                {c.avatar_url && c.avatar_url !== '/default-avatar.png' ? (
                                                                    <img src={c.avatar_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} decoding="async" />
                                                                ) : (
                                                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `linear-gradient(135deg, ${avatarColor}20 0%, ${avatarColor}10 100%)`, border: `1px solid ${avatarColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', color: avatarColor, flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                                                        {initials}
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{c.username || 'Bilinmeyen'}</span>
                                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email || `${c.username?.toLowerCase() || 'user'}@gmail.com`}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '20px 16px', maxWidth: '350px' }}>
                                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: rCount > 0 ? '10px' : '0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                                                                {c.content}
                                                            </div>
                                                            {rCount > 0 && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                                                    <ShieldIcon /> {rCount} Şikayet
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '20px 16px' }}>
                                                            <a href={safeHref(commentUrl)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60a5fa', textDecoration: 'none', fontWeight: '600', padding: '6px 12px', borderRadius: '8px', background: 'rgba(96, 165, 250, 0.1)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'}>
                                                                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {c.series_title} {c.chapter_title && c.chapter_title !== 'Series Comment' ? `- ${c.chapter_title}` : ''}
                                                                </span>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                                            </a>
                                                        </td>
                                                        <td style={{ padding: '20px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', fontWeight: '700' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                                                    <span>{c.likes || 0}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"/></svg>
                                                                    <span>{c.dislikes || 0}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '20px 16px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                            {fDate(c.created_at)}
                                                        </td>
                                                        <td style={{ padding: '20px 16px' }}>
                                                            {rCount > 0 ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', boxShadow: '0 0 8px #f87171' }}></span>
                                                                    İncelenecek
                                                                </span>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }}></span>
                                                                    Onaylı
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                                                            <button className="btn btn-ghost btn-sm" style={{ padding: '8px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: '10px', transition: 'all 0.2s' }} onClick={() => setConfirmModal({ action: 'delete-comment', body: { commentId: c.id }, text: 'Bu yorumu silmek istediğinize emin misiniz?' })} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}>
                                                                <TrashIcon />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Bulk Action Bar */}
                                {selectedComments.size > 0 && (
                                    <div style={{ padding: '16px 32px', background: 'rgba(99,102,241,0.06)', borderTop: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-light)' }}>{selectedComments.size} yorum seçildi</span>
                                            <button style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }} onClick={() => setSelectedComments(new Set())}>Seçimi Temizle</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={async () => { if (!window.confirm(`${selectedComments.size} yorumu silmek istediğinize emin misiniz?`)) return; const ids = Array.from(selectedComments); let ok = 0; for (const id of ids) { try { const fd = new FormData(); fd.append('action', 'delete-comment'); fd.append('commentId', id); const res = await authFetch('/api/admin', { method: 'POST', body: fd }); const d = await res.json(); if (d.message || d.success) ok++; } catch {} } show(`${ok}/${ids.length} yorum silindi`); setSelectedComments(new Set()); if (tab === 'comments') loadStats(); }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                Toplu Sil
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <AdminPager page={commentsPage} total={filtered.length} pageSize={ADMIN_PAGE_SIZE} onPageChange={p => setCommentsPage(p)} />
                                </div>
                            </div>

                            {/* Settings Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {/* Tepki Emojileri */}
                                <div style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}>🎯</div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Tepki Emojileri</h3>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                                        Yorumlarda kullanıcıların etkileşim kurabileceği emojileri belirleyin.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                        {commentEmojis.map((em, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <input type="text" value={em.icon} onChange={e => updateEmojiField(index, 'icon', e.target.value)} style={{ width: '48px', textAlign: 'center', padding: '6px', fontSize: '1.2rem', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='transparent'} placeholder="👍" />
                                                <input type="text" value={em.label} onChange={e => updateEmojiField(index, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='transparent'} placeholder="Etiket" />
                                                <button onClick={() => removeEmoji(index)} style={{ padding: '8px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7, transition: 'all 0.2s', borderRadius: '8px' }} onMouseEnter={e=>{e.currentTarget.style.opacity=1; e.currentTarget.style.background='rgba(248,113,113,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.opacity=0.7; e.currentTarget.style.background='transparent'}} title="Kaldır"><TrashIcon /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', marginBottom: '20px', border: '1px dashed rgba(59, 130, 246, 0.3)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#60a5fa', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yeni Ekle</div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input type="text" value={newEmojiIcon} onChange={e => setNewEmojiIcon(e.target.value)} style={{ width: '48px', textAlign: 'center', padding: '8px', fontSize: '1.2rem', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} placeholder="👍" onKeyDown={e => e.key === 'Enter' && addEmoji()} />
                                            <input type="text" value={newEmojiLabel} onChange={e => setNewEmojiLabel(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} placeholder="İsim (örn. Beğen)" onKeyDown={e => e.key === 'Enter' && addEmoji()} />
                                            <button onClick={addEmoji} disabled={!newEmojiIcon.trim() || !newEmojiLabel.trim()} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: (!newEmojiIcon.trim() || !newEmojiLabel.trim()) ? 0.5 : 1 }}>Ekle</button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleSaveEmojis(commentEmojis)} disabled={submitting} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                    </button>
                                </div>

                                {/* Bildirim Nedenleri */}
                                <div style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}>🚩</div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Bildirim Nedenleri</h3>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                                        Kullanıcıların yorumları raporlarken seçebileceği nedenler listesi.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                        {reportReasons.map((re, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>{index + 1}</div>
                                                <input type="text" value={re} onChange={e => updateReasonText(index, e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid transparent', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e=>e.target.style.borderColor='#ef4444'} onBlur={e=>e.target.style.borderColor='transparent'} />
                                                <button onClick={() => removeReason(index)} style={{ padding: '8px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7, transition: 'all 0.2s', borderRadius: '8px' }} onMouseEnter={e=>{e.currentTarget.style.opacity=1; e.currentTarget.style.background='rgba(248,113,113,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.opacity=0.7; e.currentTarget.style.background='transparent'}} title="Kaldır"><TrashIcon /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', marginBottom: '20px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f87171', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yeni Ekle</div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input type="text" value={newReasonText} onChange={e => setNewReasonText(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} placeholder="Örn. Nefret Söylemi" onKeyDown={e => e.key === 'Enter' && addReason()} />
                                            <button onClick={addReason} disabled={!newReasonText.trim()} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: !newReasonText.trim() ? 0.5 : 1 }}>Ekle</button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleSaveReportReasons(reportReasons)} disabled={submitting} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s', opacity: submitting ? 0.7 : 1 }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        {submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                    </button>
                                </div>
                            </div>

                            {/* Yorum Şikayetleri */}
                            <div style={{ padding: '28px 32px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                            <ShieldIcon />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>Yorum Şikayetleri</h3>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kullanıcılar tarafından rapor edilen yorumlar</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                            {commentReports.filter(r => r.status === 'open' || r.status === 'pending' || !r.status).length} Yeni Rapor
                                        </span>
                                        <button style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                                            setCommentReportsLoaded(false);
                                            setCommentReportsLoading(true);
                                            authFetch('/api/reports/comments').then(r => r.json()).then(d => {
                                                if (d.success) {
                                                    console.log('[Admin] Yorum şikayetleri yenilendi:', (d.reports || []).length, 'rapor');
                                                    setCommentReports(d.reports || []);
                                                } else {
                                                    console.error('[Admin] Yorum şikayetleri yüklenemedi:', d.error);
                                                }
                                                setCommentReportsLoaded(true);
                                            }).catch(err => console.error('[Admin] Yorum şikayetleri fetch hatası:', err)).finally(() => setCommentReportsLoading(false));
                                        }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='var(--bg-tertiary)'}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.66 5.66"/></svg>
                                            Yenile
                                        </button>
                                    </div>
                                </div>
                                {commentReportsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>
                                ) : commentReports.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'inline-flex', padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '50%', marginBottom: '16px', color: 'var(--text-muted)' }}>
                                            <ShieldIcon />
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Henüz şikayet yok</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>Topluluğunuz güvende! Yeni bir şikayet geldiğinde burada görünecek.</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {commentReports.map(r => (
                                            <div key={r.id} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: `1px solid ${r.status === 'resolved' ? 'rgba(52,211,153,0.3)' : r.status === 'rejected' ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.05)'}`, padding: '16px 20px', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '6px', background: r.status === 'resolved' ? 'rgba(52,211,153,0.1)' : r.status === 'rejected' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'resolved' ? '#34d399' : r.status === 'rejected' ? '#f87171' : '#fbbf24', border: `1px solid ${r.status === 'resolved' ? 'rgba(52,211,153,0.2)' : r.status === 'rejected' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`, display: 'inline-block' }}>
                                                                {r.status === 'resolved' ? '✓ Çözüldü' : r.status === 'rejected' ? '✕ Reddedildi' : '⏳ Beklemede'}
                                                            </span>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                                {r.created_at ? new Date(r.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{r.title}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>{r.description}</div>
                                                        {r.comment_content && (
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)', fontStyle: 'italic', marginBottom: '8px', lineHeight: '1.5' }}>
                                                                "{r.comment_content.length > 100 ? r.comment_content.substring(0, 100) + '...' : r.comment_content}"
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>👤</div>
                                                            Raporlayan: {r.reporter_username || 'Anonim'}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                                        {(!r.status || r.status === 'open' || r.status === 'pending') && (
                                                            <>
                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                                    <button style={{ padding: '6px 12px', background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onClick={() => authFetch('/api/reports/comments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id, status: 'resolved' }) }).then(() => setCommentReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved' } : x))).catch(() => show('İşlem başarısız', 'error'))} onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(52,211,153,0.1)'}>
                                                                        Çöz
                                                                    </button>
                                                                    <button style={{ padding: '6px 12px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onClick={() => authFetch('/api/reports/comments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id, status: 'rejected' }) }).then(() => setCommentReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'rejected' } : x))).catch(() => show('İşlem başarısız', 'error'))} onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'}>
                                                                        Reddet
                                                                    </button>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} onClick={() => { if (!window.confirm('Yorumu silmek istediğinize emin misiniz?')) return; const fd = new FormData(); fd.append('action', 'delete-comment'); fd.append('commentId', r.comment_id); authFetch('/api/admin', { method: 'POST', body: fd }).then(res => res.json()).then(d => { if (d.message || d.success) { setCommentReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved', comment_content: '[silindi]' } : x)); show('Yorum silindi'); } else show(d.error || 'Silinemedi', 'error'); }).catch(() => show('Silinemedi', 'error')); }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'} onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}>
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                        Yorumu Sil
                                                                    </button>
                                                                    <button style={{ padding: '6px 10px', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} onClick={() => { if (!window.confirm('Bu raporu silmek istediğinize emin misiniz?')) return; authFetch('/api/reports/comments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id }) }).then(res => res.json()).then(d => { if (d.success) { setCommentReports(prev => prev.filter(x => x.id !== r.id)); show('Rapor silindi'); } else show(d.error || 'Silinemedi', 'error'); }).catch(() => show('Silinemedi', 'error')); }} onMouseEnter={e => e.currentTarget.style.background='rgba(100,116,139,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(100,116,139,0.1)'}>
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                        Raporu Sil
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                        {(r.status === 'resolved' || r.status === 'rejected') && (
                                                            <button style={{ padding: '6px 10px', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.15)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} onClick={() => { if (!window.confirm('Bu raporu silmek istediğinize emin misiniz?')) return; authFetch('/api/reports/comments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id }) }).then(res => res.json()).then(d => { if (d.success) { setCommentReports(prev => prev.filter(x => x.id !== r.id)); show('Rapor silindi'); } else show(d.error || 'Silinemedi', 'error'); }).catch(() => show('Silinemedi', 'error')); }} onMouseEnter={e => e.currentTarget.style.background='rgba(100,116,139,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(100,116,139,0.1)'}>
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                Raporu Sil
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
                {/* ═══════════════ SITE TRAFİĞİ ═══════════════ */}
                {tab === 'traffic' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                <TrafficIcon /> Site Trafiği
                            </h2>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select value={trafficRange} onChange={e => { setTrafficRange(e.target.value); loadTrafficData(e.target.value); }}
                                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '5px 10px', fontSize: '0.82rem' }}>
                                    <option value="7">Son 7 Gün</option>
                                    <option value="14">Son 14 Gün</option>
                                    <option value="30">Son 30 Gün</option>
                                    <option value="90">Son 90 Gün</option>
                                </select>
                                <button className="btn btn-ghost btn-sm" onClick={() => loadTrafficData(trafficRange)}>↻ Yenile</button>
                            </div>
                        </div>

                        {trafficLoading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
                        ) : trafficData ? (
                            <>
                                {/* Özet Kartları */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
                                    {[
                                        { label: 'Toplam Ziyaret', sub: `Son ${trafficRange} gün`, value: (trafficData.totalStats?.total_visits || 0).toLocaleString('tr-TR'), color: '#818cf8', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
                                        { label: 'Benzersiz Ziyaretçi', sub: `Son ${trafficRange} gün`, value: (trafficData.totalStats?.unique_visitors || 0).toLocaleString('tr-TR'), color: '#4ade80', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                                        { label: 'Bugünkü Ziyaret', sub: 'Bugün', value: (trafficData.todayStats?.visits || 0).toLocaleString('tr-TR'), color: '#fbbf24', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                                        { label: 'Bugünkü Benzersiz', sub: 'Bugün', value: (trafficData.todayStats?.unique_visitors || 0).toLocaleString('tr-TR'), color: '#f472b6', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px', border: `1px solid ${s.color}33`, position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.5 }}>{s.icon}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.sub}</div>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Günlük Ziyaret Grafiği */}
                                <div className="admin-card" style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Günlük Ziyaret — Son {trafficRange} Gün</h3>
                                    </div>
                                    {trafficData.dailyVisits.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                                            Henüz trafik verisi yok. Site sayfaları ziyaret edilince veriler burada görünür.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130, overflowX: 'auto', paddingBottom: 4, paddingTop: 8 }}>
                                            {(() => {
                                                const max = Math.max(...trafficData.dailyVisits.map(x => x.visits), 1);
                                                return trafficData.dailyVisits.map(d => {
                                                    const h = Math.max(6, (d.visits / max) * 100);
                                                    const isToday = d.date === new Date().toISOString().split('T')[0];
                                                    return (
                                                        <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: '0 0 auto', minWidth: 30 }}
                                                            title={`${d.date}: ${d.visits} ziyaret, ${d.unique_visitors} benzersiz`}>
                                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.visits}</div>
                                                            <div style={{ width: 22, height: `${h}px`, background: isToday ? '#fbbf24' : 'var(--accent)', borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'height 0.3s' }} />
                                                            <div style={{ fontSize: '0.58rem', color: isToday ? '#fbbf24' : 'var(--text-muted)', fontWeight: isToday ? 700 : 400 }}>
                                                                {d.date.slice(5)}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
                                    {/* En Çok Ziyaret Edilen Sayfalar */}
                                    <div className="admin-card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>En Çok Ziyaret Edilen Sayfalar</h3>
                                        </div>
                                        {trafficData.topPages.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: 10 }}>Veri yok</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                {trafficData.topPages.slice(0, 10).map((p, i) => {
                                                    const maxV = trafficData.topPages[0]?.visits || 1;
                                                    const pct = Math.round((p.visits / maxV) * 100);
                                                    return (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--accent)', opacity: 0.07, borderRadius: 6 }} />
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-light)', minWidth: 22, zIndex: 1 }}>#{i + 1}</span>
                                                            <span style={{ flex: 1, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 1 }} title={p.path}>{p.path}</span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 600, zIndex: 1 }}>{p.visits.toLocaleString('tr-TR')}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Yeni Üyeler */}
                                    <div className="admin-card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#4ade80' }}>Yeni Üyeler</h3>
                                        </div>
                                        {trafficData.newUsers.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: 10 }}>Veri yok</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, overflowX: 'auto' }}>
                                                {(() => {
                                                    const max = Math.max(...trafficData.newUsers.map(x => x.count), 1);
                                                    return trafficData.newUsers.map(d => {
                                                        const h = Math.max(4, (d.count / max) * 80);
                                                        return (
                                                            <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: '0 0 auto', minWidth: 24 }}
                                                                title={`${d.date}: ${d.count} yeni üye`}>
                                                                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{d.count}</div>
                                                                <div style={{ width: 16, height: `${h}px`, background: '#4ade80', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                                                                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{d.date.slice(5)}</div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="admin-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        <span>Trafik verileri her sayfa yüklenişinde otomatik olarak kaydedilir. <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>TrafficTracker</code> bileşeni layout'a eklenmiştir.</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                                <p style={{ color: 'var(--text-muted)' }}>Trafik verisi yüklenemedi.</p>
                                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => loadTrafficData()}>Yükle</button>
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════ TÜRLER ═══════════════ */}
                

                {/* ═══════════════ DENETİM KAYDI ═══════════════ */}
                {tab === 'audit-log' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                <AuditIcon /> Denetim Kaydı
                                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>({auditLogs.length} kayıt)</span>
                            </h2>
                            <button className="btn btn-ghost btn-sm" onClick={loadAuditLogs}>{auditLoading ? 'Yükleniyor...' : '↻ Yenile'}</button>
                        </div>

                        {/* Arama ve Filtre */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input type="text" className="form-input" placeholder="Yönetici adı veya detay ara..."
                                    style={{ paddingLeft: 32, fontSize: '0.85rem' }}
                                    value={auditSearch || ''} onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }} />
                            </div>
                            <select value={auditActionFilter || 'all'} onChange={e => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px', fontSize: '0.82rem' }}>
                                <option value="all">Tüm İşlemler</option>
                                <option value="delete">Silme</option>
                                <option value="add">Ekleme</option>
                                <option value="update">Güncelleme</option>
                                <option value="create">Oluşturma</option>
                                <option value="reset">Sıfırlama</option>
                                <option value="change">Değişiklik</option>
                            </select>
                        </div>

                        <div className="admin-card" style={{ overflow: 'auto' }}>
                            {auditLoading ? (
                                <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
                            ) : (() => {
                                const q = (auditSearch || '').trim().toLowerCase();
                                const af = auditActionFilter || 'all';
                                const filtered = auditLogs.filter(log => {
                                    const matchSearch = !q || log.admin_username?.toLowerCase().includes(q) || log.details?.toLowerCase().includes(q) || log.action?.toLowerCase().includes(q);
                                    const matchAction = af === 'all' || log.action?.includes(af);
                                    return matchSearch && matchAction;
                                });
                                const paginated = filtered.slice((auditPage - 1) * ADMIN_PAGE_SIZE, auditPage * ADMIN_PAGE_SIZE);
                                return (
                                    <>
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Yönetici</th>
                                                    <th>İşlem</th>
                                                    <th>Özet</th>
                                                    <th>Tarih</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginated.map(log => {
                                                    const isDel = log.action?.includes('delete') || log.action?.includes('ban');
                                                    const isAdd = log.action?.includes('add') || log.action?.includes('create') || log.action?.includes('upload');
                                                    const badgeBg = isDel ? 'rgba(239,68,68,0.15)' : isAdd ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)';
                                                    const badgeColor = isDel ? '#f87171' : isAdd ? '#4ade80' : 'var(--accent-light)';
                                                    // Detayları sadeleştir: JSON ise ilk anlamlı değeri al
                                                    let detailShort = log.details || '';
                                                    try {
                                                        const parsed = JSON.parse(detailShort);
                                                        if (parsed && typeof parsed === 'object') {
                                                            const val = parsed.title || parsed.username || parsed.name || parsed.series_title || Object.values(parsed)[0];
                                                            detailShort = val ? String(val).substring(0, 60) : detailShort.substring(0, 60);
                                                        }
                                                    } catch { detailShort = detailShort.substring(0, 80); }
                                                    return (
                                                        <tr key={log.id}>
                                                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{log.admin_username}</td>
                                                            <td>
                                                                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: badgeBg, color: badgeColor, whiteSpace: 'nowrap' }}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                                                                {detailShort}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                                {new Date(log.created_at).toLocaleString('tr-TR')}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filtered.length === 0 && (
                                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Kayıt bulunamadı</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                        <AdminPager page={auditPage} total={filtered.length} pageSize={ADMIN_PAGE_SIZE} onPageChange={p => setAuditPage(p)} />
                                    </>
                                );
                            })()}
                        </div>
                    </>
                )}

                {/* ═══════════════ SYSTEM LOGS ═══════════════ */}
                {(user.role === 'admin' || user.role === 'manager') && tab === 'logs' && (
                    <>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Sistem Logları</h2>
                        <div className="admin-card" style={{ padding: 0 }}>
                            <div style={{ maxHeight: 500, overflowY: 'auto', padding: '12px', background: 'var(--bg-tertiary)', fontFamily: 'monospace', fontSize: '0.75rem', color: '#ccc' }}>
                                {systemLogs.map((log, i) => <div key={i} style={{ marginBottom: 4 }}>[{log.timestamp}] {log.message}</div>)}
                            </div>
                        </div>
                    </>
                )}
                {/* ═══════════════ SERIES REQUESTS ═══════════════ */}
                {tab === 'requests' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                                Seri İstekleri ({seriesRequests.length})
                            </h2>
                            <button className="btn btn-sm" style={{ background: 'var(--bg-tertiary)' }} onClick={async () => {
                                setReqLoading(true);
                                try {
                                    const res = await authFetch('/api/series-requests?admin=1');
                                    const data = await res.json();
                                    setSeriesRequests(data.requests || []);
                                } catch {}
                                setReqLoading(false);
                            }}>
                                {reqLoading ? 'Yükleniyor...' : '↻ Yenile'}
                            </button>
                        </div>

                        {/* Filtre sekmeleri */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                            {[{ k: 'all', l: 'Tümü' }, ...REQ_STATUSES.map(s => ({ k: s.value, l: s.label }))].map(f => (
                                <button key={f.k}
                                    onClick={() => { setReqFilter(f.k); setRequestsPage(1); }}
                                    style={{ padding: '5px 12px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: reqFilter === f.k ? 'var(--accent)' : 'var(--bg-tertiary)', color: reqFilter === f.k ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                    {f.l}
                                </button>
                            ))}
                        </div>

                        {reqLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}><div className="spinner" /></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {seriesRequests.filter(r => reqFilter === 'all' || r.status === reqFilter).slice((requestsPage - 1) * ADMIN_PAGE_SIZE, requestsPage * ADMIN_PAGE_SIZE).map(req => {
                                    const st = REQ_STATUSES.find(s => s.value === req.status) || REQ_STATUSES[0];
                                    const isEditing = editingReq?.id === req.id;
                                    return (
                                        <div key={req.id} className="admin-card" style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                        <strong style={{ fontSize: '0.95rem' }}>{req.series_title}</strong>
                                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 50, background: st.color + '22', color: st.color, border: `1px solid ${st.color}55`, fontWeight: 700 }}>
                                                            {st.label}
                                                        </span>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 7px', background: 'var(--bg-tertiary)', borderRadius: 50, border: '1px solid var(--border-color)' }}>
                                                            {req.series_type}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                        {req.author && <span>Yazar: {req.author}</span>}
                                                        <span>Ekleyen: <strong>{req.username}</strong></span>
                                                        <span>👍 {req.upvotes}</span>
                                                        <span>{new Date(req.created_at + 'Z').toLocaleDateString()}</span>
                                                    </div>
                                                    {req.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '6px 0 0' }}>{req.description}</p>}
                                                    {req.reason && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>"{req.reason}"</p>}
                                                    {req.source_url && <a href={safeHref(req.source_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-light)', wordBreak: 'break-all' }}>{req.source_url}</a>}
                                                    {req.admin_note && <p style={{ fontSize: '0.78rem', color: '#a5b4fc', margin: '6px 0 0', padding: '6px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: 6 }}>📝 {req.admin_note}</p>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                    <button className="btn btn-sm" onClick={() => setEditingReq(isEditing ? null : { id: req.id, status: req.status, admin_note: req.admin_note || '' })}
                                                        style={{ fontSize: '0.75rem' }}>
                                                        {isEditing ? 'İptal' : 'Düzenle'}
                                                    </button>
                                                    <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.75rem' }}
                                                        onClick={() => setConfirmModal({
                                                            text: `"${req.series_title}" isteği silinsin mi?`,
                                                            action: async () => {
                                                                await authFetch('/api/series-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: req.id }) });
                                                                setSeriesRequests(prev => prev.filter(r => r.id !== req.id));
                                                                show('Silindi');
                                                            }
                                                        })}>
                                                        Sil
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Düzenleme paneli */}
                                            {isEditing && (
                                                <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Durum:</label>
                                                        <select value={editingReq.status} onChange={e => setEditingReq(r => ({ ...r, status: e.target.value }))}
                                                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.82rem' }}>
                                                            {REQ_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Yönetici Notu:</label>
                                                        <textarea value={editingReq.admin_note} onChange={e => setEditingReq(r => ({ ...r, admin_note: e.target.value }))}
                                                            placeholder="Kullanıcı için isteğe bağlı not..."
                                                            rows={2} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit' }} />
                                                    </div>
                                                    <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                                                        onClick={async () => {
                                                            const res = await authFetch('/api/series-requests', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ action: 'update-status', id: editingReq.id, status: editingReq.status, admin_note: editingReq.admin_note }),
                                                            });
                                                            if (res.ok) {
                                                                setSeriesRequests(prev => prev.map(r => r.id === editingReq.id ? { ...r, status: editingReq.status, admin_note: editingReq.admin_note } : r));
                                                                setEditingReq(null);
                                                                show('İstek güncellendi');
                                                            }
                                                        }}>
                                                        Değişiklikleri Kaydet
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {seriesRequests.filter(r => reqFilter === 'all' || r.status === reqFilter).length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.9rem' }}>İstek bulunamadı.</div>
                                )}
                                <AdminPager
                                    page={requestsPage}
                                    total={seriesRequests.filter(r => reqFilter === 'all' || r.status === reqFilter).length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={p => setRequestsPage(p)}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════ SCRAPER ═══════════════ */}
                {tab === 'scraper' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                <DownloadIcon /> Bot (Scraper)
                            </h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={loadAllScraperSources} disabled={allScraperSourcesLoading}>
                                    {allScraperSourcesLoading ? 'Yükleniyor...' : <><SyncIcon /> Yenile</>}
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={scraperSyncAll} disabled={scraperSyncLoading}>
                                    {scraperSyncLoading ? 'Eşitleniyor...' : <><SyncIcon /> Tüm Kaynakları Eşitle</>}
                                </button>
                            </div>
                        </div>

                        {/* Create new series from URL */}
                        <div className="admin-card" style={{ marginBottom: 20 }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
                                <LinkIcon /> URL'den Yeni Seri Çek
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                                MangaDex, Comick.io veya desteklenen diğer sitelerden bir manga URL'si yapıştırın. Bot; seri bilgilerini ve kapağı çekecek, tüm bölümleri inceleme için hazırlayacaktır.
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                <input
                                    type="url"
                                    className="form-input"
                                    placeholder="https://mangadex.org/title/... veya https://comick.io/comic/..."
                                    value={scrapeNewUrl}
                                    onChange={e => { setScrapeNewUrl(e.target.value); setScrapeNewPreview(null); }}
                                    style={{ flex: 1 }}
                                />
                                <select
                                    value={scrapeNewLang}
                                    onChange={e => { setScrapeNewLang(e.target.value); setScrapeNewPreview(null); }}
                                    title="Dil (Yalnızca MangaDex / Comick)"
                                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', flexShrink: 0 }}>
                                    <option value="en">🇬🇧 English</option>
                                    <option value="tr">🇹🇷 Türkçe</option>
                                    <option value="pt-br">🇧🇷 Portuguese (BR)</option>
                                    <option value="es">🇪🇸 Spanish</option>
                                    <option value="es-la">🇲🇽 Spanish (LA)</option>
                                    <option value="fr">🇫🇷 French</option>
                                    <option value="de">🇩🇪 German</option>
                                    <option value="it">🇮🇹 Italian</option>
                                    <option value="id">🇮🇩 Indonesian</option>
                                    <option value="ru">🇷🇺 Russian</option>
                                    <option value="ar">🇸🇦 Arabic</option>
                                    <option value="ja">🇯🇵 Japanese</option>
                                    <option value="ko">🇰🇷 Korean</option>
                                    <option value="zh">🇨🇳 Chinese (Simp.)</option>
                                    <option value="zh-hk">🇹🇼 Chinese (Trad.)</option>
                                </select>
                                <button className="btn btn-ghost btn-sm" disabled={scrapeNewLoading || !scrapeNewUrl}
                                    onClick={async () => {
                                        if (!scrapeNewUrl.trim()) return;
                                        setScrapeNewLoading(true);
                                        try {
                                            const res = await authFetch('/api/admin/scrape', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'fetch-info', url: scrapeNewUrl.trim(), language: scrapeNewLang }),
                                            });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error);
                                            setScrapeNewPreview(data);
                                        } catch (e) { show(e.message, 'error'); }
                                        finally { setScrapeNewLoading(false); }
                                    }}>
                                    {scrapeNewLoading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Önizleme'}
                                </button>
                            </div>
                            {scrapeNewPreview && (
                                <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, marginTop: 10 }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        {scrapeNewPreview.meta?.coverUrl && (
                                            <img src={scrapeNewPreview.meta.coverUrl} alt="" style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} decoding="async" />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                                                <strong style={{ fontSize: '1rem' }}>{scrapeNewPreview.meta?.title}</strong>
                                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{scrapeNewPreview.site}</span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{scrapeNewPreview.chapters_count} bölüm bulundu</span>
                                            </div>
                                            {scrapeNewPreview.meta?.author && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Yazar: {scrapeNewPreview.meta.author}</div>}
                                            {scrapeNewPreview.meta?.genres?.length > 0 && (
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                                    {scrapeNewPreview.meta.genres.slice(0, 6).map(g => <span key={g} className="genre-tag" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>{g}</span>)}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <button className="btn btn-primary btn-sm" onClick={handleCreateSeriesFromScrape} disabled={scrapeNewLoading}>
                                                    {scrapeNewLoading ? 'Oluşturuluyor...' : `Seriyi Oluştur ve ${scrapeNewPreview.chapters_count} Bölümü Hazırla`}
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setScrapeNewPreview(null); setScrapeNewUrl(''); }}>İptal</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* All sources */}
                        <div className="admin-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <h3 style={{ margin: 0 }}>Aktif Kaynaklar ({allScraperSources.length})</h3>
                                {allScraperSources.length === 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={loadAllScraperSources}>Kaynakları Yükle</button>
                                )}
                            </div>
                            {allScraperSources.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                                    Henüz kaynak eklenmemiş. Bir seriyi açıp "Otomatik İçerik Çekme" alanından kaynak URL'si ekleyebilirsiniz.
                                </p>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Seri</th>
                                            <th>Site</th>
                                            <th>Kaynak URL</th>
                                            <th>Son Kontrol</th>
                                            <th>Son Bölüm</th>
                                            <th>Bekleyen</th>
                                            <th>Otomatik Eşitleme</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allScraperSources.map(src => (
                                            <tr key={src.id}>
                                                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', padding: '2px 6px' }}
                                                        onClick={() => { setTab('series'); openSeriesDetail(src.series_id); }}>
                                                        {src.series_title}
                                                    </button>
                                                </td>
                                                <td><span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', textTransform: 'uppercase' }}>{src.source_site}</span></td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                    <a href={safeHref(src.source_url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)' }}>{src.source_url}</a>
                                                </td>
                                                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {src.last_checked ? new Date(src.last_checked).toLocaleString() : 'Hiçbir Zaman'}
                                                </td>
                                                <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                    {src.last_chapter_found > 0 ? `Bölüm ${src.last_chapter_found}` : '-'}
                                                </td>
                                                <td>
                                                    {src.pending_count > 0 ? (
                                                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 50, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>
                                                            {src.pending_count} bekleyen
                                                        </span>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '0.72rem', color: src.auto_sync ? '#22c55e' : 'var(--text-muted)' }}>
                                                        {src.auto_sync ? '✓ Açık' : 'Kapalı'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {/* ═══════════════ MEDIA ═══════════════ */}
                {tab === 'media' && (
                    <>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ImageIcon /> Medya Kütüphanesi</h2>

                        {/* ── Görünüm Seçici ── */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            <button
                                className={`btn btn-sm ${mediaView === 'flat' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => { setMediaView('flat'); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                                Düz Liste
                            </button>
                            <button
                                className={`btn btn-sm ${mediaView === 'folders' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => {
                                    setMediaView('folders');
                                    setSelectedMediaSeries(null);
                                    setSelectedMediaChapter(null);
                                    setChapterPages(null);
                                    setSeriesChapterFolders(null);
                                    loadMediaFolders();
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                Seri Klasörleri
                            </button>
                            <button
                                className={`btn btn-sm ${mediaView === 'user-folders' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => {
                                    setMediaView('user-folders');
                                    setSelectedUserFolder(null);
                                    setUserFolderDetail(null);
                                    setUserFolderSearch('');
                                    loadUserFolders();
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                Kullanıcı Klasörleri
                            </button>
                        </div>

                        {/* ══════════ KLASÖR GÖRÜNÜMÜ ══════════ */}
                        {mediaView === 'folders' && (
                            <>
                                {/* Breadcrumb */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                    {mediaFolderBreadcrumb().map((item, i, arr) => (
                                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {i > 0 && <span style={{ color: 'var(--border-color)' }}>/</span>}
                                            {item.onClick ? (
                                                <button
                                                    onClick={item.onClick}
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                                                >
                                                    {item.label}
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
                                            )}
                                        </span>
                                    ))}
                                </div>

                                {/* ── Seri listesi ── */}
                                {!selectedMediaSeries && (
                                    <>
                                        {mediaFoldersLoading ? (
                                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Klasörler yükleniyor...</div>
                                        ) : mediaFolders.length === 0 ? (
                                            <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                                                <p style={{ color: 'var(--text-muted)' }}>Henüz seri bulunamadı.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                                {mediaFolders.map(folder => (
                                                    <div
                                                        key={folder.seriesId}
                                                        onClick={() => openMediaSeriesFolder(folder)}
                                                        style={{
                                                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                            borderRadius: 10, padding: 14, cursor: 'pointer',
                                                            display: 'flex', flexDirection: 'column', gap: 8,
                                                            transition: 'border-color 0.15s, background 0.15s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            {folder.coverUrl ? (
                                                                <img src={folder.coverUrl} alt={folder.title} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                                                            ) : (
                                                                <div style={{ width: 40, height: 56, borderRadius: 4, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                                </div>
                                                            )}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }} title={folder.title}>{folder.title}</div>
                                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                                                                    {folder.chapterCount} bölüm · {folder.pagesCount} sayfa
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{folder.totalSize}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── Seri içi: Kapak + Bölüm listesi ── */}
                                {selectedMediaSeries && !selectedMediaChapter && (
                                    <>
                                        {seriesChaptersLoading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40, color: 'var(--text-muted)' }}>
                                                <div className="spinner" />
                                                <span>Bölümler yükleniyor...</span>
                                            </div>
                                        ) : seriesChapterFolders && (
                                            <>
                                                {/* Kapak Görseli Klasörü */}
                                                <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                        Kapak Görseli
                                                    </div>
                                                    {seriesChapterFolders.series?.coverUrl ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <img
                                                                src={seriesChapterFolders.series.coverUrl}
                                                                alt="Kapak"
                                                                style={{ width: 60, height: 84, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                                                                onClick={() => setPreviewImage({ src: seriesChapterFolders.series.coverUrl, title: `${seriesChapterFolders.series.title} — Kapak` })}
                                                                onError={e => e.target.style.display='none'}
                                                            />
                                                            <div>
                                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{seriesChapterFolders.series.coverUrl.split('/').pop()}</div>
                                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{seriesChapterFolders.series.coverSize}</div>
                                                                <button
                                                                    className="btn btn-danger btn-sm"
                                                                    style={{ marginTop: 8, fontSize: '0.72rem' }}
                                                                    onClick={() => setConfirmModal({ action: 'delete-media', body: { filePath: seriesChapterFolders.series.coverUrl }, text: `"${seriesChapterFolders.series.title}" kapak görselini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.` })}
                                                                >
                                                                    <TrashIcon /> Sil
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kapak görseli yok veya varsayılan kullanılıyor.</div>
                                                    )}
                                                </div>

                                                {/* Bölüm Klasörleri */}
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10 }}>Bölümler ({seriesChapterFolders.chapters?.length || 0})</div>
                                                {seriesChapterFolders.chapters?.length === 0 ? (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px 0' }}>Bu seriye ait bölüm bulunamadı.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                                                        {(seriesChapterFolders.chapters || []).map(ch => (
                                                            <div
                                                                key={ch.chapterId}
                                                                onClick={() => openMediaChapterFolder(ch)}
                                                                style={{
                                                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                                                                    display: 'flex', flexDirection: 'column', gap: 4,
                                                                    transition: 'border-color 0.15s'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)', flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                                                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Bölüm {ch.chapterNumber}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ch.pageCount} sayfa · {ch.dirSize}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                {/* ── Bölüm sayfaları ── */}
                                {selectedMediaChapter && (
                                    <>
                                        {chapterPagesLoading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40, color: 'var(--text-muted)' }}>
                                                <div className="spinner" />
                                                <span>Sayfalar yükleniyor...</span>
                                            </div>
                                        ) : chapterPages && (
                                            <>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                                                    {chapterPages.pages?.length || 0} sayfa
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                                                    {(chapterPages.pages || []).map(p => (
                                                        <div key={p.pageId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                                            {!p.isShared && p.exists ? (
                                                                <img
                                                                    src={p.path}
                                                                    alt={`Sayfa ${p.pageNumber}`}
                                                                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                                                                    onClick={() => setPreviewImage({ src: p.path, title: `Sayfa ${p.pageNumber} — ${p.name}` })}
                                                                    loading="lazy"
                                                                    onError={e => { e.target.style.display='none'; }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '100%', aspectRatio: '3/4', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                    {p.isShared ? 'Paylaşılan' : 'Bulunamadı'}
                                                                </div>
                                                            )}
                                                            <div style={{ padding: '4px 6px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                                S.{p.pageNumber} · {p.sizeFormatted}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                         )}
                                    </>
                                )}
                            </>
                        )}

                        {/* ══════════ KULLANICI KLASÖR GÖRÜNÜMÜ ══════════ */}
                        {mediaView === 'user-folders' && (
                            <>
                                {/* Breadcrumb */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                    {userFolderBreadcrumb().map((item, i) => (
                                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {i > 0 && <span style={{ color: 'var(--border-color)' }}>/</span>}
                                            {item.onClick ? (
                                                <button
                                                    onClick={item.onClick}
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                                                >
                                                    {item.label}
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
                                            )}
                                        </span>
                                    ))}
                                </div>

                                {/* ── Kullanıcı listesi ── */}
                                {!selectedUserFolder && (
                                    <>
                                        {/* Arama */}
                                        <div style={{ marginBottom: 14 }}>
                                            <input
                                                type="text"
                                                placeholder="Kullanıcı ara..."
                                                value={userFolderSearch}
                                                onChange={e => setUserFolderSearch(e.target.value)}
                                                style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%', maxWidth: 300 }}
                                            />
                                        </div>

                                        {userFoldersLoading ? (
                                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Kullanıcı klasörleri yükleniyor...</div>
                                        ) : userFolders.length === 0 ? (
                                            <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                                                <p style={{ color: 'var(--text-muted)' }}>Henüz kullanıcı bulunamadı.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    {userFolders.filter(f => !userFolderSearch || f.username.toLowerCase().includes(userFolderSearch.toLowerCase())).length} kullanıcı
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                                    {userFolders
                                                        .filter(f => !userFolderSearch || f.username.toLowerCase().includes(userFolderSearch.toLowerCase()))
                                                        .map(folder => (
                                                        <div
                                                            key={folder.userId}
                                                            onClick={() => openUserFolder(folder)}
                                                            style={{
                                                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                                borderRadius: 10, padding: 14, cursor: 'pointer',
                                                                display: 'flex', flexDirection: 'column', gap: 8,
                                                                transition: 'border-color 0.15s, background 0.15s',
                                                                position: 'relative'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                                                        >
                                                            {folder.orphanCount > 0 && (
                                                                <div style={{ position: 'absolute', top: 8, right: 8, background: '#f59e0b', color: '#000', fontSize: '0.6rem', fontWeight: 800, borderRadius: 4, padding: '1px 5px' }}>
                                                                    {folder.orphanCount} sahipsiz
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                {folder.avatarUrl ? (
                                                                    <img
                                                                        src={folder.avatarUrl}
                                                                        alt={folder.username}
                                                                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', flexShrink: 0, border: '2px solid var(--border-color)' }}
                                                                        onError={e => { e.target.style.display='none'; }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                                                                        {folder.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }} title={folder.username}>
                                                                        {folder.username}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                                        {folder.role || 'user'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                {folder.avatarUrl && (
                                                                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                                                        Avatar
                                                                    </span>
                                                                )}
                                                                {folder.coverUrl && (
                                                                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                                                                        Kapak
                                                                    </span>
                                                                )}
                                                                {folder.fileCount === 0 && !folder.orphanCount && (
                                                                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                                                        Varsayılan
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                {folder.fileCount + folder.orphanCount} dosya · {folder.totalSize}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* ── Seçili kullanıcının dosya detayı ── */}
                                {selectedUserFolder && (
                                    <>
                                        {userFolderDetailLoading ? (
                                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Yükleniyor...</div>
                                        ) : userFolderDetail && (
                                            <>
                                                {/* Kullanıcı başlık kartı */}
                                                <div style={{ padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    {selectedUserFolder.avatarUrl ? (
                                                        <img src={selectedUserFolder.avatarUrl} alt={selectedUserFolder.username} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} onError={e => e.target.style.display='none'} />
                                                    ) : (
                                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                            {selectedUserFolder.username.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedUserFolder.username}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedUserFolder.role || 'user'} · ID: {selectedUserFolder.userId}</div>
                                                    </div>
                                                </div>

                                                {/* Dosyalar */}
                                                {userFolderDetail.files?.length === 0 ? (
                                                    <div className="admin-card" style={{ textAlign: 'center', padding: 30 }}>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bu kullanıcıya ait özel medya dosyası bulunamadı (varsayılan görseller kullanılıyor).</p>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                                                        {(userFolderDetail.files || []).map((file, idx) => (
                                                            <div key={idx} style={{ background: 'var(--bg-card)', border: `1px solid ${file.type === 'orphan' ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                                                                {file.type === 'orphan' && (
                                                                    <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 5, background: '#f59e0b', color: '#000', fontSize: '0.6rem', fontWeight: 800, borderRadius: 4, padding: '2px 6px' }}>
                                                                        Sahipsiz
                                                                    </div>
                                                                )}
                                                                {file.exists && !file.isExternal ? (
                                                                    <img
                                                                        src={file.path}
                                                                        alt={file.label}
                                                                        style={{ width: '100%', aspectRatio: file.type === 'cover' ? '3/1' : '1/1', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                                                                        onClick={() => setPreviewImage({ src: file.path, title: `${selectedUserFolder.username} — ${file.label}` })}
                                                                        loading="lazy"
                                                                        onError={e => { e.target.style.display='none'; }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                                    </div>
                                                                )}
                                                                <div style={{ padding: '8px 10px' }}>
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{file.label}</div>
                                                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>{file.name}</div>
                                                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{file.sizeFormatted}</div>
                                                                    <button
                                                                        className="btn btn-danger btn-sm"
                                                                        style={{ marginTop: 8, fontSize: '0.7rem', width: '100%', justifyContent: 'center' }}
                                                                        onClick={() => setConfirmModal({
                                                                            action: 'delete-media',
                                                                            body: { filePath: file.path },
                                                                            text: `"${selectedUserFolder.username}" kullanıcısının "${file.label}" dosyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
                                                                        })}
                                                                    >
                                                                        <TrashIcon /> Sil
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                        {mediaView === 'flat' && (
                            <>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => loadMedia(1, false, mediaFilter)}>
                                        {mediaLoading && mediaPage === 1 ? 'Yükleniyor...' : 'Yenile'}
                                    </button>
                                    {['all', 'covers', 'pages', 'user_images'].map(f => {
                                        const labelsTr = { all: 'Tümü', covers: 'Kapaklar', pages: 'Sayfalar', user_images: 'Kullanıcı Görselleri' };
                                        return (
                                            <button key={f} className={`btn btn-sm ${mediaFilter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => {
                                                exitSelectMode();
                                                setMediaFilter(f);
                                                loadMedia(1, false, f);
                                            }}>{labelsTr[f] || f}</button>
                                        );
                                    })}
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                        {mediaFiles.length} / {mediaTotal} dosya
                                    </span>
                                    {!mediaSelectMode ? (
                                        <button className="btn btn-sm btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={() => { setMediaSelectMode(true); setMediaSelected(new Set()); }}>
                                            <CheckIcon /> Seç
                                        </button>
                                    ) : (
                                        <button className="btn btn-sm btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={exitSelectMode}>
                                            İptal
                                        </button>
                                    )}
                                </div>

                                {mediaSelectMode && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, flexWrap: 'wrap' }}>
                                        <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.78rem' }} onClick={toggleMediaSelectAll}>
                                            {mediaSelected.size === mediaFiles.length && mediaFiles.length > 0 ? 'Tüm Seçimi Kaldır' : 'Tümünü Seç'}
                                        </button>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{mediaSelected.size} seçili</span>
                                    </div>
                                )}

                                {/* ── Görsel Yükleme Alanı ── */}
                                {mediaFilter !== 'user_images' && (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <UploadIcon />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Görsel Yükle</span>
                                        <select
                                            value={mediaUploadCategory}
                                            onChange={e => setMediaUploadCategory(e.target.value)}
                                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                                        >
                                            <option value="covers">Kapaklar</option>
                                            <option value="pages">Sayfalar</option>
                                        </select>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: mediaUploading ? 'not-allowed' : 'pointer', background: 'var(--accent)', color: '#fff', padding: '6px 16px', borderRadius: 7, fontSize: '0.82rem', fontWeight: 700, opacity: mediaUploading ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                                            {mediaUploading ? 'Yükleniyor...' : <><UploadIcon /> Dosya Seç</>}
                                            <input
                                                ref={mediaUploadRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                disabled={mediaUploading}
                                                onChange={handleMediaUpload}
                                            />
                                        </label>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP, GIF, SVG — Otomatik WebP'ye dönüştürülür</span>
                                    </div>
                                )}

                                {mediaFilter === 'user_images' && (
                                    <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Kullanıcıların profil avatarları ve kapak fotoğrafları (DB + /uploads/avatars/ dizini birleşik). Görsele tıklayınca önizleme açılır. Silme işlemi dosyayı kaldırır ve kullanıcının profil kaydını temizler.
                                    </div>
                                )}

                                {mediaFiles.length === 0 && !mediaLoading ? (
                                    <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                                        <ImageIcon />
                                        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Medya dosyalarını yüklemek için "Yenile"ye tıklayın.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                                            {mediaFiles.map((m, i) => (
                                                <LazyMediaCard
                                                    key={`${m.path}-${i}`}
                                                    m={m}
                                                    onPreview={() => setPreviewImage({ src: m.path, title: m.name })}
                                                    onDelete={() => setConfirmModal({ action: 'delete-media', body: { filePath: m.path }, text: `"${m.name}" dosyasını silmek istediğinize emin misiniz?` })}
                                                    selectionMode={mediaSelectMode}
                                                    selected={mediaSelected.has(m.path)}
                                                    onToggleSelect={toggleMediaSelect}
                                                />
                                            ))}
                                        </div>
                                        {mediaHasMore && (
                                            <div style={{ textAlign: 'center', marginTop: 24 }}>
                                                <button className="btn btn-secondary" onClick={() => loadMedia(mediaPage + 1, true, mediaFilter)} disabled={mediaLoading}>
                                                    {mediaLoading ? 'Yükleniyor...' : 'Daha Fazla Medya Yükle'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── Floating bulk action bar ── */}
                                {mediaSelectMode && mediaSelected.size > 0 && mounted && createPortal(
                                    <div style={{
                                        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                        borderRadius: 12, padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 9999, flexWrap: 'wrap'
                                    }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{mediaSelected.size} dosya seçildi</span>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
                                            onClick={handleBulkDownload}
                                        >
                                            <DownloadIcon /> Seçilenleri İndir
                                        </button>
                                        <button
                                                className="btn btn-danger btn-sm"
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                                onClick={handleBulkDelete}
                                                disabled={bulkDeleting}
                                            >
                                                <TrashIcon /> {bulkDeleting ? 'Siliniyor...' : 'Seçilenleri Sil'}
                                            </button>
                                        <button className="btn btn-sm btn-ghost" onClick={exitSelectMode} style={{ fontSize: '0.78rem' }}>İptal</button>
                                    </div>,
                                    document.body
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ═══════════════ PAGES & MENUS ═══════════════ */}
                {tab === 'pages' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <GlobeIcon /> Sayfalar & Menüler
                            </h2>
                        </div>

                        {/* ── Özel Sayfalar ── */}
                        <div className="admin-card" style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ margin: 0 }}>Özel Sayfalar</h3>
                                {editingPage === null && (
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                        setPageForm({ title: '', slug: '', content: '', is_active: true, show_in_footer: true, show_in_navbar: false });
                                        setEditingPage('new');
                                    }}>
                                        <PlusIcon /> Yeni Sayfa
                                    </button>
                                )}
                            </div>

                            {/* Page editor form */}
                            {editingPage !== null && (
                                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 18, marginBottom: 18, border: '1px solid var(--border-color)' }}>
                                    <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem' }}>
                                        {editingPage === 'new' ? 'Yeni Sayfa Oluştur' : `Düzenle: ${editingPage.title}`}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label>Sayfa Başlığı *</label>
                                            <input className="form-input" placeholder="örn. Hakkımızda" value={pageForm.title}
                                                onChange={e => setPageForm(f => ({ ...f, title: e.target.value }))} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label>URL (slug)</label>
                                            <input className="form-input" placeholder="hakkimizda" value={pageForm.slug}
                                                onChange={e => setPageForm(f => ({ ...f, slug: e.target.value }))} />
                                            <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Boş bırakılırsa başlıktan otomatik oluşturulur. Erişim: /p/slug</small>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 10 }}>
                                        <label>İçerik (HTML destekler)</label>
                                        <FormatToolbar stateSetter={v => setPageForm(f => ({ ...f, content: v }))} stateValue={pageForm.content} textareaId="page-content-editor" />
                                        <textarea id="page-content-editor" className="form-input" rows={10} value={pageForm.content}
                                            onChange={e => setPageForm(f => ({ ...f, content: e.target.value }))}
                                            placeholder="Sayfa içeriğini buraya yazın..." style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                                        {[
                                            { key: 'is_active', label: 'Sayfa Aktif' },
                                            { key: 'show_in_footer', label: 'Footer\'da Göster' },
                                            { key: 'show_in_navbar', label: 'Navbar\'da Göster' },
                                        ].map(({ key, label }) => (
                                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                                                <input type="checkbox" checked={!!pageForm[key]}
                                                    onChange={e => setPageForm(f => ({ ...f, [key]: e.target.checked }))} />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary btn-sm" onClick={savePage} disabled={!pageForm.title.trim()}>Kaydet</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingPage(null)}>İptal</button>
                                    </div>
                                </div>
                            )}

                            {/* Pages list */}
                            {pagesLoading ? (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Yükleniyor...</div>
                            ) : customPages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                                    Henüz özel sayfa yok.
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Başlık</th>
                                            <th>URL</th>
                                            <th>Durum</th>
                                            <th>Menü</th>
                                            <th>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customPages.map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600 }}>{p.title}</td>
                                                <td>
                                                    <a href={`/p/${encodeURIComponent(p.slug)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)', fontSize: '0.82rem' }}>/p/{p.slug}</a>
                                                </td>
                                                <td>
                                                    {p.is_active
                                                        ? <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>● Aktif</span>
                                                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>○ Gizli</span>}
                                                </td>
                                                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    {p.show_in_navbar && <span style={{ marginRight: 6 }}>Navbar</span>}
                                                    {p.show_in_footer && <span>Footer</span>}
                                                    {!p.show_in_navbar && !p.show_in_footer && '—'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => {
                                                            setPageForm({ title: p.title, slug: p.slug, content: p.content || '', is_active: !!p.is_active, show_in_footer: !!p.show_in_footer, show_in_navbar: !!p.show_in_navbar });
                                                            setEditingPage(p);
                                                        }}><EditIcon /> Düzenle</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => deletePage(p.id)}><TrashIcon /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* ── Menü Yönetimi ── */}
                        <div className="admin-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ margin: 0 }}>Menü Yönetimi</h3>
                                <button className="btn btn-primary btn-sm" onClick={saveMenus} disabled={menuSaving}>
                                    {menuSaving ? 'Kaydediliyor...' : 'Menüleri Kaydet'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {/* Navbar Menu */}
                                {[
                                    { label: 'Navbar Menüsü', menu: navbarMenu, setter: setNavbarMenu },
                                    { label: 'Footer Menüsü', menu: footerMenu, setter: setFooterMenu },
                                ].map(({ label, menu, setter }) => (
                                    <div key={label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{label}</h4>
                                            <button className="btn btn-ghost btn-sm" onClick={() => addMenuItem(setter)}>
                                                <PlusIcon /> Bağlantı Ekle
                                            </button>
                                        </div>
                                        {menu.length === 0 && (
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>Henüz bağlantı yok.</div>
                                        )}
                                        {menu.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                                                <input className="form-input" placeholder="Etiket" value={item.label} style={{ flex: '0 0 110px', fontSize: '0.82rem', padding: '5px 8px' }}
                                                    onChange={e => updateMenuItem(setter, idx, 'label', e.target.value)} />
                                                <input className="form-input" placeholder="/seriler" value={item.url} style={{ flex: 1, fontSize: '0.82rem', padding: '5px 8px' }}
                                                    onChange={e => updateMenuItem(setter, idx, 'url', e.target.value)} />
                                                <button className="btn btn-ghost btn-sm" title="Yukarı" onClick={() => moveMenuItem(setter, idx, -1)} disabled={idx === 0} style={{ padding: '4px 7px' }}>↑</button>
                                                <button className="btn btn-ghost btn-sm" title="Aşağı" onClick={() => moveMenuItem(setter, idx, 1)} disabled={idx === menu.length - 1} style={{ padding: '4px 7px' }}>↓</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => removeMenuItem(setter, idx)} style={{ padding: '4px 7px' }}><TrashIcon /></button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <p style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                URL olarak <code>/series</code>, <code>/ranking</code>, <code>/p/hakkimizda</code> gibi yerel yollar veya <code>https://...</code> şeklinde dış bağlantılar kullanabilirsiniz.
                            </p>
                        </div>
                    </>
                )}

                {/* ═══════════════ YEDEKLEME ═══════════════ */}
                {tab === 'backup' && (
                    <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BackupIcon /> Yedekleme Yönetimi
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
                            Veritabanı yedeklerini oluşturun, geri yükleyin veya dışa aktarın. Son 7 yedek otomatik tutulur.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                            <div className="admin-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Yeni Yedek Oluştur</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tüm verileri JSON olarak kaydet</div>
                                    </div>
                                </div>
                                <button className="btn btn-primary" onClick={createBackup} style={{ width: '100%' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Yedek Oluştur
                                </button>
                            </div>

                            <div className="admin-card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', flexShrink: 0 }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Verileri İçe Aktar</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JSON dosyasından geri yükle</div>
                                    </div>
                                </div>
                                <label className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    İçe Aktar
                                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
                                </label>
                            </div>
                        </div>

                        {/* Mevcut Yedekler */}
                        <div className="admin-card">
                            <h3 style={{ marginBottom: 16 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                Mevcut Yedekler ({backups.length})
                            </h3>
                            {loadingBackups && backups.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Yedekler yükleniyor...</div>
                            ) : backups.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.5 }}>
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    <p>Henüz yedek oluşturulmamış</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                                    {backups.map(b => (
                                        <div key={b.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, border: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{b.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {new Date(b.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-light)', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                                                    {b.sizeFormatted}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <span>{b.seriesCount} seri</span>
                                                <span>•</span>
                                                <span>{b.chaptersCount} bölüm</span>
                                                <span>•</span>
                                                <span>{b.commentsCount} yorum</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => downloadBackup(b)}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                    İndir
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => deleteBackup(b.id)}>
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════ SETTINGS ═══════════════ */}
                {tab === 'settings' && (
                    <div className="admin-card" style={{ maxWidth: 640 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GearIcon /> Site Ayarları</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                            Küresel uygulama ayarlarını ve ana sayfa bileşenlerini yapılandırın.
                        </p>
                        
                        <form onSubmit={saveSettings}>
                            {/* ── Yönetici Paneli için 2FA Zorunluluğu (Madde 12) ── */}
                            <div style={{ padding: '16px', background: settings.admin_2fa_required === '1' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: settings.admin_2fa_required === '1' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: settings.admin_2fa_required === '1' ? '#22c55e' : 'var(--text-primary)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-5z" /><path d="m9 12 2 2 4-4" /></svg>
                                    Yönetici Panelinde 2FA Zorunlu
                                    {settings.admin_2fa_required === '1' && <span style={{ fontSize: '0.72rem', background: 'rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: 50, padding: '2px 10px', marginLeft: 4 }}>AKTİF</span>}
                                </h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                                    Etkinleştirildiğinde, admin/manager/moderator/team_member (ve özel) rollerine sahip
                                    hesaplar, kendi hesaplarında 2FA (Profil → Ayarlar → İki Adımlı Doğrulama) kurulu
                                    olmadan yönetici paneline veya admin API'lerine erişemez. Bu ayarı açmadan önce
                                    <strong> kendi hesabınızda 2FA'yı kurmuş olduğunuzdan emin olun</strong>, aksi
                                    halde kendinizi panelden kilitleyebilirsiniz.
                                </p>
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        id="admin2FARequired"
                                        checked={settings.admin_2fa_required === '1'}
                                        onChange={(e) => setSettings({ ...settings, admin_2fa_required: e.target.checked ? '1' : '0' })}
                                        style={{ width: 18, height: 18, accentColor: '#22c55e' }}
                                    />
                                    <label htmlFor="admin2FARequired" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>
                                        Panel erişimi için personel hesaplarında 2FA'yı zorunlu kıl
                                    </label>
                                </div>
                            </div>

                            {/* ── Bakım Modu (Maintenance Mode) ── */}
                            <div style={{ padding: '16px', background: settings.maintenance_mode === '1' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: settings.maintenance_mode === '1' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: settings.maintenance_mode === '1' ? '#fbbf24' : 'var(--text-primary)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                    Bakım Modu
                                    {settings.maintenance_mode === '1' && <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: 50, padding: '2px 10px', marginLeft: 4 }}>AKTİF</span>}
                                </h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                                    Etkinleştirildiğinde, ziyaretçiler bir bakım sayfası görür. Siteye yalnızca yöneticiler (giriş yapmış olanlar) erişebilir.
                                </p>
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        id="maintenanceEnabled"
                                        checked={settings.maintenance_mode === '1'}
                                        onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? '1' : '0' })}
                                        style={{ width: 18, height: 18, accentColor: '#f59e0b' }}
                                    />
                                    <label htmlFor="maintenanceEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>
                                        Bakım Modunu Etkinleştir
                                    </label>
                                </div>
                                <div className="form-group" style={{ marginTop: 14 }}>
                                    <label>Bakım Mesajı (isteğe bağlı)</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={settings.maintenance_message}
                                        onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                                        placeholder="Deneyiminizi geliştirmek için şu anda planlı bakım yapıyoruz. Bu işlem uzun sürmeyecektir - lütfen kısa süre sonra tekrar kontrol edin."
                                        style={{ resize: 'vertical', minHeight: 70 }}
                                    />
                                    <small style={{ color: 'var(--text-muted)', marginTop: 4 }}>Varsayılan mesaj için boş bırakın.</small>
                                </div>
                                <div className="form-group" style={{ marginTop: 14 }}>
                                    <label>Bakım Sayfası Tasarımı</label>
                                    <select
                                        className="form-input"
                                        value={settings.maintenance_mode_design}
                                        onChange={(e) => setSettings({ ...settings, maintenance_mode_design: e.target.value })}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <option value="default">Varsayılan</option>
                                        <option value="glassmorphism">Glassmorphism</option>
                                    </select>
                                    <small style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                                        Glassmorphism: Animasyonlu arka plan ile modern cam efektli tasarım.
                                    </small>
                                </div>
                            </div>

                            {/* ── Bağış Afişi (Donation Banner) ── */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    Bağış Afişi
                                </h4>
                                
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <input 
                                        type="checkbox" 
                                        id="donEnabled"
                                        checked={settings.donation_enabled === '1'} 
                                        onChange={(e) => setSettings({...settings, donation_enabled: e.target.checked ? '1' : '0'})} 
                                        style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} 
                                    />
                                    <label htmlFor="donEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Ana Sayfada Bağış Afişini Göster</label>
                                </div>

                                <div className="form-group">
                                    <label>Teşvik Edici Mesaj / Başlık</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={settings.donation_text} 
                                        onChange={(e) => setSettings({...settings, donation_text: e.target.value})} 
                                        placeholder="örn. Sunucuları açık tutmak için bize destek olun!"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label>PayPal URL</label>
                                        <input 
                                            type="url" 
                                            className="form-input" 
                                            value={settings.paypal_url} 
                                            onChange={(e) => setSettings({...settings, paypal_url: e.target.value})} 
                                            placeholder="https://paypal.me/..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ko-fi URL</label>
                                        <input 
                                            type="url" 
                                            className="form-input" 
                                            value={settings.kofi_url} 
                                            onChange={(e) => setSettings({...settings, kofi_url: e.target.value})} 
                                            placeholder="https://ko-fi.com/..."
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 12 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                        Kreosus URL
                                    </label>
                                    <input 
                                        type="url" 
                                        className="form-input" 
                                        value={settings.kreosus_url} 
                                        onChange={(e) => setSettings({...settings, kreosus_url: e.target.value})} 
                                        placeholder="https://kreosus.com/..."
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                                        Kreosus bağış sayfanızın URL'sini girin. Doldurulduğunda bağış afiş üzerinde Kreosus butonu gösterilir.
                                    </small>
                                </div>

                                {/* ── Hedef Barı ── */}
                                <div style={{ marginTop: 20, padding: '16px', background: 'rgba(52,211,153,0.05)', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.15)' }}>
                                    <h4 style={{ fontSize: '0.95rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#34d399' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                        Bağış Hedef Barı
                                    </h4>
                                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                        <input
                                            type="checkbox"
                                            id="goalEnabled"
                                            checked={settings.donation_goal_enabled === '1'}
                                            onChange={(e) => setSettings({...settings, donation_goal_enabled: e.target.checked ? '1' : '0'})}
                                            style={{ width: 18, height: 18, accentColor: '#34d399' }}
                                        />
                                        <label htmlFor="goalEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Hedef Barını Göster</label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12, marginBottom: 12 }}>
                                        <div className="form-group">
                                            <label>Mevcut Miktar</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={settings.donation_goal_current}
                                                onChange={(e) => setSettings({...settings, donation_goal_current: e.target.value})}
                                                placeholder="örn. 350"
                                                min="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Hedef Miktar</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={settings.donation_goal_target}
                                                onChange={(e) => setSettings({...settings, donation_goal_target: e.target.value})}
                                                placeholder="örn. 1000"
                                                min="1"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Para Birimi</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={settings.donation_goal_currency}
                                                onChange={(e) => setSettings({...settings, donation_goal_currency: e.target.value})}
                                                placeholder="₺"
                                                maxLength={3}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Hedef Etiketi</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={settings.donation_goal_label}
                                            onChange={(e) => setSettings({...settings, donation_goal_label: e.target.value})}
                                            placeholder="örn. Sunucu Maliyeti"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginTop: 12, padding: '12px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                                            Manuel Yüzde (%) Modu
                                        </label>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                                            0 bırakılırsa yukarıdaki tutarlardan otomatik hesaplanır. 1–100 arası değer girilirse bar bu yüzdeye göre dolar ve tutar gösterilmez.
                                        </p>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={settings.donation_goal_pct}
                                            onChange={(e) => setSettings({...settings, donation_goal_pct: e.target.value})}
                                            placeholder="örn. 65 (0 = devre dışı)"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginTop: 12, padding: '12px', background: 'rgba(245,158,11,0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            Geri Sayım Bitiş Tarihi
                                        </label>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                                            Bir bitiş tarihi/saati seçin — bağış afişinde kalan gün/saat/dakika gösterilir. Son 3 günde tasarım aciliyeti vurgulayan renge geçer. Boş bırakılırsa geri sayım gösterilmez.
                                        </p>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={settings.donation_goal_deadline}
                                            onChange={(e) => setSettings({...settings, donation_goal_deadline: e.target.value})}
                                        />
                                        {settings.donation_goal_deadline && (
                                            <button
                                                type="button"
                                                style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                onClick={() => setSettings({...settings, donation_goal_deadline: ''})}
                                            >✕ Geri sayımı kaldır</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Discord Sunucu Afişi ── */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#5865F2' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12c.5 1.5 2 2.5 4 2.5s3.5-1 4-2.5"/></svg>
                                    Discord Afişi
                                </h4>
                                
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <input 
                                        type="checkbox" 
                                        id="discEnabled"
                                        checked={settings.discord_enabled === '1'} 
                                        onChange={(e) => setSettings({...settings, discord_enabled: e.target.checked ? '1' : '0'})} 
                                        style={{ width: 18, height: 18, accentColor: '#5865F2' }} 
                                    />
                                    <label htmlFor="discEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Ana Sayfada Discord Afişini Göster</label>
                                </div>

                                <div className="form-group">
                                    <label>Discord Davet URL'si</label>
                                    <input 
                                        type="url" 
                                        className="form-input" 
                                        value={settings.discord_url} 
                                        onChange={(e) => setSettings({...settings, discord_url: e.target.value})} 
                                        placeholder="https://discord.gg/..."
                                    />
                                </div>
                            </div>

                            {/* ── Ana Sayfa İstatistikler Barı ── */}
                            <div style={{ padding: '16px', background: 'rgba(99,102,241,0.04)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-light)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                                    Ana Sayfa İstatistikler Barı
                                </h4>
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        id="showStatsBar"
                                        checked={settings.show_stats_bar !== '0'}
                                        onChange={(e) => setSettings({...settings, show_stats_bar: e.target.checked ? '1' : '0'})}
                                        style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                                    />
                                    <label htmlFor="showStatsBar" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Ana sayfada Seri / Bölüm / Kullanıcı istatistikler barını göster</label>
                                </div>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8, display: 'block' }}>
                                    Kapatılırsa ana sayfanın altındaki istatistik sayaçları gizlenir.
                                </small>
                            </div>

                            {/* ── Hata Bildirimi Ayarları ── */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                                    <ShieldIcon />
                                    Hata Bildirimi Ayarları
                                </h4>
                                
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        id="bugRepEnabled"
                                        checked={settings.bug_report_enabled === '1'} 
                                        onChange={(e) => setSettings({...settings, bug_report_enabled: e.target.checked ? '1' : '0'})} 
                                        style={{ width: 18, height: 18, accentColor: '#ef4444' }} 
                                    />
                                    <label htmlFor="bugRepEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Ana Sayfada Hata Bildirimi Butonunu Göster</label>
                                </div>
                            </div>

                            {/* ── Okuyucu Destek Kartı ── */}
                            <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                    Okuyucu Destek Kartı (Bölüm Sonu)
                                </h4>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 14, display: 'block' }}>
                                    Bölüm okuma sayfasının sonunda görünen glassmorphism destek kartı. Açık olduğunda tüm okuma modlarında (webtoon, manga, novel) gösterilir.
                                </small>

                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="checkbox"
                                        id="readerSupportEnabled"
                                        checked={settings.reader_support_enabled === '1'}
                                        onChange={(e) => setSettings({...settings, reader_support_enabled: e.target.checked ? '1' : '0'})}
                                        style={{ width: 18, height: 18, accentColor: '#8b5cf6' }}
                                    />
                                    <label htmlFor="readerSupportEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Bölüm sayfasında Destek Kartını Göster</label>
                                </div>

                                <div className="form-group">
                                    <label>Kart Metni</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={settings.reader_support_text}
                                        onChange={(e) => setSettings({...settings, reader_support_text: e.target.value})}
                                        placeholder="Her bölüm yaklaşık 5 TL AI maliyetiyle hazırlanıyor..."
                                        style={{ resize: 'vertical', minHeight: 72 }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label>Buton Metni</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={settings.reader_support_button_text}
                                            onChange={(e) => setSettings({...settings, reader_support_button_text: e.target.value})}
                                            placeholder="Destek Ol"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Buton URL</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={settings.reader_support_url}
                                            onChange={(e) => setSettings({...settings, reader_support_url: e.target.value})}
                                            placeholder="https://... veya #"
                                        />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                                            Bağış sayfanızın URL'si. # yazarsanız buton sayfada kalır.
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-card" style={{ marginTop: 20 }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                                    Dış Bağlantılı Bölüm Uyarısı
                                </h4>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 14, display: 'block' }}>
                                    Başka bir ekip tarafından yapılmış, sadece URL olarak eklediğiniz bölümlere kullanıcı girdiğinde gösterilen tam ekran uyarı. Bir bölüme özel metin girilmediyse buradaki varsayılan metin kullanılır.
                                </small>

                                <div className="form-group">
                                    <label>Varsayılan Uyarı Metni</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={settings.external_redirect_message}
                                        onChange={(e) => setSettings({...settings, external_redirect_message: e.target.value})}
                                        placeholder="Bu seri başka bir ekip tarafından yapılmıştır..."
                                        style={{ resize: 'vertical', minHeight: 72 }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Buton Metni</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.external_redirect_button_text}
                                        onChange={(e) => setSettings({...settings, external_redirect_button_text: e.target.value})}
                                        placeholder="Siteye Git"
                                        style={{ maxWidth: 260 }}
                                    />
                                </div>
                            </div>

                            {/* ── Hoş Geldin Ekranı (İlk Ziyaret) ── */}
                            <div style={{ padding: '16px', background: 'rgba(34,197,94,0.05)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    Hoş Geldin Ekranı (İlk Ziyaret)
                                </h4>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 14, display: 'block' }}>
                                    Bir IP adresi siteye ilk kez girdiğinde (bir defaya mahsus) karşısına çıkan, birden fazla slayttan oluşabilen karşılama ekranı. Daha sonra aynı IP'den gelen ziyaretlerde tekrar gösterilmez. Kullanıcı slaytlar arasında "İleri / Geri" ile gezinebilir, isterse "Geç" diyerek kapatabilir.
                                </small>

                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="checkbox"
                                        id="welcomeScreenEnabled"
                                        checked={settings.welcome_screen_enabled === '1'}
                                        onChange={(e) => setSettings({...settings, welcome_screen_enabled: e.target.checked ? '1' : '0'})}
                                        style={{ width: 18, height: 18, accentColor: '#22c55e' }}
                                    />
                                    <label htmlFor="welcomeScreenEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>İlk kez gelen ziyaretçilere hoş geldin ekranını göster</label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 12 }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.ddos_gate_enabled === '1'}
                                            onChange={(e) => setSettings({...settings, ddos_gate_enabled: e.target.checked ? '1' : '0'})}
                                        />
                                        <span>
                                            <strong>DDoS Koruma Kapısı</strong>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                Siteye giren her ziyaretçiye Turnstile doğrulaması gösterir. Aktif etmek için Turnstile Site Key ayarlanmış olmalı.
                                            </span>
                                        </span>
                                    </label>                                </div>

                                {(() => {
                                    const wSlides = getWelcomeSlides();
                                    return (
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                                <label style={{ marginBottom: 0, fontWeight: 600 }}>
                                                    Slaytlar {wSlides.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({wSlides.length})</span>}
                                                </label>
                                                {wSlides.length === 0 && (
                                                    <button type="button" onClick={loadDefaultWelcomeSlides} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                                        ✨ Varsayılan 5 Slaytı Yükle
                                                    </button>
                                                )}
                                            </div>

                                            {wSlides.length === 0 && (
                                                <div style={{ padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                                                    Henüz slayt eklenmedi. Slayt eklenmezse basit, tek ekranlık eski tarz karşılama (aşağıdaki yedek başlık/mesaj/buton alanları) kullanılır. Çok adımlı bir karşılama için "Varsayılan 5 Slaytı Yükle" butonunu kullanabilir ya da "+ Slayt Ekle" ile sıfırdan başlayabilirsin.
                                                </div>
                                            )}

                                            {wSlides.map((slide, idx) => (
                                                <div key={idx} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ade80' }}>Slayt {idx + 1}{idx === wSlides.length - 1 ? ' (son — buton kapatır)' : ''}</span>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button type="button" onClick={() => moveWelcomeSlide(idx, -1)} disabled={idx === 0} title="Yukarı taşı" className="btn-icon-sm">↑</button>
                                                            <button type="button" onClick={() => moveWelcomeSlide(idx, 1)} disabled={idx === wSlides.length - 1} title="Aşağı taşı" className="btn-icon-sm">↓</button>
                                                            <button type="button" onClick={() => removeWelcomeSlide(idx)} title="Slaytı sil" className="btn-icon-sm" style={{ color: '#f87171' }}>✕</button>
                                                        </div>
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 8 }}>
                                                        <label style={{ fontSize: '0.78rem' }}>Başlık</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={slide.title || ''}
                                                            onChange={(e) => updateWelcomeSlide(idx, 'title', e.target.value)}
                                                            placeholder="Örn: Binlerce bölüm 📚"
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 8 }}>
                                                        <label style={{ fontSize: '0.78rem' }}>Mesaj</label>
                                                        <textarea
                                                            className="form-input"
                                                            rows={2}
                                                            value={slide.message || ''}
                                                            onChange={(e) => updateWelcomeSlide(idx, 'message', e.target.value)}
                                                            placeholder="Bu slaytta ne anlatmak istiyorsun?"
                                                            style={{ resize: 'vertical', minHeight: 54 }}
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 8 }}>
                                                        <label style={{ fontSize: '0.78rem' }}>Görsel / GIF URL (opsiyonel)</label>
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={slide.image || ''}
                                                                onChange={(e) => updateWelcomeSlide(idx, 'image', e.target.value)}
                                                                placeholder="https://... (.gif, .png, .jpg, .webp)"
                                                                style={{ flex: 1 }}
                                                            />
                                                            {slide.image && (
                                                                <img
                                                                    src={slide.image}
                                                                    alt=""
                                                                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}
                                                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                                                />
                                                            )}
                                                        </div>
                                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Boş bırakılırsa site logon gösterilir. Medya dosyalarını "Medya Kütüphanesi" sekmesinden yükleyip linkini buraya yapıştırabilirsin.</small>
                                                    </div>

                                                    {idx === wSlides.length - 1 && (
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label style={{ fontSize: '0.78rem' }}>Buton Metni (son slayt)</label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={slide.buttonText || ''}
                                                                onChange={(e) => updateWelcomeSlide(idx, 'buttonText', e.target.value)}
                                                                placeholder="Keşfetmeye Başla"
                                                                style={{ maxWidth: 260 }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button type="button" onClick={addWelcomeSlide} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '8px 14px' }}>
                                                + Slayt Ekle
                                            </button>
                                        </div>
                                    );
                                })()}

                                <details style={{ marginTop: 18 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)', userSelect: 'none' }}>
                                        Yedek tek-ekran alanları (slayt eklenmezse kullanılır)
                                    </summary>
                                    <div style={{ marginTop: 12 }}>
                                        <div className="form-group">
                                            <label>Başlık</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={settings.welcome_screen_title}
                                                onChange={(e) => setSettings({...settings, welcome_screen_title: e.target.value})}
                                                placeholder="Hoş geldin!"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Mesaj</label>
                                            <textarea
                                                className="form-input"
                                                rows={3}
                                                value={settings.welcome_screen_message}
                                                onChange={(e) => setSettings({...settings, welcome_screen_message: e.target.value})}
                                                placeholder="Sitemize ilk kez uğruyorsun..."
                                                style={{ resize: 'vertical', minHeight: 72 }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>Buton Metni</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={settings.welcome_screen_button_text}
                                                onChange={(e) => setSettings({...settings, welcome_screen_button_text: e.target.value})}
                                                placeholder="Keşfetmeye Başla"
                                                style={{ maxWidth: 260 }}
                                            />
                                        </div>
                                    </div>
                                </details>
                            </div>

                            {/* ── Yeni Bölüm Özelleştirmesi ── */}
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c0 0-4.5 4.5-4.5 8.5C7.5 14.5 10.5 17 12 17s4.5-2.5 4.5-6.5C16.5 6.5 12 2 12 2zm0 12.5c-1.38 0-2.5-1.12-2.5-2.5 0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 1.38-1.12 2.5-2.5 2.5z"/></svg>
                                    Yeni Bölüm Özelleştirmesi (24 Saat)
                                </h4>
                                
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        id="newChHighlightEnabled"
                                        checked={settings.show_new_chapter_badge === '1'} 
                                        onChange={(e) => setSettings({...settings, show_new_chapter_badge: e.target.checked ? '1' : '0'})} 
                                        style={{ width: 18, height: 18, accentColor: '#f59e0b' }} 
                                    />
                                    <label htmlFor="newChHighlightEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Son 24 saatte yüklenen bölümleri vurgula (alev ve animasyon efekti)</label>
                                </div>
                            </div>

                            {/* ── Son Güncellemeler Sayfalama ── */}
                            <div style={{ padding: '16px', background: 'rgba(6,182,212,0.04)', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.15)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#06b6d4' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                                    Son Güncellemeler — Sayfa Başına Seri
                                </h4>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>Sayfa Başına Seri Sayısı</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="4"
                                        max="64"
                                        value={settings.updates_per_page}
                                        onChange={(e) => setSettings({...settings, updates_per_page: e.target.value})}
                                        style={{ maxWidth: 120 }}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                                        Ana sayfadaki "Son Güncellemeler" bölümünde her sayfada kaç seri gösterileceğini belirler. Önerilen: 12–24.
                                    </small>
                                </div>
                            </div>

                            {/* ── Bölüm Küçük Görseli (Thumbnail) ── */}
                            <div style={{ padding: '16px', background: 'rgba(16,185,129,0.04)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#10b981' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M3 13l4-4 4 4 4-5 4 5"/></svg>
                                    Bölüm Küçük Görseli
                                </h4>
                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        id="chapterThumbEnabled"
                                        checked={settings.chapter_thumbnails_enabled === '1'}
                                        onChange={(e) => setSettings({...settings, chapter_thumbnails_enabled: e.target.checked ? '1' : '0'})}
                                        style={{ width: 18, height: 18, accentColor: '#10b981' }}
                                    />
                                    <label htmlFor="chapterThumbEnabled" style={{ marginBottom: 0, fontWeight: 500, cursor: 'pointer' }}>Seri detay sayfasında bölüm kartlarında küçük görsel göster</label>
                                </div>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 8, display: 'block' }}>
                                    Etkinleştirildiğinde seri detay sayfasındaki bölüm kartlarında küçük görsel (thumbnail) gösterilir. Bölüm eklerken manuel URL girebilir veya otomatik oluşturabilirsiniz.
                                </small>
                            </div>

                            {/* ── Giriş / Kayıt Sayfası Yazıları ── */}
                            <div style={{ padding: '16px', background: 'rgba(99,102,241,0.04)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-light)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    Giriş / Kayıt Sayfası Alt Başlıkları
                                </h4>
                                <div className="form-group">
                                    <label>Giriş Sayfası Alt Başlığı</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.auth_subtitle_login}
                                        onChange={(e) => setSettings({...settings, auth_subtitle_login: e.target.value})}
                                        placeholder="Okumaya devam etmek için giriş yapın"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                                        Giriş sayfasında başlığın altında gösterilen kısa metin.
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Kayıt Sayfası Alt Başlığı</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.auth_subtitle_register}
                                        onChange={(e) => setSettings({...settings, auth_subtitle_register: e.target.value})}
                                        placeholder="dilediğiniz dilde manga okuyun"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                                        Kayıt sayfasında başlığın altında gösterilen kısa metin. Site adıyla birleştirilir.
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Puan Adı</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.points_name}
                                        onChange={(e) => setSettings({...settings, points_name: e.target.value})}
                                        placeholder="Asteria Scans Puanı"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                                        Sitede kullanılan puan biriminin tam adı (örn. Asteria Scans Puanı, Coin, Altın).
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Puan Kısaltması</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.points_short}
                                        onChange={(e) => setSettings({...settings, points_short: e.target.value})}
                                        placeholder="YP"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                                        Puan biriminin kısa gösterimi (örn. YP, CN, ALT).
                                    </small>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ═══════════════ HATA BİLDİRİMLERİ ═══════════════ */}
                {tab === 'bug-reports' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                <ShieldIcon />
                                Hata Bildirimleri ({bugReports.length})
                            </h2>
                            <button className="btn btn-sm" style={{ background: 'var(--bg-tertiary)' }} onClick={() => {
                                setReportsLoading(true);
                                authFetch('/api/admin/reports')
                                    .then(r => r.json())
                                    .then(d => { if (d.success) setBugReports(d.reports || []); })
                                    .catch(() => {})
                                    .finally(() => setReportsLoading(false));
                            }}>
                                {reportsLoading ? 'Yükleniyor...' : '🔄 Yenile'}
                            </button>
                        </div>

                        {bugReports.length === 0 && !reportsLoading ? (
                            <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
                                <ShieldIcon />
                                <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Henüz herhangi bir hata bildirimi alınmadı.</p>
                            </div>
                        ) : (
                            <div className="admin-card" style={{ overflow: 'auto' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Tür</th>
                                            <th>Başlık</th>
                                            <th>Açıklama</th>
                                            <th>Gönderen</th>
                                            <th>Tarih</th>
                                            <th>Durum</th>
                                            <th>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bugReports.slice((reportsPage - 1) * ADMIN_PAGE_SIZE, reportsPage * ADMIN_PAGE_SIZE).map(rep => (
                                            <tr key={rep.id}>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        background: rep.type === 'comment_report' ? 'rgba(236,72,153,0.15)' : 'rgba(99,102,241,0.15)',
                                                        color: rep.type === 'comment_report' ? '#f472b6' : '#818cf8',
                                                        fontWeight: 700
                                                    }}>
                                                        {rep.type === 'comment_report' ? 'Yorum' : 'Hata'}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rep.title}</td>
                                                <td style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: '0.8rem', padding: '10px 8px' }}>
                                                    {rep.description}
                                                </td>
                                                <td style={{ fontSize: '0.8rem' }}>
                                                    {rep.username ? (
                                                        <div>
                                                            <strong>{rep.username}</strong>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{rep.email}</div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>Ziyaretçi (Anonim)</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {new Date(rep.created_at).toLocaleString('tr-TR')}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        padding: '2px 8px',
                                                        borderRadius: 50,
                                                        background: rep.status === 'resolved' ? 'rgba(34,197,94,0.15)' : rep.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                        color: rep.status === 'resolved' ? '#22c55e' : rep.status === 'rejected' ? '#ef4444' : '#f59e0b',
                                                        fontWeight: 700
                                                    }}>
                                                        {rep.status === 'resolved' ? 'Çözüldü' : rep.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {rep.status !== 'resolved' && (
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => updateReportStatus(rep.id, 'resolved')}
                                                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                            >
                                                                Çözüldü
                                                            </button>
                                                        )}
                                                        {rep.status !== 'rejected' && (
                                                            <button
                                                                className="btn btn-sm"
                                                                onClick={() => updateReportStatus(rep.id, 'rejected')}
                                                                style={{ padding: '4px 8px', fontSize: '0.72rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                                                            >
                                                                Reddet
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => deleteReport(rep.id)}
                                                            style={{ padding: '6px 8px' }}
                                                            title="Raporu Sil"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <AdminPager page={reportsPage} total={bugReports.length} pageSize={ADMIN_PAGE_SIZE} onPageChange={p => setReportsPage(p)} />
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════ ÖZELLEŞTIRME ═══════════════ */}
                {tab === 'customize' && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PaletteIcon /> Tema &amp; Site Özelleştirme
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
                            Sitenizin görünümünü, adını, logosunu, renklerini ve sosyal medya bağlantılarını buradan özelleştirin.
                        </p>

                        <form onSubmit={saveCustomize}>

                            {/* ── Site Kimliği ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                    Site Kimliği
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Site Adı</label>
                                        <input type="text" className="form-input" placeholder="örn. MangaHub" value={customize.site_name} onChange={e => setCustomize({ ...customize, site_name: e.target.value })} />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Başlık çubuğu ve meta etiketlerinde görünür.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Site Açıklaması (SEO)</label>
                                        <input type="text" className="form-input" placeholder="örn. Türkçe Manga Okuma Sitesi" value={customize.site_description} onChange={e => setCustomize({ ...customize, site_description: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Logo URL</label>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input type="text" className="form-input" style={{ flex: 1 }} placeholder="/uploads/logo.png veya https://..." value={customize.logo_url} onChange={e => setCustomize({ ...customize, logo_url: e.target.value })} />
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: assetUploading === 'logo' ? 'not-allowed' : 'pointer', background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', opacity: assetUploading === 'logo' ? 0.65 : 1, flexShrink: 0 }}>
                                                <UploadIcon /> {assetUploading === 'logo' ? 'Yükleniyor...' : 'Yükle'}
                                                <input ref={logoUploadRef} type="file" accept="image/*,.svg" style={{ display: 'none' }} disabled={!!assetUploading} onChange={e => handleSiteAssetUpload(e, 'logo', 'logo_url')} />
                                            </label>
                                        </div>
                                        {customize.logo_url && (
                                            <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <img src={customize.logo_url} alt="Logo önizleme" style={{ maxHeight: 40, maxWidth: 160, objectFit: 'contain', borderRadius: 4 }} onError={e => e.target.style.display='none'} />
                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Önizleme</span>
                                            </div>
                                        )}
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Navbar'da gösterilecek logo. Boşsa site adı gösterilir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Favicon URL</label>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input type="text" className="form-input" style={{ flex: 1 }} placeholder="/favicon.ico veya https://..." value={customize.favicon_url} onChange={e => setCustomize({ ...customize, favicon_url: e.target.value })} />
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: assetUploading === 'favicon' ? 'not-allowed' : 'pointer', background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', opacity: assetUploading === 'favicon' ? 0.65 : 1, flexShrink: 0 }}>
                                                <UploadIcon /> {assetUploading === 'favicon' ? 'Yükleniyor...' : 'Yükle'}
                                                <input ref={faviconUploadRef} type="file" accept="image/*,.ico,.svg" style={{ display: 'none' }} disabled={!!assetUploading} onChange={e => handleSiteAssetUpload(e, 'favicon', 'favicon_url')} />
                                            </label>
                                        </div>
                                        {customize.favicon_url && (
                                            <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <img src={customize.favicon_url} alt="Favicon önizleme" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} onError={e => e.target.style.display='none'} />
                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Önizleme</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomize({ ...customize, favicon_url: '' })}
                                                    style={{
                                                        marginLeft: 8,
                                                        padding: '4px 8px',
                                                        background: 'rgba(239,68,68,0.15)',
                                                        border: '1px solid rgba(239,68,68,0.4)',
                                                        borderRadius: 4,
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 600,
                                                    }}
                                                    title="Favicon'u kaldır"
                                                >
                                                    Kaldır
                                                </button>
                                            </div>
                                        )}
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>ICO, PNG, SVG formatları desteklenir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>İletişim E-postası</label>
                                        <input type="email" className="form-input" placeholder="info@siteniz.com" value={customize.contact_email} onChange={e => setCustomize({ ...customize, contact_email: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>OG / Sosyal Medya Görseli URL</label>
                                        <input type="text" className="form-input" placeholder="https://..." value={customize.og_image_url} onChange={e => setCustomize({ ...customize, og_image_url: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                        <label>Footer Alt Metin / Telif Hakkı Notu</label>
                                        <input type="text" className="form-input" placeholder="© 2025 MangaHub — Tüm hakları saklıdır." value={customize.footer_text} onChange={e => setCustomize({ ...customize, footer_text: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Görünüm ve Tasarım ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PaletteIcon /> Görünüm ve Tasarım
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Ana Sayfa Yeni Bölüm Kart Tasarımı</label>
                                        <select className="form-input" value={customize.latest_updates_design || 'style6'} onChange={e => setCustomize({ ...customize, latest_updates_design: e.target.value })}>
                                            <option value="style6">Glassmorphism (Cam Efekti)</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Ana sayfadaki Son Güncellemeler bölümünün görünümünü değiştirir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Ana Sayfa "En Çok Okunanlar" Tasarımı</label>
                                        <select className="form-input" value={customize.most_read_design || 'mr_style2'} onChange={e => setCustomize({ ...customize, most_read_design: e.target.value })}>
                                            <option value="mr_style2">Kademeli Cam (Glass Steps)</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Sağ panodaki (Sidebar) En Çok Okunanlar sıralamasının görünümünü değiştirir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Ana Sayfa "Şu Anda Trend Olanlar" Tasarımı</label>
                                        <select className="form-input" value={customize.trending_design || 'trend_style4'} onChange={e => setCustomize({ ...customize, trending_design: e.target.value })}>
                                            <option value="trend_style4">Cam Küp 3D (Glass 3D)</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Ana sayfadaki üst yatay trend panosunun görünümünü değiştirir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Ana Sayfa "Ana Slider" (Popüler Seriler) Tasarımı</label>
                                        <select className="form-input" value={customize.hero_slider_design || 'hero_style4'} onChange={e => setCustomize({ ...customize, hero_slider_design: e.target.value })}>
                                            <option value="hero_style4">Kademeli Yükseliş (Cascading Steps)</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Ana sayfanın en üstündeki popüler seriler slider'ının görünümünü ve animasyonlarını değiştirir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Seri Detay Sayfası Tasarımı</label>
<select className="form-input" value={customize.series_detail_design || 'detail_style1'} onChange={e => setCustomize({ ...customize, series_detail_design: e.target.value })}>
                                            <option value="detail_style1">Klasik Parallax (Mevcut Görünüm)</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Seri detay sayfasının üst bilgi (Hero) kısmının görünümünü değiştirir.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Yorum Bölümü Tasarımı</label>
                                        <select className="form-input" value={customize.comment_design || 'comment_style1'} onChange={e => setCustomize({ ...customize, comment_design: e.target.value })}>
                                            <option value="comment_style1">Klasik (Asura Style)</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Bölüm ve seri sayfalarındaki yorum alanının görünümünü değiştirir.</small>
                                    </div>
                                </div>
                            </div>

                            {/* ── Seri Detay Tam Sayfa Arka Plan ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    Seri Detay — Tam Sayfa Arka Plan
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Aktif edildiğinde seri kapak görseli tüm sayfanın arka planını kaplar ve sayfayı kaydırırken sabit kalır.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Tam Sayfa Arka Plan</label>
                                        <select className="form-input" value={customize.sd_fullpage_bg || '0'} onChange={e => setCustomize({ ...customize, sd_fullpage_bg: e.target.value })}>
                                            <option value="0">Kapalı</option>
                                            <option value="1">Açık</option>
                                        </select>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Kapak görseli tüm sayfayı kaplar, sabit durur.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Blur Miktarı (px): {customize.sd_fullpage_bg_blur || '28'}</label>
                                        <input type="range" min="0" max="60" value={customize.sd_fullpage_bg_blur || '28'}
                                            onChange={e => setCustomize({ ...customize, sd_fullpage_bg_blur: e.target.value })}
                                            style={{ width: '100%', marginTop: 8 }} />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Arka plan görselinin bulanıklık miktarı.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Karanlık Örtü Oranı: {Math.round((customize.sd_fullpage_bg_overlay || '0.72') * 100)}%</label>
                                        <input type="range" min="0" max="95" value={Math.round((customize.sd_fullpage_bg_overlay || '0.72') * 100)}
                                            onChange={e => setCustomize({ ...customize, sd_fullpage_bg_overlay: (e.target.value / 100).toFixed(2) })}
                                            style={{ width: '100%', marginTop: 8 }} />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginTop: 4 }}>Görselin üstündeki siyah örtü yoğunluğu.</small>
                                    </div>
                                </div>
                            </div>

                            {/* ── Sayfa Arka Plan Ayarları ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    Sayfa Arka Planları
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Ana sayfa, arşiv, istekler, profil, sıralama ve diğer sayfalar için özel arka plan rengi veya görseli belirleyin. Görsel yüklemek için "Görsel Seç &amp; Yükle" butonunu kullanın; yoksa sadece renk uygulanır.
                                </p>
                                {[
                                    { key: 'global', label: 'Tüm Sayfalar (Genel)', hint: 'Diğer sayfa ayarları boş olduğunda bu genel ayar uygulanır.' },
                                    { key: 'home', label: 'Ana Sayfa' },
                                    { key: 'archive', label: 'Arşiv / Seri Listesi (/series)' },
                                    { key: 'requests', label: 'İstekler (/requests)' },
                                    { key: 'profile', label: 'Profil (/profile)' },
                                    { key: 'ranking', label: 'Sıralama (/ranking)' },
                                ].map(({ key, label, hint }) => (
                                    <div key={key} style={{ marginBottom: 16, padding: 14, background: 'rgba(0,0,0,0.15)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-primary)' }}>{label}</div>
                                        {hint && <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem', display: 'block', marginBottom: 10 }}>{hint}</small>}
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, alignItems: 'start' }}>
                                            {/* Renk seçici */}
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                    <input type="color" value={customize[`page_bg_${key}_color`] || '#0a0a0d'}
                                                        onChange={e => setCustomize({ ...customize, [`page_bg_${key}_color`]: e.target.value })}
                                                        style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, padding: 2, cursor: 'pointer', background: 'none' }} />
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Renk</span>
                                                </label>
                                                <input type="text" className="form-input" value={customize[`page_bg_${key}_color`] || ''}
                                                    onChange={e => setCustomize({ ...customize, [`page_bg_${key}_color`]: e.target.value })}
                                                    placeholder="#rrggbb" style={{ fontSize: '0.75rem' }} />
                                            </div>
                                            {/* Görsel yükleme */}
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Arka Plan Görseli</label>
                                                {customize[`page_bg_${key}_image`] ? (
                                                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 6 }}>
                                                        <img
                                                            src={customize[`page_bg_${key}_image`]}
                                                            alt="Arka plan önizleme"
                                                            style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} decoding="async" />
                                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                            <label style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', color: '#fff', fontWeight: 600 }}>
                                                                Değiştir
                                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handlePageBgImageUpload(key, e.target.files[0]); e.target.value = ''; }} />
                                                            </label>
                                                            <button type="button" onClick={() => handlePageBgImageDelete(key)}
                                                                style={{ background: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                                                Sil
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                        border: '2px dashed var(--border-color)', borderRadius: 8, padding: '14px 10px',
                                                        cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600,
                                                        transition: 'border-color 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                        Görsel Seç &amp; Yükle
                                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handlePageBgImageUpload(key, e.target.files[0]); e.target.value = ''; }} />
                                                    </label>
                                                )}
                                                <small style={{ color: 'var(--text-muted)', fontSize: '0.67rem', display: 'block', marginTop: 4 }}>Max 10MB. PNG, JPEG, WebP, GIF.</small>
                                            </div>
                                            {/* Blur slider */}
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Blur: {customize[`page_bg_${key}_blur`] || '0'}px</label>
                                                <input type="range" min="0" max="40" value={customize[`page_bg_${key}_blur`] || '0'}
                                                    onChange={e => setCustomize({ ...customize, [`page_bg_${key}_blur`]: e.target.value })}
                                                    style={{ width: '100%', marginTop: 8 }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── SEO Özelleştirmeleri ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    SEO ve Başlık Özelleştirmeleri
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Ana Sayfa Başlığı (Title)</label>
                                        <input type="text" className="form-input" placeholder="örn. Asteria Scans — Yapay Zeka Çevirili Çevrimiçi Manga Oku" value={customize.seo_title_home} onChange={e => setCustomize({ ...customize, seo_title_home: e.target.value })} />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Sitenin ana sayfasında sekmede görünecek olan başlık.</small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Ana Sayfa Açıklaması (Description)</label>
                                        <textarea className="form-input" placeholder="Siteniz için SEO açıklaması..." value={customize.seo_desc_home} onChange={e => setCustomize({ ...customize, seo_desc_home: e.target.value })} style={{ height: 60 }} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Seri (Bölüm Listesi) Sayfası Başlık Formatı</label>
                                        <input type="text" className="form-input" placeholder="örn. {series_name} Oku - {site_name}" value={customize.seo_title_series} onChange={e => setCustomize({ ...customize, seo_title_series: e.target.value })} />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Kullanabileceğiniz değişkenler: <code>{`{series_name}`}</code>, <code>{`{site_name}`}</code></small>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Okuma (Bölüm) Sayfası Başlık Formatı</label>
                                        <input type="text" className="form-input" placeholder="örn. {series_name} Bölüm {chapter_number} Türkçe Oku - {site_name}" value={customize.seo_title_chapter} onChange={e => setCustomize({ ...customize, seo_title_chapter: e.target.value })} />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Kullanabileceğiniz değişkenler: <code>{`{series_name}`}</code>, <code>{`{chapter_number}`}</code>, <code>{`{chapter_title}`}</code>, <code>{`{site_name}`}</code></small>
                                    </div>
                                </div>
                            </div>

                            {/* ── Renk Paleti ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PaletteIcon /> Renk Paleti
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Renk seçici veya HEX değeri girin. Boş bırakılan alanlar varsayılan tema renklerini kullanır.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                                    {[
                                        { key: 'accent_color', label: 'Ana Renk (Accent)', hint: 'Butonlar, linkler, vurgular. Diğer renkler buradan türetilir.' },
                                        { key: 'button_color', label: 'Buton Rengi', hint: 'Birincil buton arka planı' },
                                        { key: 'button_hover_color', label: 'Buton Hover Rengi', hint: 'Üzerine gelince buton rengi' },
                                        { key: 'button_text_color', label: 'Buton Metin Rengi', hint: '' },
                                        { key: 'link_color', label: 'Link Rengi', hint: '' },
                                        { key: 'link_hover_color', label: 'Link Hover Rengi', hint: '' },
                                        { key: 'navbar_bg_color', label: 'Navbar Arka Planı', hint: '' },
                                        { key: 'reader_bg_color', label: 'Okuyucu Arka Planı', hint: 'Manga okuma sayfası arka planı' },
                                        { key: 'announcement_bg_color', label: 'Duyuru Şeridi Rengi', hint: '' },
                                    ].map(({ key, label, hint }) => (
                                        <div key={key} className="form-group" style={{ margin: 0 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <input
                                                    type="color"
                                                    value={customize[key] || '#000000'}
                                                    onChange={e => setCustomize({ ...customize, [key]: e.target.value })}
                                                    style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, padding: 2, cursor: 'pointer', background: 'none' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={customize[key] || ''}
                                                onChange={e => setCustomize({ ...customize, [key]: e.target.value })}
                                                placeholder="#rrggbb (boş = varsayılan)"
                                                style={{ fontSize: '0.78rem' }}
                                            />
                                            {hint && <small style={{ color: 'var(--text-muted)', fontSize: '0.67rem' }}>{hint}</small>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Son Güncellemeler Renk Ayarları ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PaletteIcon /> Son Güncellemeler Renk Ayarları
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Ana sayfadaki Son Güncellemeler kartlarının renklerini özelleştirin. Boş bırakılan alanlar varsayılan tema renklerini kullanır.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                                    {[
                                        { key: 'latest_updates_title_color', label: 'Başlık Metin Rengi', hint: 'Kart üzerindeki seri başlığı rengi' },
                                        { key: 'latest_updates_card_bg', label: 'Kart Arka Plan Rengi', hint: 'Kartın arka plan rengi' },
                                        { key: 'latest_updates_card_border', label: 'Kart Kenarlık Rengi', hint: 'Kartın kenarlık rengi' },
                                        { key: 'latest_updates_badge_bg', label: 'Bölüm Rozet Arka Planı', hint: '"YENİ" rozetinin arka plan rengi' },
                                        { key: 'latest_updates_badge_text', label: 'Bölüm Rozet Metin Rengi', hint: '"YENİ" rozetinin metin rengi' },
                                        { key: 'latest_updates_hover_bg', label: 'Kart Hover Arka Planı', hint: 'Üzerine gelinince bölüm satırı rengi' },
                                    ].map(({ key, label, hint }) => (
                                        <div key={key} className="form-group" style={{ margin: 0 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <input
                                                    type="color"
                                                    value={customize[key] && customize[key].startsWith('#') ? customize[key] : '#000000'}
                                                    onChange={e => setCustomize({ ...customize, [key]: e.target.value })}
                                                    style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 6, padding: 2, cursor: 'pointer', background: 'none' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={customize[key] || ''}
                                                onChange={e => setCustomize({ ...customize, [key]: e.target.value })}
                                                placeholder="#rrggbb (boş = varsayılan)"
                                                style={{ fontSize: '0.78rem' }}
                                            />
                                            {hint && <small style={{ color: 'var(--text-muted)', fontSize: '0.67rem' }}>{hint}</small>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Sosyal Medya ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <GlobeIcon /> Sosyal Medya Bağlantıları
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>Footer'da sosyal medya ikonları olarak görünür. Boş bırakılan platformlar gösterilmez.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    {[
                                        { key: 'discord_url', label: 'Discord', placeholder: 'https://discord.gg/...' },
                                        { key: 'reddit_url', label: 'Reddit', placeholder: 'https://reddit.com/r/...' },
                                        { key: 'twitter_url', label: 'Twitter / X', placeholder: 'https://twitter.com/...' },
                                        { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' },
                                        { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
                                        { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/c/...' },
                                        { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                                    ].map(({ key, label, placeholder }) => (
                                        <div key={key} className="form-group" style={{ margin: 0 }}>
                                            <label>{label}</label>
                                            <input type="url" className="form-input" placeholder={placeholder} value={customize[key] || ''} onChange={e => setCustomize({ ...customize, [key]: e.target.value })} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Analitik ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <DashIcon /> Analitik
                                </h4>
                                <div className="form-group" style={{ margin: '0 0 14px' }}>
                                    <label>Google Analytics 4 Ölçüm Kimliği</label>
                                    <input type="text" className="form-input" placeholder="G-XXXXXXXXXX" value={customize.google_analytics_id || ''} onChange={e => setCustomize({ ...customize, google_analytics_id: e.target.value })} />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Google Analytics 4 Measurement ID. Boş bırakırsanız devre dışı kalır. GTM kullanıyorsanız GA4'ü GTM üzerinden yapılandırın.</small>
                                </div>
                                <div className="form-group" style={{ margin: '0 0 14px' }}>
                                    <label>Google Tag Manager Kapsayıcı Kimliği</label>
                                    <input type="text" className="form-input" placeholder="GTM-XXXXXXX" value={customize.google_tag_manager_id || ''} onChange={e => setCustomize({ ...customize, google_tag_manager_id: e.target.value })} />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>GTM Container ID (GTM-XXXXXXX). Hem &lt;head&gt; hem &lt;body&gt; snippet'i otomatik eklenir. GA4 + GTM birlikte kullanılırsa GTM üzerinden tetiklenir.</small>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>Google Search Console Doğrulama Kodu</label>
                                    <input type="text" className="form-input" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={customize.google_site_verification || ''} onChange={e => setCustomize({ ...customize, google_site_verification: e.target.value })} />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Google Search Console &gt; Mülk ekle &gt; HTML etiketi yönteminden alınan doğrulama kodunu girin (sadece &lt;meta name="google-site-verification" content="..." /&gt; içindeki değer). Sitenizin Google'da daha hızlı indekslenmesini sağlar.</small>
                                </div>
                            </div>

                            {/* ── Google Indexing API ── */}
                            <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <GlobeIcon /> Google Indexing API (Otomatik İndeksleme)
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                    Yeni bölüm eklendiğinde Google'ın sayfayı otomatik olarak indekslemesi için Google Search Console Service Account anahtarı gereklidir. <br />
                                    <strong style={{ color: 'var(--text-secondary)' }}>Kurulum:</strong> Google Cloud Console → Service Accounts → Anahtar Oluştur (JSON) → Aşağıya yükleyin. Search Console'da bu hesabı mülkünüze "Sahip" olarak ekleyin.
                                </p>
                                {gIndexingKey.exists ? (
                                    <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#34d399' }}>Anahtar Yüklü</span>
                                            </div>
                                            {gIndexingKey.clientEmail && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{gIndexingKey.clientEmail}</div>}
                                            {gIndexingKey.projectId && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proje: {gIndexingKey.projectId}</div>}
                                        </div>
                                        <button type="button" style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }} onClick={async () => { if (!window.confirm('Anahtarı silmek istediğinize emin misiniz?')) return; const fd = new FormData(); fd.append('action', 'delete-key'); const r = await authFetch('/api/admin/google-indexing', { method: 'POST', body: fd }); const d = await r.json(); if (d.success) { setGIndexingKey({ exists: false, clientEmail: null, projectId: null }); show('Anahtar silindi'); } else show(d.error || 'Silinemedi', 'error'); }}>Anahtarı Sil</button>
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                                        <span style={{ fontSize: '0.82rem', color: '#fbbf24' }}>⚠ Henüz anahtar yüklenmedi. Otomatik indeksleme devre dışı.</span>
                                    </div>
                                )}
                                <div className="form-group" style={{ margin: '0 0 12px' }}>
                                    <label>Service Account Anahtarı Yükle (.json)</label>
                                    <input type="file" accept=".json,application/json" className="form-input" style={{ cursor: 'pointer' }} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setGIndexingLoading(true); try { const fd = new FormData(); fd.append('action', 'upload-key'); fd.append('file', file); const r = await authFetch('/api/admin/google-indexing', { method: 'POST', body: fd }); const d = await r.json(); if (d.success) { setGIndexingKey({ exists: true, clientEmail: d.clientEmail, projectId: d.projectId }); show(d.message || 'Anahtar yüklendi'); } else show(d.error || 'Yükleme başarısız', 'error'); } catch { show('Yükleme hatası', 'error'); } finally { setGIndexingLoading(false); e.target.value = ''; } }} disabled={gIndexingLoading} />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>Google Cloud Console'dan indirilen service account JSON anahtarını yükleyin.</small>
                                </div>
                                {gIndexingKey.exists && (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                        <div className="form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                                            <label>Test URL (İndeksleme Bildirimi Gönder)</label>
                                            <input type="url" className="form-input" placeholder={`${typeof window !== 'undefined' ? window.location.origin : 'https://siteniz.com'}/`} value={gIndexingTestUrl} onChange={e => setGIndexingTestUrl(e.target.value)} />
                                        </div>
                                        <button type="button" style={{ padding: '10px 18px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: 2 }} onClick={async () => { setGIndexingLoading(true); setGIndexingTestResult(null); try { const fd = new FormData(); fd.append('action', 'test-indexing'); if (gIndexingTestUrl) fd.append('url', gIndexingTestUrl); const r = await authFetch('/api/admin/google-indexing', { method: 'POST', body: fd }); const d = await r.json(); setGIndexingTestResult(d); } catch (err) { setGIndexingTestResult({ error: err.message }); } finally { setGIndexingLoading(false); } }} disabled={gIndexingLoading}>
                                            {gIndexingLoading ? 'Test ediliyor...' : 'Test Et'}
                                        </button>
                                    </div>
                                )}
                                {gIndexingTestResult && (
                                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: gIndexingTestResult.success ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${gIndexingTestResult.success ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: '0.82rem', color: gIndexingTestResult.success ? '#34d399' : '#ef4444' }}>
                                        {gIndexingTestResult.success ? `✓ ${gIndexingTestResult.message}` : `✗ ${gIndexingTestResult.error}`}
                                    </div>
                                )}
                            </div>

                            {/* ── Gelişmiş: Özel CSS & Script ── */}
                            <div style={{ padding: 20, background: 'rgba(99,102,241,0.04)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-light)' }}>
                                    <KeyIcon /> Gelişmiş Ayarlar
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--warning)', marginBottom: 14 }}>
                                    ⚠️ Bu alan yanlış kod girişi durumunda sitenin bozulmasına neden olabilir. Dikkatli kullanın.
                                </p>
                                <div className="form-group" style={{ margin: 0, marginBottom: 14 }}>
                                    <label>Özel CSS (Tüm sayfalara uygulanır)</label>
                                    <textarea
                                        className="form-input"
                                        rows={7}
                                        placeholder=".my-class { color: red; }&#10;/* Buraya geçerli CSS yazın */"
                                        value={customize.custom_css}
                                        onChange={e => setCustomize({ ...customize, custom_css: e.target.value })}
                                        style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical', lineHeight: 1.6 }}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0, marginBottom: 14 }}>
                                    <label>&lt;head&gt; İçine Özel Script / Meta Etiketleri</label>
                                    <textarea
                                        className="form-input"
                                        rows={4}
                                        placeholder='<meta name="..." content="...">&#10;<script>...</script>'
                                        value={customize.custom_head_scripts || ''}
                                        onChange={e => setCustomize({ ...customize, custom_head_scripts: e.target.value })}
                                        style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical', lineHeight: 1.6 }}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>&lt;body&gt; Sonuna Özel JavaScript Kodu</label>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, marginTop: 2 }}>
                                        Analytics, chat widget veya özel JavaScript kodları buraya ekleyin. Yalnızca &lt;script&gt; tagları veya saf JS.
                                    </p>
                                    <textarea
                                        className="form-input"
                                        rows={5}
                                        placeholder={'<script>\n  console.log("Merhaba!");\n</script>'}
                                        value={customize.custom_body_js || ''}
                                        onChange={e => setCustomize({ ...customize, custom_body_js: e.target.value })}
                                        style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical', lineHeight: 1.6 }}
                                    />
                                </div>
                            </div>

                            {/* ── Watermark Ayarları ── */}
                            <div style={{ padding: 20, background: 'rgba(99,102,241,0.04)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.25)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg>
                                    Otomatik Watermark
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Bölüm yüklemelerinde görsellere otomatik olarak watermark eklenir. PNG veya WebP (şeffaflık için) önerilir.
                                </p>

                                {/* Etkin/Devre dışı toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={watermark.enabled === '1'}
                                            onChange={e => setWatermark(prev => ({ ...prev, enabled: e.target.checked ? '1' : '0' }))}
                                            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Watermark aktif</span>
                                    </label>
                                    {watermark.enabled === '1' && (
                                        <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>● Açık</span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                                    {/* Watermark Görseli */}
                                    <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                        <label>Watermark Görseli</label>
                                        {watermark.path && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <img src={watermark.path} alt="Watermark" style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', borderRadius: 4 }} decoding="async" />
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{watermark.path}</span>
                                                <button type="button" onClick={handleWatermarkDelete} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>Sil</button>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input
                                                type="file"
                                                accept="image/png,image/webp,image/jpeg"
                                                onChange={e => setWatermarkFile(e.target.files[0] || null)}
                                                className="form-input"
                                                style={{ flex: 1, padding: 8 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleWatermarkUpload}
                                                disabled={!watermarkFile || watermarkUploading}
                                                className="btn btn-primary"
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                {watermarkUploading ? 'Yükleniyor...' : 'Yükle'}
                                            </button>
                                        </div>
                                        {watermarkMsg && <small style={{ color: '#4ade80' }}>{watermarkMsg}</small>}
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>PNG/WebP şeffaflık için önerilir. En iyi sonuç için beyaz veya renkli logo kullanın.</small>
                                    </div>

                                    {/* Konum */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Konum</label>
                                        <select
                                            className="form-input"
                                            value={watermark.position}
                                            onChange={e => setWatermark(prev => ({ ...prev, position: e.target.value }))}
                                        >
                                            <option value="top-left">Üst Sol</option>
                                            <option value="top-center">Üst Orta</option>
                                            <option value="top-right">Üst Sağ</option>
                                            <option value="center">Orta</option>
                                            <option value="bottom-left">Alt Sol</option>
                                            <option value="bottom-center">Alt Orta</option>
                                            <option value="bottom-right">Alt Sağ</option>
                                        </select>
                                    </div>

                                    {/* Boyut */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Boyut (görsel genişliğinin %si): <strong>{watermark.scale}%</strong></label>
                                        <input
                                            type="range" min="5" max="50" step="1"
                                            value={watermark.scale}
                                            onChange={e => setWatermark(prev => ({ ...prev, scale: e.target.value }))}
                                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                                        />
                                    </div>

                                    {/* Saydamlık */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Saydamlık: <strong>{watermark.opacity}%</strong></label>
                                        <input
                                            type="range" min="10" max="100" step="5"
                                            value={watermark.opacity}
                                            onChange={e => setWatermark(prev => ({ ...prev, opacity: e.target.value }))}
                                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                                        />
                                    </div>

                                    {/* Konumun görsel gösterimi */}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Konum Önizleme</label>
                                        <div style={{ position: 'relative', width: '100%', maxWidth: 280, height: 140, background: '#1a1a2e', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                            {['top-left','top-center','top-right','center','bottom-left','bottom-center','bottom-right'].map(pos => (
                                                <div
                                                    key={pos}
                                                    onClick={() => setWatermark(prev => ({ ...prev, position: pos }))}
                                                    style={{
                                                        position: 'absolute',
                                                        width: 28, height: 14,
                                                        borderRadius: 3,
                                                        background: watermark.position === pos ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s',
                                                        ...(pos === 'top-left' ? { top: 8, left: 8 } :
                                                            pos === 'top-center' ? { top: 8, left: '50%', transform: 'translateX(-50%)' } :
                                                            pos === 'top-right' ? { top: 8, right: 8 } :
                                                            pos === 'center' ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } :
                                                            pos === 'bottom-left' ? { bottom: 8, left: 8 } :
                                                            pos === 'bottom-center' ? { bottom: 8, left: '50%', transform: 'translateX(-50%)' } :
                                                            { bottom: 8, right: 8 })
                                                    }}
                                                    title={pos}
                                                />
                                            ))}
                                        </div>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Kutucuklara tıklayarak konum seçin</small>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={saveWatermarkSettings}
                                    className="btn btn-primary"
                                    style={{ minWidth: 180 }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                    Watermark Ayarlarını Kaydet
                                </button>
                            </div>

                            {/* ── Bölüm Başı Görseli ── */}
                            <div style={{ padding: 20, background: 'rgba(251,191,36,0.04)', borderRadius: 12, border: '1px solid rgba(251,191,36,0.25)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Bölüm Başı Görseli
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Bölüm yüklemelerinde tüm sayfaların <strong>ilk sayfası</strong> olarak bu görsel eklenir. Sadece yeni yüklemelerde (daha önce sayfa yüklenmemiş bölümler) uygulanır.
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={chapterStartImage.enabled === '1'}
                                            onChange={e => setChapterStartImage(prev => ({ ...prev, enabled: e.target.checked ? '1' : '0' }))}
                                            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Bölüm başı görseli aktif</span>
                                    </label>
                                    {chapterStartImage.enabled === '1' && (
                                        <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>● Açık</span>
                                    )}
                                </div>

                                <div className="form-group" style={{ margin: '0 0 14px' }}>
                                    <label>Bölüm Başı Görseli</label>
                                    {chapterStartImage.path && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                            <img src={chapterStartImage.path} alt="Bölüm Başı" style={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain', borderRadius: 4 }} decoding="async" />
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{chapterStartImage.path}</span>
                                            <button type="button" onClick={handleChapterStartImageDelete} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>Sil</button>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            type="file"
                                            accept="image/png,image/webp,image/jpeg"
                                            onChange={e => setChapterStartImageFile(e.target.files[0] || null)}
                                            className="form-input"
                                            style={{ flex: 1, padding: 8 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleChapterStartImageUpload}
                                            disabled={!chapterStartImageFile || chapterStartImageUploading}
                                            className="btn btn-primary"
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            {chapterStartImageUploading ? 'Yükleniyor...' : 'Yükle'}
                                        </button>
                                    </div>
                                    {chapterStartImageMsg && <small style={{ color: '#4ade80' }}>{chapterStartImageMsg}</small>}
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>PNG/WebP/JPEG. Görsel yüklenen bölümün ilk sayfası olarak eklenir.</small>
                                </div>

                                <button
                                    type="button"
                                    onClick={saveChapterStartImageSettings}
                                    className="btn btn-primary"
                                    style={{ minWidth: 210 }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                    Bölüm Başı Ayarlarını Kaydet
                                </button>
                            </div>

                            {/* ── Bölüm Sonu Görseli ── */}
                            <div style={{ padding: 20, background: 'rgba(45,212,191,0.04)', borderRadius: 12, border: '1px solid rgba(45,212,191,0.25)', marginBottom: 20 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                                    Bölüm Sonu Görseli
                                </h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Bölüm yüklemelerinde yüklenen tüm sayfaların sonuna otomatik olarak bu görsel eklenir. Örneğin sitenizin tanıtım banneri, Discord linki veya bir sonraki bölüm duyurusu olabilir.
                                </p>

                                {/* Etkin/Devre dışı toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={chapterEndImage.enabled === '1'}
                                            onChange={e => setChapterEndImage(prev => ({ ...prev, enabled: e.target.checked ? '1' : '0' }))}
                                            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Bölüm sonu görseli aktif</span>
                                    </label>
                                    {chapterEndImage.enabled === '1' && (
                                        <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>● Açık</span>
                                    )}
                                </div>

                                {/* Görsel yükleme */}
                                <div className="form-group" style={{ margin: '0 0 14px' }}>
                                    <label>Bölüm Sonu Görseli</label>
                                    {chapterEndImage.path && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                            <img src={chapterEndImage.path} alt="Bölüm Sonu" style={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain', borderRadius: 4 }} decoding="async" />
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{chapterEndImage.path}</span>
                                            <button type="button" onClick={handleChapterEndImageDelete} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>Sil</button>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            type="file"
                                            accept="image/png,image/webp,image/jpeg"
                                            onChange={e => setChapterEndImageFile(e.target.files[0] || null)}
                                            className="form-input"
                                            style={{ flex: 1, padding: 8 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleChapterEndImageUpload}
                                            disabled={!chapterEndImageFile || chapterEndImageUploading}
                                            className="btn btn-primary"
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            {chapterEndImageUploading ? 'Yükleniyor...' : 'Yükle'}
                                        </button>
                                    </div>
                                    {chapterEndImageMsg && <small style={{ color: '#4ade80' }}>{chapterEndImageMsg}</small>}
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>PNG/WebP/JPEG. Görsel yüklenen bölümün son sayfası olarak eklenir.</small>
                                </div>

                                <button
                                    type="button"
                                    onClick={saveChapterEndImageSettings}
                                    className="btn btn-primary"
                                    style={{ minWidth: 200 }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                    Bölüm Sonu Ayarlarını Kaydet
                                </button>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={customizeSubmitting} style={{ minWidth: 180 }}>
                                {customizeSubmitting ? 'Kaydediliyor...' : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Özelleştirmeyi Kaydet</>}
                            </button>
                        </form>
                    </div>
                )}

                {/* ═══════════════ ADS TAB ═══════════════ */}
                {tab === 'ads' && (
                    <div className="admin-card">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AdsIcon /> Reklam Yönetimi
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                            Farklı sayfa konumları için reklam kodları (AdSense, HTML/JS banner, vb.) ekleyin. Her konumu bağımsız olarak etkinleştirebilirsiniz.
                        </p>

                        {[
                            {
                                key: 'popup',
                                label: 'Pop-up Reklam Kodu',
                                desc: 'Ziyaretçi sayfayı açtığında overlay olarak gösterilen reklam. Oturum başına bir kez gösterilir.',
                                color: 'rgba(239,68,68,0.04)',
                                border: 'rgba(239,68,68,0.25)',
                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>,
                            },
                            {
                                key: 'header',
                                label: 'Üst Banner Reklam',
                                desc: 'Sayfanın en üstünde, navbar\'ın hemen altında gösterilir.',
                                color: 'rgba(99,102,241,0.04)',
                                border: 'rgba(99,102,241,0.25)',
                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="11" rx="1"/></svg>,
                            },
                            {
                                key: 'sidebar',
                                label: 'Yan Panel Reklam',
                                desc: 'Sayfa içeriğinin yan panelinde (sidebar) gösterilen reklam.',
                                color: 'rgba(16,185,129,0.04)',
                                border: 'rgba(16,185,129,0.25)',
                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="10" y="3" width="12" height="18" rx="1"/></svg>,
                            },
                            {
                                key: 'between_chapters',
                                label: 'Bölümler Arası Reklam',
                                desc: 'Bölüm okuma sayfasında bölüm içeriğinin ortasında veya bölümler arasında gösterilir.',
                                color: 'rgba(245,158,11,0.04)',
                                border: 'rgba(245,158,11,0.25)',
                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><line x1="2" y1="12" x2="22" y2="12"/><rect x="2" y="16" width="20" height="5" rx="1"/></svg>,
                            },
                            {
                                key: 'footer',
                                label: 'Alt Banner Reklam',
                                desc: 'Sayfanın footer bölümünün üstünde gösterilen reklam.',
                                color: 'rgba(139,92,246,0.04)',
                                border: 'rgba(139,92,246,0.25)',
                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="11" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1"/></svg>,
                            },
                        ].map(({ key, label, desc, color, border, icon }) => {
                            const enabledKey = `ad_${key}_enabled`;
                            const codeKey = `ad_${key}_code`;
                            const isEnabled = adSettings[enabledKey] === '1';
                            return (
                                <div key={key} style={{ padding: 20, background: color, borderRadius: 12, border: `1px solid ${border}`, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                            {icon} {label}
                                        </h4>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                            <div
                                                onClick={() => setAdSettings(prev => ({ ...prev, [enabledKey]: isEnabled ? '0' : '1' }))}
                                                style={{
                                                    width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
                                                    background: isEnabled ? 'var(--accent)' : 'var(--border-color)',
                                                    transition: 'background 0.2s', cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute', top: 3, left: isEnabled ? 23 : 3,
                                                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isEnabled ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                                                {isEnabled ? 'Aktif' : 'Devre Dışı'}
                                            </span>
                                        </label>
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>{desc}</p>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.78rem' }}>Reklam Kodu (HTML / JavaScript / AdSense)</label>
                                        <textarea
                                            className="form-input"
                                            rows={4}
                                            placeholder={'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js">\n</script>\n<!-- Ad slot -->\n<ins class="adsbygoogle" ...></ins>'}
                                            value={adSettings[codeKey]}
                                            onChange={e => setAdSettings(prev => ({ ...prev, [codeKey]: e.target.value }))}
                                            style={{ fontFamily: 'monospace', fontSize: '0.76rem', resize: 'vertical', lineHeight: 1.5 }}
                                        />
                                    </div>
                                    {adSettings[codeKey] && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            style={{ marginTop: 8, fontSize: '0.75rem' }}
                                            onClick={() => setAdPreview(adPreview === key ? null : key)}
                                        >
                                            <EyeIcon /> {adPreview === key ? 'Önizlemeyi Kapat' : 'Önizle'}
                                        </button>
                                    )}
                                    {adPreview === key && adSettings[codeKey] && (
                                        <div style={{ marginTop: 10, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px dashed var(--border-color)' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Canlı Önizleme (sandbox)
                                            </div>
                                            <iframe
                                                srcDoc={adSettings[codeKey]}
                                                sandbox="allow-scripts"
                                                title={`${key} reklam önizleme`}
                                                style={{ width: '100%', minHeight: 120, border: 'none', borderRadius: 6, background: '#fff', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={adSettingsSubmitting}
                            onClick={saveAdsSettings}
                            style={{ minWidth: 180 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            {adSettingsSubmitting ? 'Kaydediliyor...' : 'Reklam Ayarlarını Kaydet'}
                        </button>
                    </div>
                )}

                {/* Popup Alert (Uyari Kutusu) */}
                {tab === 'ads' && (
                    <div className="admin-card" style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Uyar Popup'u (Ozelleştirilebilir)
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                            Adblock uyarisi, ekip alimi, duyuru vb. icin ozelleştirilebilir bir popup kutusu. Tum metinler ve butonlar ayarlanabilir.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            {/* Aktif / Tip */}
                            <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Popup Aktif</label>
                                    <div onClick={() => setAlertPopup(p => ({ ...p, alert_popup_enabled: p.alert_popup_enabled === '1' ? '0' : '1' }))}
                                        style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                                            background: alertPopup.alert_popup_enabled === '1' ? 'var(--accent)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <div style={{ position: 'absolute', top: 3, left: alertPopup.alert_popup_enabled === '1' ? 23 : 3,
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label style={{ fontSize: '0.78rem' }}>Popup Tipi</label>
                                    <select className="form-input" value={alertPopup.alert_popup_type} onChange={e => setAlertPopup(p => ({ ...p, alert_popup_type: e.target.value }))}>
                                        <option value="custom">Ozel (Custom)</option>
                                        <option value="adblock">Adblock Tarz</option>
                                    </select>
                                </div>
                            </div>

                            {/* Session / Goster */}
                            <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Oturum Basina Bir Kez Goster</label>
                                    <div onClick={() => setAlertPopup(p => ({ ...p, alert_popup_show_once: p.alert_popup_show_once === '1' ? '0' : '1' }))}
                                        style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                                            background: alertPopup.alert_popup_show_once === '1' ? 'var(--accent)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <div style={{ position: 'absolute', top: 3, left: alertPopup.alert_popup_show_once === '1' ? 23 : 3,
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: '0.78rem' }}>Gosterim Araligi</label>
                                    <select className="form-input" value={alertPopup.alert_popup_interval} onChange={e => setAlertPopup(p => ({ ...p, alert_popup_interval: e.target.value }))}>
                                        <option value="always">Her Zaman</option>
                                        <option value="daily">Gunde Bir</option>
                                        <option value="every_3_hours">3 Saatte Bir</option>
                                        <option value="hourly">Saatte Bir</option>
                                        <option value="session">Oturum Basina Bir</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label style={{ fontSize: '0.78rem' }}>Ikon / Emoji (opsiyonel)</label>
                                    <input className="form-input" placeholder="ornek: 🛡️ 🎉 📢" value={alertPopup.alert_popup_icon}
                                        onChange={e => setAlertPopup(p => ({ ...p, alert_popup_icon: e.target.value }))} style={{ fontSize: '1.2rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Baslik & Mesaj */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label>Popup Basligi</label>
                                <input className="form-input" placeholder="ornek: Reklam Engelleyici Tespit Edildi" value={alertPopup.alert_popup_title}
                                    onChange={e => setAlertPopup(p => ({ ...p, alert_popup_title: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label>Arka Plan Rengi (opsiyonel)</label>
                                <input className="form-input" placeholder="#1a1a2e veya boş bırakın" value={alertPopup.alert_popup_bg_color}
                                    onChange={e => setAlertPopup(p => ({ ...p, alert_popup_bg_color: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Popup Mesaji</label>
                            <textarea className="form-input" rows={3} placeholder="Kullanicilara gostermek istediginiz mesaji girin..."
                                value={alertPopup.alert_popup_message}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_message: e.target.value }))}
                                style={{ resize: 'vertical' }} />
                        </div>

                        {/* Gec Butonu */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, padding: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-secondary)' }}>Gec / Kapat Butonu</div>
                                <div className="form-group" style={{ margin: '0 0 10px' }}>
                                    <label style={{ fontSize: '0.78rem' }}>Buton Etiketi</label>
                                    <input className="form-input" placeholder="Gec" value={alertPopup.alert_popup_skip_label}
                                        onChange={e => setAlertPopup(p => ({ ...p, alert_popup_skip_label: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label style={{ fontSize: '0.78rem' }}>Gec Gecikmesi (saniye, 0 = aninda aktif)</label>
                                    <input className="form-input" type="number" min="0" max="60" value={alertPopup.alert_popup_skip_delay}
                                        onChange={e => setAlertPopup(p => ({ ...p, alert_popup_skip_delay: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-secondary)' }}>Baglantı Butonu (opsiyonel)</div>
                                <div className="form-group" style={{ margin: '0 0 10px' }}>
                                    <label style={{ fontSize: '0.78rem' }}>Buton Etiketi</label>
                                    <input className="form-input" placeholder="Devam Et" value={alertPopup.alert_popup_link_label}
                                        onChange={e => setAlertPopup(p => ({ ...p, alert_popup_link_label: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ margin: '0 0 10px' }}>
                                    <label style={{ fontSize: '0.78rem' }}>Baglantı URL (bos = buton gosterilmez)</label>
                                    <input className="form-input" placeholder="https://..." value={alertPopup.alert_popup_link_url}
                                        onChange={e => setAlertPopup(p => ({ ...p, alert_popup_link_url: e.target.value }))} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div onClick={() => setAlertPopup(p => ({ ...p, alert_popup_link_new_tab: p.alert_popup_link_new_tab === '1' ? '0' : '1' }))}
                                        style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', flexShrink: 0,
                                            background: alertPopup.alert_popup_link_new_tab === '1' ? 'var(--accent)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <div style={{ position: 'absolute', top: 2, left: alertPopup.alert_popup_link_new_tab === '1' ? 18 : 2,
                                            width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Yeni sekmede ac</span>
                                </div>
                            </div>
                        </div>

                        <button type="button" className="btn btn-primary" disabled={alertPopupSubmitting} onClick={saveAlertPopupSettings} style={{ minWidth: 200 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            {alertPopupSubmitting ? 'Kaydediliyor...' : 'Popup Ayarlarini Kaydet'}
                        </button>
                    </div>
                )}

                {/* ═══════════════ SHOP ITEM MODAL (Portal) ═══════════════ */}
                {mounted && shopModalOpen && createPortal(
                    <div className="modal-overlay" onClick={() => setShopModalOpen(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                            <h3><GiftIcon /> {editingShopItem ? 'Öğeyi Düzenle' : 'Yeni Mağaza Öğesi'}</h3>

                            {!editingShopItem && (
                                <div className="form-group">
                                    <label>Tür</label>
                                    <select className="form-input" value={shopForm.type} onChange={e => setShopForm(p => ({ ...p, type: e.target.value }))}>
                                        <option value="badge">Rozet</option>
                                        <option value="frame">Avatar Çerçevesi</option>
                                        <option value="title">Unvan (Renkli İsim)</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>İsim</label>
                                <input className="form-input" value={shopForm.name} onChange={e => setShopForm(p => ({ ...p, name: e.target.value }))} placeholder="ör. Altın Rozet" />
                            </div>

                            <div className="form-group">
                                <label>Fiyat (Asteria Scans Puanı)</label>
                                <input type="number" min="0" className="form-input" value={shopForm.price} onChange={e => setShopForm(p => ({ ...p, price: Number(e.target.value) }))} />
                            </div>

                            {(shopForm.type === 'badge' || shopForm.type === 'frame') && (
                                <div className="form-group">
                                    <label>Görsel (PNG/GIF/WebP, animasyonlu GIF desteklenir)</label>
                                    {shopForm.image_url && (
                                        <div style={{ width: 64, height: 64, borderRadius: shopForm.type === 'frame' ? '50%' : 8, background: 'var(--bg-tertiary)', overflow: 'hidden', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img src={shopForm.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} decoding="async" />
                                        </div>
                                    )}
                                    <input type="file" accept="image/png,image/gif,image/webp,image/jpeg" disabled={shopImageUploading}
                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadShopItemImage(f); e.target.value = ''; }} />
                                    {shopImageUploading && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Yükleniyor...</div>}
                                </div>
                            )}

                            {shopForm.type === 'title' && (
                                <div className="form-group">
                                    <label>İsim Rengi</label>
                                    <input type="color" value={shopForm.title_color} onChange={e => setShopForm(p => ({ ...p, title_color: e.target.value }))} style={{ width: 60, height: 36, padding: 2, background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer' }} />
                                    <div style={{ marginTop: 8, fontWeight: 700, color: shopForm.title_color }}>{shopForm.name || 'Önizleme'}</div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => setShopModalOpen(false)}>İptal</button>
                                <button className="btn btn-primary btn-sm" onClick={saveShopItem}>{editingShopItem ? 'Kaydet' : 'Oluştur'}</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* ═══════════════ UPLOAD PROGRESS MODAL (Portal) ═══════════════ */}
                {mounted && uploadProgress && createPortal(
                    <div className="modal-overlay" style={{ zIndex: 1200 }}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                            <h3>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                {uploadProgress.label || 'Yükleniyor'}
                            </h3>
                            <p style={{ marginBottom: 4, wordBreak: 'break-all' }}>
                                {Math.min(uploadProgress.current + 1, uploadProgress.total)}/{uploadProgress.total} yüklendi
                                {uploadProgress.fileName ? ` — ${uploadProgress.fileName}` : ''}
                            </p>
                            <div style={{ width: '100%', height: 10, borderRadius: 6, background: 'var(--bg-tertiary)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <div style={{
                                    width: `${Math.max(0, Math.min(100, uploadProgress.percent || 0))}%`,
                                    height: '100%',
                                    background: 'var(--accent)',
                                    transition: 'width 0.2s ease',
                                }} />
                            </div>
                            <p style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                %{Math.max(0, Math.min(100, uploadProgress.percent || 0))}
                            </p>
                        </div>
                    </div>,
                    document.body
                )}

                {/* ═══════════════ CONFIRM MODAL (Portal) ═══════════════ */}
                {mounted && confirmModal && createPortal(
                    <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> İşlemi Onayla</h3>
                            <p>{confirmModal.text}</p>
                            <div className="modal-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmModal(null)}>İptal</button>
                                <button className="btn btn-danger btn-sm" onClick={confirmAction}>Onayla</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* ═══════════════ IMAGE PREVIEW MODAL (Portal) ═══════════════ */}
                {mounted && previewImage && createPortal(
                    <div className="modal-overlay" onClick={() => setPreviewImage(null)} style={{ zIndex: 1100 }}>
                        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'rgba(0,0,0,0.8)', padding: '10px 16px', borderRadius: '8px 8px 0 0' }}>
                                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{previewImage.title}</span>
                                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewImage(null)} style={{ color: '#fff' }}>✕</button>
                            </div>
                            <img src={previewImage.src} alt={previewImage.title} style={{ maxWidth: '90vw', maxHeight: 'calc(90vh - 50px)', objectFit: 'contain', borderRadius: '0 0 8px 8px', display: 'block' }} decoding="async" />
                        </div>
                    </div>,
                    document.body
                )}
            </main>
        </div>
    );

    /* ── Shared series form ── */
    function renderSeriesForm() {
        return (
            <div style={{ marginTop: 12 }}>
                <div className="form-group">
                    <label>Title *</label>
                    <input className="form-input" value={sTitle} onChange={e => setSTitle(e.target.value)} required placeholder="e.g. Shadow Ronin" />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-input" rows={3} value={sDesc} onChange={e => setSDesc(e.target.value)} style={{ resize: 'vertical' }} placeholder="Series synopsis..." />
                </div>
                <div className="form-group">
                    <label><ImageIcon /> Cover Image</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <input type="file" className="form-input" accept="image/*" onChange={handleCoverSelect} style={{ padding: 8 }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recommended: 300x450px (2:3 ratio)</span>
                        </div>
                        {sCoverPreview && (
                            <div style={{ width: 60, height: 85, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                <img src={sCoverPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group"><label>Author</label><input className="form-input" value={sAuthor} onChange={e => setSAuthor(e.target.value)} placeholder="Author" /></div>
                    <div className="form-group"><label>Artist</label><input className="form-input" value={sArtist} onChange={e => setSArtist(e.target.value)} placeholder="Artist" /></div>
                </div>
                <div className="form-group">
                    <label>Alternatif İsimler (SEO — virgülle ayırın)</label>
                    <input className="form-input" placeholder="örn. Shadow Ronin, 影の浪人, 그림자 로닌" value={sAltNames} onChange={e => setSAltNames(e.target.value)} />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Arama motorları için serinin diğer adlarını ekleyin.</small>
                </div>
                <div className="form-group">
                    <label>Türler</label>
                    {/* Predefined genre tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {Object.keys(GENRE_TR).map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setSGenres(prev =>
                                    prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                )}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    transition: 'all 0.15s',
                                    background: sGenres.includes(g) ? 'var(--accent)' : 'var(--bg-glass)',
                                    borderColor: sGenres.includes(g) ? 'var(--accent)' : 'var(--border-color)',
                                    color: sGenres.includes(g) ? '#fff' : 'var(--text-secondary)',
                                }}
                            >
                                {GENRE_TR[g] || g}
                            </button>
                        ))}
                    </div>

                    {/* Selected genres list with remove buttons */}
                    {sGenres.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: 6 }}>
                                Seçili türler:
                            </small>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {sGenres.map(g => (
                                    <span
                                        key={g}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '3px 8px 3px 10px',
                                            borderRadius: 20,
                                            fontSize: '0.76rem',
                                            fontWeight: 600,
                                            background: 'var(--accent)',
                                            color: '#fff',
                                            border: '1px solid var(--accent)',
                                        }}
                                    >
                                        {GENRE_TR[g] || g}
                                        <button
                                            type="button"
                                            onClick={() => setSGenres(prev => prev.filter(x => x !== g))}
                                            title="Kaldır"
                                            style={{
                                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)',
                                                cursor: 'pointer', padding: '0 0 0 2px', fontSize: '0.85rem',
                                                lineHeight: 1, display: 'flex', alignItems: 'center',
                                            }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Tür Yönetimi Paneli ── */}
                    <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TagIcon /> Tür Yönetimi (Ekle / Sil)
                            </span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={loadGenres} style={{ fontSize: '0.72rem' }}>
                                {genresLoading ? '...' : '↻ Yenile'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Yeni tür adı (örn. Cultivation)"
                                value={newGenreName}
                                onChange={e => setNewGenreName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                                style={{ flex: 1, padding: '5px 10px', fontSize: '0.8rem' }}
                            />
                            <button type="button" className="btn btn-primary btn-sm" onClick={addGenre} style={{ fontSize: '0.8rem' }}>
                                + Ekle
                            </button>
                        </div>
                        {genresLoading ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                        ) : (
                            <>
                            {/* Varsayılan türler */}
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Varsayılan Türler ({genres.filter(g => g.isDefault).length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
                                    {genres.filter(g => g.isDefault).map(g => (
                                        <div key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 10px', background: 'rgba(99,102,241,0.08)', borderRadius: 16, border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.76rem' }}>
                                            <button type="button" onClick={() => { if (!sGenres.includes(g.name)) setSGenres(prev => [...prev, g.name]); }}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', padding: 0, fontSize: '0.76rem', fontWeight: 600 }}
                                                title="Seriye ekle">{GENRE_TR[g.name] || g.name}</button>
                                            {g.usageCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{g.usageCount}</span>}
                                            <button type="button" onClick={() => deleteGenre(g.id, g.name)}
                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 1px', fontSize: '0.85rem', lineHeight: 1 }}
                                                title="Varsayılan türü gizle">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Özel türler */}
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Özel Türler ({genres.filter(g => !g.isDefault).length})
                                </div>
                                {genres.filter(g => !g.isDefault).length === 0 ? (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Henüz özel tür yok.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {genres.filter(g => !g.isDefault).map(g => (
                                            <div key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 10px', background: 'var(--bg-tertiary)', borderRadius: 16, border: '1px solid var(--border-color)', fontSize: '0.76rem' }}>
                                                <button type="button" onClick={() => { if (!sGenres.includes(g.name)) setSGenres(prev => [...prev, g.name]); }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0, fontSize: '0.76rem', fontWeight: 600 }}
                                                    title="Seriye ekle">{g.name}</button>
                                                {g.usageCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--accent-light)' }}>{g.usageCount}</span>}
                                                <button type="button" onClick={() => deleteGenre(g.id, g.name)}
                                                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 1px', fontSize: '0.85rem', lineHeight: 1 }}
                                                    title="Türü kalıcı sil">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Gizlenmiş varsayılan türler */}
                            {deletedDefaultGenres.length > 0 && (
                                <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(251,191,36,0.06)', borderRadius: 6, border: '1px solid rgba(251,191,36,0.2)' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#fbbf24', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Gizlenmiş Varsayılan Türler ({deletedDefaultGenres.length}) — Geri yüklemek için tıklayın
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {deletedDefaultGenres.map(g => (
                                            <button key={g.name} type="button"
                                                onClick={() => restoreGenre(g.name)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(251,191,36,0.1)', borderRadius: 16, border: '1px solid rgba(251,191,36,0.3)', fontSize: '0.76rem', color: '#fbbf24', cursor: 'pointer', fontWeight: 600 }}
                                                title="Geri yükle">
                                                ↺ {GENRE_TR[g.name] || g.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 6, display: 'block' }}>
                            Tür adına tıklayarak bu seriye ekleyin. Yeni tür eklemek için yukarıdaki alana yazın. × ile kalıcı silin (tüm serilerden kaldırılır). Gizlenen türler arşiv filtresinde görünmez.
                        </small>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                        <label>Seri Durumu</label>
                        <select className="form-input" value={sStatus} onChange={e => setSStatus(e.target.value)}>
                            <option value="ongoing">Devam Ediyor</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="hiatus">Ara Verildi</option>
                            <option value="cancelled">İptal Edildi</option>
                            <option value="current">Güncel</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select className="form-input" value={sType} onChange={e => setSType(e.target.value)}>
                            <option value="manga">Manga</option>
                            <option value="manhwa">Manhwa</option>
                            <option value="manhua">Manhua</option>
                            <option value="comic">Comic</option>
                            <option value="novel">Novel</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Rating (0-10)</label>
                        <input type="number" className="form-input" min="0" max="10" step="0.1" value={sRating} onChange={e => setSRating(e.target.value)} />
                    </div>
                </div>
                {/* Adult Content Toggle */}
                <div className="form-group" style={{ marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                        <div
                            onClick={() => setSIsAdult(v => !v)}
                            style={{
                                width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
                                background: sIsAdult ? '#ef4444' : 'var(--border-color)',
                                transition: 'background 0.2s', cursor: 'pointer'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 3, left: sIsAdult ? 23 : 3,
                                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        </div>
                        <span style={{ fontWeight: 600, color: sIsAdult ? '#ef4444' : 'var(--text-secondary)', fontSize: '0.88rem' }}>
                            🔞 Yetişkin İçeriği (18+)
                        </span>
                    </label>
                    {sIsAdult && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: '#ef4444' }}>⚠️ Yetişkin İçeriği Aktif:</strong> Bu seri için kapak görseli bulanık görünecek ve ziyaretçiler giriş yapmaları istenecektir. Giriş yapan kullanıcılar ise 18+ yaş onayı verdikten sonra seriyi görebilecektir.
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
