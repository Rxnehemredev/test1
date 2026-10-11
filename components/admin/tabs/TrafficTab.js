import React from 'react';
import { TrafficIcon } from '@/components/admin/AdminIcons';

export default function TrafficTab({
  trafficRange,
  setTrafficRange,
  loadTrafficData,
  trafficLoading,
  trafficData
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <TrafficIcon /> Site Trafiği
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={trafficRange}
            onChange={e => { setTrafficRange(e.target.value); loadTrafficData(e.target.value); }}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, padding: '5px 10px', fontSize: '0.82rem' }}
          >
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
  );
}
