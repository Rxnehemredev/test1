'use client';

import React from 'react';
import { GearIcon, ShieldIcon } from '../AdminIcons';

export default function SettingsTab({
    settings,
    setSettings,
    saveSettings,
    submitting,
}) {
    return (
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

    );
}
