'use client';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/components/SettingsProvider';
import { useEffect, useState, useMemo } from 'react';

/**
 * Sayfa bazlı arka plan uygulayıcı.
 * Admin panelinden ayarlanan renk, görsel ve blur değerlerini
 * ilgili sayfada <body> elementine CSS değişkeni olarak enjekte eder.
 */

/** Pathname'den sayfa key'ini çıkarır */
function resolvePageKey(pathname) {
    if (pathname === '/' || pathname === '') return 'home';
    // /series (arşiv listesi) vs /series/slug veya /seri/slug (detay)
    if (pathname.startsWith('/series') || pathname.startsWith('/seri')) {
        const parts = pathname.split('/').filter(Boolean);
        // Sadece /series → arşiv
        if (parts.length <= 1) return 'archive';
        // /seri/slug/bolum/X veya /series/slug/chapter/X → detay/okuyucu → null
        return null;
    }
    if (pathname.startsWith('/requests')) return 'requests';
    if (pathname.startsWith('/profile') || pathname.startsWith('/user')) return 'profile';
    if (pathname.startsWith('/ranking')) return 'ranking';
    return null; // bilinmeyen sayfa
}

export default function PageBackground() {
    const pathname = usePathname();
    const { settings } = useSettings() || {};
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const pageKey = useMemo(() => resolvePageKey(pathname), [pathname]);

    const resolveVal = (suffix) => {
        if (!settings) return null;
        if (pageKey) {
            const v = settings[`page_bg_${pageKey}_${suffix}`];
            const str = v !== undefined && v !== null ? String(v).trim() : '';
            // Blur için '0' değeri "ayarlanmamış" sayılır — global değere düşülür
            const isEmpty = str === '' || (suffix === 'blur' && str === '0');
            if (!isEmpty) return str;
        }
        const g = settings[`page_bg_global_${suffix}`];
        return g !== undefined && g !== null && String(g).trim() !== '' ? String(g).trim() : null;
    };

    useEffect(() => {
        if (!mounted || !settings) return;

        const color = resolveVal('color');
        const image = resolveVal('image');
        const blur  = resolveVal('blur');

        const root = document.documentElement;

        if (color) {
            root.style.setProperty('--page-bg-color', color);
        } else {
            root.style.removeProperty('--page-bg-color');
        }

        if (image) {
            root.style.setProperty('--page-bg-image', `url(${encodeURI(image)})`);
        } else {
            root.style.removeProperty('--page-bg-image');
        }

        const blurNum = parseInt(blur || '0', 10);
        if (blurNum > 0) {
            root.style.setProperty('--page-bg-blur', `${blurNum}px`);
        } else {
            root.style.removeProperty('--page-bg-blur');
        }

        // body arka plan rengini güncelle (yalnızca renk ayarlandıysa)
        if (color) {
            document.body.style.setProperty('background-color', color, 'important');
        } else {
            document.body.style.removeProperty('background-color');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, settings, mounted]);

    // Görsel + blur için sabit arka plan div'i (sadece görsel varsa)
    if (!mounted || !settings) return null;

    const image = resolveVal('image');
    const blur  = parseInt(resolveVal('blur') || '0');

    if (!image) return null;

    if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/admin-panel') || pathname.startsWith('/profile') || pathname.startsWith('/user'))) return null;

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: -10,
                backgroundImage: `url(${encodeURI(image)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat',
                filter: blur > 0 ? `blur(${blur}px)` : undefined,
                transform: blur > 0 ? 'scale(1.05)' : undefined,
                pointerEvents: 'none',
            }}
        />
    );
}