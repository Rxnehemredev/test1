// Mağaza (Shop) yardımcı fonksiyonları.
// shop_items.type ∈ 'badge' | 'frame' | 'title'

export const SHOP_TYPES = ['badge', 'frame', 'title'];

export function isValidShopType(type) {
    return SHOP_TYPES.includes(type);
}

/** Tüm aktif mağaza öğelerini döndürür (herkese açık liste). */
export async function getActiveShopItems(db) {
    return db.prepare(
        'SELECT id, type, name, image_url, title_color, price, sort_order FROM shop_items WHERE is_active = 1 ORDER BY type, sort_order ASC, id ASC'
    ).all();
}

/** Admin panel için tüm öğeleri (aktif + pasif) döndürür. */
export async function getAllShopItems(db) {
    return db.prepare(
        'SELECT * FROM shop_items ORDER BY type, sort_order ASC, id ASC'
    ).all();
}

/** Bir kullanıcının satın aldığı tüm öğe id'lerini Set olarak döndürür. */
export async function getUserPurchasedIds(db, userId) {
    const rows = await db.prepare('SELECT item_id FROM user_purchases WHERE user_id = ?').all(userId);
    return new Set(rows.map(r => r.item_id));
}

/**
 * Kullanıcının o an kuşandığı rozet/çerçeve/unvan öğelerini tam veriyle döndürür.
 * users.equipped_frame_id / equipped_title_id / equipped_badge_id referanslarını çözer.
 */
export async function getEquippedCosmetics(db, user) {
    if (!user) return { frame: null, title: null, badge: null };
    const ids = [user.equipped_frame_id, user.equipped_title_id, user.equipped_badge_id].filter(Boolean);
    if (ids.length === 0) return { frame: null, title: null, badge: null };

    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.prepare(`SELECT id, type, name, image_url, title_color, price FROM shop_items WHERE id IN (${placeholders})`).all(...ids);
    const byId = new Map(rows.map(r => [r.id, r]));

    return {
        frame: user.equipped_frame_id ? (byId.get(user.equipped_frame_id) || null) : null,
        title: user.equipped_title_id ? (byId.get(user.equipped_title_id) || null) : null,
        badge: user.equipped_badge_id ? (byId.get(user.equipped_badge_id) || null) : null,
    };
}

/** Bir mağaza öğesi silindiğinde, onu kuşanmış olan tüm kullanıcılardan kaldırır. */
export async function unequipItemFromAllUsers(db, itemId) {
    await db.prepare('UPDATE users SET equipped_frame_id = NULL WHERE equipped_frame_id = ?').run(itemId);
    await db.prepare('UPDATE users SET equipped_title_id = NULL WHERE equipped_title_id = ?').run(itemId);
    await db.prepare('UPDATE users SET equipped_badge_id = NULL WHERE equipped_badge_id = ?').run(itemId);
}
