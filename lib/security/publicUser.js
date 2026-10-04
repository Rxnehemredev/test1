// lib/security/publicUser.js
//
// Herkese açık API yanıtlarında kullanıcı alanları için ALLOWLIST.
// E-posta, IP, password_hash, totp_*, banned_until vb. hiçbir zaman buradan geçemez;
// SQL'e yanlışlıkla `SELECT *` / yeni bir hassas kolon eklense bile yanıta sızmaz.
const PUBLIC_USER_FIELDS = [
    'id', 'username', 'display_name', 'avatar_url', 'cover_url', 'bio',
    'role', 'yomi_points', 'created_at',
    'favoriteCount', 'commentCount', 'badgeCount',
];

export function toPublicUser(row) {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const k of PUBLIC_USER_FIELDS) {
        if (k in row) out[k] = row[k];
    }
    return out;
}
