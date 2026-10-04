/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker imajı için küçük, bağımsız çıktı (deploy/docker/Dockerfile BUILD_STANDALONE=1 verir).
  // Vercel ve `next start` kurulumlarında DEĞİŞİKLİK yok.
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' } : {}),
  // Kaynak haritaları sunucudan sızmasın (varsayılan zaten kapalı; açıkça sabitlendi).
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['jsonwebtoken', 'sharp'],

  // Tum favicon yonetimi artik veritabani uzerinden dinamik olarak yapiliyor
  // Favicon API: /api/favicon — veritabanindaki favicon_url degerini dondurur

  // Server Actions body limiti (madde 7: 50mb → 5mb). Büyük manga yüklemeleri
  // Server Action değil API route üzerinden yapılıyor.
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    optimizePackageImports: ['recharts', 'lucide-react', 'date-fns'],
    // Critical CSS generation - render-blocking azaltir
    optimizeCss: true,
  },
  // Prevent Turbopack from statically tracing the uploads directory
  outputFileTracingExcludes: {
    '*': [
      './public/uploads/**',
      './public/uploads/pages/**',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      // Not: Kapak/avatar görselleriniz başka bir domainden de geliyorsa
      // (ör. discord CDN, kendi CDN'iniz) burada ayrı bir satır olarak ekleyin.
      // hostname: '**' KULLANMAYIN — /_next/image?url= endpoint'ini herkese
      // açık bir görsel proxy'sine çevirir (SSRF + kaynak tüketimi riski).
    ],
    // Performans: WebP/AVIF otomatik dönüşümü
    formats: ['image/avif', 'image/webp'],
    // Caching süresi (saniye) - 30 gün
    minimumCacheTTL: 2592000,
    // Cihaz boyutları — manga okuyucu + kart görsellerine göre optimize edildi
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [24, 32, 48, 64, 96, 128, 256, 384],
    // Kestrel için optimize
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Gzip/Brotli compression
  compress: true,
  // X-Powered-By header'ını kaldır (küçük güvenlik + gereksiz byte)
  poweredByHeader: false,
  // Üretimde console.log'ları kaldır (bundle küçülür, runtime hızlanır)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  // Bundle analyzer icin notlar
  // Bundle'ı analiz etmek icin: ANALYZE=true npm run build
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()' },
          // Vercel dışında bu başlıkları ekleyen bir platform yok → uygulama kendisi ekler.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Origin-Agent-Cluster', value: '?1' },
          // Madde 6: Tüm site HTTPS'e zorlanır, tarayıcı bir daha hiç http:// ile
          // denemez (preload olmadan da 2 yıl boyunca geçerli). Vercel zaten HTTP'yi
          // HTTPS'e yönlendiriyor ama bu header olmadan ilk istek (veya bir MITM'in
          // downgrade denemesi) hâlâ düz HTTP üzerinden gidebiliyordu.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Content-Security-Policy artık middleware.js'te (lib/security/csp.js)
          // istek başına nonce ile üretiliyor — 'unsafe-inline' script yok.
        ],
      },
      {
        // Oturum / yönetici uçları ASLA cache'lenmesin (ara proxy, CDN, paylaşımlı tarayıcı)
        source: '/api/(admin|auth)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Kullanıcı yükleme görselleri — 30 gün cache
        source: '/uploads/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // Public statik dosyalar (icon, manifest vb.) — 7 gün cache
        source: '/:file(.*\\.(?:png|ico|svg|webp|jpg|jpeg|gif|woff2|woff))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      // NOT: /_next/static için özel header eklenmez — Next.js bunu otomatik yönetir
    ];
  },
  async redirects() {
    return [
      // /series/slug → /seri/slug (301 kalıcı yönlendirme)
      {
        source: '/series/:slug',
        destination: '/seri/:slug',
        permanent: true,
      },
      // /series/slug/chapter/N → /seri/slug/bolum/N
      {
        source: '/series/:slug/chapter/:chapterNumber',
        destination: '/seri/:slug/bolum/:chapterNumber',
        permanent: true,
      },
      // /series (liste sayfası)
      {
        source: '/series',
        destination: '/seri',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
