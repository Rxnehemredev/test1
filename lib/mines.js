// Mayın Tarlası (mines) — istemci ve sunucu tarafından ORTAK kullanılan saf
// matematik. Node'a özel hiçbir import YOK, istemci tarafında olası ödülü
// canlı göstermek için de kullanılabilsin diye (sunucu her zaman otoriter kaynak).

export const MINES_GRID_SIZE = 36; // 6x6
export const MINES_MINE_COUNT = 6;
export const MINES_MIN_BET = 10;
export const MINES_MAX_BET = 500; // çarpan tüm güvenli kareler açılınca çok büyüyebiliyor — önceki 100.000 ekonomiyi bozacak kadar yüksekti
export const MINES_HOUSE_EDGE = 0.97; // %3 kasa avantajı
export const MINES_MAX_MULTIPLIER = 1000; // güvenlik tavanı — tüm tahtayı temizlemek matematiksel olarak ~1.9 milyon x çarpana denk gelir, bu makul olmayan uçtaki senaryoya karşı bir tavan koyuyoruz

/**
 * k adet güvenli kare açıldığında, N karelik ve M mayınlı bir tahtada
 * "adil" (kasa avantajsız) çarpan: her adımda kalan güvenli/kalan toplam
 * oranının tersinin çarpımı. Kasa avantajı sabit bir faktörle uygulanır.
 * MINES_MAX_MULTIPLIER ile üst sınır konur (bkz. yukarıdaki not).
 */
export function minesMultiplier(revealedCount, totalTiles = MINES_GRID_SIZE, mineCount = MINES_MINE_COUNT) {
    if (revealedCount <= 0) return 1;
    let m = 1;
    for (let i = 0; i < revealedCount; i++) {
        m *= (totalTiles - i) / (totalTiles - mineCount - i);
    }
    return Math.min(m * MINES_HOUSE_EDGE, MINES_MAX_MULTIPLIER);
}

/** 2 ondalık basamağa yuvarlar (ör. çarpan gösterimi için). */
export function round2(n) {
    return Math.round(n * 100) / 100;
}
