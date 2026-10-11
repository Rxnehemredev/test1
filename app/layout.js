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
import { getRawSettingsCache } from '@/lib/settings-cache';
import { validateCustomBodyJs } from '@/lib/security/scriptSanitizer';
import MaintenancePage from '@/components/layout/MaintenanceView';
import Footer from '@/components/layout/Footer';
import {
  isStaffFromCookie,
  isMaintenanceModeOn,
  getMaintenanceMessage,
  getSiteSettings
} from '@/lib/settings/siteSettings';
import { buildDynamicCss } from '@/lib/theme/dynamicCss';

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
          <Footer
            siteSettings={siteSettings}
            cacheVersion={cacheVersion}
            displaySiteName={displaySiteName}
            displayFooterText={displayFooterText}
            contactEmail={contactEmail}
          />
        </AuthProvider>
        </SettingsProvider>
        {/* Custom Body JS injected by admin (güvenlik doğrulamalı ve yapılandırılmış) */}
        {(() => {
          if (!siteSettings.custom_body_js) return null;
          const check = validateCustomBodyJs(siteSettings.custom_body_js);
          if (!check.valid || !Array.isArray(check.scripts)) {
            if (typeof console !== 'undefined') {
              console.warn('[layout] custom_body_js güvenlik doğrulaması başarısız:', check.error);
            }
            return null;
          }
          return check.scripts.map((item, idx) => {
            if (item.type === 'external') {
              return (
                <script
                  key={`custom-script-${idx}`}
                  src={item.src}
                  async={item.async ?? true}
                  defer={item.defer ?? false}
                  nonce={nonce}
                />
              );
            }
            if (item.type === 'inline' && item.code) {
              return (
                <script
                  key={`custom-script-${idx}`}
                  nonce={nonce}
                  dangerouslySetInnerHTML={{ __html: item.code }}
                />
              );
            }
            return null;
          });
        })()}
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
