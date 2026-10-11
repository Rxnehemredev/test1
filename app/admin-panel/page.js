'use client';

import OverviewTab from '@/components/admin/tabs/OverviewTab';
import AnnouncementsTab from '@/components/admin/tabs/AnnouncementsTab';
import ShopTab from '@/components/admin/tabs/ShopTab';
import SeriesTab from '@/components/admin/tabs/SeriesTab';
import ApiKeyTab from '@/components/admin/tabs/ApiKeyTab';
import UsersTab from '@/components/admin/tabs/UsersTab';
import CommentsTab from '@/components/admin/tabs/CommentsTab';
import TrafficTab from '@/components/admin/tabs/TrafficTab';
import AuditLogTab from '@/components/admin/tabs/AuditLogTab';
import RequestsTab from '@/components/admin/tabs/RequestsTab';
import ScraperTab from '@/components/admin/tabs/ScraperTab';
import MediaTab from '@/components/admin/tabs/MediaTab';
import PagesTab from '@/components/admin/tabs/PagesTab';
import BackupsTab from '@/components/admin/tabs/BackupsTab';
import SettingsTab from '@/components/admin/tabs/SettingsTab';
import BugReportsTab from '@/components/admin/tabs/BugReportsTab';
import CustomizeTab from '@/components/admin/tabs/CustomizeTab';
import AdsTab from '@/components/admin/tabs/AdsTab';
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

                {tab === 'overview' && <OverviewTab stats={stats} />}

                {tab === 'announcements' && (
                    <AnnouncementsTab
                        annMsg={annMsg}
                        setAnnMsg={setAnnMsg}
                        annLink={annLink}
                        setAnnLink={setAnnLink}
                        addAnnouncement={addAnnouncement}
                        announcements={announcements}
                        toggleAnn={toggleAnn}
                        deleteAnn={deleteAnn}
                    />
                )}

                {tab === 'shop' && (
                    <ShopTab
                        shopFilterType={shopFilterType}
                        setShopFilterType={setShopFilterType}
                        shopItems={shopItems}
                        shopLoading={shopLoading}
                        openShopCreateModal={openShopCreateModal}
                        openShopEditModal={openShopEditModal}
                        toggleShopItemActive={toggleShopItemActive}
                        deleteShopItem={deleteShopItem}
                    />
                )}

                {tab === 'series' && (
                    <SeriesTab
                        user={user}
                        allSeries={allSeries}
                        selectedSeriesIds={selectedSeriesIds}
                        setSelectedSeriesIds={setSelectedSeriesIds}
                        subView={subView}
                        setSubView={setSubView}
                        resetForm={resetForm}
                        handleCreateSeries={handleCreateSeries}
                        submitting={submitting}
                        detailSeries={detailSeries}
                        setDetailSeries={setDetailSeries}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        handleUpdateSeries={handleUpdateSeries}
                        handleDeleteSeries={handleDeleteSeries}
                        openSeriesDetail={openSeriesDetail}
                        sTitle={sTitle} setSTitle={setSTitle}
                        sDesc={sDesc} setSDesc={setSDesc}
                        sCoverPreview={sCoverPreview} setSCoverPreview={setSCoverPreview}
                        sAuthor={sAuthor} setSAuthor={setSAuthor}
                        sArtist={sArtist} setSArtist={setSArtist}
                        sAltTitles={sAltTitles} setSAltTitles={setSAltTitles}
                        sGenres={sGenres} setSGenres={setSGenres}
                        sStatus={sStatus} setSStatus={setSStatus}
                        sType={sType} setSType={setSType}
                        sSlug={sSlug} setSSlug={setSSlug}
                        sCustomUrl={sCustomUrl} setSCustomUrl={setSCustomUrl}
                        sShowInSlider={sShowInSlider} setSShowInSlider={setSShowInSlider}
                        sSliderOrder={sSliderOrder} setSSliderOrder={setSSliderOrder}
                        sPinned={sPinned} setSPinned={setSPinned}
                        sStaffPick={sStaffPick} setSStaffPick={setSStaffPick}
                        sAgeRating={sAgeRating} setSAgeRating={setSAgeRating}
                        sRecommendation={sRecommendation} setSRecommendation={setSRecommendation}
                        sScheduleDays={sScheduleDays} setSScheduleDays={setSScheduleDays}
                        sScheduleTime={sScheduleTime} setSScheduleTime={setSScheduleTime}
                        sScheduleEnabled={sScheduleEnabled} setSScheduleEnabled={setSScheduleEnabled}
                        sCustomScore={sCustomScore} setSCustomScore={setSCustomScore}
                        sCustomVotes={sCustomVotes} setSCustomVotes={setSCustomVotes}
                        sExternalId={sExternalId} setSExternalId={setSExternalId}
                        sCoverSource={sCoverSource} setSCoverSource={setSCoverSource}
                        sReleaseDate={sReleaseDate} setSReleaseDate={setSReleaseDate}
                        sAdult={sAdult} setSAdult={setSAdult}
                        sShowAd={sShowAd} setSShowAd={setSShowAd}
                        genres={genres} genresLoading={genresLoading}
                        newGenreName={newGenreName} setNewGenreName={setNewGenreName}
                        deletedDefaultGenres={deletedDefaultGenres}
                        addGenre={addGenre} deleteGenre={deleteGenre} restoreGenre={restoreGenre}
                        chapters={chapters} chapterPage={chapterPage} setChapterPage={setChapterPage}
                        CHAPTERS_PER_PAGE={CHAPTERS_PER_PAGE}
                        selectedChapters={selectedChapters} setSelectedChapters={setSelectedChapters}
                        chapterNumber={chapterNumber} setChapterNumber={setChapterNumber}
                        chapterTitle={chapterTitle} setChapterTitle={setChapterTitle}
                        chapterType={chapterType} setChapterType={setChapterType}
                        chapterPages={chapterPages} setChapterPages={setChapterPages}
                        chapterNovelContent={chapterNovelContent} setChapterNovelContent={setChapterNovelContent}
                        chapterVolume={chapterVolume} setChapterVolume={setChapterVolume}
                        chapterScheduledAt={chapterScheduledAt} setChapterScheduledAt={setChapterScheduledAt}
                        chapterPrice={chapterPrice} setChapterPrice={setChapterPrice}
                        chapterStatus={chapterStatus} setChapterStatus={setChapterStatus}
                        chapterBulkFiles={chapterBulkFiles} setChapterBulkFiles={setChapterBulkFiles}
                        chapterBulkUploading={chapterBulkUploading} handleBulkUploadChapters={handleBulkUploadChapters}
                        handleAddChapter={handleAddChapter} handleDeleteChapter={handleDeleteChapter}
                        handleBulkDeleteChapters={handleBulkDeleteChapters}
                        startEditChapter={startEditChapter} saveEditedChapter={saveEditedChapter} cancelEditChapter={cancelEditChapter}
                        editingChapterId={editingChapterId} quickEditPrice={quickEditPrice} setQuickEditPrice={setQuickEditPrice}
                        viewPagesChapterId={viewPagesChapterId} setViewPagesChapterId={setViewPagesChapterId}
                        viewPages={viewPages} setViewPages={setViewPages} viewPagesLoading={viewPagesLoading}
                        handleViewChapterPages={handleViewChapterPages}
                        compressCoverImage={compressCoverImage} handleCoverUpload={handleCoverUpload} insertFormat={insertFormat}
                        setPreviewImage={setPreviewImage} setConfirmModal={setConfirmModal} show={show}
                        authFetch={authFetch} safeJson={safeJson} loadStats={loadStats} fDate={fDate}
                    />
                )}

                {tab === 'api-key' && (
                    <ApiKeyTab
                        turnstileLoaded={turnstileLoaded}
                        turnstileSiteKey={turnstileSiteKey}
                        setTurnstileSiteKey={setTurnstileSiteKey}
                        turnstileSecretKey={turnstileSecretKey}
                        setTurnstileSecretKey={setTurnstileSecretKey}
                        authFetch={authFetch}
                        show={show}
                        fetchStats={fetchStats}
                    />
                )}

                {tab === 'users' && (
                    <UsersTab
                        user={user}
                        stats={stats}
                        settings={settings}
                        userSearch={userSearch}
                        setUserSearch={setUserSearch}
                        usersPage={usersPage}
                        setUsersPage={setUsersPage}
                        ADMIN_PAGE_SIZE={ADMIN_PAGE_SIZE}
                        allBadgeOptions={allBadgeOptions}
                        setAllBadgeOptions={setAllBadgeOptions}
                        customRoles={customRoles}
                        setCustomRoles={setCustomRoles}
                        authFetch={authFetch}
                        show={show}
                        setConfirmModal={setConfirmModal}
                        fDate={fDate}
                    />
                )}

                {tab === 'comments' && (
                    <CommentsTab
                        stats={stats}
                        commentSearch={commentSearch}
                        setCommentSearch={setCommentSearch}
                        commentReports={commentReports}
                        setCommentReports={setCommentReports}
                        commentFilter={commentFilter}
                        setCommentFilter={setCommentFilter}
                        commentStatusTab={commentStatusTab}
                        setCommentStatusTab={setCommentStatusTab}
                        commentsPage={commentsPage}
                        setCommentsPage={setCommentsPage}
                        ADMIN_PAGE_SIZE={ADMIN_PAGE_SIZE}
                        selectedComments={selectedComments}
                        setSelectedComments={setSelectedComments}
                        commentEmojis={commentEmojis}
                        setCommentEmojis={setCommentEmojis}
                        reportReasons={reportReasons}
                        setReportReasons={setReportReasons}
                        submitting={submitting}
                        setSubmitting={setSubmitting}
                        authFetch={authFetch}
                        show={show}
                        loadStats={loadStats}
                        setConfirmModal={setConfirmModal}
                        fDate={fDate}
                        tab={tab}
                    />
                )}

                {tab === 'traffic' && (
                    <TrafficTab
                        trafficRange={trafficRange}
                        setTrafficRange={setTrafficRange}
                        loadTrafficData={loadTrafficData}
                        trafficLoading={trafficLoading}
                        trafficData={trafficData}
                    />
                )}

                {(tab === 'audit-log' || ((user.role === 'admin' || user.role === 'manager') && tab === 'logs')) && (
                    <AuditLogTab
                        auditLogs={auditLogs}
                        auditLoading={auditLoading}
                        loadAuditLogs={loadAuditLogs}
                        auditSearch={auditSearch}
                        setAuditSearch={setAuditSearch}
                        auditPage={auditPage}
                        setAuditPage={setAuditPage}
                        auditActionFilter={auditActionFilter}
                        setAuditActionFilter={setAuditActionFilter}
                        ADMIN_PAGE_SIZE={ADMIN_PAGE_SIZE}
                    />
                )}

                {tab === 'requests' && (
                    <RequestsTab
                        seriesRequests={seriesRequests}
                        setSeriesRequests={setSeriesRequests}
                        reqLoading={reqLoading}
                        setReqLoading={setReqLoading}
                        reqFilter={reqFilter}
                        setReqFilter={setReqFilter}
                        requestsPage={requestsPage}
                        setRequestsPage={setRequestsPage}
                        editingReq={editingReq}
                        setEditingReq={setEditingReq}
                        setConfirmModal={setConfirmModal}
                        show={show}
                        authFetch={authFetch}
                        ADMIN_PAGE_SIZE={ADMIN_PAGE_SIZE}
                    />
                )}

                {tab === 'scraper' && (
                    <ScraperTab
                        loadAllScraperSources={loadAllScraperSources}
                        allScraperSourcesLoading={allScraperSourcesLoading}
                        scraperSyncAll={scraperSyncAll}
                        scraperSyncLoading={scraperSyncLoading}
                        scrapeNewUrl={scrapeNewUrl}
                        setScrapeNewUrl={setScrapeNewUrl}
                        scrapeNewLang={scrapeNewLang}
                        setScrapeNewLang={setScrapeNewLang}
                        scrapeNewLoading={scrapeNewLoading}
                        setScrapeNewLoading={setScrapeNewLoading}
                        scrapeNewPreview={scrapeNewPreview}
                        setScrapeNewPreview={setScrapeNewPreview}
                        handleCreateSeriesFromScrape={handleCreateSeriesFromScrape}
                        allScraperSources={allScraperSources}
                        setTab={setTab}
                        openSeriesDetail={openSeriesDetail}
                        authFetch={authFetch}
                        show={show}
                    />
                )}

                {tab === 'media' && (
                    <MediaTab
                        mediaView={mediaView}
                        setMediaView={setMediaView}
                        setSelectedMediaSeries={setSelectedMediaSeries}
                        setSelectedMediaChapter={setSelectedMediaChapter}
                        setChapterPages={setChapterPages}
                        setSeriesChapterFolders={setSeriesChapterFolders}
                        loadMediaFolders={loadMediaFolders}
                        setSelectedUserFolder={setSelectedUserFolder}
                        setUserFolderDetail={setUserFolderDetail}
                        setUserFolderSearch={setUserFolderSearch}
                        loadUserFolders={loadUserFolders}
                        mediaFolderBreadcrumb={mediaFolderBreadcrumb}
                        selectedMediaSeries={selectedMediaSeries}
                        selectedMediaChapter={selectedMediaChapter}
                        mediaFoldersLoading={mediaFoldersLoading}
                        mediaFolders={mediaFolders}
                        openMediaSeriesFolder={openMediaSeriesFolder}
                        seriesChaptersLoading={seriesChaptersLoading}
                        seriesChapterFolders={seriesChapterFolders}
                        setPreviewImage={setPreviewImage}
                        setConfirmModal={setConfirmModal}
                        openMediaChapterFolder={openMediaChapterFolder}
                        chapterPagesLoading={chapterPagesLoading}
                        chapterPages={chapterPages}
                        userFolderBreadcrumb={userFolderBreadcrumb}
                        selectedUserFolder={selectedUserFolder}
                        userFolderSearch={userFolderSearch}
                        userFoldersLoading={userFoldersLoading}
                        userFolders={userFolders}
                        openUserFolder={openUserFolder}
                        userFolderDetailLoading={userFolderDetailLoading}
                        userFolderDetail={userFolderDetail}
                        loadMedia={loadMedia}
                        mediaLoading={mediaLoading}
                        mediaPage={mediaPage}
                        mediaFilter={mediaFilter}
                        setMediaFilter={setMediaFilter}
                        exitSelectMode={exitSelectMode}
                        mediaFiles={mediaFiles}
                        mediaTotal={mediaTotal}
                        mediaSelectMode={mediaSelectMode}
                        setMediaSelectMode={setMediaSelectMode}
                        mediaSelected={mediaSelected}
                        setMediaSelected={setMediaSelected}
                        toggleMediaSelectAll={toggleMediaSelectAll}
                        mediaUploadCategory={mediaUploadCategory}
                        setMediaUploadCategory={setMediaUploadCategory}
                        mediaUploading={mediaUploading}
                        mediaUploadRef={mediaUploadRef}
                        handleMediaUpload={handleMediaUpload}
                        toggleMediaSelect={toggleMediaSelect}
                        mediaHasMore={mediaHasMore}
                        mounted={mounted}
                        handleBulkDownload={handleBulkDownload}
                        handleBulkDelete={handleBulkDelete}
                        bulkDeleting={bulkDeleting}
                    />
                )}

                {tab === 'pages' && (
                    <PagesTab
                        editingPage={editingPage}
                        setEditingPage={setEditingPage}
                        pageForm={pageForm}
                        setPageForm={setPageForm}
                        savePage={savePage}
                        pagesLoading={pagesLoading}
                        customPages={customPages}
                        deletePage={deletePage}
                        saveMenus={saveMenus}
                        menuSaving={menuSaving}
                        navbarMenu={navbarMenu}
                        setNavbarMenu={setNavbarMenu}
                        footerMenu={footerMenu}
                        setFooterMenu={setFooterMenu}
                        addMenuItem={addMenuItem}
                        updateMenuItem={updateMenuItem}
                        moveMenuItem={moveMenuItem}
                        removeMenuItem={removeMenuItem}
                    />
                )}

                {tab === 'backup' && (
                    <BackupsTab
                        createBackup={createBackup}
                        importData={importData}
                        backups={backups}
                        loadingBackups={loadingBackups}
                        downloadBackup={downloadBackup}
                        deleteBackup={deleteBackup}
                    />
                )}

                {tab === 'settings' && (
                    <SettingsTab
                        settings={settings}
                        setSettings={setSettings}
                        saveSettings={saveSettings}
                        submitting={submitting}
                    />
                )}

                {tab === 'bug-reports' && (
                    <BugReportsTab
                        bugReports={bugReports}
                        setBugReports={setBugReports}
                        reportsLoading={reportsLoading}
                        setReportsLoading={setReportsLoading}
                        authFetch={authFetch}
                        reportsPage={reportsPage}
                        setReportsPage={setReportsPage}
                        updateReportStatus={updateReportStatus}
                        deleteReport={deleteReport}
                        ADMIN_PAGE_SIZE={ADMIN_PAGE_SIZE}
                    />
                )}

                {tab === 'customize' && (
                    <CustomizeTab
                        customize={customize}
                        setCustomize={setCustomize}
                        saveCustomize={saveCustomize}
                        customizeSubmitting={customizeSubmitting}
                        assetUploading={assetUploading}
                        handleSiteAssetUpload={handleSiteAssetUpload}
                        logoUploadRef={logoUploadRef}
                        faviconUploadRef={faviconUploadRef}
                        watermarkUploadRef={watermarkUploadRef}
                        pageBgUploadRef={pageBgUploadRef}
                        chapterStartImageUploading={chapterStartImageUploading}
                        chapterStartImageMsg={chapterStartImageMsg}
                        chapterStartImageFile={chapterStartImageFile}
                        setChapterStartImageFile={setChapterStartImageFile}
                        handleChapterStartImageUpload={handleChapterStartImageUpload}
                        saveChapterStartImageSettings={saveChapterStartImageSettings}
                        chapterEndImageUploading={chapterEndImageUploading}
                        chapterEndImageMsg={chapterEndImageMsg}
                        chapterEndImageFile={chapterEndImageFile}
                        setChapterEndImageFile={setChapterEndImageFile}
                        handleChapterEndImageUpload={handleChapterEndImageUpload}
                        saveChapterEndImageSettings={saveChapterEndImageSettings}
                        gIndexingKey={gIndexingKey}
                        setGIndexingKey={setGIndexingKey}
                        gIndexingLoading={gIndexingLoading}
                        setGIndexingLoading={setGIndexingLoading}
                        gIndexingTestUrl={gIndexingTestUrl}
                        setGIndexingTestUrl={setGIndexingTestUrl}
                        gIndexingTestResult={gIndexingTestResult}
                        setGIndexingTestResult={setGIndexingTestResult}
                        authFetch={authFetch}
                        show={show}
                    />
                )}

                {tab === 'ads' && (
                    <AdsTab
                        adSettings={adSettings}
                        setAdSettings={setAdSettings}
                        adSettingsSubmitting={adSettingsSubmitting}
                        saveAdsSettings={saveAdsSettings}
                        adPreview={adPreview}
                        setAdPreview={setAdPreview}
                        alertPopup={alertPopup}
                        setAlertPopup={setAlertPopup}
                        alertPopupSubmitting={alertPopupSubmitting}
                        saveAlertPopupSettings={saveAlertPopupSettings}
                    />
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

}
