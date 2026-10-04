'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ── Optimizasyon notları ───────────────────────────────────────────────────
// 1) %30 örnekleme: her sayfayı takip etmek yerine rastgele 1/3 isteği gönder.
//    Trend doğruluk kaybı çok küçük, Turso + Vercel CPU tasarrufu büyük.
// 2) sendBeacon: fetch()'in aksine sayfa kapanırken bile güvenli çalışır,
//    ayrıca tarayıcı bunu arka plana atar — ana thread'i bloklamaz.
// 3) Bot erken çıkış: UA zaten middleware'de engelleniyor; burada da check
//    yaparak sunucuya istek gitmesini önlüyoruz.
// 4) pathRef: aynı path'e çift kayıt gitmemesi için ref koruması.
// ──────────────────────────────────────────────────────────────────────────

const BOT_UA_RE = /bot|crawler|spider|scraper|headless/i;
const SAMPLE_RATE = 0.3; // %30 örnekleme — değiştirmek istersen 1.0 yap

export default function TrafficTracker() {
    const pathname = usePathname();
    const lastSentRef = useRef(null);

    useEffect(() => {
        if (!pathname) return;
        if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;
        // Aynı path'e tekrar gönderme (React Strict Mode çift-fire koruması)
        if (lastSentRef.current === pathname) return;

        // Bot kontrolü (client tarafı ön filtre)
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        if (BOT_UA_RE.test(ua)) return;

        // Örnekleme: %30 ihtimalle gönder, geri kalanını atla
        if (Math.random() > SAMPLE_RATE) return;

        lastSentRef.current = pathname;

        const referrer = typeof document !== 'undefined' ? document.referrer : '';
        const payload = JSON.stringify({ path: pathname, referrer });

        // sendBeacon tercihli — sayfa kapanırken bile çalışır, non-blocking
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/admin/traffic', blob);
        } else {
            // Fallback: fetch, hata sessizce yutulur
            fetch('/api/admin/traffic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
            }).catch(() => {});
        }
    }, [pathname]);

    return null;
}
