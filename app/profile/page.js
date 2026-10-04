'use client';
import { useAuth } from '@/components/AuthProvider';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SeriesCard from '@/components/SeriesCard';
import { getCultivationData } from '@/lib/gamification';
import { useSettings } from '@/components/SettingsProvider';
import BadgeIcon from '@/components/BadgeIcon';

/**
 * Canvas tabanlı kırpma: görüntünün kırpılmış halini blob olarak döner.
 * @param {string} imageSrc  - ObjectURL veya data URL
 * @param {object} cropData  - { x, y, scale } (CSS transform değerleri)
 * @param {number} vpW       - Önizleme kapsayıcı genişliği (px)
 * @param {number} vpH       - Önizleme kapsayıcı yüksekliği (px)
 * @param {number} outW      - Çıktı genişliği (px)
 * @param {number} outH      - Çıktı yüksekliği (px)
 * @returns {Promise<Blob>}
 */
function getCroppedBlob(imageSrc, cropData, vpW, vpH, outW, outH) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const { x: cropX, y: cropY, scale: cropScale } = cropData;
                const imgW = img.naturalWidth;
                const imgH = img.naturalHeight;

                // CSS transform: scale(cropScale) translate(cropX, cropY)
                // Transform sırası: önce translate uygulanır, sonra scale.
                // transform-origin merkez (vpW/2, vpH/2).
                // Viewport merkezinde görünen image pikseli:
                //   cx_img = imgW/2 - cropX / sfPrev
                //   cy_img = imgH/2 - cropY / sfPrev
                // object-fit:cover temel ölçek faktörü
                const sfPrev = Math.max(vpW / imgW, vpH / imgH);

                // Görüntü merkez pikseli: CSS translate'i image-space'e çevir
                const cx_img = imgW / 2 - cropX / sfPrev;
                const cy_img = imgH / 2 - cropY / sfPrev;

                // Çıktı için toplam ölçek faktörü
                // cropScale doğrudan kullanılır (Math.max ile kısıtlama YOK — önizleme ile tutarlı olsun)
                const sfOut = Math.max(outW / imgW, outH / imgH);
                const totalSF = sfOut * cropScale;

                // Canvas kurulumu
                const canvas = document.createElement('canvas');
                canvas.width = outW;
                canvas.height = outH;
                const ctx = canvas.getContext('2d');

                // Görüntüyü çiz: merkez pikseli canvas merkezine hizala
                const drawX = outW / 2 - cx_img * totalSF;
                const drawY = outH / 2 - cy_img * totalSF;
                ctx.drawImage(img, drawX, drawY, imgW * totalSF, imgH * totalSF);

                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob başarısız'));
                }, 'image/webp', 0.92);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        // Blob URL'leri için crossOrigin gerekmez ama diğer kaynaklar için güvenlik
        if (!imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.src = imageSrc;
    });
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Görsel önizlemesi oluşturulamadı.'));
        reader.readAsDataURL(file);
    });
}

const GENRE_TR = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim', 'Ecchi': 'Ecchi', 'Harem': 'Harem',
    'Josei': 'Josei', 'Mature': 'Yetişkin', 'Mecha': 'Mecha', 'Psychological': 'Psikolojik',
    'Seinen': 'Seinen', 'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua'
};

function getGenreTranslation(genre) {
    if (!genre) return '';
    const keys = Object.keys(GENRE_TR);
    const matchedKey = keys.find(k => k.toLowerCase() === genre.toLowerCase());
    return matchedKey ? GENRE_TR[matchedKey] : genre;
}


// Rank icon mapper (SVG ikonlar, emoji yok) — havacılık/gökyüzü rütbe ikonları
function RankIcon({ icon, size = 16, color = 'currentColor' }) {
    const s = { width: size, height: size, flexShrink: 0 };
    if (icon === 'rocket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        </svg>
    );
    if (icon === 'comet') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 3l1.4 3.3L24 8l-3.6 1.7L19 13l-1.4-3.3L14 8l3.6-1.7L19 3z" fill={color} stroke="none"/>
            <path d="M2 20c4-6.5 9.5-9.5 15-11"/>
        </svg>
    );
    if (icon === 'radar') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill={color}/>
            <path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/>
        </svg>
    );
    if (icon === 'wings') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c-1.4 4-4.8 6-10 6 2.3 3.6 6 5 10 3.6"/>
            <path d="M12 3c1.4 4 4.8 6 10 6-2.3 3.6-6 5-10 3.6"/>
            <path d="M12 12.6V21"/>
        </svg>
    );
    if (icon === 'compass') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
    );
    if (icon === 'headset') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-6a9 9 0 1 1 18 0v6a1 1 0 0 1-1 1h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
        </svg>
    );
    if (icon === 'ticket') return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
        </svg>
    );
    return null;
}

