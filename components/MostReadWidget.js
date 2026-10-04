'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';

// Yetişkin içerik mini overlay — kart tasarımını bozmaz
function AdultMiniOverlay({ isAdult, user }) {
  if (!isAdult || user) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)', borderRadius: 'inherit', pointerEvents: 'none',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}>18+</span>
    </div>
  );
}

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth="1" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px', transform: 'translateY(-1px)' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Kademeli Cam (Glass Steps) — tek tasarım
export function GlassStepsMR({ series, index, lang_rating, user }) {
  const cover = series.cover_url || '/demo/cover1.jpg';
  const isBlocked = series.is_adult && !user;
  return (
    <Link href={isBlocked ? '/login' : `/seri/${series.slug || series.id}`} className="mr-glass-item">
      <div className="mr-glass-bg" style={{ backgroundImage: isBlocked ? 'none' : `url(${cover})` }}></div>
      <div className="mr-glass-overlay"></div>
      <div className="mr-glass-content">
        <div className="mr-glass-rank">#{index + 1}</div>
        <div className="mr-glass-cover" style={{ position: 'relative', overflow: 'hidden' }}>
          <Image src={cover} alt={series.title} fill loading="lazy" unoptimized sizes="60px" style={isBlocked ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : {}} />
          <AdultMiniOverlay isAdult={series.is_adult} user={user} />
        </div>
        <div className="mr-glass-info">
          <div className="mr-glass-title">{isBlocked ? '18+ İçerik' : series.title}</div>
          {!isBlocked && (
            <div className="mr-glass-meta" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <StarIcon /> {series.rating ? series.rating.toFixed(1) : 'N/A'} {lang_rating || 'Puan'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MostReadWidget({ design, topSeries, topLoading, lang_rating }) {
  const { user } = useAuth();

  return (
    <div className="mr-glass-list" style={{ opacity: topLoading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
      {topSeries.map((s, idx) => (
        <GlassStepsMR key={s.id} series={s} index={idx} lang_rating={lang_rating} user={user} />
      ))}
    </div>
  );
}
