// lib/points.js
//
// Yomi puan bakiyesi için ATOMİK yardımcılar. Tüm oyun route'ları (wheel, slots, mines,
// blackjack, xox) ve mağaza satın alma bunları kullanır.
//
// Neden: "SELECT bakiye → JS'te karşılaştır → UPDATE" deseni eşzamanlı isteklerle
// aşılır (iki istek aynı bakiyeyi görüp ikisi de geçer → bakiye eksiye düşer / çift
// harcama). Koşul UPDATE'in İÇİNDE (`WHERE yomi_points >= ?`) olmalı ve etkilenen
// satır sayısı (`changes`) kontrol edilmeli. Aynı şekilde, ödeme yatırma da
// `changes` kontrolü olmadan yapılırsa kullanıcı satırı yokken (silinmiş hesap vb.)
// sessizce "başarılı" sayılırdı.

function assertAmount(amount) {
    if (!Number.isInteger(amount) || amount < 0) {
        throw new Error(`Invalid points amount: ${amount}`);
    }
}

/**
 * Bakiyeden ATOMİK düşer. Bakiye yetersizse hiçbir şey değişmez.
 * @returns {Promise<boolean>} true = düşüldü, false = yetersiz bakiye (veya kullanıcı yok)
 */
export async function debitPoints(db, userId, amount) {
    assertAmount(amount);
    const res = await db.prepare(
        'UPDATE users SET yomi_points = yomi_points - ? WHERE id = ? AND yomi_points >= ?'
    ).run(amount, userId, amount);
    return res.changes > 0;
}

/**
 * Bakiyeye ekler (ödeme). Hiçbir satır etkilenmediyse (kullanıcı yok) FIRLATIR —
 * çağıran taraf mevcut telafi (compensation) akışını çalıştırabilsin diye.
 */
export async function creditPoints(db, userId, amount) {
    assertAmount(amount);
    const res = await db.prepare('UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?').run(amount, userId);
    if (res.changes === 0) throw new Error(`creditPoints: user ${userId} not found`);
}

/**
 * Telafi/iade amaçlı ekleme. ASLA fırlatmaz (zaten hata yolunda çalışır); başarısızlığı
 * bağlamıyla birlikte loglar ki manuel düzeltilebilsin.
 */
export async function refundPoints(db, userId, amount, context = '') {
    try {
        await creditPoints(db, userId, amount);
    } catch (err) {
        console.error(`[points] İADE BAŞARISIZ user=${userId} amount=${amount} ${context}:`, err?.message || err);
    }
}

/** SQLite UNIQUE ihlali mi? (tek aktif tur / tekrar satın alma indeksleri) */
export function isUniqueViolation(err) {
    return /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(String(err?.message || err));
}
