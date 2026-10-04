'use client';

import { useEffect } from 'react';

// ══════════════════════════════════════════════════════════════════════════
// Görsel "hırsızlığına" karşı CAYDIRICI önlemler.
//
// DÜRÜST UYARI: Bunlar gerçek bir güvenlik önlemi DEĞİL, sadece caydırıcıdır.
// Tarayıcıya gönderilen her görsel, tarayıcının DevTools > Network sekmesinden
// veya "görüntüyü kaydet" engellense bile ekran görüntüsüyle her zaman elde
// edilebilir. Amacımız sıradan kullanıcının sağ-tık > "resmi kopyala/farklı
// kaydet" ile saniyeler içinde toplu indirme yapmasını biraz zorlaştırmak.
//
// Gerçek koruma için (öncelik sırasına göre):
//   1) Watermark (zaten admin panelde mevcut — /api/admin/watermark)
//   2) Görselleri kendi originin üzerinden proxy'leyip Referer/hotlink
//      kontrolü yapmak (bkz. FIREWALL.md — "imgbb yerine kendi CDN" notu)
//   3) DMCA / telif şikayeti süreci (asıl caydırıcı olan budur)
// ══════════════════════════════════════════════════════════════════════════

// DevTools'u açan klavye kısayolları. NOT: Bu liste sadece TARAYICI
// KISAYOLLARINI yakalayıp preventDefault() ile durdurur. Tarayıcının kendi
// menüsünden (⋮ > Diğer araçlar > Geliştirici Araçları) veya farklı bir
// klavye düzeninde/harici kısayol atamasıyla açılmasını ENGELLEYEMEZ — bu
// tarayıcı seviyesinde mümkün değil. Yine de sıradan bir kullanıcının F12'ye
// basıp kaynak/network sekmesini açmasını biraz zorlaştırır.
function isBlockedDevToolsShortcut(e) {
  const key = (e.key || '').toLowerCase();

  if (e.key === 'F12') return true; // DevTools'u doğrudan aç/kapat
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) return true; // Inspect/Console/Elements
  if ((e.ctrlKey || e.metaKey) && key === 'u') return true; // View source
  if ((e.ctrlKey || e.metaKey) && key === 's') return true; // Sayfayı kaydet (tüm görselleri toplu indirir)

  return false;
}

export default function ContentProtection() {
  useEffect(() => {
    const isProtectedTarget = (el) => {
      if (!el) return false;
      return (
        el.tagName === 'IMG' ||
        !!el.closest?.('.protected-image, .manga-page-img, .webtoon-page-img, .rec-bg, [data-protect-image]')
      );
    };

    const handleContextMenu = (e) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e) => {
      if (isProtectedTarget(e.target)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      // Not: Ctrl+S / Ctrl+U / Ctrl+Shift+I gibi kombinasyonlar hiçbir
      // input/textarea'da metin girişine karışmaz (karakter üretmezler),
      // bu yüzden yazı yazarken ekstra bir istisnaya gerek yok.
      if (isBlockedDevToolsShortcut(e)) {
        e.preventDefault();
      }
    };

    // Görsel sürükle-bırak ile yeni sekmede/masaüstüne kopyalanmasını engeller
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
