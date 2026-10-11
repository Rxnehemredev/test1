'use client';

import React, { useState } from 'react';
import { UsersIcon, TagIcon, ShieldIcon, TrashIcon, MsgIcon, BadgeIcon, BADGE_ICON_OPTIONS } from '../AdminIcons';
import AdminPager from '../AdminPager';
import { BADGE_OPTIONS } from '@/lib/badges';

export const ALL_PERMISSIONS = [
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

export default function UsersTab({
    user,
    stats,
    settings,
    userSearch,
    setUserSearch,
    usersPage,
    setUsersPage,
    ADMIN_PAGE_SIZE,
    allBadgeOptions,
    setAllBadgeOptions,
    customRoles,
    setCustomRoles,
    authFetch,
    show,
    setConfirmModal,
    fDate,
}) {
    // Custom role form state
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleLabel, setNewRoleLabel] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#818cf8');
    const [newRolePerms, setNewRolePerms] = useState([]);
    const [roleCreating, setRoleCreating] = useState(false);
    const [showRoleForm, setShowRoleForm] = useState(false);

    // Custom badge form state
    const [newBadgeId, setNewBadgeId] = useState('');
    const [newBadgeLabel, setNewBadgeLabel] = useState('');
    const [newBadgeIcon, setNewBadgeIcon] = useState('star');
    const [newBadgeColor, setNewBadgeColor] = useState('#6366f1');
    const [badgeCreating, setBadgeCreating] = useState(false);
    const [badgeOrderDirty, setBadgeOrderDirty] = useState(false);
    const [badgeOrderSaving, setBadgeOrderSaving] = useState(false);

    // Viewing user & badges
    const [viewingUser, setViewingUser] = useState(null);
    const [userActivityLoading, setUserActivityLoading] = useState(false);
    const [userBadges, setUserBadges] = useState([]);
    const [badgeLoading, setBadgeLoading] = useState(false);
    const [resetPwdUserId, setResetPwdUserId] = useState(null);
    const [resetPwdValue, setResetPwdValue] = useState('');
    const [resetPwdSubmitting, setResetPwdSubmitting] = useState(false);

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

    return (
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
                                style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                            >
                                {badgeOrderSaving ? 'Kaydediliyor...' : '✓ Sıralamayı Kaydet'}
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
                                    style={{ width: 38, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{newBadgeColor}</span>
                            </div>
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={createCustomBadge}
                            disabled={badgeCreating || !newBadgeId || !newBadgeLabel}
                            style={{ height: 36, whiteSpace: 'nowrap' }}
                        >
                            {badgeCreating ? '...' : '+ Oluştur'}
                        </button>
                    </div>
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
                            {['Seri', 'Kullanıcı', 'Yorum', 'Medya', 'Sistem'].map(group => (
                                <div key={group} style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{group}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => {
                                            const isSelected = newRolePerms.includes(perm.id);
                                            return (
                                                <button key={perm.id}
                                                    type="button"
                                                    onClick={() => setNewRolePerms(prev => isSelected ? prev.filter(x => x !== perm.id) : [...prev, perm.id])}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem',
                                                        fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                                        transition: 'all 0.15s',
                                                        background: isSelected ? 'var(--accent)' : 'var(--bg-tertiary)',
                                                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                                                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {isSelected ? '✓ ' : '+ '}{perm.label}
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
                                        >✕</button>
                                    </span>
                                );
                            })}
                        </div>
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
    );
}
