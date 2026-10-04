// Blackjack (21) — istemci ve sunucu tarafından ORTAK kullanılan saf mantık.
// Node'a özel (crypto) hiçbir import YOK — deste KARIŞTIRMA işlemi ayrı,
// server-only olan lib/blackjack-fairness.js'te yapılır; burada sadece
// sıralı deste üretimi ve el değeri hesaplama gibi saf fonksiyonlar var.

export const BJ_MIN_BET = 10;
export const BJ_MAX_BET = 5000; // düşük oynaklık (maks 2.5x) — önceki 100.000 ekonomiye göre aşırı yüksekti
export const BJ_BLACKJACK_PAYOUT = 2.5; // doğal 21: bahis + 1.5x kâr
export const BJ_WIN_PAYOUT = 2; // normal kazanç: bahis + 1x kâr
export const BJ_DEALER_STAND = 17; // krupiye 17 ve üzerinde durur

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Sıralı (karıştırılmamış) 52'lik deste üretir. */
export function buildOrderedDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) deck.push({ rank, suit });
    }
    return deck;
}

/** Bir elin en iyi (21'i aşmayan, mümkünse) değerini ve "soft" (yumuşak As) olup olmadığını hesaplar. */
export function handValue(cards) {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        if (c.rank === 'A') { total += 11; aces += 1; }
        else if (['J', 'Q', 'K'].includes(c.rank)) total += 10;
        else total += parseInt(c.rank, 10);
    }
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return { value: total, soft: aces > 0 };
}

export function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards).value === 21;
}

export function isBust(cards) {
    return handValue(cards).value > 21;
}

/** Krupiyeyi kalan desteden, 17'ye (veya üzeri) ulaşana kadar kart çektirir. Deste'yi mutasyona uğratır. */
export function dealerPlay(deck, dealerHand) {
    while (handValue(dealerHand).value < BJ_DEALER_STAND) {
        dealerHand.push(deck.pop());
    }
    return dealerHand;
}
