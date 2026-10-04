'use client';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/components/SettingsProvider';

/**
 * AdBanner — renders ad code for a given placement.
 *
 * Props:
 *   placement  — 'popup' | 'header' | 'sidebar' | 'between_chapters' | 'footer'
 *   style      — optional inline styles for the wrapper element
 *   className  — optional class name for the wrapper element
 */
export default function AdBanner({ placement, style, className }) {
    const { settings, loaded } = useSettings();
    const containerRef = useRef(null);
    const scriptRanRef = useRef(false);
    const [dismissed, setDismissed] = useState(false);

    const enabledKey = `ad_${placement}_enabled`;
    const codeKey = `ad_${placement}_code`;

    const isEnabled = settings?.[enabledKey] === '1';
    const adCode = settings?.[codeKey] || '';

    // Popup: show once per browser session, versioned by a short hash of the ad code
    // so that updating the popup content resets suppression automatically.
    const [popupVisible, setPopupVisible] = useState(false);
    useEffect(() => {
        if (placement !== 'popup') return;
        if (!loaded || !isEnabled || !adCode) return;
        // Build a lightweight content key (first 16 chars of base64) to version the flag.
        let contentKey = 'ad_popup_shown';
        try { contentKey = `ad_popup_shown_${btoa(adCode).slice(0, 16)}`; } catch {}
        const seen = localStorage.getItem(contentKey);
        if (!seen) {
            setPopupVisible(true);
            localStorage.setItem(contentKey, '1');
        }
    }, [placement, loaded, isEnabled, adCode]);

    // Re-execute <script> tags that dangerouslySetInnerHTML does not run.
    // Guarded by scriptRanRef so scripts fire exactly once per mount, preventing
    // duplicate ad-network slots, listeners, or timers on re-renders.
    useEffect(() => {
        if (!containerRef.current) return;
        if (placement === 'popup' && !popupVisible) return;
        if (scriptRanRef.current) return;
        scriptRanRef.current = true;

        const container = containerRef.current;
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [popupVisible]); // runs once after mount (and once more when popup becomes visible)

    if (!loaded || !isEnabled || !adCode) return null;

    // ── Popup overlay ──────────────────────────────────────────────
    if (placement === 'popup') {
        if (!popupVisible || dismissed) return null;
        return (
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20,
                }}
                onClick={() => setDismissed(true)}
            >
                <div
                    style={{ position: 'relative', maxWidth: 640, width: '100%' }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => setDismissed(true)}
                        aria-label="Kapat"
                        style={{
                            position: 'absolute', top: -12, right: -12, zIndex: 1,
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        ✕
                    </button>
                    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: adCode }} />
                </div>
            </div>
        );
    }

    // ── All other placements ────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className={className}
            style={{ textAlign: 'center', ...style }}
            dangerouslySetInnerHTML={{ __html: adCode }}
        />
    );
}