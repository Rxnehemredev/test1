'use client';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from './AuthProvider';

// Trend kartları için yetişkin içerik overlay bileşeni
function AdultCardOverlay({ isAdult, user }) {
  if (!isAdult || user) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)', borderRadius: 'inherit',
      color: '#fff', pointerEvents: 'none',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.04em' }}>18+</span>
    </div>
  );
}

// Cam Küp 3D (Glass 3D) — tek tasarım
export function Glass3DTrending({ series, index, isBlocked, href, user }) {
  return (
    <div className="trend-glass3d-container">
      <Link href={href || `/seri/${series.slug || series.id}`} className="trend-glass3d-card" style={{ display: 'block', position: 'relative' }}>
        <div className="tg-bg">
          <Image
            src={series.cover_url || '/demo/cover1.jpg'}
            alt={isBlocked ? '18+ içerik kapak görseli' : `${series.title} kapak görseli`}
            fill
            loading="lazy"
            unoptimized
            sizes="166px"
            style={isBlocked ? { filter: 'blur(10px)', transform: 'scale(1.1)' } : {}}
          />
        </div>
        <div className="tg-overlay">
          <div className="tg-title">{isBlocked ? '18+' : series.title}</div>
        </div>
        <div className="tg-rank">#{index + 1}</div>
        <AdultCardOverlay isAdult={series.is_adult} user={user} />
      </Link>
    </div>
  );
}

export default function TrendingWidget({ design, trending, autoScrollEnabled = true }) {
  const { user } = useAuth();
  const [autoScroll, setAutoScroll] = useState(autoScrollEnabled);
  const [paused, setPaused] = useState(false);

  // CSS marquee yaklaşımı: DOM scroll limiti olmadan sonsuz döngü
  // İki kopya yeterli — CSS animation ile mükemmel loop
  const doubleList = trending.length > 0 ? [...trending, ...trending] : [];

  // Animasyon süresi: kart sayısı * kart genişliği / hız — yavaş ve akıcı
  const CARD_WIDTH = 166; // 150px + 16px gap
  const SPEED_PPS = 55; // piksel/saniye
  const duration = trending.length > 0 ? (trending.length * CARD_WIDTH) / SPEED_PPS : 20;

  return (
    <div>
      {/* Otomatik Kaydırma Açma/Kapama Butonu */}
      <div className="trend-autoscroll-row">
        <button
          className={`trend-autoscroll-btn${autoScroll ? ' active' : ''}`}
          onClick={() => setAutoScroll(v => !v)}
          title={autoScroll ? 'Otomatik kaydırmayı durdur' : 'Otomatik kaydırmayı başlat'}
        >
          {autoScroll ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              <span className="trend-autoscroll-label">Otomatik Kaydırma Açık</span>
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span className="trend-autoscroll-label">Otomatik Kaydırma Kapalı</span>
            </>
          )}
        </button>
      </div>

      {autoScroll ? (
        /* CSS transform marquee — sonsuz, takılmasız */
        <div className="trend-marquee-outer">
          <div
            className="trend-marquee-track"
            style={{
              animationDuration: `${duration}s`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            {doubleList.map((s, idx) => {
              const displayIdx = idx % (trending.length || 1);
              const isBlocked = s.is_adult && !user;
              const href = isBlocked ? '/login' : `/seri/${s.slug || s.id}`;
              return (
                <Glass3DTrending
                  key={`marquee-${s.id}-${idx}`}
                  series={s}
                  index={displayIdx}
                  isBlocked={isBlocked}
                  href={href}
                  user={user}
                />
              );
            })}
          </div>
        </div>
      ) : (
        /* Manuel kaydırma modu */
        <div className="trend-list-container">
          {trending.map((s, idx) => {
            const isBlocked = s.is_adult && !user;
            const href = isBlocked ? '/login' : `/seri/${s.slug || s.id}`;
            return (
              <Glass3DTrending
                key={`manual-${s.id}-${idx}`}
                series={s}
                index={idx}
                isBlocked={isBlocked}
                href={href}
                user={user}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
