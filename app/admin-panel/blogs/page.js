'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

// Gemini free-tier'ın (gemini-3.5-flash-lite) 15 istek/dk limitine saygılı,
// altında güvenli pay bırakan aralık (~13/dk hedefliyor)
const AUTOPILOT_INTERVAL_MS = 4500;
const AUTOPILOT_LOG_MAX = 25;

export default function AdminBlogsPage() {
    const { user, loading: authLoading, authFetch } = useAuth();
    const router = useRouter();

    const [blogs, setBlogs] = useState([]);
    const [seriesWithoutBlog, setSeriesWithoutBlog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [genLoadingId, setGenLoadingId] = useState(null);
    const [deleteLoadingSlug, setDeleteLoadingSlug] = useState(null);
    const [toast, setToast] = useState('');
    const [topicInput, setTopicInput] = useState('');
    const [topicBusy, setTopicBusy] = useState(false);

    // Gemini API anahtarı durumu (anahtarın kendisi sunucudan hiç dönmez)
    const [geminiStatus, setGeminiStatus] = useState(null); // { configured, source } | null
    const [geminiKeyInput, setGeminiKeyInput] = useState('');
    const [geminiSaving, setGeminiSaving] = useState(false);

    // Kuyruk (otomatik/toplu üretim) state'i
    const [queueCounts, setQueueCounts] = useState({});
    const [queueRecent, setQueueRecent] = useState([]);
    const [queueLoading, setQueueLoading] = useState(false);
    const [enqueueCount, setEnqueueCount] = useState(10);
    const [enqueueBusy, setEnqueueBusy] = useState(null);
    const [processBusy, setProcessBusy] = useState(false);

    // Otomatik Pilot (canlı) state'i — bu sayfa açıkken 5 istek/dk hızında
    // rastgele blog üretmeye devam eder, sekme kapanınca/sayfadan çıkınca durur.
    const [autopilotOn, setAutopilotOn] = useState(false);
    const [autopilotTick, setAutopilotTick] = useState(false);
    const [autopilotLog, setAutopilotLog] = useState([]);
    const [autopilotCount, setAutopilotCount] = useState(0);
    const autopilotOnRef = useRef(false);
    const autopilotTimerRef = useRef(null);
    const authFetchRef = useRef(authFetch);
    authFetchRef.current = authFetch;

    useEffect(() => {
        if (!authLoading && (!user || !['admin', 'manager'].includes(user.role))) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await authFetch('/api/admin/blogs');
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Yüklenemedi'); setLoading(false); return; }
            setBlogs(data.blogs || []);
            setSeriesWithoutBlog(data.seriesWithoutBlog || []);
            try {
                const gres = await authFetch('/api/admin/blogs/gemini-key');
                if (gres.ok) setGeminiStatus(await gres.json());
            } catch { /* durum okunamazsa banner gizli kalır */ }
        } catch {
            setError('Yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    useEffect(() => {
        if (user && ['admin', 'manager'].includes(user.role)) load();
    }, [user, load]);

    const loadQueue = useCallback(async () => {
        setQueueLoading(true);
        try {
            const res = await authFetch('/api/admin/blogs/queue');
            const data = await res.json();
            if (res.ok) {
                setQueueCounts(data.counts || {});
                setQueueRecent(data.recent || []);
            }
        } catch { /* sessizce geç, kritik değil */ }
        finally { setQueueLoading(false); }
    }, [authFetch]);

    useEffect(() => {
        if (user && ['admin', 'manager'].includes(user.role)) loadQueue();
    }, [user, loadQueue]);

    async function enqueue(mode) {
        setEnqueueBusy(mode);
        try {
            const res = await authFetch('/api/admin/blogs/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, count: enqueueCount }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Kuyruğa eklenemedi'); return; }
            showToast(`${data.inserted} iş kuyruğa eklendi ✓`);
            await loadQueue();
        } catch {
            showToast('Kuyruğa eklenemedi');
        } finally {
            setEnqueueBusy(null);
        }
    }

    async function clearQueue() {
        if (!confirm('Bekleyen tüm kuyruk işlerini silmek istediğinize emin misiniz?')) return;
        try {
            const res = await authFetch('/api/admin/blogs/queue', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Temizlenemedi'); return; }
            showToast(`${data.deleted} iş silindi`);
            await loadQueue();
        } catch {
            showToast('Temizlenemedi');
        }
    }

    async function processNow() {
        setProcessBusy(true);
        try {
            const res = await authFetch('/api/admin/blogs/queue/process?batch=1', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'İşlenemedi'); return; }
            if (data.processed === 0) { showToast('Kuyruk zaten boş'); }
            else {
                const r = data.results[0];
                showToast(r.ok ? 'İşlendi ✓' : `Hata: ${r.error}`);
            }
            await loadQueue();
            await load();
        } catch {
            showToast('İşlenemedi');
        } finally {
            setProcessBusy(false);
        }
    }

    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(''), 3500);
    }

    // ── Otomatik Pilot (canlı, düğmeyle başlat/durdur) ──────────────────
    const runAutopilotTick = useCallback(async () => {
        if (!autopilotOnRef.current) return;
        setAutopilotTick(true);
        try {
            const res = await authFetchRef.current('/api/admin/blogs/autopilot', { method: 'POST' });
            const data = await res.json();
            setAutopilotLog((prev) => [
                {
                    time: new Date().toLocaleTimeString('tr-TR'),
                    ok: res.ok && data.ok,
                    kindLabel: data.kindLabel || (data.error ? 'Hata' : '—'),
                    label: data.label || data.error || 'Bilinmeyen hata',
                },
                ...prev,
            ].slice(0, AUTOPILOT_LOG_MAX));
            if (res.ok && data.ok) {
                setAutopilotCount((c) => c + 1);
                // Liste ve kuyruk sayaçlarını arka planda tazele (sessizce, hata olursa önemli değil)
                load();
                loadQueue();
            }
        } catch {
            setAutopilotLog((prev) => [
                { time: new Date().toLocaleTimeString('tr-TR'), ok: false, kindLabel: 'Hata', label: 'İstek gönderilemedi' },
                ...prev,
            ].slice(0, AUTOPILOT_LOG_MAX));
        } finally {
            setAutopilotTick(false);
            if (autopilotOnRef.current) {
                autopilotTimerRef.current = setTimeout(runAutopilotTick, AUTOPILOT_INTERVAL_MS);
            }
        }
    }, [load, loadQueue]);

    function toggleAutopilot() {
        if (autopilotOnRef.current) {
            autopilotOnRef.current = false;
            setAutopilotOn(false);
            if (autopilotTimerRef.current) clearTimeout(autopilotTimerRef.current);
            showToast('Otomatik pilot durduruldu');
        } else {
            autopilotOnRef.current = true;
            setAutopilotOn(true);
            showToast('Otomatik pilot başladı — bu sayfa açık kaldığı sürece ~5 istek/dk hızında üretecek');
            runAutopilotTick();
        }
    }

    // Sayfadan ayrılınca (unmount) otomatik pilotu kesinlikle durdur
    useEffect(() => {
        return () => {
            autopilotOnRef.current = false;
            if (autopilotTimerRef.current) clearTimeout(autopilotTimerRef.current);
        };
    }, []);

    async function generateFor(seriesId) {
        setGenLoadingId(seriesId);
        try {
            const res = await authFetch('/api/admin/blogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ series_id: seriesId }),
            });
            // Sunucu zaman aşımına düşerse (504) gövde JSON olmaz; res.json() patlayıp
            // hep aynı belirsiz "Blog üretilemedi" mesajını gösteriyordu.
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(data.error || (res.status === 504
                    ? 'Sunucu zaman aşımına uğradı (504). Tekrar deneyin; sürerse Vercel loglarına bakın.'
                    : `Blog üretilemedi (HTTP ${res.status})`));
                setGenLoadingId(null);
                return;
            }
            if (!data.blog) { showToast('Sunucu 200 döndü ama blog nesnesi yok — DB hatası olabilir, Vercel loglarını kontrol edin.'); setGenLoadingId(null); return; }
            showToast(`Blog yazısı oluşturuldu ✓ — /blog/${data.blog.slug}`);
            await load();
        } catch {
            showToast('Blog üretilemedi');
        } finally {
            setGenLoadingId(null);
        }
    }

    async function generateFromTopic() {
        const topic = topicInput.trim();
        if (topic.length < 3) { showToast('Önce bir konu/başlık yazın'); return; }
        setTopicBusy(true);
        try {
            const res = await authFetch('/api/admin/blogs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(data.error || (res.status === 504
                    ? 'Sunucu zaman aşımına uğradı (504). Tekrar deneyin.'
                    : `Blog üretilemedi (HTTP ${res.status})`));
                return;
            }
            if (!data.blog) { showToast('Sunucu blog nesnesi döndürmedi — logları kontrol edin.'); return; }
            showToast(`Yayınlandı ✓ — /blog/${data.blog.slug}`);
            setTopicInput('');
            await load();
        } catch {
            showToast('Blog üretilemedi');
        } finally {
            setTopicBusy(false);
        }
    }

    async function deleteBlog(slug) {
        if (!confirm('Bu blog yazısını silmek istediğinize emin misiniz?')) return;
        setDeleteLoadingSlug(slug);
        try {
            const res = await authFetch(`/api/blogs/${encodeURIComponent(slug)}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Silinemedi'); setDeleteLoadingSlug(null); return; }
            showToast('Silindi');
            await load();
        } catch {
            showToast('Silinemedi');
        } finally {
            setDeleteLoadingSlug(null);
        }
    }

    if (authLoading || (loading && blogs.length === 0 && !error)) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
    }

    if (!user || !['admin', 'manager'].includes(user.role)) return null;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>AI Blog Yönetimi</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Yeni seri eklendiğinde blog otomatik oluşur. Buradan mevcut serileri backfill edebilir, yeniden üretebilir veya silebilirsiniz.
                    </p>
                </div>
                <Link href="/blog" className="btn btn-secondary">Bloglar sayfasını gör →</Link>
            </div>

            {toast && (
                <div style={{ position: 'fixed', top: 90, right: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '10px 18px', borderRadius: 10, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', fontSize: '0.88rem' }}>
                    {toast}
                </div>
            )}

            {error && <div style={{ color: '#ef4444', marginBottom: 20 }}>{error}</div>}

            {geminiStatus && (
                <div className="glass-panel" style={{ padding: 16, borderRadius: 14, marginBottom: 24, border: geminiStatus.configured ? '1px solid #22c55e' : '1px solid #ef4444' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        Gemini API Anahtarı: {geminiStatus.configured
                            ? `ayarlı ✓ (${geminiStatus.source === 'database' ? 'panelden girildi' : 'ortam değişkeni'})`
                            : 'ayarlı DEĞİL — blog üretilemez'}
                    </div>
                    {user?.role === 'admin' && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                                type="password"
                                autoComplete="off"
                                value={geminiKeyInput}
                                onChange={e => setGeminiKeyInput(e.target.value)}
                                placeholder="AIza... (aistudio.google.com/apikey)"
                                style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'inherit' }}
                            />
                            <button
                                className="btn btn-primary"
                                disabled={geminiSaving || !geminiKeyInput.trim()}
                                onClick={async () => {
                                    setGeminiSaving(true);
                                    try {
                                        const r = await authFetch('/api/admin/blogs/gemini-key', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ key: geminiKeyInput.trim() }),
                                        });
                                        const d = await r.json();
                                        if (!r.ok) { showToast(d.error || 'Kaydedilemedi'); }
                                        else { setGeminiStatus({ configured: d.configured, source: d.source }); setGeminiKeyInput(''); showToast('Gemini anahtarı kaydedildi ✓'); }
                                    } catch { showToast('Kaydedilemedi'); }
                                    setGeminiSaving(false);
                                }}
                            >
                                {geminiSaving ? 'Kaydediliyor…' : 'Kaydet'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="glass-panel" style={{ padding: 20, borderRadius: 14, marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>Konudan Blog Üret</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                    Bir konu veya başlık yazın; üretilen yazı <b>otomatik yayınlanır</b> ve herkese açık Bloglar sayfasında görünür.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={topicInput}
                        maxLength={200}
                        onChange={e => setTopicInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !topicBusy) generateFromTopic(); }}
                        placeholder="Örn: En iyi isekai manhwa önerileri"
                        style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'inherit' }}
                    />
                    <button className="btn btn-primary" disabled={topicBusy || topicInput.trim().length < 3} onClick={generateFromTopic}>
                        {topicBusy ? 'Üretiliyor…' : 'Üret ve Yayınla'}
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 20, borderRadius: 14, marginBottom: 32, border: autopilotOn ? '1px solid #22c55e' : undefined }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Otomatik Pilot (Canlı)
                    {autopilotOn && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 999 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            ÇALIŞIYOR
                        </span>
                    )}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                    Başlat'a basınca, bu sayfa açık kaldığı sürece yaklaşık 5 istek/dakika hızında
                    (Gemini'nin gerçek limitine uygun aralıklarla) rastgele blog üretmeye devam eder —
                    bazen bir seri tanıtımı, bazen yeni bölüm duyurusu, bazen sitedeki hiçbir seriyle
                    sınırlı olmayan genel bir manga/manhwa konusu. Sekmeyi kapatırsan veya sayfadan
                    ayrılırsan durur; sen yokken de arka planda devam etmesini istiyorsan aşağıdaki
                    kuyruk sistemini kullan.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: autopilotLog.length ? 16 : 0 }}>
                    <button
                        className="btn btn-primary"
                        style={autopilotOn ? { background: '#ef4444', borderColor: '#ef4444' } : undefined}
                        onClick={toggleAutopilot}
                    >
                        {autopilotOn ? 'Durdur' : 'Başlat'}
                    </button>
                    {autopilotOn && autopilotTick && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>üretiyor…</span>}
                    {autopilotCount > 0 && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Bu oturumda üretilen: <b style={{ color: '#22c55e' }}>{autopilotCount}</b>
                        </span>
                    )}
                </div>
                {autopilotLog.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                        {autopilotLog.map((l, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.78rem', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 68 }}>{l.time}</span>
                                <span style={{
                                    padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', minWidth: 74, textAlign: 'center',
                                    background: l.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: l.ok ? '#22c55e' : '#ef4444',
                                }}>{l.kindLabel}</span>
                                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{l.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <details className="glass-panel" style={{ padding: 20, borderRadius: 14, marginBottom: 32 }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Gelişmiş: Kuyruklu Toplu Üretim (isteğe bağlı, dokunmana gerek yok)
                </summary>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '12px 0 16px' }}>
                    Yukarıdaki "Otomatik Pilot" çoğu durumda yeterli. Bu bölüm sadece, panel kapalıyken/sen
                    sitede değilken de günlerce arka planda üretim istiyorsan ve dış bir zamanlayıcı
                    kurmayı biliyorsan işine yarar — istemiyorsan hiç açmana gerek yok.
                </p>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    <span>Bekleyen: <b>{queueCounts.pending || 0}</b></span>
                    <span>İşleniyor: <b>{queueCounts.processing || 0}</b></span>
                    <span style={{ color: '#22c55e' }}>Tamamlanan: <b>{queueCounts.done || 0}</b></span>
                    <span style={{ color: '#ef4444' }}>Hatalı: <b>{queueCounts.failed || 0}</b></span>
                    {queueLoading && <span style={{ color: 'var(--text-muted)' }}>yükleniyor…</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ekleme adedi:</label>
                    <input
                        type="number" min={1} max={200} value={enqueueCount}
                        onChange={(e) => setEnqueueCount(parseInt(e.target.value, 10) || 1)}
                        style={{ width: 70, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <button className="btn btn-secondary" disabled={!!enqueueBusy} onClick={() => enqueue('missing_series')}>
                        {enqueueBusy === 'missing_series' ? '…' : 'Blogu Olmayan Serileri Ekle'}
                    </button>
                    <button className="btn btn-secondary" disabled={!!enqueueBusy} onClick={() => enqueue('all_series')}>
                        {enqueueBusy === 'all_series' ? '…' : 'Rastgele Serilerden Ekle (tüm site)'}
                    </button>
                    <button className="btn btn-secondary" disabled={!!enqueueBusy} onClick={() => enqueue('chapters')}>
                        {enqueueBusy === 'chapters' ? '…' : 'Son Bölümlerden Ekle'}
                    </button>
                    <button className="btn btn-secondary" disabled={!!enqueueBusy} onClick={() => enqueue('topics')}>
                        {enqueueBusy === 'topics' ? '…' : 'Genel Manga Konularından Ekle'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" disabled={processBusy} onClick={processNow}>
                        {processBusy ? 'İşleniyor…' : 'Şimdi 1 Tanesini İşle'}
                    </button>
                    <button className="btn btn-secondary" style={{ color: '#ef4444' }} onClick={clearQueue}>
                        Bekleyenleri Temizle
                    </button>
                    <button className="btn btn-secondary" onClick={loadQueue}>Yenile</button>
                </div>

                {queueRecent.length > 0 && (
                    <div style={{ marginTop: 18, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Son kuyruk işleri:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                            {queueRecent.map(q => (
                                <div key={q.id} style={{ display: 'flex', gap: 10, fontSize: '0.78rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem',
                                        background: q.status === 'done' ? 'rgba(34,197,94,0.15)' : q.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                                        color: q.status === 'done' ? '#22c55e' : q.status === 'failed' ? '#ef4444' : 'var(--text-secondary)',
                                    }}>{q.status}</span>
                                    <span>{q.kind}</span>
                                    <span style={{ flex: 1 }}>{q.series_title || q.topic || (q.chapter_number ? `Bölüm ${q.chapter_number}` : '—')}</span>
                                    {q.error && <span style={{ color: '#ef4444' }} title={q.error}>hata</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </details>

            {seriesWithoutBlog.length > 0 && (
                <div className="glass-panel" style={{ padding: 20, borderRadius: 14, marginBottom: 32 }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
                        Blogu Olmayan Seriler ({seriesWithoutBlog.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {seriesWithoutBlog.map(s => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                {s.cover_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={s.cover_url} alt={s.title} style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                )}
                                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{s.title}</span>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                                    disabled={genLoadingId === s.id}
                                    onClick={() => generateFor(s.id)}
                                >
                                    {genLoadingId === s.id ? 'Oluşturuluyor…' : 'Blog Oluştur'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: 20, borderRadius: 14 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
                    Tüm Bloglar ({blogs.length})
                </h2>
                {blogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '20px 0' }}>Henüz blog yazısı yok.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {blogs.map(b => (
                            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                                <span style={{ flex: 1, minWidth: 200, fontSize: '0.9rem', fontWeight: 600 }}>{b.title}</span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                                    {b.chapter_id ? 'Bölüm' : b.series_id ? 'Seri' : 'Genel'}
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: b.status === 'published' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: b.status === 'published' ? '#22c55e' : '#ef4444' }}>
                                    {b.status === 'published' ? 'Yayında' : 'Taslak'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.series_title || '—'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.views || 0} görüntülenme</span>
                                <Link href={`/blog/${b.slug}`} target="_blank" className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>Görüntüle</Link>
                                {b.series_id && !b.chapter_id && (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                                        disabled={genLoadingId === b.series_id}
                                        onClick={() => generateFor(b.series_id)}
                                        title="Bu blogu silip aynı seri için yeniden üretir"
                                    >
                                        {genLoadingId === b.series_id ? '…' : 'Yeniden Üret'}
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '5px 12px', fontSize: '0.78rem', color: '#ef4444' }}
                                    disabled={deleteLoadingSlug === b.slug}
                                    onClick={() => deleteBlog(b.slug)}
                                >
                                    {deleteLoadingSlug === b.slug ? '…' : 'Sil'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
