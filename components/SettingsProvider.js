'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);

async function isAdminSession() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.user?.role === 'admin';
    } catch {
        return false;
    }
}

export function SettingsProvider({ children, initialSettings }) {
    // initialSettings: layout.js SSR sırasında zaten getSiteSettings() ile ayarları
    // çekiyor. Bunu buraya geçirmezsek, her sayfa yüklemesinde İKİNCİ bir
    // /api/settings isteği atılıyor VE loaded=false olduğu ilk anda (Ad banner
    // gibi) ayara bağlı bileşenler render edilmiyor — sonra veriler gelince
    // aniden beliriyor (CLS / layout shift). Server'dan gelen veriyle senkron
    // (aynı ilk render'da) başlatınca hem gereksiz fetch hem de bu "zıplama"
    // ortadan kalkıyor. 30sn'lik periyodik kontrol (bakım modu vb. için) aynen
    // devam ediyor, sadece mount'taki İLK bloklayıcı fetch atlanıyor.
    const [settings, setSettings] = useState(initialSettings || {});
    const [loaded, setLoaded] = useState(!!initialSettings);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.settings) {
                    setSettings(data.settings);
                    // Check maintenance mode on client-side navigation
                    if (data.settings.maintenance_mode === '1') {
                        const isBypass = window.location.pathname === '/login'
                            || window.location.pathname === '/admin5'
                            || window.location.pathname === '/maintenance'
                            || window.location.pathname.startsWith('/api/');
                        if (!isBypass) {
                            // Admin kullanıcılar bakım modunda da siteye erişebilir
                            const admin = await isAdminSession();
                            if (!admin) {
                                const currentPath = window.location.pathname;
                                if (currentPath !== '/login' && currentPath !== '/admin5' && currentPath !== '/maintenance' && !currentPath.startsWith('/api/')) {
                                    window.location.href = '/maintenance';
                                }
                            }
                        }
                    }
                }
            }
        } catch {
            // Network error — keep previous settings
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        // Server zaten ayarları verdiyse mount'ta tekrar fetch etme — sadece
        // periyodik kontrol (bakım modu değişikliklerini yakalamak için) çalışsın.
        if (!initialSettings) {
            fetchSettings();
        }
        // Periodic check for maintenance mode (every 30 seconds) — sekme arka plandaysa atla
        const interval = setInterval(() => {
            if (!document.hidden) fetchSettings();
        }, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider value={{ settings, loaded, refetch: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);