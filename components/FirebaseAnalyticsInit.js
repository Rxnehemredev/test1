'use client';

import { useEffect } from 'react';
import { initFirebaseAnalytics } from '@/lib/firebase';

/**
 * Görünür bir şey render etmez — sadece sayfa yüklendiğinde (client-side)
 * Firebase Analytics'i başlatır. NEXT_PUBLIC_FIREBASE_* ortam değişkenleri
 * tanımlı değilse sessizce hiçbir şey yapmaz.
 */
export default function FirebaseAnalyticsInit() {
    useEffect(() => {
        initFirebaseAnalytics();
    }, []);

    return null;
}
