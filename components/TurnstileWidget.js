'use client';
import { useEffect, useRef, useState } from 'react';

export default function TurnstileWidget({ onVerify, onError, siteKey }) {
    const containerRef = useRef(null);
    const widgetId = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!siteKey) return;

        // Load the Turnstile script if not already loaded
        if (!document.getElementById('cf-turnstile-script')) {
            const script = document.createElement('script');
            script.id = 'cf-turnstile-script';
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => setLoaded(true);
            document.head.appendChild(script);
        } else if (window.turnstile) {
            setLoaded(true);
        } else {
            // Script exists but might not be loaded yet
            const existingScript = document.getElementById('cf-turnstile-script');
            existingScript.addEventListener('load', () => setLoaded(true));
        }
    }, [siteKey]);

    useEffect(() => {
        if (!loaded || !siteKey || !containerRef.current) return;
        if (widgetId.current !== null) return; // already rendered

        widgetId.current = window.turnstile?.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => { if (onVerify) onVerify(token); },
            'error-callback': () => { if (onError) onError('Turnstile verification failed'); },
            'expired-callback': () => { if (onVerify) onVerify(null); },
            theme: 'dark',
            size: 'normal',
        });
    }, [loaded, siteKey, onVerify, onError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (widgetId.current !== null && window.turnstile) {
                try { window.turnstile.remove(widgetId.current); } catch {}
                widgetId.current = null;
            }
        };
    }, []);

    if (!siteKey) return null;

    return (
        <div
            ref={containerRef}
            style={{ margin: '12px 0', display: 'flex', justifyContent: 'center' }}
        />
    );
}