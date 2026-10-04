// Slot 777 — istemci ve sunucu tarafından ORTAK kullanılan saf veri.
// Node'a özel hiçbir import YOK, istemci tarafında makara ikonlarını ve
// ödeme tablosunu göstermek için de kullanılabilsin diye.

export const SLOT_MIN_BET = 10;
export const SLOT_MAX_BET = 500; // çok yüksek oynaklık (maks 300x jackpot) — önceki 100.000 ile tek elde 30.000.000 kazanılabiliyordu
export const SLOT_PAIR_MULTIPLIER = 1; // herhangi 2 eş sembol -> bahsin tamamı geri

export const SLOT_SYMBOLS = [
    { id: 'cherry',     emoji: '🍒', weight: 32,  threeMult: 4 },
    { id: 'lemon',      emoji: '🍋', weight: 26,  threeMult: 6 },
    { id: 'grape',      emoji: '🍇', weight: 20,  threeMult: 10 },
    { id: 'watermelon', emoji: '🍉', weight: 13,  threeMult: 16 },
    { id: 'bell',       emoji: '🔔', weight: 6,   threeMult: 30 },
    { id: 'diamond',    emoji: '💎', weight: 2.5, threeMult: 80 },
    { id: 'seven',      emoji: '7️⃣', weight: 0.5, threeMult: 300 },
];

export const SLOT_TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);

export function symbolById(id) {
    return SLOT_SYMBOLS.find(s => s.id === id) || SLOT_SYMBOLS[0];
}

/** Üç sembolden ödeme çarpanını hesaplar (saf fonksiyon — RNG içermez). */
export function calcSlotMultiplier(ids) {
    const [a, b, c] = ids;
    if (a === b && b === c) return symbolById(a).threeMult;
    if (a === b || b === c || a === c) return SLOT_PAIR_MULTIPLIER;
    return 0;
}