// Quest icon mapper
function QuestIcon({ icon, size = 18 }) {
    if (icon === 'sun') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
    );
    if (icon === 'book') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
    );
    if (icon === 'chat') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    );
    if (icon === 'pen') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
    );
    if (icon === 'star') return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    );
    // fallback check icon
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    );
}

function CheckCircleIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    );
}

export default function ProfilePage() {
    const { user, loading, logout, authFetch, updateUser, refreshUser } = useAuth();
    const router = useRouter();
const { settings: siteSettings } = useSettings() || {};
    const pointsName = siteSettings?.points_name || 'Asteria Yıldızı';
    
    // Site-stay heartbeat: her 1 dakikada bir puan için API'ye bildirim gönder
    useEffect(() => {
        if (!user) return;
        const sendHeartbeat = async () => {
            try {
                await authFetch('/api/users/site-stay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ minutes: 1 })
                });
            } catch {}
        };
        // İlk ziyarette görev tamamla
        authFetch('/api/users/site-stay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: 1 })
        }).catch(() => {});
        const interval = setInterval(sendHeartbeat, 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);
    const [tab, setTab] = useState('overview');
    const [msg, setMsg] = useState('');
    const [msgType, setMsgType] = useState('success');

    // Profile form
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [saving, setSaving] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Favorites
    const [favorites, setFavorites] = useState([]);
    const [loadingFavs, setLoadingFavs] = useState(true);

    // Stats
    const [userStats, setUserStats] = useState({ favoriteCount: 0, commentCount: 0 });
    const [detailedStats, setDetailedStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Quests
    const [quests, setQuests] = useState([]);
    const [questLoading, setQuestLoading] = useState(false);
    const [claimingQuest, setClaimingQuest] = useState(null);

    // Reading List
    const [readingList, setReadingList] = useState([]);
    const [readingListStatus, setReadingListStatus] = useState('reading');
    const [loadingReadingList, setLoadingReadingList] = useState(false);

    // Library view state (merged favorites + reading list)
    const [favoritesView, setFavoritesView] = useState('favorites');

    // Badges
    const [badges, setBadges] = useState([]);
    const [customBadges, setCustomBadges] = useState([]);
    const [loadingBadges, setLoadingBadges] = useState(false);

    // Reading history (for overview tab)
    const [readingHistory, setReadingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Image upload states (pending = selected but not saved yet)
    const [pendingAvatar, setPendingAvatar] = useState(null);
    const [pendingCover, setPendingCover] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [showAvatarCrop, setShowAvatarCrop] = useState(false);
    const [showCoverCrop, setShowCoverCrop] = useState(false);
    const [avatarCropData, setAvatarCropData] = useState({ x: 0, y: 0, scale: 1 });
    const [coverCropData, setCoverCropData] = useState({ x: 0, y: 0, scale: 1 });
    const [uploadingImage, setUploadingImage] = useState(false);
    const coverCropRef = useRef(null); // kapak kırpma container genişliğini ölçmek için
    const avatarCropRef = useRef(null); // avatar kırpma ref

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setDisplayName(user.display_name || '');
            setEmail(user.email);
            setAvatarUrl(user.avatar_url || '');
            fetchFavorites();
            fetchQuests();
            fetchDetailedStats();
            fetchReadingList();
            fetchBadges();
            fetchReadingHistory();
        }
    }, [user]);

    

    async function fetchFavorites() {
        try {
            const res = await authFetch('/api/favorites/list');
            const data = await res.json();
            const favs = data.favorites || [];
            setFavorites(favs);
            setUserStats(prev => ({ ...prev, favoriteCount: favs.length }));
        } catch { }
        finally { setLoadingFavs(false); }
    }

    async function fetchReadingHistory() {
        setLoadingHistory(true);
        try {
            const res = await authFetch('/api/users/reading-history');
            if (!res) return;
            const data = await res.json();
            setReadingHistory(data.history || []);
        } catch {}
        finally { setLoadingHistory(false); }
    }

    async function fetchQuests() {
        try {
            const res = await authFetch('/api/users/quests');
            const data = await res.json();
            setQuests(data.quests || []);
        } catch {}
    }

    async function fetchDetailedStats() {
        setLoadingStats(true);
        try {
            const res = await authFetch('/api/users/stats');
            if (!res) { setLoadingStats(false); return; }
            const data = await res.json();
            if (!data.error) setDetailedStats(data);
        } catch {}
        finally { setLoadingStats(false); }
    }

    async function fetchReadingList() {
        setLoadingReadingList(true);
        try {
            const res = await authFetch('/api/reading-list');
            if (!res) return;
            const data = await res.json();
            setReadingList(data.list || []);
        } catch {}
        finally { setLoadingReadingList(false); }
    }

    async function fetchBadges() {
        setLoadingBadges(true);
        try {
            const res = await authFetch('/api/users/badges');
            if (!res) return;
            const data = await res.json();
            setBadges(data.badges || []);
            setCustomBadges(data.customBadges || []);
        } catch {}
        finally { setLoadingBadges(false); }
    }

    async function removeFromReadingList(seriesId) {
        try {
            await authFetch(`/api/reading-list?seriesId=${seriesId}`, { method: 'DELETE' });
            setReadingList(prev => prev.filter(item => item.series_id !== seriesId));
        } catch {}
    }

    async function claimQuest(questId) {
        setClaimingQuest(questId);
        try {
            const res = await authFetch('/api/users/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                show(`${data.message}`, 'success');
                await fetchQuests();
                if (refreshUser) await refreshUser();
            } else {
                show(data.error || 'Başarısız oldu', 'error');
            }
        } catch (err) { show(err.message, 'error'); }
        finally { setClaimingQuest(null); }
    }

    function show(text, type = 'success') {
        setMsg(text); setMsgType(type);
        setTimeout(() => setMsg(''), 4000);
    }

    async function handleProfileUpdate(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await authFetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, avatar_url: avatarUrl, display_name: displayName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            updateUser(data.user);
            show(data.message);
        } catch (err) { show(err.message, 'error'); }
        finally { setSaving(false); }
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
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) { show(err.message, 'error'); }
        finally { setSaving(false); }
    }

    function getMemberDays() {
        if (!user?.created_at) return 0;
        return Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
    }

    function canUpdateAvatar() {
        if (!user?.last_avatar_update) return { canUpdate: true, remainingChanges: 2, nextResetAt: null };
        const msInDay = 24 * 60 * 60 * 1000;
        const lastUpdate = new Date(user.last_avatar_update + 'Z').getTime();
        const diff = Date.now() - lastUpdate;
        if (diff > msInDay) return { canUpdate: true, remainingChanges: 2, nextResetAt: null };
// Use actual DB counter; 0 means no changes yet in this 24h window
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
            // Kırpma modu aktifse canvas kırpma uygula; aksi hâlde orijinal dosyayı gönder
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
        } catch (err) { show(err.message || 'Kırpma işlemi başarısız', 'error'); }
        finally { setUploadingImage(false); }
    }

    async function saveCover() {
        if (!pendingCover || !coverPreview) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            // Kırpma modu aktifse canvas kırpma uygula; aksi hâlde orijinal dosyayı gönder
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
        } catch (err) { show(err.message || 'Kırpma işlemi başarısız', 'error'); }
        finally { setUploadingImage(false); }
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

    if (loading || !user) return <div className="page-loading"><div className="spinner" /></div>;

    const tabs = [
        { id: 'overview', label: 'Genel Bakış', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
        { id: 'favorites', label: 'Kütüphane', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
        { id: 'stats', label: 'İstatistikler', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
        { id: 'badges', label: 'Rozetler', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> },
        { id: 'settings', label: 'Ayarlar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
    ];

    const cultivation = getCultivationData(user.yomi_points);
    const avatarStatus = canUpdateAvatar();
    const coverStatus = canUpdateCover();

    return (
        <div className="page-container page-section fade-in glass-page-container" style={{ paddingTop: 0 }}>

            {/* ── Banner ── */}
            <div className={`prf-banner${user.cover_url ? ' prf-banner-has-cover' : ''}`} style={user.cover_url ? {
                backgroundImage: `url(${encodeURI(user.cover_url)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            } : {
                background: `linear-gradient(135deg, ${cultivation.color}18 0%, rgba(15,15,20,1) 100%)`,
            }}>
                <div className="prf-banner-overlay" />
                {/* dekoratif ışıma */}
                <div style={{ position:'absolute', top:'-30%', right:'-5%', width:320, height:320, background:`radial-gradient(circle, ${cultivation.color}22 0%, transparent 65%)`, filter:'blur(50px)', pointerEvents:'none', zIndex:0 }} />
            </div>

            {/* ── Avatar + Bilgi Satırı ── */}
            <div className="prf-identity">
                {/* Avatar */}
                <div className="prf-avatar-wrap" style={{ borderColor: cultivation.color, boxShadow: `0 0 0 3px ${cultivation.color}40` }}>
                    {(!user.avatar_url || user.avatar_url === '/default-avatar.png') ? (
                        <div style={{ width:'100%', height:'100%', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-tertiary)', color:cultivation.color, fontSize:'2.8rem', fontWeight:800 }}>
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                    ) : (
                        <img src={user.avatar_url} alt="Avatar" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} decoding="async" />
                    )}
                </div>

                {/* İsim + Badges + Rütbe */}
                <div className="prf-identity-info">
                    <h1 className="prf-username">
                        {user.username}
                    </h1>

                    <div className="prf-meta-row">
                        <span className="prf-rank-badge" style={{ background:`${cultivation.color}1a`, color:cultivation.color, borderColor:`${cultivation.color}40` }}>
                            {cultivation.icon && <RankIcon icon={cultivation.icon} size={13} color={cultivation.color} />}
                            {cultivation.title}
                        </span>
                        <span className="prf-days-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {getMemberDays()} Gün Aktif
                        </span>
                        {customBadges.map(b => (
                            <span key={b.id} title={b.label} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:700, padding:'2px 8px', borderRadius:10, background:`${b.color}1a`, border:`1px solid ${b.color}40`, color:b.color }}>
                                <BadgeIcon name={b.icon} size={12} color={b.color} /> {b.label}
                            </span>
                        ))}
                    </div>

                    {/* XP Bar */}
                    <div className="prf-xp-row">
                        <span className="prf-xp-label">{user.yomi_points || 0} {pointsName}</span>
                        <span className="prf-xp-next">{cultivation.nextRank ? `${cultivation.nextRank.title} için ${cultivation.nextRank.minPoints - (user.yomi_points||0)} ${pointsName}` : 'Max. Rütbe'}</span>
                    </div>
                    <div className="prf-xp-bar">
                        <div className="prf-xp-fill" style={{ width:`${cultivation.progressPercent}%`, background:cultivation.progressColor }} />
                    </div>
                </div>

                {/* Hızlı İstatistikler — sağ taraf */}
                <div className="prf-quick-stats">
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => setTab('favorites')}>
                        <span className="prf-qs-num" style={{ color:'#f87171' }}>{favorites.length}</span>
                        <span className="prf-qs-lbl">Favori</span>
                    </button>
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => setTab('stats')}>
                        <span className="prf-qs-num" style={{ color:'#818cf8' }}>{user.yomi_points || 0}</span>
                        <span className="prf-qs-lbl">{pointsName}</span>
                    </button>
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => { setFavoritesView('all'); setTab('favorites'); }}>
                        <span className="prf-qs-num" style={{ color:'#4ade80' }}>{readingList.length}</span>
                        <span className="prf-qs-lbl">Listede</span>
                    </button>
                    <button className="prf-qs-card glass-panel glass-panel-hoverable" onClick={() => setTab('badges')}>
                        <span className="prf-qs-num" style={{ color:'#fbbf24' }}>{badges.filter(b => b.earned).length}</span>
                        <span className="prf-qs-lbl">Rozet</span>
                    </button>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="prf-tabs">
                {tabs.map(t => (
                    <button key={t.id} className={`prf-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {msg && <div className={`alert ${msgType === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>{msg}</div>}

            {/* Overview */}
            {tab === 'overview' && (
                <div className="admin-grid">
                    {/* ── Okuma Geçmişi Kartı — kompakt liste ── */}
                    <div className="admin-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(99,102,241,0.18)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Okuma Geçmişi
                            </span>
                            <a href="/gecmis" style={{ fontSize: '0.7rem', color: 'var(--accent-light)', fontWeight: 500 }}>Tümünü gör →</a>
                        </h3>
                        {loadingHistory ? (
                            <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" /></div>
                        ) : readingHistory.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {readingHistory.slice(0, 5).map(item => (
                                    <a key={item.chapter_id || item.series_id} href={`/read/${item.chapter_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}>
                                        <img
                                            src={item.cover_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='40'%3E%3Crect width='28' height='40' fill='%231a1a2e'/%3E%3C/svg%3E"}
                                            alt={item.series_title || ''}
                                            style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}
                                            loading="lazy" decoding="async" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.series_title || item.title}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bölüm {item.chapter_number}</div>
                                        </div>
                                    </a>
                                ))}
                                {readingHistory.length > 5 && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 4 }}>
                                        +{readingHistory.length - 5} daha fazla
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                Henüz okuma geçmişiniz yok. Manga okumaya başlayın!
                            </p>
                        )}
                    </div>

                    {/* Daily Quests Card */}
                    <div className="admin-card glass-panel">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            Günlük Görevler
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4, marginBottom: 8 }}>
                            {pointsName} kazanmak için görevleri tamamlayın! Bölüm okuyarak, yorum yaparak ve sitede vakit geçirerek puan kazanabilirsiniz.
                        </p>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16, padding: '10px 14px', background: 'rgba(94,114,228,0.08)', borderRadius: 10, border: '1px solid rgba(94,114,228,0.2)', lineHeight: 1.5 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 4, verticalAlign: '-2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><strong style={{ color: 'var(--accent-light)' }}>İpucu:</strong> Sitede her geçirilen dakika için {pointsName} kazanabilirsiniz. Sitede kalın, puan kazanın!
                        </div>
                        <div className="quest-board">
                            {quests.map(q => (
                                <div key={q.id} className={`quest-card ${q.claimed ? 'completed' : ''}`}>
                                    <div className="quest-icon" style={{ background: q.claimed ? undefined : 'var(--bg-tertiary)', color: q.claimed ? undefined : 'var(--text-muted)' }}>
                                        {q.claimed ? <CheckCircleIcon /> : <QuestIcon icon={q.icon} />}
                                    </div>
                                    <div className="quest-info">
                                        <div className="quest-title">{q.title}</div>
                                        <div className="quest-desc">{q.desc}</div>
                                        <div className="quest-progress">
                                            <div className="quest-progress-fill" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
                                        </div>
                                        <div className="quest-progress-text">{q.progress}/{q.target}</div>
                                    </div>
                                    <div className="quest-reward-wrap">
                                        <span className="quest-reward">+{q.reward} {pointsName}</span>
                                        {q.completed && !q.claimed ? (
                                            <button className="quest-claim-btn" onClick={() => claimQuest(q.id)} disabled={claimingQuest === q.id}>
                                                {claimingQuest === q.id ? '...' : 'Ödülü Al'}
                                            </button>
                                        ) : q.claimed ? (
                                            <span className="quest-claimed-text">Alındı</span>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                            {quests.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Görevler yükleniyor...</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Library/Favorites - Merged with Reading List */}
            {tab === 'favorites' && (
                <div>
                    <div className="reading-list-tabs">
                        <button
                            className={`reading-list-tab ${favoritesView === 'favorites' ? 'active' : ''}`}
                            onClick={() => setFavoritesView('favorites')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                            Kütüphanem ({favorites.length})
                        </button>
                        <button
                            className={`reading-list-tab ${favoritesView === 'all' ? 'active' : ''}`}
                            onClick={() => setFavoritesView('all')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Listem ({readingList.length})
                        </button>
                        <button
                            className={`reading-list-tab ${favoritesView === 'reading' ? 'active' : ''}`}
                            onClick={() => setFavoritesView('reading')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                            Okuyor ({readingList.filter(i => i.status === 'reading').length})
                        </button>
                        <button
                            className={`reading-list-tab ${favoritesView === 'completed' ? 'active' : ''}`}
                            onClick={() => setFavoritesView('completed')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            Tamamlandı ({readingList.filter(i => i.status === 'completed').length})
                        </button>
                        <button
                            className={`reading-list-tab ${favoritesView === 'plan' ? 'active' : ''}`}
                            onClick={() => setFavoritesView('plan')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Okuyacak ({readingList.filter(i => i.status === 'plan').length})
                        </button>
                        <button
                            className={`reading-list-tab ${favoritesView === 'dropped' ? 'active' : ''}`}
                            onClick={() => setFavoritesView('dropped')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            Bırakıldı ({readingList.filter(i => i.status === 'dropped').length})
                        </button>
                    </div>

                    {favoritesView === 'favorites' && (
                        loadingFavs ? (
                            <div className="series-grid">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/5' }} />)}</div>
                        ) : favorites.length === 0 ? (
                            <div className="admin-card glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Kütüphaneniz boş</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>Herhangi bir manga sayfasındaki kalp simgesine tıklayarak kütüphanenize seriler ekleyebilirsiniz.</p>
                                <Link href="/seri" className="btn btn-primary btn-sm">Mangalara Göz At</Link>
                            </div>
                        ) : (
                            <div className="series-grid">
                                {favorites.map(s => <SeriesCard key={s.id} series={s} />)}
                            </div>
                        )
                    )}

                    {['all', 'reading', 'completed', 'plan', 'dropped'].includes(favoritesView) && (
                        loadingReadingList ? (
                            <div className="series-grid">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/5' }} />)}</div>
                        ) : (() => {
                            const filtered = favoritesView === 'all' ? readingList : readingList.filter(i => i.status === favoritesView);
                            if (filtered.length === 0) return (
                                <div className="admin-card glass-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>Bu kategoride seri bulunmuyor</p>
                                    <Link href="/seri" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Mangalara Göz At</Link>
                                </div>
                            );
                            return (
                                <div className="series-grid">
                                    {filtered.map(item => (
                                        <div key={item.id} style={{ position: 'relative' }}>
                                            <Link href={`/seri/${item.slug || item.series_id}`}>
                                                <div style={{ background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                    <img src={item.cover_image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='300' height='400' fill='%231a1a2e'/%3E%3Ctext x='150' y='210' text-anchor='middle' fill='%23555' font-size='48'%3EManga%3C/text%3E%3C/svg%3E"} alt={item.title} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} decoding="async" />
                                                    <div style={{ padding: '10px 12px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                                        {item.last_read_chapter && (
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Son okunan: Bölüm {item.last_read_chapter}</div>
                                                        )}
                                                        {item.latest_chapter && (
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Son bölüm: Bölüm {item.latest_chapter}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                            <button onClick={() => removeFromReadingList(item.series_id)}
                                                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                                                title="Listeden kaldır">✕</button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    )}
                </div>
            )}

            {/* Stats */}
            {tab === 'stats' && (
                <div>
                    {loadingStats ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
                    ) : !detailedStats ? (
                        <div className="admin-card glass-panel" style={{ textAlign: 'center', padding: 40 }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>İstatistikler yüklenemedi. Lütfen tekrar deneyin.</p>
                            <button className="btn btn-ghost btn-sm" onClick={fetchDetailedStats}>Tekrar Dene</button>
                        </div>
                    ) : (
                        <>
                            {/* ── Stat Cards Grid ── */}
                            <div className="stats-grid" style={{ marginBottom: 24 }}>

                                {/* Okunan Bölüm */}
                                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam</span>
                                    </div>
                                    <div className="stat-card-value" style={{ color: '#c7d2fe' }}>{detailedStats.totalChapters}</div>
                                    <div className="stat-card-label">Okunan Bölüm</div>
                                </div>

                                {/* Bu Hafta */}
                                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))', border: '1px solid rgba(34,197,94,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Haftalık</span>
                                    </div>
                                    <div className="stat-card-value" style={{ color: '#bbf7d0' }}>{detailedStats.thisWeek}</div>
                                    <div className="stat-card-label">Bu Hafta</div>
                                </div>

                                {/* Bu Ay */}
                                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aylık</span>
                                    </div>
                                    <div className="stat-card-value" style={{ color: '#fde68a' }}>{detailedStats.thisMonth}</div>
                                    <div className="stat-card-label">Bu Ay</div>
                                </div>

                                {/* Yorumlar */}
                                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))', border: '1px solid rgba(236,72,153,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam</span>
                                    </div>
                                    <div className="stat-card-value" style={{ color: '#fbcfe8' }}>{detailedStats.totalComments}</div>
                                    <div className="stat-card-label">Yorumlar</div>
                                </div>

                                {/* Tamamlandı */}
                                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))', border: '1px solid rgba(20,184,166,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(20,184,166,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Liste</span>
                                    </div>
                                    <div className="stat-card-value" style={{ color: '#99f6e4' }}>{detailedStats.listStats.completed}</div>
                                    <div className="stat-card-label">Tamamlandı</div>
                                </div>

                                {/* Okuyor */}
                                <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aktif</span>
                                    </div>
                                    <div className="stat-card-value" style={{ color: '#bfdbfe' }}>{detailedStats.listStats.reading}</div>
                                    <div className="stat-card-label">Okuyor</div>
                                </div>

                                {/* En Çok Okunan Tür — tam genişlik, yeni tasarım */}
                                {detailedStats.topGenre && (
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.10) 60%, rgba(139,92,246,0.06) 100%)',
                                        border: '1px solid rgba(139,92,246,0.30)',
                                        borderRadius: 14,
                                        padding: '20px 24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 20,
                                        boxShadow: '0 4px 24px rgba(139,92,246,0.08)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Dekoratif arka plan efekti */}
                                        <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                        {/* İkon */}
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                                            background: 'linear-gradient(135deg, rgba(139,92,246,0.30), rgba(99,102,241,0.20))',
                                            border: '1px solid rgba(139,92,246,0.40)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#c4b5fd',
                                            boxShadow: '0 4px 16px rgba(139,92,246,0.20)',
                                        }}>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                            </svg>
                                        </div>

                                        {/* Metin */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(196,181,253,0.7)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 6 }}>
                                                En Çok Okunan Tür
                                            </div>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e9d5ff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                                                {getGenreTranslation(detailedStats.topGenre)}
                                            </div>
                                            {detailedStats.topGenreCount != null && (
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(196,181,253,0.6)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                                    {detailedStats.topGenreCount} bölüm okundu
                                                </div>
                                            )}
                                        </div>

                                        {/* Rozet */}
                                        <div className="top-genre-badge" style={{
                                            flexShrink: 0,
                                            background: 'rgba(139,92,246,0.20)',
                                            border: '1px solid rgba(139,92,246,0.35)',
                                            borderRadius: 20, padding: '6px 14px',
                                            fontSize: '0.72rem', fontWeight: 800,
                                            color: '#c4b5fd', letterSpacing: '0.5px',
                                            textTransform: 'uppercase',
                                        }}>
                                            #1 Favori
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Aktivite Grafiği ── */}
                            {detailedStats.dailyActivity.length > 0 && (
                                <div style={{
                                    marginBottom: 20,
                                    padding: '22px 24px',
                                    borderRadius: 18,
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.07) 100%)',
                                    border: '1px solid rgba(99,102,241,0.18)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    {/* Dekoratif orb */}
                                    <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Son 30 Günlük Aktivite</div>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(129,140,248,0.7)', marginTop: 2 }}>
                                                    {detailedStats.dailyActivity.reduce((s, d) => s + d.count, 0)} bölüm okundu
                                                </div>
                                            </div>
                                        </div>
                                        {/* Aktif gün sayısı */}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a5b4fc', lineHeight: 1 }}>
                                                {detailedStats.dailyActivity.filter(d => d.count > 0).length}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(129,140,248,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Aktif Gün</div>
                                        </div>
                                    </div>

                                    {/* Grafik */}
                                    <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 2px' }}>
                                        {(() => {
                                            const max = Math.max(...detailedStats.dailyActivity.map(x => x.count), 1);
                                            return detailedStats.dailyActivity.map((d, idx) => {
                                                const pct = (d.count / max) * 100;
                                                const isEmpty = d.count === 0;
                                                const isToday = idx === detailedStats.dailyActivity.length - 1;
                                                // Haftanın başını belirle (7'nin katı olan bar'lar hafif farklı)
                                                const isWeekBoundary = (detailedStats.dailyActivity.length - 1 - idx) % 7 === 0 && !isToday;
                                                return (
                                                    <div
                                                        key={d.date}
                                                        title={`${d.date}: ${d.count} bölüm`}
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            height: `${Math.max(pct, isEmpty ? 6 : 8)}%`,
                                                            background: isEmpty
                                                                ? 'rgba(99,102,241,0.10)'
                                                                : isToday
                                                                    ? 'linear-gradient(to top, #6366f1, #a5b4fc)'
                                                                    : pct > 70
                                                                        ? 'linear-gradient(to top, #6366f1, #8b5cf6)'
                                                                        : pct > 40
                                                                            ? 'rgba(99,102,241,0.65)'
                                                                            : 'rgba(99,102,241,0.35)',
                                                            borderRadius: '4px 4px 2px 2px',
                                                            transition: 'all 0.25s ease',
                                                            cursor: 'default',
                                                            boxShadow: isToday ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                                                            outline: isWeekBoundary ? '1px solid rgba(139,92,246,0.25)' : 'none',
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (!isEmpty) e.currentTarget.style.opacity = '0.85';
                                                            e.currentTarget.style.transform = 'scaleY(1.05)';
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.opacity = '1';
                                                            e.currentTarget.style.transform = '';
                                                        }}
                                                    />
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Hafta etiketleri */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.62rem', color: 'rgba(99,102,241,0.5)' }}>
                                        <span>30 gün önce</span>
                                        <span>3 hafta önce</span>
                                        <span>2 hafta önce</span>
                                        <span>1 hafta önce</span>
                                        <span style={{ color: '#818cf8', fontWeight: 700 }}>Bugün</span>
                                    </div>
                                </div>
                            )}

                            {/* ── Son Aktiviteler ── */}
                            {detailedStats.recentReads.length > 0 && (
                                <div className="admin-card glass-panel" style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Son Aktiviteler</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {detailedStats.recentReads.map((r, idx) => (
                                            <Link key={r.id} href={`/read/${r.id}`} style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                textDecoration: 'none',
                                                background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
                                            >
                                                <img
                                                    src={r.cover_image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='48'%3E%3Crect width='36' height='48' fill='%231a1a2e'/%3E%3Ctext x='18' y='28' text-anchor='middle' fill='%23555' font-size='16'%3EIMG%3C/text%3E%3C/svg%3E"}
                                                    alt={r.series_title}
                                                    style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)', flexShrink: 0 }} decoding="async" />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.series_title}</div>
                                                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                                        Bölüm {r.chapter_number}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', flexShrink: 0, background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: 6 }}>
                                                    {new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Badges */}
            {tab === 'badges' && (
                <div>
                    {/* ── Admin-assigned / Custom Badges Section ── */}
                    {customBadges.length > 0 && (
                        <div style={{ marginBottom: 28 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                Özel Rozetler
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>— Yönetici tarafından verildi</span>
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {customBadges.map(b => (
                                    <div key={b.id} style={{
                                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                        padding: '14px 18px', borderRadius: 12,
                                        background: `${b.color}14`,
                                        border: `1px solid ${b.color}44`,
                                        minWidth: 90, textAlign: 'center',
                                        position: 'relative',
                                    }}>
                                        {b.is_new && <div className="badge-new-dot" />}
                                        <span style={{ fontSize: '2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: b.color }}><BadgeIcon name={b.icon} size={32} color={b.color} /></span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: b.color }}>{b.label}</span>
                                        {b.earned_at && (
                                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                                {new Date(b.earned_at).toLocaleDateString('tr-TR')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Achievement Badges Section ── */}
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                        Başarı Rozetleri
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
                        Bölümleri okuyarak, yorum yazarak ve serileri tamamlayarak rozetler kazanın.
                    </p>
                    {loadingBadges ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
                    ) : (
                        <div className="badges-grid">
                            {badges.map(b => {
                                const iconSvg = {
                                    book:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
                                    chat:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                                    heart: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
                                    sun:   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
                                    star:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
                                    crown: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 19h20l-2-10-5 5-3-8-3 8-5-5L2 19z"/><rect x="2" y="20" width="20" height="2" rx="1"/></svg>,
                                    check: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                                    moon:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
                                    coin:  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1M9.07 9.07A3 3 0 0 1 12 8a3 3 0 0 1 3 3c0 1.5-1 2.5-3 3s-3 1.5-3 3a3 3 0 0 0 3 3 3 3 0 0 0 2.93-2"/></svg>,
                                };
                                return (
                                    <div key={b.id} className={`badge-card glass-panel ${b.earned ? 'earned' : 'locked'}`} title={b.description}>
                                        {b.is_new && <div className="badge-new-dot" />}
                                        <div className="badge-card-icon" style={{ color: b.earned ? b.color : 'var(--text-muted)', filter: b.earned ? 'none' : 'grayscale(1)', opacity: b.earned ? 1 : 0.4 }}>
                                            {iconSvg[b.icon] || <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>}
                                        </div>
                                        <div className="badge-card-name" style={{ color: b.earned ? b.color : 'var(--text-muted)' }}>{b.name}</div>
                                        <div className="badge-card-desc">{b.description}</div>
                                        {b.earned && b.earned_at && (
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                {new Date(b.earned_at).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Settings */}
            {tab === 'settings' && (
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

                        {/* Avatar Upload UI - YENİ SİSTEM */}
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
                                {/* Mevcut Avatar */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                                        border: '3px solid var(--accent)', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                                        margin: '0 auto 6px'
                                    }}>
                                        {(user.avatar_url && user.avatar_url !== '/default-avatar.png') ? (
                                            <img src={user.avatar_url} alt="Mevcut" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                        ) : (
                                            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{user.username?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mevcut</div>
                                </div>

                                {/* Ok işareti */}
                                {pendingAvatar && (
                                    <div style={{ color: 'var(--accent)', flexShrink: 0 }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                    </div>
                                )}

                                {/* Yeni Önizleme */}
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
                                    {/* Kırpma ipucu */}
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        Görseli sürükleyerek konumlandırın, slider ile zoom yapın
                                    </div>

                                    {/* Ana Kırpma Alanı */}
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

                                    {/* Zoom Kontrolü */}
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

                                    {/* Sıfırla Butonu */}
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

                            {/* Dosya Yükleme ve Aksiyonlar */}
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

                        {/* Cover Upload UI - YENİ SİSTEM */}
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

                            {/* Önceki ve Yeni Karşılaştırma */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                                {/* Mevcut Cover */}
                                <div>
                                    <div style={{
                                        width: '100%', height: 80, borderRadius: 8, overflow: 'hidden',
                                        border: '2px solid var(--border-color)',
                                        background: 'var(--bg-tertiary)',
                                        position: 'relative'
                                    }}>
                                        {user.cover_url ? (
                                            <img src={user.cover_url} alt="Mevcut" style={{ width: '100%', height: '100%', objectFit: 'cover' }} decoding="async" />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                Kapak yok
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>Mevcut</div>
                                </div>

                                {/* Ok işareti */}
                                {pendingCover && (
                                    <div style={{ color: 'var(--accent)' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                    </div>
                                )}

                                {/* Yeni Önizleme */}
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

                            {/* Kırpma Alanı */}
                            {showCoverCrop && coverPreview && (
                                <div style={{ 
                                    background: 'rgba(0,0,0,0.3)', 
                                    padding: 20, 
                                    borderRadius: 12, 
                                    marginBottom: 16, 
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {/* Kırpma ipucu */}
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        Görseli sürükleyerek konumlandırın, slider ile zoom yapın
                                    </div>

                                    {/* Ana Kırpma Alanı */}
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

                                    {/* Zoom Kontrolü */}
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

                                    {/* Sıfırla Butonu */}
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

                            {/* Dosya Yükleme ve Aksiyonlar */}
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
            )}
        </div>
    );
}
