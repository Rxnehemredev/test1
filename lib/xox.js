// XOX (tic-tac-toe) — kullanıcı 'x', bot 'o' oynar. Saf mantık, crypto YOK.
// Bot, klasik "yenilmez XOX" algoritmasıyla (kazan > engelle > çatal kur >
// çatalı engelle > merkez > karşı köşe > köşe > kenar) oynar; bu sayede
// belirli bir hamle sırasıyla (örn. iki karşıt köşe + üçüncü köşe ile çatal
// kurma) her seferinde kazanılabilen eski açık kapatılmıştır — bot artık
// matematiksel olarak asla kaybetmez, en kötü ihtimalle berabere kalır.

export const XOX_MIN_BET = 10;
export const XOX_MAX_BET = 5000; // düşük oynaklık (maks 1.8x) — önceki 100.000 ekonomiye göre aşırı yüksekti
export const XOX_WIN_MULTIPLIER = 1.8; // kazanınca 1.8x öde (kasa avantajı)

const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

/** 'x' | 'o' | 'draw' | null (oyun devam ediyor) */
export function checkResult(board) {
    for (const [a, b, c] of LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every(c => c !== null)) return 'draw';
    return null;
}

function getEmptyCells(board) {
    return board.map((c, i) => (c === null ? i : null)).filter(i => i !== null);
}

/** Belirtilen oyuncu için, verilen tahtada kaç farklı hücrenin kazandıracağını sayar. */
function countWinningMoves(board, player) {
    let count = 0;
    for (const i of getEmptyCells(board)) {
        const copy = [...board]; copy[i] = player;
        if (checkResult(copy) === player) count++;
    }
    return count;
}

/** Oyuncu için ANINDA kazandıran bir hücre varsa onu döner, yoksa -1. */
function findWinningMove(board, player) {
    for (const i of getEmptyCells(board)) {
        const copy = [...board]; copy[i] = player;
        if (checkResult(copy) === player) return i;
    }
    return -1;
}

/** Oyuncunun oynayınca AYNI ANDA iki farklı kazanma yolu açacağı (çatal/fork) bir hücre varsa döner, yoksa -1. */
function findForkMove(board, player) {
    for (const i of getEmptyCells(board)) {
        const copy = [...board]; copy[i] = player;
        if (countWinningMoves(copy, player) >= 2) return i;
    }
    return -1;
}

/**
 * Klasik "yenilmez XOX" algoritması (Newell & Simon sıralaması):
 * 1) Kazanma hamlesi varsa oyna
 * 2) Rakibin kazanma hamlesini engelle
 * 3) Kendi çatalını (iki kazanma tehdidi birden) oluştur
 * 4) Rakibin çatalını engelle (mümkünse kendi tek tehdidini oynayarak rakibi
 *    savunmaya zorla, bu onun çatalını bozar; değilse doğrudan çatal hücresini kapat)
 * 5) Merkezi al
 * 6) Rakip köşedeyse karşı köşeyi al
 * 7) Boş köşe al
 * 8) Boş kenar al
 *
 * Bu sıralamayla bot MATEMATİKSEL OLARAK KAYBETMEZ (en kötü ihtimalle berabere
 * kalır) — önceki basit sezgisel botun "iki karşıt köşe + üçüncü köşe" çatal
 * hilesiyle her seferinde yenilebilmesi buğu bu şekilde kapatılmış olur.
 */
export function botMove(board) {
    const empty = getEmptyCells(board);
    if (empty.length === 0) return -1;

    // 1) Kazan
    let move = findWinningMove(board, 'o');
    if (move !== -1) return move;

    // 2) Engelle
    move = findWinningMove(board, 'x');
    if (move !== -1) return move;

    // 3) Kendi çatalını kur
    move = findForkMove(board, 'o');
    if (move !== -1) return move;

    // 4) Rakibin çatalını engelle
    const oppForkCells = empty.filter(i => {
        const copy = [...board]; copy[i] = 'x';
        return countWinningMoves(copy, 'x') >= 2;
    });
    if (oppForkCells.length === 1) {
        return oppForkCells[0];
    }
    if (oppForkCells.length > 1) {
        // Birden fazla çatal hücresi varsa: kendi tek tehditli (çatal olmayan)
        // bir hamlemizle rakibi bloklamaya zorlayıp çatalını bozmayı dene.
        for (const i of empty) {
            if (oppForkCells.includes(i)) continue;
            const copy = [...board]; copy[i] = 'o';
            if (countWinningMoves(copy, 'o') !== 1) continue;
            const forcedBlock = findWinningMove(copy, 'o');
            if (forcedBlock !== -1 && !oppForkCells.includes(forcedBlock)) {
                return i;
            }
        }
        return oppForkCells[0];
    }

    // 5) Merkez
    if (board[4] === null) return 4;

    // 6) Rakip köşedeyse karşı köşeyi al
    const cornerOpposite = { 0: 8, 8: 0, 2: 6, 6: 2 };
    for (const c of [0, 2, 6, 8]) {
        if (board[c] === 'x' && board[cornerOpposite[c]] === null) return cornerOpposite[c];
    }

    // 7) Boş köşe
    const corners = [0, 2, 6, 8].filter(i => board[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

    // 8) Boş kenar
    const sides = [1, 3, 5, 7].filter(i => board[i] === null);
    if (sides.length > 0) return sides[Math.floor(Math.random() * sides.length)];

    return empty[0];
}
