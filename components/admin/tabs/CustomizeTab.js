'use client';

import React from 'react';
import { PaletteIcon, UploadIcon, GlobeIcon, KeyIcon, DashIcon } from '../AdminIcons';

export default function CustomizeTab({
    customize,
    setCustomize,
    saveCustomize,
    customizeSubmitting,
    assetUploading,
    handleSiteAssetUpload,
    logoUploadRef,
    faviconUploadRef,
    watermarkUploadRef,
    pageBgUploadRef,
    chapterStartImageUploading,
    chapterStartImageMsg,
    chapterStartImageFile,
    setChapterStartImageFile,
    handleChapterStartImageUpload,
    saveChapterStartImageSettings,
    chapterEndImageUploading,
    chapterEndImageMsg,
    chapterEndImageFile,
    setChapterEndImageFile,
    handleChapterEndImageUpload,
    saveChapterEndImageSettings,
    gIndexingKey,
    setGIndexingKey,
    gIndexingLoading,
    setGIndexingLoading,
    gIndexingTestUrl,
    setGIndexingTestUrl,
    gIndexingTestResult,
    setGIndexingTestResult,
    authFetch,
    show,
}) {
    return (
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

    );
}
