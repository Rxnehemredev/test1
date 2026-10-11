import React from 'react';
import Link from 'next/link';
import { safeHref } from '@/lib/security/safeUrl';

export default function NavbarMobileDrawer({
    isOpen,
    onClose,
    navMenuItems,
    navItemIcon,
    openAuthModal,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="mobile-nav-overlay" onClick={onClose} />
            <div className="mobile-nav-panel">
                <button
                    className="mobile-nav-close-btn"
                    onClick={onClose}
                    aria-label="Menüyü kapat"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
                {navMenuItems.map((item, i) => (
                    <Link key={i} href={safeHref(item.url)} className="mobile-nav-item" onClick={onClose}>
                        {navItemIcon(item.url)}
                        {item.label}
                    </Link>
                ))}
                <div className="mobile-nav-divider" />
                <button className="mobile-nav-item" onClick={() => { onClose(); openAuthModal('login'); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Giriş Yap
                </button>
                <button className="mobile-nav-item mobile-nav-signup" onClick={() => { onClose(); openAuthModal('register'); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                    Kayıt Ol
                </button>
            </div>
        </>
    );
}
