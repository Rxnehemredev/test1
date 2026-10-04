import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { SettingsProvider } from '@/components/SettingsProvider';
import Navbar from '@/components/Navbar';
import CustomHeadScripts from '@/components/CustomHeadScripts';
import AdBanner from '@/components/AdBanner';
import PopupAlert from '@/components/PopupAlert';
import TrafficTracker from '@/components/TrafficTracker';
import WelcomeScreen from '@/components/WelcomeScreen';
import FirebaseAnalyticsInit from '@/components/FirebaseAnalyticsInit';
import MaintenanceChecker from '@/components/MaintenanceChecker';
import PageBackground from '@/components/PageBackground';
import ContentProtection from '@/components/ContentProtection';
import Link from 'next/link';
import Script from 'next/script';
import { cookies, headers } from 'next/headers';
import { getDb } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getSettingsCache, setSettingsCache, getRawSettingsCache, setRawSettingsCache, SETTINGS_CACHE_TTL } from '@/lib/settings-cache';
import { requiredJwtSecret } from '@/lib/envGuard';

// Fontlar next/font/google yerine <head>'deki normal Google Fonts <link>
// etiketiyle yükleniyor (bkz. aşağıdaki <head> içindeki fontlink).
// SEBEP: next/font/google, build sırasında Vercel'in kendi sunucularından
// fonts.googleapis.com'a istek atıyor; bu istek ara sıra (ağ/DNS kaynaklı)
// boş/bozuk yanıt döndüğünde next/font'un CSS parser'ı çöküyor ve
// "TypeError: Cannot read properties of null (reading '1')" ile TÜM build
// başarısız oluyor. <link> etiketiyle yükleme bu isteği build-time'dan
// runtime'a (kullanıcının tarayıcısına) taşıyarak build'i tamamen bu
// sorundan bağımsız hale getirir — küçük bir FOIT/CLS maliyeti karşılığında
// build asla bu yüzden kırılmaz.

// Paths that bypass maintenance mode (so admin can log in)
const MAINTENANCE_BYPASS = ['/login', '/api/'];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

// Sunucu başlangıcında bir kez üretilen versiyon string'i.
// Browser cache'ini deployment'ta kırar ama her request'te yeni URL üretmez.
const SERVER_START_VER = Date.now().toString(36);

// Favicon cache busting için veritabanındaki ayar değerinin hash'ini üret
// Bu, ayar her değiştiğinde otomatik olarak değişir
// settings objesi verilirse ayrı DB sorgusu yapmaz (daha verimli)
function getFaviconTimestamp(settings) {
  const faviconUrl = settings?.favicon_url || '';
  // Değerin uzunluğu + ilk/son karakterlerin hash'i
  // Bu, aynı uzunlukta farklı değerler için farklı sonuç verir
  const hash = (faviconUrl.length + (faviconUrl[0]?.charCodeAt(0) || 0) + (faviconUrl[faviconUrl.length-1]?.charCodeAt(0) || 0)).toString(36);
  return `${faviconUrl.length.toString(36)}_${hash}`;
}

// ── In-memory settings cache: lib/settings-cache.js üzerinden yönetiliyor ──────
// Admin panelinden ayar kaydedilince invalidateSettingsCache() çağrılarak anında temizlenir.

