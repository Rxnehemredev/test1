import React from 'react';
import { isAllowedImageUrl } from '@/lib/commentImages';

/**
 * Yorum metnini güvenli Markdown/HTML çıktısına dönüştürür.
 * XSS engeli: HTML karakterleri escape edilir.
 * Güvenlik/Gizlilik: Yalnızca whitelist domainlerdeki (GIPHY, imgbb) görsellere izin verilir.
 */
export function renderMarkdown(rawText) {
    if (!rawText) return null;
    const images = [];
    let html = String(rawText)
        .replace(/\u0000/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/!\[([^\]]*)\]\(([^)\s]*)\)/g, (match, alt, url) => {
            if (!isAllowedImageUrl(url.replace(/&amp;/g, '&'))) {
                images.push('<em style="opacity:0.6;font-size:0.85em;">[izin verilmeyen görsel kaldırıldı]</em>');
                return `\u0000IMG${images.length - 1}\u0000`;
            }
            const safeAlt = alt.replace(/[|*~]/g, '');
            images.push(`<img src="${url}" alt="${safeAlt}" referrerpolicy="no-referrer" style="max-width:100%; display:block; border-radius:4px; margin-top:8px;" decoding="async" loading="lazy" />`);
            return `\u0000IMG${images.length - 1}\u0000`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/\|\|(.*?)\|\|/g, '<span class="spoiler-text" onclick="this.classList.toggle(&#39;revealed&#39;)" title="Click to reveal spoiler">$1</span>')
        .replace(/\n/g, '<br />')
        .replace(/\u0000IMG(\d+)\u0000/g, (m, i) => images[Number(i)] || '');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
