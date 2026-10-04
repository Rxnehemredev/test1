import 'server-only';
import crypto from 'crypto';
import { WHEEL_SEGMENTS, WHEEL_TOTAL_WEIGHT } from './wheel.js';

/** Ağırlıklara göre kriptografik olarak güvenli rastgele bir dilim seçer. */
export function spinWheel() {
    let r = crypto.randomInt(0, WHEEL_TOTAL_WEIGHT);
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        if (r < WHEEL_SEGMENTS[i].weight) return i;
        r -= WHEEL_SEGMENTS[i].weight;
    }
    return WHEEL_SEGMENTS.length - 1;
}