function buildWebsiteJsonLd(siteName, contactEmail) {
  const name = siteName || 'Asteria Scans';
  const email = contactEmail || 'asteriascanssupport@gmail.com';
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name,
        description: 'Yapay zeka destekli anında çeviri ile çevrimiçi manga okuyun.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/series?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name,
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/api/favicon`,
          width: 32,
          height: 32,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email,
        },
      },
    ],
  });
}

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteName = settings.site_name || 'Asteria Scans';
  const siteTitle = settings.seo_title_home || 'Asteria Scans — Yapay Zeka Çevirili Çevrimiçi Manga Oku';
  const siteDesc = settings.seo_desc_home || 'Yapay zeka destekli anında çeviri ile mangaları istediğiniz dilde okuyun. En son yapay zeka teknolojisi ile çevrilmiş binlerce manga serisini keşfedin. Ücretsiz, hızlı ve her zaman güncel.';

  // OG image: admin panelinden özel URL varsa kullan, yoksa icon-512
  const ogImageUrl = settings.og_image_url?.trim()
    ? (settings.og_image_url.startsWith('http') ? settings.og_image_url : `${BASE_URL}${settings.og_image_url}`)
    : `${BASE_URL}/icon-512.png`;
  const ogImageWidth = settings.og_image_url?.trim() ? 1200 : 512;
  const ogImageHeight = settings.og_image_url?.trim() ? 630 : 512;

  // Favicon: admin panelinden ayarlanmışsa onu kullan, yoksa /api/favicon (veritabanından dinamik)
  // NOT: /api/favicon her zaman veritabanındaki favicon_url değerini döndürür
  const faviconUrl = settings.favicon_url?.trim()
    ? (settings.favicon_url.startsWith('http') ? settings.favicon_url : `${BASE_URL}${settings.favicon_url}`)
    : null;

  // Cache busting için veritabanındaki favicon_url değerinden hash üret
  const faviconBuster = getFaviconTimestamp(settings);

  // Favicon URL'si varsa cache busting ekle
  const getFaviconWithBuster = (url) => {
    if (!url) return null;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}fv=${faviconBuster}`;
  };

  // Logo (apple-touch-icon vb.): logo_url yoksa icon-192 kullan
  const logoUrl = settings.logo_url?.trim()
    ? (settings.logo_url.startsWith('http') ? settings.logo_url : `${BASE_URL}${settings.logo_url}`)
    : `${BASE_URL}/icon-192.png`;

  // OG Image: paylaşımda gösterilecek görsel
  const ogShareImage = settings.og_image_url?.trim()
    ? (settings.og_image_url.startsWith('http') ? settings.og_image_url : `${BASE_URL}${settings.og_image_url}`)
    : `${BASE_URL}/icon-512.png`;

  return {
    title: siteTitle,
    description: siteDesc,
    keywords: 'manga, çevrimiçi manga oku, manga okuma, manga çevirisi, yapay zeka çevirisi, asteria scans, webtoon, manhwa, manhua, Türkçe manga',
    manifest: '/manifest.json',
    metadataBase: new URL(BASE_URL),
    icons: faviconUrl ? (() => {
      // Determine the correct MIME type based on extension
      const urlLower = faviconUrl.toLowerCase();
      let faviconType = 'image/png';
      if (urlLower.includes('.svg')) faviconType = 'image/svg+xml';
      else if (urlLower.includes('.webp')) faviconType = 'image/webp';
      else if (urlLower.includes('.ico')) faviconType = 'image/x-icon';
      else if (urlLower.includes('.gif')) faviconType = 'image/gif';

      const faviconWithBust = getFaviconWithBuster(faviconUrl);

      // Özel favicon ayarlanmışsa EN BAŞA koy — tarayıcılar ilk eşleşeni önceliklendirir
      return {
        icon: [
          { url: faviconWithBust, type: faviconType, sizes: 'any' },
        ],
        apple: [{ url: `${logoUrl}?v=${SERVER_START_VER}` }],
        shortcut: [{ url: faviconWithBust, type: faviconType }],
        other: [
          { rel: 'icon', url: faviconWithBust, type: faviconType },
        ],
      };
    })() : {
      // Varsayılan: dinamik favicon API'sini kullan (varsayılan olarak icon-192.png'ye yönlendirir)
      icon: [
        { url: `/api/favicon?v=${faviconBuster}`, type: 'image/png' },
      ],
      apple: [{ url: `/api/favicon?v=${faviconBuster}`, type: 'image/png' }],
    },
    openGraph: {
      type: 'website',
      locale: 'tr_TR',
      url: '/',
      siteName: siteName,
      title: siteTitle,
      description: siteDesc,
      images: [{
        url: ogShareImage,
        width: ogImageWidth,
        height: ogImageHeight,
        alt: `${siteName} — Manga Platformu`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDesc,
      images: [ogShareImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: '/',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteName,
    },
    ...(settings.google_site_verification?.trim() ? {
      verification: {
        google: settings.google_site_verification.trim(),
      },
    } : {}),
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#5e72e4',
};

function MaintenancePage({ message, siteName, contactEmail, discordUrl, logoUrl, design }) {
  const displayMessage = message || "Deneyiminizi iyileştirmek için şu anda planlı bakım çalışması yapıyoruz. Bu işlem uzun sürmeyecektir — lütfen kısa süre sonra tekrar kontrol edin.";
  const displaySiteName = siteName || 'Site';
  const displayEmail = contactEmail || null;
  const displayDiscord = discordUrl || null;
  const isGlass = design === 'glassmorphism';

  if (isGlass) {
    return (
      <html lang="tr" suppressHydrationWarning>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bakım Modu — {displaySiteName}</title>
          <style>{`
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              overflow: hidden;
              background: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 35%, #0a1628 70%, #0d1f3c 100%);
              position: relative;
            }
            body::before {
              content: '';
              position: fixed;
              inset: 0;
              background: linear-gradient(225deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.10) 25%, rgba(59,130,246,0.12) 50%, rgba(16,185,129,0.08) 75%, rgba(99,102,241,0.15) 100%);
              background-size: 400% 400%;
              animation: gradientShift 12s ease infinite;
              z-index: 0;
            }
            .orb { position: fixed; border-radius: 50%; filter: blur(60px); opacity: 0.5; z-index: 0; pointer-events: none; }
            .orb-1 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(99,102,241,0.6), transparent 70%); top: -100px; left: -100px; animation: floatOrb1 18s ease-in-out infinite; }
            .orb-2 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%); bottom: -80px; right: -80px; animation: floatOrb2 22s ease-in-out infinite; }
            .orb-3 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent 70%); top: 50%; left: 70%; animation: floatOrb3 16s ease-in-out infinite; }
            .orb-4 { width: 180px; height: 180px; background: radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%); top: 20%; right: 15%; animation: floatOrb4 20s ease-in-out infinite; }
            .orb-5 { width: 220px; height: 220px; background: radial-gradient(circle, rgba(245,158,11,0.25), transparent 70%); bottom: 25%; left: 10%; animation: floatOrb5 24s ease-in-out infinite; }
            .glass-card {
              position: relative; z-index: 10;
              background: rgba(255,255,255,0.06);
              backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 24px; padding: 52px 44px;
              max-width: 520px; width: 100%; text-align: center;
              box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.15) inset;
              animation: cardAppear 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
            }
            .logo-wrap { margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
            .logo-img { max-height: 56px; max-width: 200px; object-fit: contain; filter: drop-shadow(0 0 12px rgba(165,180,252,0.4)); }
            .logo-icon { font-size: 3rem; filter: drop-shadow(0 0 16px rgba(165,180,252,0.5)); }
            .brand { font-size: 1.5rem; font-weight: 700; color: #e0e7ff; margin-bottom: 28px; letter-spacing: -0.01em; text-shadow: 0 0 20px rgba(165,180,252,0.4); }
            .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.18); backdrop-filter: blur(8px); border: 1px solid rgba(165,180,252,0.25); border-radius: 50px; padding: 7px 18px; font-size: 0.8rem; color: #c7d2fe; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(99,102,241,0.2); }
            .dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; box-shadow: 0 0 8px rgba(245,158,11,0.6); }
            .icon-wrapper { width: 80px; height: 80px; margin: 0 auto 24px; background: rgba(99,102,241,0.15); backdrop-filter: blur(8px); border: 1px solid rgba(165,180,252,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: iconPulse 2s ease-in-out infinite; box-shadow: 0 0 24px rgba(99,102,241,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset; }
            .icon-wrapper svg { color: #a5b4fc; filter: drop-shadow(0 0 6px rgba(165,180,252,0.5)); }
            h1 { font-size: 1.7rem; font-weight: 700; color: #f0f4ff; margin-bottom: 14px; letter-spacing: -0.02em; text-shadow: 0 2px 12px rgba(0,0,0,0.3); }
            p { color: rgba(203,213,225,0.85); font-size: 0.95rem; line-height: 1.75; margin-bottom: 28px; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(165,180,252,0.2), transparent); margin: 24px 0; }
            .contact { font-size: 0.82rem; color: rgba(148,163,184,0.8); line-height: 1.8; }
            .contact a { color: #a5b4fc; text-decoration: none; }
            .contact-links { display: flex; flex-direction: column; gap: 12px; align-items: center; }
            .discord-btn { display: inline-flex; align-items: center; gap: 9px; background: rgba(88,101,242,0.4); backdrop-filter: blur(8px); border: 1px solid rgba(88,101,242,0.5); color: #fff; border-radius: 12px; padding: 10px 22px; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: background 0.2s, transform 0.15s; box-shadow: 0 4px 16px rgba(88,101,242,0.3); }
            .login-link { display: inline-flex; align-items: center; gap: 6px; color: rgba(100,116,139,0.8); font-size: 0.78rem; margin-top: 20px; text-decoration: none; transition: color 0.2s; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
            .login-link:hover { color: #a5b4fc; }
            @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
            @keyframes floatOrb1 { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(60px,40px) scale(1.1); } 66% { transform: translate(-30px,80px) scale(0.9); } }
            @keyframes floatOrb2 { 0%, 100% { transform: translate(0,0) scale(1); } 40% { transform: translate(-70px,-50px) scale(1.15); } 70% { transform: translate(40px,-90px) scale(0.85); } }
            @keyframes floatOrb3 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,60px) scale(1.2); } }
            @keyframes floatOrb4 { 0%, 100% { transform: translate(0,0); } 30% { transform: translate(-40px,30px); } 60% { transform: translate(20px,-40px); } }
            @keyframes floatOrb5 { 0%, 100% { transform: translate(0,0) scale(1); } 45% { transform: translate(50px,-60px) scale(1.1); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
            @keyframes iconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
            @keyframes cardAppear { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}</style>
        </head>
        <body>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="orb orb-4" />
          <div className="orb orb-5" />
          <div className="glass-card">
            <div className="logo-wrap">
              {logoUrl ? (
                <img src={logoUrl} alt={displaySiteName} className="logo-img" decoding="async" />
              ) : (
                <span className="logo-icon">読</span>
              )}
            </div>
            {!logoUrl && <div className="brand">{displaySiteName}</div>}
            <div className="badge"><span className="dot" />Bakım Çalışması</div>
            <div className="icon-wrapper">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <h1>Yakında döneceğiz</h1>
            <p>{displayMessage}</p>
            <div className="divider" />
            <div className="contact">
              <div className="contact-links">
                {displayDiscord && (
                  <a href={displayDiscord} target="_blank" rel="noopener noreferrer" className="discord-btn">
                    <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54.1 54.1 0 0 0-16.3 0A39.4 39.4 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19 -1 32.7.3 46.3a59 59 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.3 38.3 38.3 0 0 1-6-2.9l1.4-1.1a42 42 0 0 0 36.1 0l1.5 1.1a38.4 38.4 0 0 1-6 2.9 44.4 44.4 0 0 0 3.8 6.3 58.8 58.8 0 0 0 18-9.1c1.5-15.8-2.5-29.3-10.8-41.3zM23.7 38c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.5 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2z"/></svg>
                    Discord Sunucumuza Katılın
                  </a>
                )}
                {displayEmail && <span>Sorularınız için: <a href={`mailto:${displayEmail}`}>{displayEmail}</a></span>}
                {!displayDiscord && !displayEmail && <span>Yakında tekrar kontrol edin.</span>}
              </div>
            </div>
            <a href="/login" className="login-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Yönetici Girişi
            </a>
          </div>
        </body>
      </html>
    );
  }

  // Default design
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bakım Modu — {displaySiteName}</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0f0f14;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: #1a1a2e;
            border: 1px solid rgba(99,102,241,0.3);
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 0 40px rgba(99,102,241,0.08);
          }
          .logo-wrap { margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
          .logo-img { max-height: 56px; max-width: 200px; object-fit: contain; }
          .logo-icon { font-size: 3rem; }
          .brand { font-size: 1.4rem; font-weight: 700; color: #a5b4fc; margin-bottom: 28px; }
          .icon-wrapper {
            width: 72px; height: 72px; margin: 0 auto 20px;
            background: rgba(99,102,241,0.1); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            animation: iconPulse 2s ease-in-out infinite;
          }
          .icon-wrapper svg { color: #818cf8; }
          h1 { font-size: 1.6rem; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.7; margin-bottom: 28px; }
          .divider { height: 1px; background: rgba(99,102,241,0.15); margin: 24px 0; }
          .contact { font-size: 0.82rem; color: #64748b; line-height: 1.8; }
          .contact a { color: #818cf8; text-decoration: none; }
          .contact-links { display: flex; flex-direction: column; gap: 10px; align-items: center; }
          .discord-btn { display: inline-flex; align-items: center; gap: 8px; background: #5865f2; color: #fff; border-radius: 8px; padding: 8px 20px; font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
          .discord-btn:hover { opacity: 0.88; }
          .badge {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(99,102,241,0.15);
            border: 1px solid rgba(99,102,241,0.3);
            border-radius: 50px; padding: 6px 16px;
            font-size: 0.8rem; color: #a5b4fc; margin-bottom: 28px;
          }
          .dot {
            width: 8px; height: 8px; background: #f59e0b;
            border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;
          }
          .login-link {
            display: inline-flex; align-items: center; gap: 6px;
            color: #64748b; font-size: 0.78rem; margin-top: 16px;
            text-decoration: none; transition: color 0.2s;
          }
          .login-link:hover { color: #a5b4fc; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes iconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="logo-wrap">
            {logoUrl ? (
              <img src={logoUrl} alt={displaySiteName} className="logo-img" decoding="async" />
            ) : (
              <span className="logo-icon">読</span>
            )}
          </div>
          {!logoUrl && <div className="brand">{displaySiteName}</div>}
          <div className="badge">
            <span className="dot" />
            Bakım Çalışması
          </div>
          <div className="icon-wrapper">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h1>Yakında döneceğiz</h1>
          <p>{displayMessage}</p>
          <div className="divider" />
          <div className="contact">
            <div className="contact-links">
              {displayDiscord && (
                <a href={displayDiscord} target="_blank" rel="noopener noreferrer" className="discord-btn">
                  <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54.1 54.1 0 0 0-16.3 0A39.4 39.4 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19 -1 32.7.3 46.3a59 59 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.3 38.3 38.3 0 0 1-6-2.9l1.4-1.1a42 42 0 0 0 36.1 0l1.5 1.1a38.4 38.4 0 0 1-6 2.9 44.4 44.4 0 0 0 3.8 6.3 58.8 58.8 0 0 0 18-9.1c1.5-15.8-2.5-29.3-10.8-41.3zM23.7 38c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.5 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2z"/></svg>
                  Discord Sunucumuza Katılın
                </a>
              )}
              {displayEmail && <span>Sorularınız için: <a href={`mailto:${displayEmail}`}>{displayEmail}</a></span>}
              {!displayDiscord && !displayEmail && <span>Yakında tekrar kontrol edin.</span>}
            </div>
          </div>
          <a href="/login" className="login-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Yönetici Girişi
          </a>
        </div>
      </body>
    </html>
  );
}

async function isStaffFromCookie(cookieStore) {
  try {
    const token = cookieStore.get('yomi_token')?.value;
    if (!token) return false;
    const payload = jwt.verify(token, requiredJwtSecret(), { algorithms: ['HS256'] });
    if (!payload?.role) return false;
    // Yerleşik yetkili roller
    const builtinStaff = ['admin', 'manager', 'moderator', 'team_member'];
    if (builtinStaff.includes(payload.role)) return true;
    // Özel roller: DB'den kontrol et
    try {
      const db = await getDb();
      const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
      if (row?.setting_value) {
        const customRoles = JSON.parse(row.setting_value);
        return customRoles.some(r => r.name === payload.role);
      }
    } catch {}
    return false;
  } catch {
    return false;
  }
}

async function isMaintenanceModeOn(settings) {
  try {
    // settings nesnesi varsa önce onu kullan (DB'den cache'lenmiş veri — ekstra sorgu yok)
    if (settings && typeof settings === 'object' && 'maintenance_mode' in settings) {
      return settings.maintenance_mode === '1';
    }
    const db = await getDb();
    const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'").get();
    return row?.setting_value === '1';
  } catch {
    return false;
  }
}

async function getMaintenanceMessage(settings) {
  try {
    // settings nesnesi varsa önce onu kullan (DB'den cache'lenmiş veri — ekstra sorgu yok)
    if (settings && typeof settings === 'object' && 'maintenance_message' in settings) {
      return settings.maintenance_message || '';
    }
    const db = await getDb();
    const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_message'").get();
    return row?.setting_value || '';
  } catch {
    return '';
  }
}

const DEFAULT_NAVBAR_MENU = [
  { label: 'Ana Sayfa', url: '/' },
  { label: 'Göz At', url: '/series' },
  { label: 'Blog', url: '/blog' },
  { label: 'Sıralama', url: '/ranking' },
  { label: 'İstekler', url: '/requests' },
];

const DEFAULT_FOOTER_MENU = [
  { label: 'Gizlilik Politikası', url: '/privacy' },
  { label: 'Kullanım Koşulları', url: '/terms' },
  { label: 'Göz At', url: '/series' },
];

async function getSiteSettings() {
  // Paylaşılan cache geçerliyse DB'ye gitme
  const now = Date.now();
  const { cache: _settingsCache, cacheAt: _settingsCacheAt } = getSettingsCache();
  if (_settingsCache && now - _settingsCacheAt < SETTINGS_CACHE_TTL) {
    return _settingsCache;
  }
  try {
    const db = await getDb();
    const rows = await db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
    const s = {};
    rows.forEach(r => { s[r.setting_key] = r.setting_value; });
    // Ham ayar map'ini de (aynı DB satırlarından, ekstra sorgu YAPMADAN)
    // /api/settings ile aynı şekilde cache'liyoruz — SettingsProvider'a
    // initialSettings olarak geçirebilmek için (ad_* gibi anahtarlar aşağıdaki
    // "result" whitelist'inde yok, client tarafı ham map'i bekliyor).
    setRawSettingsCache(s);

    let navbarMenu = DEFAULT_NAVBAR_MENU;
    let footerMenu = DEFAULT_FOOTER_MENU;
    try { if (s.navbar_menu) navbarMenu = JSON.parse(s.navbar_menu); } catch {}
    try { if (s.footer_menu) footerMenu = JSON.parse(s.footer_menu); } catch {}

    // Merge custom pages into navbar/footer menus
    try {
      const customPages = await db.prepare(
        "SELECT title, slug, show_in_navbar, show_in_footer FROM custom_pages WHERE is_active = 1 AND (show_in_navbar = 1 OR show_in_footer = 1)"
      ).all();
      for (const page of customPages) {
        const pageEntry = { label: page.title, url: `/p/${page.slug}` };
        if (page.show_in_navbar) {
          const alreadyInNavbar = navbarMenu.some(item => item.url === pageEntry.url);
          if (!alreadyInNavbar) navbarMenu = [...navbarMenu, pageEntry];
        }
        if (page.show_in_footer) {
          const alreadyInFooter = footerMenu.some(item => item.url === pageEntry.url);
          if (!alreadyInFooter) footerMenu = [...footerMenu, pageEntry];
        }
      }
    } catch {}

    const result = {
      site_name: s.site_name || '',
      site_description: s.site_description || '',
      accent_color: s.accent_color || '',
      button_color: s.button_color || '',
      button_hover_color: s.button_hover_color || '',
      button_text_color: s.button_text_color || '',
      link_color: s.link_color || '',
      link_hover_color: s.link_hover_color || '',
      navbar_bg_color: s.navbar_bg_color || '',
      favicon_url: s.favicon_url || '',
      logo_url: s.logo_url || '',
      footer_text: s.footer_text || '',
      contact_email: s.contact_email || '',
      discord_url: s.discord_url || '',
      reddit_url: s.reddit_url || '',
      twitter_url: s.twitter_url || '',
      instagram_url: s.instagram_url || '',
      tiktok_url: s.tiktok_url || '',
      youtube_url: s.youtube_url || '',
      facebook_url: s.facebook_url || '',
      custom_css: s.custom_css || '',
      custom_head_scripts: s.custom_head_scripts || '',
      custom_body_js: s.custom_body_js || '',
      reader_bg_color: s.reader_bg_color || '',
      announcement_bg_color: s.announcement_bg_color || '',
      seo_title_home: s.seo_title_home || '',
      seo_desc_home: s.seo_desc_home || '',
      seo_title_series: s.seo_title_series || '',
      seo_title_chapter: s.seo_title_chapter || '',
      google_analytics_id: s.google_analytics_id || '',
      google_tag_manager_id: s.google_tag_manager_id || '',
      google_site_verification: s.google_site_verification || '',
      og_image_url: s.og_image_url || '',
      navbar_menu: navbarMenu,
      footer_menu: footerMenu,
      maintenance_mode: s.maintenance_mode || '0',
      maintenance_message: s.maintenance_message || '',
      maintenance_mode_design: s.maintenance_mode_design || 'default',
      latest_updates_title_color: s.latest_updates_title_color || '',
      latest_updates_card_bg: s.latest_updates_card_bg || '',
      latest_updates_card_border: s.latest_updates_card_border || '',
      latest_updates_badge_bg: s.latest_updates_badge_bg || '',
      latest_updates_badge_text: s.latest_updates_badge_text || '',
      latest_updates_hover_bg: s.latest_updates_hover_bg || '',
      points_name: s.points_name || '',
      points_short: s.points_short || '',
    };
    setSettingsCache(result);
    return result;
  } catch {
    return {
      navbar_menu: DEFAULT_NAVBAR_MENU,
      footer_menu: DEFAULT_FOOTER_MENU,
    };
  }
}

// Lightens/darkens a hex color for derived CSS variables
function hexToHsl(hex) {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const r = parseInt(h.slice(0,2),16)/255;
    const g = parseInt(h.slice(2,4),16)/255;
    const b = parseInt(h.slice(4,6),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let hue, sat, lit;
    lit = (max + min) / 2;
    if (max === min) { hue = sat = 0; }
    else {
      const d = max - min;
      sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max) {
        case r: hue = ((g - b)/d + (g < b ? 6 : 0)) / 6; break;
        case g: hue = ((b - r)/d + 2) / 6; break;
        default: hue = ((r - g)/d + 4) / 6; break;
      }
    }
    return [Math.round(hue*360), Math.round(sat*100), Math.round(lit*100)];
  } catch { return null; }
}

function sanitizeCssColor(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  const safe = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.,\s%]+\)|hsla?\(\s*[\d.,\s%]+\)|[a-zA-Z]{2,30})$/.test(v);
  return safe ? v : null;
}

function buildDynamicCss(settings) {
  const lines = [];

  // Accent color → derive all related vars
  if (settings.accent_color && settings.accent_color.startsWith('#')) {
    const hsl = hexToHsl(settings.accent_color);
    if (hsl) {
      const [h, s, l] = hsl;
      const dark = `hsl(${h}, ${s}%, ${Math.max(0, l - 10)}%)`;
      const darker = `hsl(${h}, ${s}%, ${Math.max(0, l - 18)}%)`;
      const light = `hsl(${h}, ${s}%, ${Math.min(100, l + 15)}%)`;
      const bright = `hsl(${h}, ${s}%, ${Math.min(100, l + 22)}%)`;
      const glow = `hsla(${h}, ${s}%, ${l}%, 0.35)`;
      const subtle = `hsla(${h}, ${s}%, ${l}%, 0.12)`;
      const subtle2 = `hsla(${h}, ${s}%, ${l}%, 0.08)`;
      const gradient = `linear-gradient(135deg, ${darker}, ${settings.accent_color}, ${dark})`;
      lines.push(
        `  --primary: ${settings.accent_color};`,
        `  --primary-dark: ${dark};`,
        `  --primary-light: ${light};`,
        `  --accent: ${settings.accent_color};`,
        `  --accent-light: ${light};`,
        `  --accent-bright: ${bright};`,
        `  --primary-glow: ${glow};`,
        `  --primary-subtle: ${subtle};`,
        `  --gradient-primary: ${gradient};`,
      );
    }
  }

  // Button color
  if (settings.button_color) lines.push(`  --btn-primary-bg: ${settings.button_color};`);
  // Button hover color
  if (settings.button_hover_color) lines.push(`  --btn-primary-hover: ${settings.button_hover_color};`);
  // Button text color
  if (settings.button_text_color) lines.push(`  --btn-primary-text: ${settings.button_text_color};`);
  // Link color
  if (settings.link_color) lines.push(`  --link-color: ${settings.link_color};`);
  // Link hover color
  if (settings.link_hover_color) lines.push(`  --link-hover-color: ${settings.link_hover_color};`);
  // Navbar background
  if (settings.navbar_bg_color) lines.push(`  --navbar-bg: ${settings.navbar_bg_color};`);
  // Reader background
  if (settings.reader_bg_color) lines.push(`  --reader-bg: ${settings.reader_bg_color};`);
  // Announcement bar color
  if (settings.announcement_bg_color) lines.push(`  --announcement-bg: ${settings.announcement_bg_color};`);
  // Latest Updates color variables (sanitized to prevent CSS injection)
  const luTitleColor = sanitizeCssColor(settings.latest_updates_title_color);
  const luCardBg = sanitizeCssColor(settings.latest_updates_card_bg);
  const luCardBorder = sanitizeCssColor(settings.latest_updates_card_border);
  const luBadgeBg = sanitizeCssColor(settings.latest_updates_badge_bg);
  const luBadgeText = sanitizeCssColor(settings.latest_updates_badge_text);
  const luHoverBg = sanitizeCssColor(settings.latest_updates_hover_bg);
  if (luTitleColor) lines.push(`  --latest-updates-title-color: ${luTitleColor};`);
  if (luCardBg) lines.push(`  --latest-updates-card-bg: ${luCardBg};`);
  if (luCardBorder) lines.push(`  --latest-updates-card-border: ${luCardBorder};`);
  if (luBadgeBg) lines.push(`  --latest-updates-badge-bg: ${luBadgeBg};`);
  if (luBadgeText) lines.push(`  --latest-updates-badge-text: ${luBadgeText};`);
  if (luHoverBg) lines.push(`  --latest-updates-hover-bg: ${luHoverBg};`);

  let css = '';
  if (lines.length > 0) css += `:root {\n${lines.join('\n')}\n}\n`;

  // Apply comprehensive overrides so the accent color reaches all themed elements
  const overrides = [];

  if (settings.accent_color) {
    const ac = settings.accent_color;
    // Buttons
    overrides.push(
      `.btn-primary { background: var(--primary) !important; border-color: var(--primary) !important; }`,
      `.btn-primary:hover { background: var(--primary-dark) !important; border-color: var(--primary-dark) !important; }`,
    );
    // Hero slider elements
    overrides.push(
      `.hero-meta-badge { border-color: var(--primary) !important; }`,
      `.hero-dot.active { background: var(--primary) !important; }`,
      `.hero-genre-tag { background: var(--primary-subtle) !important; border-color: var(--primary) !important; color: var(--accent-bright) !important; }`,
    );
    // Accent-colored text & borders
    overrides.push(
      `.section-title svg { stroke: var(--primary) !important; }`,
      `.genre-tag, .genre-tag-filter.active { background: var(--primary-subtle) !important; border-color: var(--primary) !important; color: var(--accent-light) !important; }`,
      `.genre-tag-filter.active { background: var(--primary) !important; color: #fff !important; }`,
    );
    // Stats bar
    overrides.push(
      `.stats-bar { background: linear-gradient(135deg, var(--bg-card), var(--primary-subtle)) !important; border-top-color: var(--primary) !important; }`,
      `.stat-number { color: var(--primary) !important; }`,
    );
    // Series card & chapter links
    overrides.push(
      `.asura-title:hover, .tc-title { color: var(--accent-light) !important; }`,
      `.asura-chapter-row:hover { color: var(--accent-light) !important; border-left-color: var(--primary) !important; }`,
    );
    // Most Read widget tabs
    overrides.push(
      `.mr3-tab.active { background: var(--primary) !important; color: #fff !important; }`,
      `.mr3-badge-1 { background: var(--primary) !important; }`,
    );
    // Navbar active/hover
    overrides.push(
      `.nav-link.active, .nav-link:hover { color: var(--primary) !important; }`,
      `.nav-link.active::after { background: var(--primary) !important; }`,
    );
    // Announcement bar
    overrides.push(
      `.ann-badge { color: var(--primary) !important; }`,
    );
    // Sidebar widget headers
    overrides.push(
      `.widget-header h3 { color: var(--accent-light) !important; }`,
      `.epw-read-btn { color: var(--accent-light) !important; }`,
    );
    // Filter bar active
    overrides.push(
      `.filter-bar select:focus, .filter-bar input:focus { border-color: var(--primary) !important; }`,
    );
    // Rankings / profile
    overrides.push(
      `.rank-badge { background: var(--primary) !important; }`,
      `.yomi-points { color: var(--primary) !important; }`,
    );
    // Trending card rank numbers
    overrides.push(
      `.tc-number.rank-1, .tc-number.rank-2, .tc-number.rank-3 { color: var(--primary) !important; -webkit-text-stroke-color: var(--primary-dark) !important; }`,
    );
    // Comment section
    overrides.push(
      `.comment-action:hover, .comment-action.active { color: var(--primary) !important; }`,
    );
    // Continue reading card
    overrides.push(
      `.continue-reading-card { border-left-color: var(--primary) !important; }`,
      `.cr-subtitle { color: var(--primary) !important; }`,
    );
    // Footer
    overrides.push(
      `.footer a:hover { color: var(--primary) !important; }`,
      `.footer-social-link:hover { background: var(--primary-subtle) !important; color: var(--primary) !important; }`,
    );
    // Series detail
    overrides.push(
      `.series-status-badge { background: var(--primary-subtle) !important; color: var(--primary) !important; border-color: var(--primary) !important; }`,
      `.chapter-item:hover { border-left-color: var(--primary) !important; }`,
    );
    // Search results
    overrides.push(
      `.search-result-item:hover { background: var(--primary-subtle) !important; }`,
    );
    // Progress/loading bar
    overrides.push(
      `.spinner { border-top-color: var(--primary) !important; }`,
    );
  }

  if (settings.button_color) overrides.push(`.btn-primary { background: var(--btn-primary-bg) !important; border-color: var(--btn-primary-bg) !important; }`);
  if (settings.button_hover_color) overrides.push(`.btn-primary:hover { background: var(--btn-primary-hover) !important; border-color: var(--btn-primary-hover) !important; }`);
  if (settings.button_text_color) overrides.push(`.btn-primary, .btn-primary:hover { color: var(--btn-primary-text) !important; }`);
  if (settings.link_color) overrides.push(`a { color: var(--link-color); }`);
  if (settings.link_hover_color) overrides.push(`a:hover { color: var(--link-hover-color) !important; }`);
  if (settings.navbar_bg_color) overrides.push(`.navbar { background: var(--navbar-bg) !important; backdrop-filter: none !important; }`);
  if (settings.announcement_bg_color) overrides.push(`.announcements-bar, .ann-item { background: var(--announcement-bg) !important; }`);

  // Latest Updates color overrides (use pre-sanitized local vars)
  if (luTitleColor) {
    overrides.push(`.holo-title, .asura-title, .glass-card-title, .cosmic-card .ctt-title, .cinematic-card .cine-title, .skill-tree-card .st-title { color: var(--latest-updates-title-color) !important; }`);
  }
  if (luCardBg) {
    overrides.push(`.holo-card { background: var(--latest-updates-card-bg) !important; }`);
    // .holo-card-inner intentionally excluded — preserves the glassmorphism depth effect
    overrides.push(`.asura-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.glass-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.cosmic-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.cinematic-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.skill-tree-card { background: var(--latest-updates-card-bg) !important; }`);
  }
  if (luCardBorder) {
    overrides.push(`.holo-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.asura-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.glass-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.cosmic-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.cinematic-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.skill-tree-card { border-color: var(--latest-updates-card-border) !important; }`);
  }
  if (luBadgeBg) {
    overrides.push(`.new-chapter-badge-pill { background: var(--latest-updates-badge-bg) !important; border-color: var(--latest-updates-badge-bg) !important; }`);
  }
  if (luBadgeText) {
    overrides.push(`.new-chapter-badge-pill { color: var(--latest-updates-badge-text) !important; }`);
  }
  if (luHoverBg) {
    overrides.push(`.holo-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.asura-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.glass-card-chapters a:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.cosmic-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.cine-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.st-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
  }

  if (overrides.length > 0) css += overrides.join('\n') + '\n';

  // Custom CSS (always last so it can override everything)
  if (settings.custom_css) css += '\n' + settings.custom_css;

  return css;
}

// Social link SVG icons
function SocialLinks({ settings }) {
  const socials = [
    { key: 'discord_url', label: 'Discord', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.033.06a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
    { key: 'reddit_url', label: 'Reddit', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg> },
    { key: 'twitter_url', label: 'Twitter / X', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { key: 'instagram_url', label: 'Instagram', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
    { key: 'tiktok_url', label: 'TikTok', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/></svg> },
    { key: 'youtube_url', label: 'YouTube', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
    { key: 'facebook_url', label: 'Facebook', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  ];

  const activeLinks = socials.filter(s => settings[s.key]);
  if (activeLinks.length === 0) return null;

  return (
    <div className="footer-social">
      {activeLinks.map(s => (
        <a key={s.key} href={settings[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="footer-social-link">
          {s.svg}
        </a>
      ))}
    </div>
  );
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') || '/';
  const nonce = headerStore.get('x-nonce') || undefined;
  // cacheVersion en üste taşındı — bakım modu early return'lerde erken kullanılıyor
  const cacheVersion = SERVER_START_VER;
  const isAdmin = await isStaffFromCookie(cookieStore);
  const siteSettings = await getSiteSettings();
  // getSiteSettings() zaten cache'lenmiş veriyi döndürür — ekstra DB sorgusu yok
  const maintenance = await isMaintenanceModeOn(siteSettings);
  // getSiteSettings() çağrısı yukarıda ham (filtresiz) ayar map'ini de cache'ledi —
  // bunu SettingsProvider'a initialSettings olarak veriyoruz ki AdBanner ve diğer
  // ayar-bağımlı client bileşenleri ilk render'da (client'ın kendi /api/settings
  // isteğini beklemeden) doğru veriyle çizilsin. Bulunamazsa (ör. DB hatası
  // sonrası fallback yolu) undefined kalır ve SettingsProvider normal client
  // fetch'ine geri döner — davranış bozulmaz.
  const { cache: rawSiteSettingsForClient } = getRawSettingsCache();

  // API routes bypass tamamen — layout bile çalışmaz
  const isApiRoute = pathname.startsWith('/api/');
  if (isApiRoute) {
    return <>{children}</>;
  }

  // /dogrulama — DDoS gate doğrulama sayfası. Navbar/footer/reklam/chat gibi
  // hiçbir "site chrome"u YOK — middleware zaten doğrulanmamış ziyaretçiyi
  // page.js hiç çalışmadan buraya yönlendiriyor, o yüzden bu sayfa da mümkün
  // olduğunca hafif kalmalı. Ayrıca bu chrome'suz yapı, GateVerifyClient
  // içindeki `position: fixed` overlay'in normal site düzenindeki (Navbar/
  // PageBackground gibi) transform/filter içeren üst elemanlardan etkilenip
  // ekranı tam kaplayamama sorununu da ortadan kaldırır.
  if (pathname === '/dogrulama') {
    return (
      <html lang="tr" suppressHydrationWarning>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="robots" content="noindex, nofollow" />
          <title>Güvenlik Doğrulaması</title>
        </head>
        <body style={{ margin: 0, minHeight: '100vh', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <SettingsProvider initialSettings={rawSiteSettingsForClient}>
            {children}
          </SettingsProvider>
        </body>
      </html>
    );
  }

  // /admin5 — yönetici giriş sayfası. Navbar/footer/reklam/chat gibi site
  // chrome'u YOK ve bakım modundan da muaf (bakım açıkken yönetici içeri girebilmeli).
  // Normal kullanıcı girişinden (/login) tamamen ayrı bir sayfa + ayrı API kullanır.
  if (pathname === '/admin5') {
    return (
      <html lang="tr" suppressHydrationWarning>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="robots" content="noindex, nofollow" />
          <title>Yönetici Girişi — {siteSettings.site_name || 'Asteria Scans'}</title>
        </head>
        <body style={{ margin: 0, minHeight: '100vh', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <SettingsProvider initialSettings={rawSiteSettingsForClient}>
            <AuthProvider>
              {children}
            </AuthProvider>
          </SettingsProvider>
        </body>
      </html>
    );
  }

  // Bakım modunda admin değilse:
  // - /login → navbar/footer olmadan sadece form göster
  // - Diğer sayfalar → /maintenance'a proxy zaten redirect eder ama layout da kontrol eder
  if (maintenance && !isAdmin) {
    const isLoginPage = pathname.startsWith('/login');
    if (isLoginPage) {
      // Sadece login formunu göster, navbar/footer YOK
      return (
        <html lang="tr" suppressHydrationWarning>
          <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Yönetici Girişi — {siteSettings.site_name || 'Site'}</title>
          </head>
          <body style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              {siteSettings.logo_url ? (
                <img src={`${siteSettings.logo_url}${siteSettings.logo_url.includes('?') ? '&' : '?'}v=${cacheVersion}`} alt={siteSettings.site_name || 'Logo'} style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain' }} decoding="async" />
              ) : (
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#a5b4fc' }}>{siteSettings.site_name || 'Site'}</span>
              )}
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#64748b' }}>Bakım modu aktif — sadece yöneticiler giriş yapabilir</div>
            </div>
            <AuthProvider>
              <SettingsProvider initialSettings={rawSiteSettingsForClient}>
                {children}
              </SettingsProvider>
            </AuthProvider>
            <a href="/maintenance" style={{ marginTop: 20, fontSize: '0.78rem', color: '#64748b', textDecoration: 'none' }}>← Bakım sayfasına dön</a>
          </body>
        </html>
      );
    }
    // /login ve /maintenance dışındaki sayfalarda maintenance sayfasını göster
    if (!pathname.startsWith('/maintenance')) {
      const msg = await getMaintenanceMessage(siteSettings);
      const logoUrl = siteSettings.logo_url ? `${siteSettings.logo_url}${siteSettings.logo_url.includes('?') ? '&' : '?'}v=maintenance` : '/logo.png';
      return <MaintenancePage message={msg} siteName={siteSettings.site_name} contactEmail={siteSettings.contact_email} discordUrl={siteSettings.discord_url || null} logoUrl={logoUrl} design={siteSettings.maintenance_mode_design || 'default'} />;
    }
  }

  // /maintenance sayfası — minimal layout, navbar/footer yok
  if (pathname.startsWith('/maintenance')) {
    return (
      <html lang="tr" suppressHydrationWarning>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bakım Modu — {siteSettings.site_name || 'Site'}</title>
        </head>
        <body style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </body>
      </html>
    );
  }

  const dynamicCss = buildDynamicCss(siteSettings);

  const displaySiteName = siteSettings.site_name || 'Asteria Scans';
  const displayFooterText = siteSettings.footer_text || `© ${new Date().getFullYear()} ${displaySiteName}.`;
  const contactEmail = siteSettings.contact_email || 'asteriascanssupport@gmail.com';

  const gaId = siteSettings.google_analytics_id?.trim() || '';
  const gtmId = siteSettings.google_tag_manager_id?.trim() || '';
  const websiteJsonLd = buildWebsiteJsonLd(displaySiteName, contactEmail);

  // Ana sayfa BreadcrumbList — Google rich results için
  const homeBreadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: BASE_URL },
    ],
  });

  return (
    <html lang="tr" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Inter + Cinzel: build-time next/font yerine normal <link> ile,
            tarayıcıda yükleniyor — bkz. dosya başındaki açıklama. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cinzel:wght@600;700&display=swap"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Bölüm/kapak görselleri imgbb (i.ibb.co) üzerinden servis ediliyor.
            Erken preconnect, DNS+TLS el sıkışmasını sayfa yüklenirken değil
            önceden yaptırarak ilk görsellerin daha hızlı inmesini sağlar. */}
        <link rel="preconnect" href="https://i.ibb.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ibb.co" />
        {/* Favicon artik sadece generateMetadata() icinden yonetiliyor
            Varsayilan favicon: /api/favicon (veritabanindan dinamik yuklenir)
            Özel favicon: admin panelinden ayarlanan URL
            Tum durumlarda cache busting aktif - veritabani degisikliklerinde tarayici aninda guncellenir */}
        {dynamicCss && (
          <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: String(websiteJsonLd).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: String(homeBreadcrumbJsonLd).replace(/</g, '\\u003c') }}
        />
        {/* Google Tag Manager — <head> snippet */}
        {gtmId && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}
        {/* Google Analytics 4 — only when no GTM (GTM loads GA itself if configured) */}
        {gaId && !gtmId && (
          <>
            <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{page_path:window.location.pathname});`,
              }}
            />
          </>
        )}
        </head>
      <body suppressHydrationWarning>
        {/* Google Tag Manager — <body> noscript fallback */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {/* Google Analytics 4 via Script (when GTM is present, GA fires through GTM) */}
        {gaId && gtmId && (
          <Script id="ga4-gtm-init" strategy="afterInteractive" nonce={nonce}>
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{page_path:window.location.pathname});`}
          </Script>
        )}
        {/* Custom <head> scripts / meta tags configured via admin panel */}
        {siteSettings.custom_head_scripts && (
          <CustomHeadScripts html={siteSettings.custom_head_scripts} />
        )}

        <SettingsProvider initialSettings={rawSiteSettingsForClient}>
        <AuthProvider>
          <MaintenanceChecker />
        <ContentProtection />
          <PageBackground />
          <Navbar siteSettings={siteSettings} />
          <AdBanner placement="header" style={{ width: '100%' }} />
          {maintenance && isAdmin && (
            <div style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 0,
              padding: '8px 20px',
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#fbbf24',
              letterSpacing: '0.02em',
            }}>
              🔧 Bakım modu <strong>AÇIK</strong> — Siteyi sadece siz görebilirsiniz. Ziyaretçiler bakım sayfasını görür.
            </div>
          )}
          <AdBanner placement="popup" />
          <PopupAlert />
          <WelcomeScreen />
          <TrafficTracker />
          <FirebaseAnalyticsInit />
          {/* Vercel Web Analytics — paket gerektirmez. Vercel panelinde projede
              Analytics sekmesinden "Enable" edilince veri toplamaya başlar. */}
          <Script id="vercel-analytics-init" strategy="afterInteractive" nonce={nonce}>
            {`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}
          </Script>
          <Script src="/_vercel/insights/script.js" strategy="afterInteractive" nonce={nonce} />
          <main>{children}</main>
          <AdBanner placement="footer" style={{ width: '100%', padding: '8px 0' }} />
          <footer className="footer">
            <div className="footer-inner">
              <div className="footer-left">
                {siteSettings.logo_url ? (
                  <img src={`${siteSettings.logo_url}${siteSettings.logo_url.includes('?') ? '&' : '?'}v=${cacheVersion}`} alt={displaySiteName} style={{ height: 40, maxWidth: 200, width: 'auto', objectFit: 'contain', display: 'block' }} decoding="async" />
                ) : (
                  <>
                    <span className="logo-icon">読</span>
                    <span>{displaySiteName}</span>
                  </>
                )}
              </div>
              <div className="footer-links">
                {(siteSettings.footer_menu || DEFAULT_FOOTER_MENU).map((item, i) => {
                  // Navbar.js'deki aynı mantık: bilinen url'ler için etiketi
                  // her zaman Türkçe'ye zorla — DB'de eski/İngilizce bir
                  // değer kalmış olsa bile (ör. daha önce özelleştirilmiş
                  // ama migration'ın tam eşleşmediği kayıtlar) kullanıcıya
                  // asla İngilizce metin gösterilmez.
                  const label = {
                    '/privacy': 'Gizlilik Politikası',
                    '/terms': 'Kullanım Koşulları',
                    '/series': 'Göz At',
                    '/seri': 'Göz At',
                    '/': 'Ana Sayfa',
                    '/ranking': 'Sıralama',
                    '/requests': 'İstekler',
                  }[item.url] || item.label;
                  return <Link key={i} href={item.url || '#'}>{label}</Link>;
                })}
              </div>
              <div className="footer-right">
                {displayFooterText}
              </div>
            </div>
            <SocialLinks settings={siteSettings} />
            <div className="footer-disclaimer">
              {displaySiteName} hayran odaklı bir platformdur. Tüm manga başlıkları, çizimler ve karakterler kendi yaratıcılarına ve yayıncılarına aittir.
              İçerikler yalnızca eğitim ve eğlence amaçlı sunulmaktadır. Telif hakkı sahibiyseniz ve çalışmanızın izinsiz kullanıldığını düşünüyorsanız,
              yayından kaldırılması için lütfen <a href={`mailto:${contactEmail}`} style={{color: 'var(--primary)'}}>{contactEmail}</a> adresinden bizimle iletişime geçin.
            </div>
          </footer>
        </AuthProvider>
        </SettingsProvider>
        {/* Custom Body JS injected by admin */}
        {siteSettings.custom_body_js && (
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: siteSettings.custom_body_js.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '') }} />
        )}
        <Script id="sw-register" strategy="afterInteractive" nonce={nonce}>
          {`
            if ('serviceWorker' in navigator) {
              const isLocal = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
              if (isLocal) {
                navigator.serviceWorker.getRegistrations()
                  .then(regs => Promise.all(regs.map(reg => reg.unregister())))
                  .catch(() => {});
                if ('caches' in window) {
                  caches.keys()
                    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
                    .catch(() => {});
                }
              } else {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}
