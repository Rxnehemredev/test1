import React, { useState, useRef, useEffect } from 'react';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import { getCroppedBlob, readFileAsDataUrl } from '@/lib/utils/crop';

export default function ProfileSettingsTab({
    user,
    authFetch,
    updateUser,
    refreshUser,
    show,
}) {
    // Profile form
    const [username, setUsername] = useState(user?.username || '');
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [saving, setSaving] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Image upload states
    const [pendingAvatar, setPendingAvatar] = useState(null);
    const [pendingCover, setPendingCover] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [showAvatarCrop, setShowAvatarCrop] = useState(false);
    const [showCoverCrop, setShowCoverCrop] = useState(false);
    const [avatarCropData, setAvatarCropData] = useState({ x: 0, y: 0, scale: 1 });
    const [coverCropData, setCoverCropData] = useState({ x: 0, y: 0, scale: 1 });
    const [uploadingImage, setUploadingImage] = useState(false);
    const coverCropRef = useRef(null);
    const avatarCropRef = useRef(null);

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setDisplayName(user.display_name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    async function handleProfileUpdate(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await authFetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, avatar_url: user?.avatar_url, display_name: displayName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            updateUser(data.user);
            show(data.message);
        } catch (err) {
            show(err.message, 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handlePasswordChange(e) {
        e.preventDefault();
        if (newPassword !== confirmPassword) return show('Şifreler eşleşmiyor', 'error');
        if (newPassword.length < 6) return show('Şifre en az 6 karakter olmalıdır', 'error');
        setSaving(true);
        try {
            const res = await authFetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            show('Şifre başarıyla değiştirildi');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            show(err.message, 'error');
        } finally {
            setSaving(false);
        }
    }

    function canUpdateAvatar() {
        if (!user?.last_avatar_update) return { canUpdate: true, remainingChanges: 2, nextResetAt: null };
        const msInDay = 24 * 60 * 60 * 1000;
        const lastUpdate = new Date(user.last_avatar_update + 'Z').getTime();
        const diff = Date.now() - lastUpdate;
        if (diff > msInDay) return { canUpdate: true, remainingChanges: 2, nextResetAt: null };
        const changesUsed = user.avatar_changes_today ?? 0;
        if (changesUsed < 2) return { canUpdate: true, remainingChanges: 2 - changesUsed, nextResetAt: new Date(lastUpdate + msInDay) };
        return { canUpdate: false, remainingChanges: 0, nextResetAt: new Date(lastUpdate + msInDay) };
    }

    function canUpdateCover() {
        if (!user?.last_cover_update) return { canUpdate: true, remainingChanges: 2, nextResetAt: null };
        const msInDay = 24 * 60 * 60 * 1000;
        const lastUpdate = new Date(user.last_cover_update + 'Z').getTime();
        const diff = Date.now() - lastUpdate;
        if (diff > msInDay) return { canUpdate: true, remainingChanges: 2, nextResetAt: null };
        const changesUsed = user.cover_changes_today ?? 0;
        if (changesUsed < 2) return { canUpdate: true, remainingChanges: 2 - changesUsed, nextResetAt: new Date(lastUpdate + msInDay) };
        return { canUpdate: false, remainingChanges: 0, nextResetAt: new Date(lastUpdate + msInDay) };
    }

    async function handleAvatarUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            show('Geçersiz dosya türü. JPEG, PNG, WebP veya GIF seçin.', 'error');
            e.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            show('Dosya çok büyük. En fazla 2MB.', 'error');
            e.target.value = '';
            return;
        }
        try {
            const preview = await readFileAsDataUrl(file);
            setPendingAvatar(file);
            setAvatarPreview(preview);
            setShowAvatarCrop(false);
            setAvatarCropData({ x: 0, y: 0, scale: 1 });
        } catch (error) {
            show(error.message, 'error');
        } finally {
            e.target.value = '';
        }
    }

    async function handleCoverUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            show('Geçersiz dosya türü. JPEG, PNG, WebP veya GIF seçin.', 'error');
            e.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            show('Dosya çok büyük. En fazla 5MB.', 'error');
            e.target.value = '';
            return;
        }
        try {
            const preview = await readFileAsDataUrl(file);
            setPendingCover(file);
            setCoverPreview(preview);
            setShowCoverCrop(false);
            setCoverCropData({ x: 0, y: 0, scale: 1 });
        } catch (error) {
            show(error.message, 'error');
        } finally {
            e.target.value = '';
        }
    }

    function startAvatarCrop() {
        setShowAvatarCrop(true);
        setAvatarCropData({ x: 0, y: 0, scale: 1 });
    }

    function startCoverCrop() {
        setShowCoverCrop(true);
        setCoverCropData({ x: 0, y: 0, scale: 1 });
    }

    async function saveAvatar() {
        if (!pendingAvatar || !avatarPreview) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            if (showAvatarCrop && (avatarCropData.x !== 0 || avatarCropData.y !== 0 || avatarCropData.scale !== 1)) {
                const croppedBlob = await getCroppedBlob(avatarPreview, avatarCropData, 200, 200, 200, 200);
                formData.append('avatar', croppedBlob, 'avatar.webp');
                formData.append('cropApplied', 'true');
            } else {
                formData.append('avatar', pendingAvatar, pendingAvatar.name || 'avatar.webp');
                formData.append('cropApplied', 'false');
            }

            const res = await authFetch('/api/auth/profile/avatar', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Profil resmi yüklenemedi.');
            updateUser({ ...user, ...data.user, avatar_url: data.avatar_url || data.user?.avatar_url });
            show('Profil resmi başarıyla güncellendi!');
            if (refreshUser) await refreshUser();
            setPendingAvatar(null);
            setAvatarPreview(null);
            setShowAvatarCrop(false);
        } catch (err) {
            show(err.message || 'Kırpma işlemi başarısız', 'error');
        } finally {
            setUploadingImage(false);
        }
    }

    async function saveCover() {
        if (!pendingCover || !coverPreview) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            if (showCoverCrop && (coverCropData.x !== 0 || coverCropData.y !== 0 || coverCropData.scale !== 1)) {
                const vpW = coverCropRef.current?.offsetWidth || 800;
                const vpH = 180;
                const croppedBlob = await getCroppedBlob(coverPreview, coverCropData, vpW, vpH, 1200, 400);
                formData.append('cover', croppedBlob, 'cover.webp');
                formData.append('cropApplied', 'true');
            } else {
                formData.append('cover', pendingCover, pendingCover.name || 'cover.webp');
                formData.append('cropApplied', 'false');
            }

            const res = await authFetch('/api/auth/profile/cover', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Kapak resmi yüklenemedi.');

            if (data.user?.cover_url) {
                updateUser({ ...user, cover_url: data.user.cover_url });
            } else {
                updateUser(data.user);
            }
            show('Kapak resmi başarıyla güncellendi!');
            if (refreshUser) await refreshUser();

            setPendingCover(null);
            setCoverPreview(null);
            setShowCoverCrop(false);
        } catch (err) {
            show(err.message || 'Kırpma işlemi başarısız', 'error');
        } finally {
            setUploadingImage(false);
        }
    }

    function cancelAvatarUpload() {
        setPendingAvatar(null);
        setAvatarPreview(null);
        setShowAvatarCrop(false);
    }

    function cancelCoverUpload() {
        setPendingCover(null);
        setCoverPreview(null);
        setShowCoverCrop(false);
    }

    const avatarStatus = canUpdateAvatar();
    const coverStatus = canUpdateCover();

    return (
        <div className="admin-card glass-panel" style={{ maxWidth: 600 }}>
            <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Profili Düzenle
            </h3>
            <form onSubmit={handleProfileUpdate} style={{ marginTop: 24 }}>
                <div className="form-group">
                    <label>Kullanıcı Adı</label>
                    <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} />
                </div>
                <div className="form-group">
                    <label>Görünen İsim <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(sohbet ve yorumlarda bu görünür — boş bırakılırsa kullanıcı adı gösterilir)</span></label>
                    <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={30} placeholder={username} />
                </div>
                <div className="form-group">
                    <label>E-posta</label>
                    <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                {/* Avatar Upload UI */}
                <div className="form-group" style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    marginTop: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                            Profil Resmi
                        </span>
                        {!avatarStatus.canUpdate && (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {avatarStatus.nextResetAt ? `Yarın ${new Date(avatarStatus.nextResetAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'da` : '24 saat içinde tekrar deneyin'}
                            </span>
                        )}
                        {avatarStatus.canUpdate && avatarStatus.remainingChanges < 2 && (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {avatarStatus.remainingChanges} değişiklik hakkı kaldı
                            </span>
                        )}
                    </div>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '16px' }}>
                        24 saatte en fazla 2 kez değiştirilebilir. En fazla 2MB. JPEG, PNG, WebP veya GIF.
                    </small>

                    {/* Önceki ve Yeni Karşılaştırma */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                                border: '3px solid var(--accent)', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                                margin: '0 auto 6px'
                            }}>
                                {(user?.avatar_url && user?.avatar_url !== '/default-avatar.png') ? (
                                    <img src={user.avatar_url} alt="Mevcut" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                ) : (
                                    <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{user?.username?.[0]?.toUpperCase()}</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mevcut</div>
                        </div>

                        {pendingAvatar && (
                            <div style={{ color: 'var(--accent)', flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                        )}

                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                                border: '3px solid #22c55e', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                                margin: '0 auto 6px'
                            }}>
                                {pendingAvatar && avatarPreview ? (
                                    <img 
                                        src={avatarPreview} 
                                        alt="Önizleme" 
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            transform: `scale(${avatarCropData.scale}) translate(${avatarCropData.x}px, ${avatarCropData.y}px)`,
                                            transformOrigin: 'center'
                                        }} decoding="async" />
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Seçilmedi</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>Yeni (Kaydedilecek)</div>
                        </div>
                    </div>

                    {/* Kırpma Alanı */}
                    {showAvatarCrop && avatarPreview && (
                        <div style={{ 
                            background: 'rgba(0,0,0,0.3)', 
                            padding: 20, 
                            borderRadius: 12, 
                            marginBottom: 16, 
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Görseli sürükleyerek konumlandırın, slider ile zoom yapın
                            </div>

                            <div
                                ref={avatarCropRef}
                                style={{ 
                                    width: 200, height: 200, borderRadius: '50%', 
                                    overflow: 'hidden', 
                                    margin: '0 auto 16px', 
                                    border: '3px solid var(--accent)', 
                                    cursor: 'grab', 
                                    position: 'relative', 
                                    background: '#0a0a0f', 
                                    userSelect: 'none',
                                    touchAction: 'none'
                                }}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    const el = e.currentTarget;
                                    if (!el) return;
                                    el.style.cursor = 'grabbing';
                                    const startX = e.clientX; const startY = e.clientY;
                                    const origX = avatarCropData.x; const origY = avatarCropData.y;
                                    const onMove = mv => {
                                        const dx = mv.clientX - startX;
                                        const dy = mv.clientY - startY;
                                        const sens = 1 / avatarCropData.scale;
                                        setAvatarCropData(p => ({
                                            ...p,
                                            x: origX + dx * sens,
                                            y: origY + dy * sens
                                        }));
                                    };
                                    const onUp = () => {
                                        if (el) el.style.cursor = 'grab';
                                        window.removeEventListener('mousemove', onMove);
                                        window.removeEventListener('mouseup', onUp);
                                    };
                                    window.addEventListener('mousemove', onMove);
                                    window.addEventListener('mouseup', onUp);
                                }}
                                onTouchStart={e => {
                                    e.preventDefault();
                                    const t = e.touches[0];
                                    const startX = t.clientX; const startY = t.clientY;
                                    const origX = avatarCropData.x; const origY = avatarCropData.y;
                                    const onMove = mv => {
                                        const tt = mv.touches[0];
                                        const dx = tt.clientX - startX;
                                        const dy = tt.clientY - startY;
                                        const sens = 1 / avatarCropData.scale;
                                        setAvatarCropData(p => ({
                                            ...p,
                                            x: origX + dx * sens,
                                            y: origY + dy * sens
                                        }));
                                    };
                                    const onEnd = () => {
                                        window.removeEventListener('touchmove', onMove);
                                        window.removeEventListener('touchend', onEnd);
                                    };
                                    window.addEventListener('touchmove', onMove, { passive: false });
                                    window.addEventListener('touchend', onEnd);
                                }}
                                onWheel={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const delta = -e.deltaY * 0.002;
                                    const newScale = Math.max(0.5, Math.min(5, avatarCropData.scale + delta));
                                    setAvatarCropData(p => ({ ...p, scale: newScale }));
                                }}
                            >
                                <img 
                                    src={avatarPreview} 
                                    alt="Kırp" 
                                    style={{ 
                                        width: '100%', height: '100%', 
                                        objectFit: 'cover', 
                                        transform: `scale(${avatarCropData.scale}) translate(${avatarCropData.x}px, ${avatarCropData.y}px)`,
                                        transformOrigin: 'center', 
                                        pointerEvents: 'none',
                                        willChange: 'transform'
                                    }} decoding="async" />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                <input 
                                    type="range" 
                                    min="50" 
                                    max="500" 
                                    value={Math.round(avatarCropData.scale * 100)}
                                    onChange={e => setAvatarCropData(p => ({ ...p, scale: parseInt(e.target.value) / 100 }))}
                                    style={{ flex: 1, height: 6, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                />
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 45, textAlign: 'right' }}>
                                    {Math.round(avatarCropData.scale * 100)}%
                                </span>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setAvatarCropData({ x: 0, y: 0, scale: 1 })} 
                                    style={{ 
                                        background: 'var(--bg-tertiary)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: 8, 
                                        padding: '8px 16px', 
                                        cursor: 'pointer', 
                                        color: 'var(--text-muted)', 
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                    Sıfırla
                                </button>
                            </div>
                        </div>
                    )}

                    {avatarStatus.canUpdate && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pendingAvatar ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {!showAvatarCrop && (
                                        <button type="button" className="btn btn-secondary" onClick={startAvatarCrop} style={{ flex: 1 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
                                            Kırp
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-primary" onClick={saveAvatar} disabled={uploadingImage} style={{ flex: 1 }}>
                                        {uploadingImage ? (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                                Kaydediliyor...
                                            </>
                                        ) : 'Kaydet'}
                                    </button>
                                    {showAvatarCrop ? (
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowAvatarCrop(false)} style={{ flexShrink: 0 }}>
                                            Kırpma İptal
                                        </button>
                                    ) : (
                                        <button type="button" className="btn btn-ghost" onClick={cancelAvatarUpload} style={{ flexShrink: 0 }}>
                                            İptal
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <label style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    background: 'var(--bg-glass)', border: '1px dashed var(--border-color)',
                                    borderRadius: '10px', padding: '16px', cursor: 'pointer',
                                    fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-light)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Cihazdan Profil Resmi Seç
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarUpload}
                                    />
                                </label>
                            )}
                        </div>
                    )}
                </div>

                {/* Cover Upload UI */}
                <div className="form-group" style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    marginTop: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            Kapak Resmi
                        </span>
                        {!coverStatus.canUpdate && (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {coverStatus.nextResetAt ? `Yarın ${new Date(coverStatus.nextResetAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'da` : '24 saat içinde tekrar deneyin'}
                            </span>
                        )}
                        {coverStatus.canUpdate && coverStatus.remainingChanges < 2 && (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {coverStatus.remainingChanges} değişiklik hakkı kaldı
                            </span>
                        )}
                    </div>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '16px' }}>
                        24 saatte en fazla 2 kez değiştirilebilir. En fazla 5MB. JPEG, PNG veya WebP.
                    </small>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{
                                width: '100%', height: 80, borderRadius: 8, overflow: 'hidden',
                                border: '2px solid var(--border-color)',
                                background: 'var(--bg-tertiary)',
                                position: 'relative'
                            }}>
                                {user?.cover_url ? (
                                    <img src={user.cover_url} alt="Mevcut" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Kapak yok
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>Mevcut</div>
                        </div>

                        {pendingCover && (
                            <div style={{ color: 'var(--accent)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                        )}

                        <div>
                            <div style={{
                                width: '100%', height: 80, borderRadius: 8, overflow: 'hidden',
                                border: '2px solid #22c55e',
                                background: 'var(--bg-tertiary)',
                                position: 'relative'
                            }}>
                                {pendingCover && coverPreview ? (
                                    <img 
                                        src={coverPreview} 
                                        alt="Önizleme" 
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            transform: `scale(${coverCropData.scale}) translate(${coverCropData.x}px, ${coverCropData.y}px)`,
                                            transformOrigin: 'center'
                                        }} decoding="async" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Seçilmedi
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>Yeni (Kaydedilecek)</div>
                        </div>
                    </div>

                    {showCoverCrop && coverPreview && (
                        <div style={{ 
                            background: 'rgba(0,0,0,0.3)', 
                            padding: 20, 
                            borderRadius: 12, 
                            marginBottom: 16, 
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Görseli sürükleyerek konumlandırın, slider ile zoom yapın
                            </div>

                            <div
                                ref={coverCropRef}
                                style={{ 
                                    width: '100%', height: 180, borderRadius: 10, 
                                    overflow: 'hidden', 
                                    marginBottom: 16, 
                                    border: '3px solid var(--accent)', 
                                    cursor: 'grab', 
                                    position: 'relative', 
                                    background: '#0a0a0f', 
                                    userSelect: 'none',
                                    touchAction: 'none'
                                }}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    const el = e.currentTarget;
                                    if (!el) return;
                                    el.style.cursor = 'grabbing';
                                    const startX = e.clientX; const startY = e.clientY;
                                    const origX = coverCropData.x; const origY = coverCropData.y;
                                    const onMove = mv => {
                                        const dx = mv.clientX - startX;
                                        const dy = mv.clientY - startY;
                                        const sens = 1 / coverCropData.scale;
                                        setCoverCropData(p => ({
                                            ...p,
                                            x: origX + dx * sens,
                                            y: origY + dy * sens
                                        }));
                                    };
                                    const onUp = () => {
                                        if (el) el.style.cursor = 'grab';
                                        window.removeEventListener('mousemove', onMove);
                                        window.removeEventListener('mouseup', onUp);
                                    };
                                    window.addEventListener('mousemove', onMove);
                                    window.addEventListener('mouseup', onUp);
                                }}
                                onTouchStart={e => {
                                    e.preventDefault();
                                    const t = e.touches[0];
                                    const startX = t.clientX; const startY = t.clientY;
                                    const origX = coverCropData.x; const origY = coverCropData.y;
                                    const onMove = mv => {
                                        const tt = mv.touches[0];
                                        const dx = tt.clientX - startX;
                                        const dy = tt.clientY - startY;
                                        const sens = 1 / coverCropData.scale;
                                        setCoverCropData(p => ({
                                            ...p,
                                            x: origX + dx * sens,
                                            y: origY + dy * sens
                                        }));
                                    };
                                    const onEnd = () => {
                                        window.removeEventListener('touchmove', onMove);
                                        window.removeEventListener('touchend', onEnd);
                                    };
                                    window.addEventListener('touchmove', onMove, { passive: false });
                                    window.addEventListener('touchend', onEnd);
                                }}
                                onWheel={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const delta = -e.deltaY * 0.002;
                                    const newScale = Math.max(0.5, Math.min(5, coverCropData.scale + delta));
                                    setCoverCropData(p => ({ ...p, scale: newScale }));
                                }}
                            >
                                <img 
                                    src={coverPreview} 
                                    alt="Kırp" 
                                    style={{ 
                                        width: '100%', height: '100%', 
                                        objectFit: 'cover', 
                                        transform: `scale(${coverCropData.scale}) translate(${coverCropData.x}px, ${coverCropData.y}px)`,
                                        transformOrigin: 'center', 
                                        pointerEvents: 'none',
                                        willChange: 'transform'
                                    }} decoding="async" />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                <input 
                                    type="range" 
                                    min="50" 
                                    max="500" 
                                    value={Math.round(coverCropData.scale * 100)}
                                    onChange={e => setCoverCropData(p => ({ ...p, scale: parseInt(e.target.value) / 100 }))}
                                    style={{ flex: 1, height: 6, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                />
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 45, textAlign: 'right' }}>
                                    {Math.round(coverCropData.scale * 100)}%
                                </span>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setCoverCropData({ x: 0, y: 0, scale: 1 })} 
                                    style={{ 
                                        background: 'var(--bg-tertiary)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: 8, 
                                        padding: '8px 16px', 
                                        cursor: 'pointer', 
                                        color: 'var(--text-muted)', 
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                    Sıfırla
                                </button>
                            </div>
                        </div>
                    )}

                    {coverStatus.canUpdate && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pendingCover ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {!showCoverCrop && (
                                        <button type="button" className="btn btn-secondary" onClick={startCoverCrop} style={{ flex: 1 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
                                            Kırp
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-primary" onClick={saveCover} disabled={uploadingImage} style={{ flex: 1 }}>
                                        {uploadingImage ? (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                                Kaydediliyor...
                                            </>
                                        ) : 'Kaydet'}
                                    </button>
                                    {showCoverCrop ? (
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowCoverCrop(false)} style={{ flexShrink: 0 }}>
                                            Kırpma İptal
                                        </button>
                                    ) : (
                                        <button type="button" className="btn btn-ghost" onClick={cancelCoverUpload} style={{ flexShrink: 0 }}>
                                            İptal
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <label style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    background: 'var(--bg-glass)', border: '1px dashed var(--border-color)',
                                    borderRadius: '10px', padding: '16px', cursor: 'pointer',
                                    fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-light)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    Cihazdan Kapak Resmi Seç
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={handleCoverUpload}
                                    />
                                </label>
                            )}
                        </div>
                    )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving || pendingAvatar || pendingCover} style={{ marginTop: '24px' }}>
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
                {(pendingAvatar || pendingCover) && (
                    <p style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: 8 }}>
                        Önce yukarıdaki görsel değişikliklerini kaydetmeniz veya iptal etmeniz gerekiyor.
                    </p>
                )}
            </form>

            {/* Password Change Section */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Şifreyi Değiştir
                </h3>
                <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                        <label>Mevcut Şifre</label>
                        <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Yeni Şifre</label>
                        <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                    </div>
                    <div className="form-group">
                        <label>Yeni Şifreyi Onayla</label>
                        <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                    </div>
                    <button type="submit" className="btn btn-danger" disabled={saving}>
                        {saving ? 'İşleniyor...' : 'Şifreyi Değiştir'}
                    </button>
                </form>
            </div>

            <TwoFactorSettings authFetch={authFetch} />
        </div>
    );
}
