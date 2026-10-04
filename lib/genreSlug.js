// Tür (genre) <-> slug eşleme yardımcıları.
// DB'de genre isimleri İngilizce tutuluyor (series.genres JSON array, örn. "Action").
// SEO URL'leri Türkçe/okunabilir slug istiyoruz: /tur/aksiyon, /tur/bilim-kurgu.
// Tek kaynak burada tutuluyor ki app/series/page.js, SeriesCard.js ve
// SeriesDetailClient.js'deki GENRE_TR sözlükleriyle senkron kalsın.

export const GENRE_TR = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantastik', 'Historical': 'Tarihi', 'Horror': 'Korku', 'Isekai': 'Isekai',
    'Martial Arts': 'Dövüş Sanatları', 'Mystery': 'Gizem', 'Reincarnation': 'Reenkarnasyon',
    'Romance': 'Romantik', 'School': 'Okul', 'Sci-Fi': 'Bilim Kurgu',
    'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim',
    'Ecchi': 'Ecchi', 'Harem': 'Harem', 'Josei': 'Josei', 'Mature': 'Yetişkin',
    'Mecha': 'Mecha', 'Psychological': 'Psikolojik', 'Seinen': 'Seinen', 'Shoujo': 'Shoujo',
    'Shounen': 'Shounen', 'Slice of Life': 'Günlük Yaşam', 'Sports': 'Spor',
    'Tragedy': 'Trajedi', 'Webtoon': 'Webtoon', 'Manhwa': 'Manhwa', 'Manhua': 'Manhua',
};

const TR_TO_ASCII = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' };

function toSlug(str) {
    return String(str)
        .toLowerCase()
        .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (ch) => TR_TO_ASCII[ch] || ch)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Sabit liste: DB'deki custom_genres tablosu dinamik olabildiği için tam
// eşleme çalışma zamanında (getGenreByslug) DB'den de kontrol edilir; bu
// harita sadece bilinen/varsayılan türler için hızlı, statik bir katman.
export const SLUG_TO_GENRE = Object.fromEntries(
    Object.keys(GENRE_TR).map((enName) => [toSlug(GENRE_TR[enName]), enName])
);

export function genreToSlug(enName) {
    const tr = GENRE_TR[enName] || enName;
    return toSlug(tr);
}

export function genreTrLabel(enName) {
    return GENRE_TR[enName] || enName;
}

// slug -> İngilizce genre adı. Önce statik haritaya bakar, yoksa slug'ı
// DB'deki tüm genre isimleriyle (custom_genres dahil) karşılaştırmak
// çağıran tarafın sorumluluğundadır (bkz. app/tur/[genre]/page.js).
export function slugToGenre(slug) {
    return SLUG_TO_GENRE[slug] || null;
}

export function slugify(str) {
    return toSlug(str);
}

// ── DB'ye bağlı çözümleme ────────────────────────────────────────────────
// Varsayılan (30 sabit) tür + custom_genres tablosundaki özel türleri
// birleştirip { name, name_tr, slug } listesi üretir. Silinmiş varsayılan
// türler (deleted_default_genres) hariç tutulur.
const DEFAULT_GENRES = Object.keys(GENRE_TR);

export async function listPublicGenres(db) {
    let deletedSet = new Set();
    try {
        const rows = await db.prepare('SELECT name FROM deleted_default_genres').all();
        deletedSet = new Set(rows.map((r) => r.name));
    } catch { /* tablo yoksa hepsi aktif kabul edilir */ }

    const defaults = DEFAULT_GENRES
        .filter((g) => !deletedSet.has(g))
        .map((g) => ({ name: g, name_tr: GENRE_TR[g], slug: genreToSlug(g) }));

    let custom = [];
    try {
        const rows = await db.prepare('SELECT name FROM custom_genres ORDER BY name ASC').all();
        custom = rows.map((r) => ({ name: r.name, name_tr: r.name, slug: toSlug(r.name) }));
    } catch { /* özel tür yoksa yoksay */ }

    return [...defaults, ...custom];
}

// slug -> { name, name_tr } | null. Hem varsayılan hem özel türleri kapsar.
export async function resolveGenreBySlug(db, slug) {
    const all = await listPublicGenres(db);
    return all.find((g) => g.slug === slug) || null;
}
