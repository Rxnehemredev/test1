'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { isPlaceholder } from '@/lib/envGuard';

/**
 * Firebase yalnızca Analytics (ziyaretçi istatistiği) için kullanılıyor.
 * Projenin veritabanı (Turso) ve dosya depolama (imgbb) tamamen ayrı servisler —
 * Firebase burada opsiyonel bir eklenti, çekirdek işlevsellik buna bağlı değil.
 *
 * Config değerleri .env.local / Vercel ortam değişkenlerinden okunur.
 * NEXT_PUBLIC_ ön eki olmalı çünkü tarayıcıda (client-side) kullanılıyor.
 */
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app = null;
let analyticsPromise = null;

function getFirebaseApp() {
    if (!firebaseConfig.apiKey || isPlaceholder(firebaseConfig.apiKey)) return null; // girilmemiş ya da örnek değerse sessizce atla
    if (!app) {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
    return app;
}

/**
 * Firebase Analytics'i güvenli şekilde başlatır (tarayıcı desteklemiyorsa ya da
 * config eksikse sessizce hiçbir şey yapmaz — build/SSR sırasında da patlamaz).
 */
export function initFirebaseAnalytics() {
    if (typeof window === 'undefined') return; // sadece client-side
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return;

    if (!analyticsPromise) {
        analyticsPromise = isSupported()
            .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
            .catch(() => null);
    }
    return analyticsPromise;
}
