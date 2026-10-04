export const CULTIVATION_RANKS = [
    // En yüksek rütbeler (yüksekten düşüğe doğru)
    {
        title: 'Sonsuzluk Pilotu',
        minPoints: 10000,
        color: '#ffd700',
        progressColor: 'linear-gradient(90deg, #ffd700, #ffec6e)',
        icon: 'rocket',
        description: 'Gökyüzünü aşıp yıldızlara ulaşan efsanevi pilot',
        badge: 'sky_emperor',
    },
    {
        title: 'Gökyüzü Efsanesi',
        minPoints: 5000,
        color: '#e879f9',
        progressColor: 'linear-gradient(90deg, #e879f9, #f0abfc)',
        icon: 'comet',
        description: 'Atmosferin sınırlarını aşmış efsanevi kaptan',
        badge: 'sky_legend',
    },
    {
        title: 'Filo Komutanı',
        minPoints: 1500,
        color: '#f87171',
        progressColor: 'linear-gradient(90deg, #f87171, #fca5a5)',
        icon: 'radar',
        description: 'Filosunu fırtınaların ötesine taşıyan usta kaptan',
        badge: null,
    },
    {
        title: 'Kozmik Rehber',
        minPoints: 500,
        color: '#a855f7',
        progressColor: 'linear-gradient(90deg, #a855f7, #c084fc)',
        icon: 'wings',
        description: 'Bulutların üzerinde ustalaşan deneyimli pilot',
        badge: null,
    },
    {
        title: 'Kıdemli Gezgin',
        minPoints: 200,
        color: '#3b82f6',
        progressColor: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
        icon: 'compass',
        description: 'Kokpitte yerini almış kararlı yol arkadaşı',
        badge: null,
    },
    {
        title: 'Yıldız Gezgini',
        minPoints: 0,
        color: '#6b7280',
        progressColor: 'linear-gradient(90deg, #6b7280, #9ca3af)',
        icon: 'ticket',
        description: 'Gökyüzü serüvenine yeni adım atan meraklı yıldız gezgini',
        badge: null,
    },
];

// NOT: Rütbe/rank sistemi eskisi gibi yomi_points (Asteria Scans Puanı — uçak oyunu
// dahil her kaynaktan kazanılan puan) üzerinden çalışır.
export function getCultivationData(activityPoints) {
    const points = activityPoints || 0;
    
    // Find current rank (sorted from highest to lowest)
    const currentRankIndex = CULTIVATION_RANKS.findIndex(r => points >= r.minPoints);
    const currentRank = CULTIVATION_RANKS[currentRankIndex] || CULTIVATION_RANKS[CULTIVATION_RANKS.length - 1];
    
    // Find next rank (one step above current)
    const nextRank = currentRankIndex > 0 ? CULTIVATION_RANKS[currentRankIndex - 1] : null;
    
    // Calculate progress to next rank
    let progressPercent = 100;
    if (nextRank) {
        const range = nextRank.minPoints - currentRank.minPoints;
        const currentProgress = points - currentRank.minPoints;
        progressPercent = Math.min(100, Math.max(0, (currentProgress / range) * 100));
    }

    return {
        ...currentRank,
        nextRank,
        progressPercent,
        totalRanks: CULTIVATION_RANKS.length,
        rankIndex: CULTIVATION_RANKS.length - 1 - currentRankIndex, // 0=lowest
    };
}