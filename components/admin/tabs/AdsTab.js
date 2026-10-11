'use client';

import React from 'react';
import { AdsIcon, EyeIcon } from '../AdminIcons';

export default function AdsTab({
    adSettings,
    setAdSettings,
    adSettingsSubmitting,
    saveAdsSettings,
    adPreview,
    setAdPreview,
    alertPopup,
    setAlertPopup,
    alertPopupSubmitting,
    saveAlertPopupSettings,
}) {
    const adPlacements = [
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
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
        },
        {
            key: 'footer',
            label: 'Alt Banner Reklam',
            desc: 'Sayfanın footer bölümünün üstünde gösterilen reklam.',
            color: 'rgba(139,92,246,0.04)',
            border: 'rgba(139,92,246,0.25)',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="11" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1"/></svg>,
        },
    ];

    return (
        <>
            <div className="admin-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AdsIcon /> Reklam Yönetimi
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                    Farklı sayfa konumları için reklam kodları (AdSense, HTML/JS banner, vb.) ekleyin. Her konumu bağımsız olarak etkinleştirebilirsiniz.
                </p>

                {adPlacements.map(({ key, label, desc, color, border, icon }) => {
                    const enabledKey = `ad_${key}_enabled`;
                    const codeKey = `ad_${key}_code`;
                    const isEnabled = adSettings[enabledKey] === '1';
                    return (
                        <div key={key} style={{ padding: 20, background: color, borderRadius: 10, border: `1px solid ${border}`, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                    {icon} {label}
                                </h4>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <div
                                        onClick={() => setAdSettings(prev => ({ ...prev, [enabledKey]: isEnabled ? '0' : '1' }))}
                                        style={{
                                            width: 44, height: 24, borderRadius: 12, position: 'relative',
                                            background: isEnabled ? 'var(--accent)' : 'var(--border-color)',
                                            transition: 'background 0.2s', cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', top: 3, left: isEnabled ? 22 : 3,
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isEnabled ? 'var(--accent)' : 'var(--text-muted)' }}>
                                        {isEnabled ? 'Aktif' : 'Devre Dışı'}
                                    </span>
                                </label>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>{desc}</p>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.78rem' }}>Reklam Kodu (HTML / JS)</label>
                                <textarea
                                    className="form-input"
                                    rows={4}
                                    placeholder={'<script async src="https://pagead2.googlesyndication.com/..."></script>\n<ins className="adsbygoogle" ...></ins>'}
                                    value={adSettings[codeKey]}
                                    onChange={e => setAdSettings(prev => ({ ...prev, [codeKey]: e.target.value }))}
                                    style={{ fontFamily: 'monospace', fontSize: '0.76rem', resize: 'vertical' }}
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
                                <div style={{ marginTop: 10, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px dashed var(--border-color)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                                        Canlı Önizleme (sandbox)
                                    </div>
                                    <iframe
                                        srcDoc={adSettings[codeKey]}
                                        sandbox="allow-scripts"
                                        title={`${key} reklam önizleme`}
                                        style={{ width: '100%', minHeight: 120, border: 'none', borderRadius: 4 }}
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

            {/* Popup Alert (Uyari Kutusu) */}
            <div className="admin-card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Uyarı Popup'ı (Özelleştirilebilir)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                    Adblock uyarısı, ekip alımı, duyuru vb. için özelleştirilebilir bir popup kutusu. Ziyaretçilere sitede gösterilir.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* Durum & Tip */}
                    <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Popup Durumu</label>
                            <div onClick={() => setAlertPopup(p => ({ ...p, alert_popup_enabled: p.alert_popup_enabled === '1' ? '0' : '1' }))}
                                style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                                    background: alertPopup.alert_popup_enabled === '1' ? 'var(--accent)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                <div style={{ position: 'absolute', top: 3, left: alertPopup.alert_popup_enabled === '1' ? 22 : 3,
                                    width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                            </div>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>Popup Tipi / Amaci</label>
                            <select className="form-input" value={alertPopup.alert_popup_type}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_type: e.target.value }))}>
                                <option value="info">Bilgilendirme (Info)</option>
                                <option value="warning">Uyarı (Warning)</option>
                                <option value="recruitment">Ekip Alımı</option>
                                <option value="custom">Özel (Custom)</option>
                                <option value="adblock">Adblock Tarzı</option>
                            </select>
                        </div>
                    </div>

                    {/* Session / Goster */}
                    <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Oturum Başına Göster</label>
                            <div onClick={() => setAlertPopup(p => ({ ...p, alert_popup_show_once: p.alert_popup_show_once === '1' ? '0' : '1' }))}
                                style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                                    background: alertPopup.alert_popup_show_once === '1' ? 'var(--accent)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                <div style={{ position: 'absolute', top: 3, left: alertPopup.alert_popup_show_once === '1' ? 22 : 3,
                                    width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: '0.78rem' }}>Gösterim Aralığı</label>
                            <select className="form-input" value={alertPopup.alert_popup_interval}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_interval: e.target.value }))}>
                                <option value="always">Her Zaman</option>
                                <option value="daily">Günde Bir</option>
                                <option value="every_3_hours">3 Saatte Bir</option>
                                <option value="hourly">Saatte Bir</option>
                                <option value="session">Oturum Başına Bir</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>İkon / Emoji (opsiyonel)</label>
                            <input className="form-input" placeholder="örnek: 🛡️ 🎉 📢" value={alertPopup.alert_popup_icon}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_icon: e.target.value }))} />
                        </div>
                    </div>
                </div>

                {/* Baslik & Mesaj */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Popup Başlığı</label>
                        <input className="form-input" placeholder="örnek: Reklam Engelleyici Tespit Edildi" value={alertPopup.alert_popup_title}
                            onChange={e => setAlertPopup(p => ({ ...p, alert_popup_title: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Arka Plan Rengi (opsiyonel)</label>
                        <input className="form-input" placeholder="#1a1a2e veya boş bırakın" value={alertPopup.alert_popup_bg_color}
                            onChange={e => setAlertPopup(p => ({ ...p, alert_popup_bg_color: e.target.value }))} />
                    </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                    <label>Popup Mesajı</label>
                    <textarea className="form-input" rows={3} placeholder="Kullanıcılara gösterilecek açıklama..."
                        value={alertPopup.alert_popup_message}
                        onChange={e => setAlertPopup(p => ({ ...p, alert_popup_message: e.target.value }))}
                        style={{ resize: 'vertical' }} />
                </div>

                {/* Gec Butonu */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-secondary)' }}>Kapat / Geç Butonu</div>
                        <div className="form-group" style={{ margin: '0 0 10px' }}>
                            <label style={{ fontSize: '0.78rem' }}>Buton Etiketi</label>
                            <input className="form-input" placeholder="Geç" value={alertPopup.alert_popup_skip_label}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_skip_label: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>Geç Gecikmesi (saniye, 0 = beklemesiz)</label>
                            <input className="form-input" type="number" min="0" max="60" value={alertPopup.alert_popup_skip_delay}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_skip_delay: Number(e.target.value) }))} />
                        </div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-secondary)' }}>Bağlantı Butonu (Opsiyonel)</div>
                        <div className="form-group" style={{ margin: '0 0 10px' }}>
                            <label style={{ fontSize: '0.78rem' }}>Buton Etiketi</label>
                            <input className="form-input" placeholder="Devam Et" value={alertPopup.alert_popup_link_label}
                                onChange={e => setAlertPopup(p => ({ ...p, alert_popup_link_label: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: '0 0 10px' }}>
                            <label style={{ fontSize: '0.78rem' }}>Bağlantı URL (boş = buton gösterilmez)</label>
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
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Yeni sekmede aç</span>
                        </div>
                    </div>
                </div>

                <button type="button" className="btn btn-primary" disabled={alertPopupSubmitting} onClick={saveAlertPopupSettings} style={{ minWidth: 200 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    {alertPopupSubmitting ? 'Kaydediliyor...' : 'Popup Ayarlarını Kaydet'}
                </button>
            </div>
        </>
    );
}
