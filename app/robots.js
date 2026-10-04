const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

export default function robots() {
  return {
    rules: [
      {
        userAgent: 'MJ12bot',
        disallow: ['/'],
      },
      {
        userAgent: ['AhrefsBot', 'SemrushBot'],
        crawlDelay: 10,
      },
      {
        // Tüm diğer botlar: sadece gerçekten kapalı olması gereken yolları kapat.
        // Allow listesi gereksiz — robots.txt varsayılan olarak her şeye izin verir,
        // sadece istisnalar (Disallow) belirtilir. Önceki hatalı yapıda allow/disallow
        // çakışması blogları bazı araçlarda "engellenmiş" gösteriyordu.
        userAgent: '*',
        disallow: [
          '/api/',
          '/admin-panel',
          '/admin',
          '/login',
          '/register',
          '/profile',
          '/dogrulama',
          '/gecmis',
          '/magaza',
        ],
      },
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/sitemap-static.xml`,
      `${BASE_URL}/sitemap-genres.xml`,
      `${BASE_URL}/sitemap-series.xml`,
      `${BASE_URL}/sitemap-chapters.xml`,
      `${BASE_URL}/sitemap-blogs.xml`,
      `${BASE_URL}/sitemap-tags.xml`,
    ],
    host: BASE_URL,
  };
}
