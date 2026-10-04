import 'server-only';
import crypto from 'crypto';
import { buildOrderedDeck } from './blackjack.js';

/** Fisher-Yates ile kriptografik olarak güvenli şekilde karıştırılmış deste döndürür. */
export function shuffledDeck() {
    const deck = buildOrderedDeck();
    for (let i = deck.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
