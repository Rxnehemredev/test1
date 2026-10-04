// lib/security/sqlWhitelist.js
//
// Dinamik SQL parçaları (ORDER BY sütunu/yönü, LIMIT/OFFSET, IN (...) listeleri, tablo/sütun
// adları) için beyaz liste yardımcıları. Kural:
//   • DEĞERLER her zaman `?` parametresiyle bağlanır.
//   • Parametreyle bağlanamayan parçalar (ORDER BY sütunu, yön, tablo/sütun adı) SADECE bu
//     dosyadaki beyaz listeli fonksiyonlardan geçerek SQL metnine girer; kullanıcı girdisi
//     asla doğrudan birleştirilmez.
//
// Kullanım (ORDER BY):
//   const SORTABLE = { created: 'u.created_at', name: 'u.username', points: 'u.yomi_points' };
//   const { column, direction } = pickOrder(searchParams.get('sort'), searchParams.get('dir'), SORTABLE, 'created');
//   db.prepare(`SELECT ... FROM users u ORDER BY ${column} ${direction} LIMIT ? OFFSET ?`).all(limit, offset);

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Anahtar → gerçek SQL ifadesi eşlemesinden güvenli sütunu seçer. İstemcinin gönderdiği
 * değer SQL'e ASLA girmez; yalnızca `allowed` nesnesindeki SABİT ifade girer.
 * @param {string | null | undefined} requested İstemcinin istediği anahtar (ör. 'created')
 * @param {Record<string, string>} allowed        { anahtar: 'tablo.sütun' } — kodda sabit tanımlı
 * @param {string} fallbackKey                   Geçersizse kullanılacak anahtar (allowed içinde olmalı)
 * @returns {string} SQL'e eklenebilir sütun ifadesi
 */
export function pickColumn(requested, allowed, fallbackKey) {
    if (!Object.prototype.hasOwnProperty.call(allowed, fallbackKey)) {
        throw new Error(`pickColumn: fallbackKey '${fallbackKey}' allowed listesinde yok`);
    }
    const key = typeof requested === 'string' && Object.prototype.hasOwnProperty.call(allowed, requested)
        ? requested
        : fallbackKey;
    return allowed[key];
}

/** ASC/DESC beyaz listesi. Geçersiz → fallback. */
export function pickDirection(requested, fallback = 'DESC') {
    const v = typeof requested === 'string' ? requested.trim().toUpperCase() : '';
    return v === 'ASC' || v === 'DESC' ? v : fallback;
}

/** ORDER BY için { column, direction } döner (ikisi de beyaz listeden). */
export function pickOrder(sortKey, dir, allowed, fallbackKey, fallbackDir = 'DESC') {
    return { column: pickColumn(sortKey, allowed, fallbackKey), direction: pickDirection(dir, fallbackDir) };
}

/**
 * page/limit sorgu parametrelerini SINIRLANDIRILMIŞ tamsayılara çevirir. NaN, negatif, 0,
 * ondalık ve devasa değerler (LIMIT 999999999 ile tüm tabloyu çekme) güvenli aralığa çekilir.
 * @param {URLSearchParams} searchParams
 * @param {{ defaultLimit?: number, maxLimit?: number, maxPage?: number }} [opts]
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(searchParams, { defaultLimit = 20, maxLimit = 100, maxPage = 100000 } = {}) {
    const toInt = (v, d) => {
        const n = Number.parseInt(v ?? '', 10);
        return Number.isFinite(n) ? n : d;
    };
    const page = Math.min(Math.max(toInt(searchParams.get('page'), 1), 1), maxPage);
    const limit = Math.min(Math.max(toInt(searchParams.get('limit'), defaultLimit), 1), maxLimit);
    return { page, limit, offset: (page - 1) * limit };
}

/** Bir sayıyı [min, max] aralığına sıkıştırır; sayı değilse fallback. */
export function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value ?? '', 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, min), max);
}

/**
 * `IN (?,?,?)` için güvenli yer tutucu + argüman listesi üretir. Girdi bir dizi olmalı;
 * elemanlar pozitif tamsayıya zorlanır (geçersizler atılır) ve uzunluk sınırlanır
 * (SQLite değişken sınırı + kaynak tüketimi).
 * @param {unknown} ids
 * @param {number} [max]
 * @returns {{ placeholders: string, args: number[] }} args boşsa çağıran sorguyu ÇALIŞTIRMAMALI.
 */
export function inClause(ids, max = 500) {
    const list = Array.isArray(ids) ? ids : [];
    const args = [];
    for (const v of list) {
        const n = Number(v);
        if (Number.isSafeInteger(n) && n > 0) args.push(n);
        if (args.length >= max) break;
    }
    return { placeholders: args.map(() => '?').join(','), args };
}

/** Tablo/sütun adı gibi parametreyle bağlanamayan tanımlayıcıyı doğrular; geçersizse fırlatır. */
export function assertSafeIdentifier(name) {
    if (typeof name !== 'string' || !IDENT_RE.test(name) || name.length > 64) {
        throw new Error('Unsafe SQL identifier');
    }
    return name;
}
