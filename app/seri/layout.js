const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://asterianewdayv3.vercel.app';

// /seri sayfası /series ile aynı içerik — canonical /series'e işaret ediyor
// ama noindex kaldırıldı: sitedeki gerçek linkler (Navbar, SeriesCard, HomeClient,
// SeriesDetailClient) hep /seri/{slug} adresine gidiyor, bu yüzden bu route grubu
// indexlenebilir olmalı. Alt sayfalar kendi robots değerini ayrı belirtiyor zaten.
export const metadata = {
  alternates: {
    canonical: `${BASE_URL}/series`,
  },
  robots: { index: true, follow: true },
};

export default function SeriListLayout({ children }) {
  return children;
}