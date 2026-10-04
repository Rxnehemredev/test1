'use client';
import { useEffect } from 'react';

/**
 * Injects arbitrary HTML (scripts, meta tags, etc.) into <head>.
 * Used for admin-configured custom_head_scripts setting.
 * Runs client-side via useEffect to avoid invalid HTML in SSR <head>.
 */
export default function CustomHeadScripts({ html }) {
  useEffect(() => {
    if (!html || !html.trim()) return;

    const container = document.createElement('div');
    container.innerHTML = html;

    const injected = [];

    Array.from(container.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        let el;

        if (tag === 'script') {
          el = document.createElement('script');
          // Copy all attributes
          Array.from(node.attributes).forEach((attr) => {
            el.setAttribute(attr.name, attr.value);
          });
          if (node.src) {
            el.src = node.src;
          } else {
            el.textContent = node.textContent;
          }
        } else if (tag === 'meta') {
          el = document.createElement('meta');
          Array.from(node.attributes).forEach((attr) => {
            el.setAttribute(attr.name, attr.value);
          });
        } else if (tag === 'link') {
          el = document.createElement('link');
          Array.from(node.attributes).forEach((attr) => {
            el.setAttribute(attr.name, attr.value);
          });
        } else if (tag === 'style') {
          el = document.createElement('style');
          el.textContent = node.textContent;
        } else {
          // Generic element (noscript, etc.)
          el = node.cloneNode(true);
        }

        if (el) {
          document.head.appendChild(el);
          injected.push(el);
        }
      }
    });

    // Cleanup on unmount (useful for SPA navigation)
    return () => {
      injected.forEach((el) => {
        try { document.head.removeChild(el); } catch {}
      });
    };
  }, [html]);

  return null;
}