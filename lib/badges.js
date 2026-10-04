// Canonical definition of admin-assigned custom badge options.
// Import this wherever badge IDs, labels, icons, or colors are needed.
// icon field: SVG icon name string (rendered by BadgeIcon component in admin panel)
export const BADGE_OPTIONS = [
    { id: 'vip',        label: 'VIP',          icon: 'star',       color: '#f59e0b' },
    { id: 'translator', label: 'Çevirmen',      icon: 'globe',      color: '#22c55e' },
    { id: 'uploader',   label: 'Yükleyici',     icon: 'upload',     color: '#38bdf8' },
    { id: 'supporter',  label: 'Destekçi',      icon: 'heart',      color: '#fbbf24' },
    { id: 'pioneer',    label: 'Öncü',          icon: 'trophy',     color: '#f97316' },
    { id: 'verified',   label: 'Doğrulanmış',   icon: 'check',      color: '#818cf8' },
];

/**
 * Load custom badges stored in app_settings (key: custom_badges).
 * Returns an array of { id, label, icon, color, custom: true }
 */
export async function getCustomBadges(db) {
    try {
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_badges'").get();
        if (!row?.setting_value) return [];
        const parsed = JSON.parse(row.setting_value);
        return Array.isArray(parsed) ? parsed.map(b => ({ ...b, custom: true })) : [];
    } catch {
        return [];
    }
}

/**
 * Returns all badge options: built-in BADGE_OPTIONS + admin-created custom badges,
 * ordered by admin-configured priority (falls back to the default definition
 * order — BADGE_OPTIONS first, then custom badges in creation order — for any
 * badge not present in the saved priority list, e.g. newly created ones).
 * Pass a better-sqlite3 db instance.
 */
export async function getAllBadges(db) {
    const defaultOrder = [...BADGE_OPTIONS, ...(await getCustomBadges(db))];
    const savedOrder = await getBadgePriorityOrder(db);
    if (!savedOrder || savedOrder.length === 0) return defaultOrder;

    const orderIndex = new Map(savedOrder.map((id, i) => [id, i]));
    return [...defaultOrder].sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Infinity;
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Infinity;
        if (ai !== bi) return ai - bi;
        // Aynı önceliğe sahip (ikisi de listede yoksa) varsayılan sırayı koru
        return defaultOrder.indexOf(a) - defaultOrder.indexOf(b);
    });
}

/**
 * Load the admin-configured badge priority order (array of badge ids,
 * most-important-first) from app_settings (key: badge_priority_order).
 * Returns [] if never customized.
 */
export async function getBadgePriorityOrder(db) {
    try {
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'badge_priority_order'").get();
        if (!row?.setting_value) return [];
        const parsed = JSON.parse(row.setting_value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Save the admin-configured badge priority order (array of badge ids).
 */
export async function saveBadgePriorityOrder(db, order) {
    await db.prepare(
        "INSERT INTO app_settings (setting_key, setting_value) VALUES ('badge_priority_order', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value"
    ).run(JSON.stringify(order));
}

/**
 * Given a user's badge definitions and the full priority-ordered badge list
 * (from getAllBadges), returns the user's badges sorted most-important-first.
 * Badges not found in allBadges (shouldn't normally happen) are pushed to the end.
 */
export function sortBadgesByPriority(userBadges, allBadges) {
    const priorityIndex = new Map(allBadges.map((b, i) => [b.id, i]));
    return [...userBadges].sort((a, b) => {
        const ai = priorityIndex.has(a.id) ? priorityIndex.get(a.id) : Infinity;
        const bi = priorityIndex.has(b.id) ? priorityIndex.get(b.id) : Infinity;
        return ai - bi;
    });
}