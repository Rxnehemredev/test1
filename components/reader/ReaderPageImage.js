import React, { useState, useEffect, useRef } from 'react';

const NEXT_IMAGE_OPTIMIZABLE_HOSTS = new Set(['i.ibb.co']);

export function isOptimizableImageSrc(url) {
    if (!url) return false;
    if (url.startsWith('/api/img')) return false;
    if (url.startsWith('/')) return true;
    try {
        return NEXT_IMAGE_OPTIMIZABLE_HOSTS.has(new URL(url).hostname);
    } catch {
        return false;
    }
}

const OPTIMIZED_WIDTH = 1200;

export function buildOptimizedSrc(src) {
    if (!src || !src.startsWith('/')) return src;
    return `/_next/image?url=${encodeURIComponent(src)}&w=${OPTIMIZED_WIDTH}&q=80`;
}

let _refreshPagesCallback = null;
export function setRefreshPagesCallback(cb) {
    _refreshPagesCallback = cb;
}

export default function ReaderPageImage({
    page,
    retryToken,
    priority,
    className,
    style,
    onLoadDone,
    onErrorDone,
    seriesTitle,
    chapterNumber
}) {
    const [activeSrc, setActiveSrc] = useState(null);
    const triedRefreshRef = useRef(false);

    const baseSrc = page.image_url || page.display_image;
    const rawSrc = retryToken ? `${baseSrc}?retry=${retryToken}` : baseSrc;
    const hasDims = Number(page.width) > 0 && Number(page.height) > 0;
    const canOptimize = isOptimizableImageSrc(baseSrc);
    const computedSrc = hasDims && canOptimize ? buildOptimizedSrc(rawSrc) : rawSrc;
    const loadSrc = activeSrc || computedSrc;

    const alt = seriesTitle
        ? `${seriesTitle}${chapterNumber ? ` Bölüm ${chapterNumber}` : ''} — Sayfa ${page.page_number}`
        : `Sayfa ${page.page_number}`;

    useEffect(() => {
        setActiveSrc(null);
        triedRefreshRef.current = false;
    }, [baseSrc]);

    return (
        <img
            src={loadSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={className}
            style={{
                width: '100%',
                display: 'block',
                aspectRatio: hasDims ? String(page.width / page.height) : undefined,
                background: 'rgba(255,255,255,0.03)',
                ...style,
            }}
            onLoad={onLoadDone}
            onError={async (e) => {
                const img = e.currentTarget;

                if (img.src !== rawSrc && rawSrc !== loadSrc) {
                    img.src = rawSrc;
                    return;
                }

                if (!triedRefreshRef.current && _refreshPagesCallback) {
                    triedRefreshRef.current = true;
                    try {
                        const freshUrl = await _refreshPagesCallback(page.page_number);
                        if (freshUrl && freshUrl !== baseSrc) {
                            setActiveSrc(freshUrl);
                            return;
                        }
                    } catch { /* refresh failed */ }
                }

                onErrorDone?.();
            }}
        />
    );
}
