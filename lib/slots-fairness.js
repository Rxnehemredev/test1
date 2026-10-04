import 'server-only';
import crypto from 'crypto';
import { SLOT_SYMBOLS, SLOT_TOTAL_WEIGHT } from './slots.js';

function pickSymbol() {
    // Ağırlıklar ondalıklı olabildiği için (ör. 2.5) 10 ile ölçekleyip tam sayıya çeviriyoruz.
    const scaledTotal = Math.round(SLOT_TOTAL_WEIGHT * 10);
    let r = crypto.randomInt(0, scaledTotal);
    for (const sym of SLOT_SYMBOLS) {
        const w = Math.round(sym.weight * 10);
        if (r < w) return sym.id;
        r -= w;
    }
    return SLOT_SYMBOLS[0].id;
}

/** 3 makarayı kriptografik olarak güvenli şekilde bağımsız çevirir. */
export function spinSlots() {
    return [pickSymbol(), pickSymbol(), pickSymbol()];
}
