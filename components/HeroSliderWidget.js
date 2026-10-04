'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';

const GENRE_TR = {
  'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
  'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
  'Martial Arts': 'Dövüş', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
  'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
  'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim', 'Ecchi': 'Ecchi', 'Harem': 'Harem',
  'Josei': 'Josei', 'Mature': 'Yetişkin', 'Mecha': 'Mecha', 'Psychological': 'Psikolojik',
  'Seinen': 'Seinen', 'Shoujo': 'Shoujo', 'Shounen': 'Shounen', 'Slice of Life': 'Günlük',
  'Sports': 'Spor', 'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua'
};

function parseGenres(genresStr) {
  if (!genresStr) return [];
  try {
    const arr = JSON.parse(genresStr);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    if (typeof genresStr === 'string') return genresStr.split(',').map(s => s.trim());
    return [];
  }
}

function SliderNav({ popularSeries, prevSlide, nextSlide, slideIndex, goToSlide }) {
  if (popularSeries.length <= 1) return null;
  return (
    <>
      <button className="hs-nav-btn prev" onClick={prevSlide} aria-label="Önceki">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button className="hs-nav-btn next" onClick={nextSlide} aria-label="Sonraki">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>
      <div className="hs-dots">
        {popularSeries.map((_, idx) => (
          <button
            key={idx}
            className={`hs-dot${slideIndex === idx ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
            aria-label={`Seri ${idx + 1}`}
          />
        ))}
      </div>
    </>
  );
}

// Yetişkin içerik overlay bileşeni — giriş yapılmamışsa kapağı bulanıklaştırır
function AdultOverlay({ isAdult, user }) {
  if (!isAdult || user) return null;
  return (
    <a
      href="/login"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        /* backdrop-filter yerine koyu solid arka plan — daha performanslı */
        background: 'rgba(0,0,0,0.75)',
        textDecoration: 'none',
        color: '#fff',
        borderRadius: 'inherit',
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', textAlign: 'center', padding: '0 12px' }}>
        18+ İçerik<br/>
        <span style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.85 }}>Görüntülemek için giriş yapın</span>
      </span>
    </a>
  );
}

// KADEMELİ YÜKSELİŞ (Cascading Steps) — tek tasarım
function CascadeHero({ popularSeries, slideIndex, user, ...navProps }) {
  const activeSeries = popularSeries[slideIndex] || {};
  const len = popularSeries.length;
  if (len === 0) return null;
  const s1 = popularSeries[(slideIndex + 1) % len];
  const s2 = popularSeries[(slideIndex + 2) % len];
  const s3 = popularSeries[(slideIndex + 3) % len];
  const isAdultBlur = activeSeries.is_adult && !user;
  const chapterCount = activeSeries.chapterCount ?? activeSeries.chapter_count ?? 0;
  const genres = parseGenres(activeSeries.genres).slice(0, 3);

  return (
    <div className="hs-cascade-section">
      <div
        key={`cas-bg-${activeSeries.id}`}
        className="hs-cascade-bg"
        style={{ backgroundImage: `url(${activeSeries.cover_url || '/demo/cover1.jpg'})` }}
      />
      <div className="hs-cascade-active-area">
        {/* Kapak */}
        <div className="hscas-cover-wrap">
          <Image
            key={`cas-cover-${activeSeries.id}`}
            className="hscas-cover"
            src={activeSeries.cover_url || '/demo/cover1.jpg'}
            alt={activeSeries.title}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 400px"
            style={isAdultBlur ? { filter: 'blur(14px)', transform: 'scale(1.1)' } : {}}
          />
          {/* Puan rozeti */}
          {activeSeries.rating > 0 && !isAdultBlur && (
            <div className="hscas-rating-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {activeSeries.rating.toFixed(1)}
            </div>
          )}
          <AdultOverlay isAdult={activeSeries.is_adult} user={user} />
        </div>

        {/* Bilgi */}
        <div key={`cas-info-${activeSeries.id}`} className="hscas-info">
          {/* Etiket */}
          <div className="hscas-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
            HAFTANIN POPÜLERİ
          </div>

          {/* Başlık */}
          <div className="hscas-title">{activeSeries.title}</div>

          {/* Meta bilgiler */}
          <div className="hscas-meta">
            {chapterCount > 0 && (
              <span className="hscas-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                {chapterCount} Bölüm
              </span>
            )}
            {activeSeries.status && (
              <span className="hscas-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {activeSeries.status === 'ongoing' ? 'Devam Ediyor' :
                 activeSeries.status === 'completed' ? 'Tamamlandı' :
                 activeSeries.status === 'hiatus' ? 'Ara Verildi' :
                 activeSeries.status === 'current' ? 'Güncel' :
                 activeSeries.status === 'cancelled' ? 'İptal Edildi' : activeSeries.status}
              </span>
            )}
          </div>

          {/* Türler */}
          {genres.length > 0 && (
            <div className="hscas-genres">
              {genres.map(g => (
                <span key={g} className="hscas-genre-tag">{GENRE_TR[g] || g}</span>
              ))}
            </div>
          )}

          {/* Özet */}
          <p className="hscas-summary">
            {activeSeries.summary || 'Bu heyecan verici serinin yeni bölümlerini kaçırmayın. Hemen okumaya başlayın.'}
          </p>

          {/* Buton */}
          <Link
            href={isAdultBlur ? '/login' : `/seri/${activeSeries.slug || activeSeries.id}`}
            className={`hscas-btn${isAdultBlur ? ' hscas-btn-adult' : ''}`}
          >
            {isAdultBlur ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                18+ Giriş Yapın
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                OKUMAYA BAŞLA
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Kademeli arka kartlar */}
      {len > 1 && (
        <div className="hs-cascade-steps">
          {len > 1 && s1 && (
            <Link href={`/seri/${s1.slug || s1.id}`} className="hscas-step-card hscas-step-1">
              <Image src={s1.cover_url || '/demo/cover1.jpg'} alt={s1.title} fill loading="lazy" unoptimized sizes="100px" />
              <div className="hscas-step-title">{s1.title}</div>
            </Link>
          )}
          {len > 2 && s2 && (
            <Link href={`/seri/${s2.slug || s2.id}`} className="hscas-step-card hscas-step-2">
              <Image src={s2.cover_url || '/demo/cover1.jpg'} alt={s2.title} fill loading="lazy" unoptimized sizes="80px" />
            </Link>
          )}
          {len > 3 && s3 && (
            <Link href={`/seri/${s3.slug || s3.id}`} className="hscas-step-card hscas-step-3">
              <Image src={s3.cover_url || '/demo/cover1.jpg'} alt={s3.title} fill loading="lazy" unoptimized sizes="60px" />
            </Link>
          )}
        </div>
      )}

      <SliderNav popularSeries={popularSeries} slideIndex={slideIndex} {...navProps} />
    </div>
  );
}

export default function HeroSliderWidget({ design, popularSeries }) {
  const { user } = useAuth();
  const [slideIndex, setSlideIndex] = useState(0);
  const sliderRef = useRef(null);
  const autoplayRef = useRef(null);

  const startAutoplay = useCallback((totalLen) => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % totalLen);
    }, 4500);
  }, []);

  useEffect(() => {
    if (!popularSeries || popularSeries.length <= 1) return;
    startAutoplay(popularSeries.length);
    return () => clearInterval(autoplayRef.current);
  }, [popularSeries.length, startAutoplay]);

  const prevSlide = (e) => {
    if(e) e.stopPropagation();
    const len = popularSeries.length;
    if (len <= 1) return;
    setSlideIndex(prev => (prev - 1 + len) % len);
    startAutoplay(len);
  };

  const nextSlide = (e) => {
    if(e) e.stopPropagation();
    const len = popularSeries.length;
    if (len <= 1) return;
    setSlideIndex(prev => (prev + 1) % len);
    startAutoplay(len);
  };

  const goToSlide = (idx) => {
    const len = popularSeries.length;
    setSlideIndex(idx);
    startAutoplay(len);
  };

  const touchStartRef = useRef(0);
  const handleTouchStart = (e) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const len = popularSeries.length;
    if (len <= 1) return;
    const diff = touchStartRef.current - endX;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
  };

  if (!popularSeries || popularSeries.length === 0) return null;

  const navProps = { prevSlide, nextSlide, goToSlide };

  return (
    <div className="hero-slider-wrapper" ref={sliderRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <CascadeHero popularSeries={popularSeries} slideIndex={slideIndex} user={user} {...navProps} />
    </div>
  );
}