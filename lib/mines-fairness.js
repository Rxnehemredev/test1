import 'server-only';
import crypto from 'crypto';
import { MINES_GRID_SIZE, MINES_MINE_COUNT } from './mines.js';

/** Fisher-Yates ile, kriptografik olarak güvenli, benzersiz mayın pozisyonları üretir. */
export function generateMinePositions(totalTiles = MINES_GRID_SIZE, mineCount = MINES_MINE_COUNT) {
    const indices = Array.from({ length: totalTiles }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, mineCount).sort((a, b) => a - b);
}
