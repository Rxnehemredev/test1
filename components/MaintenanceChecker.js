'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Bakım modunu her route değişiminde kontrol eder.
// Server-side layout.js yalnızca ilk yüklemede çalışır;
// bu bileşen Next.js SPA navigasyonu sırasında bakım modunu yakalar.
export default function MaintenanceChecker() {
    const pathname = usePathname();
    const lastCheck = useRef(0);

    useEffect(() => {
        // Admin, login, maintenance ve API yollarını atla
        if (!pathname) return;
        if (
            pathname.startsWith('/admin') ||
            pathname.startsWith('/api') ||
            pathname.startsWith('/login') ||
            pathname.startsWith('/maintenance')
        ) return;

        // Aynı yolda çok sık kontrol etme (en az 5 saniye aralık)
        const now = Date.now();
        if (now - lastCheck.current < 5000) return;
        lastCheck.current = now;

        fetch('/api/maintenance-status', { cache: 'no-store', credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data.maintenance) {
                    // canBypass: sunucu tarafı JWT kontrolü sonucu
                    // admin, manager, moderator, team_member ve tanımlı özel roller bypass edebilir
                    if (data.canBypass) return;
                    window.location.href = '/maintenance';
                }
            })
            .catch(() => {});
    }, [pathname]);

    return null;
}