import { redirect } from 'next/navigation';

// Mağaza özelliği kaldırıldı (bkz. lib/db.js → removeShopFeature): ilgili API'ler ve tablolar yok.
// Eskiden bu sayfa olmayan API'lere istek atıp hata gösteriyordu; artık ana sayfaya yönlendiriyor.
export default function ShopPage() {
    redirect('/');
}
