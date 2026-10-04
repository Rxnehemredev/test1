import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, hasPermission, requirePermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
import { isSameOrigin } from '@/lib/security/sameOrigin';
import { getAllBadges, sortBadgesByPriority } from '@/lib/badges';
const chatLimiter = createRateLimiter(30, 60000);
const chatDeleteLimiter = createRateLimiter(20, 60000);


const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_MS = 3000; // aynı kullanıcı art arda en fazla 3 saniyede bir mesaj atabilir
const PAGE_SIZE = 50;

// GIF mesajı: `![gif](https://media*.giphy.com/...)` — yalnızca GIPHY alan adları ve sorgu
// parametresiz yol kabul edilir. Sohbete rastgele harici görsel/izleyici gömülemez.
const GIF_MESSAGE_REGEX = /^!\[gif\]\(https:\/\/(?:media\d*|i)\.giphy\.com\/[A-Za-z0-9_.\-\/]+\)$/;

// Kullanıcı adı kuralıyla aynı charset (register route'daki USERNAME_REGEX ile eşleşir)
const MENTION_REGEX = /@([a-zA-Z0-9_çÇğĞıİşŞüÜöÖ]{3,30})/g;
const MAX_MENTIONS_PER_MESSAGE = 5;

// Mesaj metnindeki @kullaniciadi etiketlerini bulup gerçekten var olan kullanıcılara
// (gönderen hariç) "mention" bildirimi oluşturur. En fazla MAX_MENTIONS_PER_MESSAGE
// benzersiz kullanıcı işlenir (spam/istismarı önlemek için).
async function notifyMentions(db, message, sender) {
    const raw = [...message.matchAll(MENTION_REGEX)].map(m => m[1]);
    if (raw.length === 0) return;

    const uniqueNames = [...new Set(raw.map(n => n.toLowerCase()))].slice(0, MAX_MENTIONS_PER_MESSAGE);
    if (uniqueNames.length === 0) return;

    const placeholders = uniqueNames.map(() => '?').join(',');
    const mentioned = await db.prepare(
        `SELECT id, username FROM users WHERE LOWER(username) IN (${placeholders})`
    ).all(...uniqueNames);

    const senderName = sender.display_name || sender.username;
    const snippet = message.length > 80 ? message.slice(0, 80) + '…' : message;

    for (const target of mentioned) {
        if (target.id === sender.id) continue; // kendi kendini etiketleme bildirimi yok
        try {
            await db.prepare(`
                INSERT INTO notifications (user_id, type, message, link)
                VALUES (?, 'mention', ?, ?)
            `).run(
                target.id,
                `${senderName} seni genel sohbette etiketledi: "${snippet}"`,
                '/'
            );
        } catch (e) {
            console.error('mention bildirimi oluşturulamadı:', e.message);
        }
    }
}

// Bir grup mesajın yazarlarına ait özel rozetleri (user_badges) tek seferde
// (batch) çekip her mesaja iliştirir — comments API'deki aynı desen.
// Rozet id'lerini burada, sunucu tarafında tam rozet nesnelerine (label/icon/color)
// çeviriyoruz; böylece admin panelinden sonradan eklenen özel rozetler de
// istemcide statik bir listeye ihtiyaç duymadan doğru şekilde görünür.
async function attachAuthorExtras(db, messages) {
    if (messages.length === 0) return messages;

    const userIds = new Set(messages.map(m => m.user_id));
    const badgesByUser = new Map();
    if (userIds.size > 0) {
        const [rows, allBadgeDefs] = await Promise.all([
            db.prepare(
                `SELECT user_id, badge_id FROM user_badges WHERE user_id IN (${Array.from(userIds).map(() => '?').join(',')}) ORDER BY earned_at ASC`
            ).all(...userIds),
            getAllBadges(db),
        ]);
        const badgeDefMap = new Map(allBadgeDefs.map(b => [b.id, b]));
        for (const row of rows) {
            const def = badgeDefMap.get(row.badge_id);
            if (!def) continue; // başarı (achievement) rozeti — sohbette gösterilmez
            if (!badgesByUser.has(row.user_id)) badgesByUser.set(row.user_id, []);
            badgesByUser.get(row.user_id).push(def);
        }
        // Her kullanıcının rozetlerini önem sırasına göre sırala (en önemli önce)
        for (const [userId, list] of badgesByUser) {
            badgesByUser.set(userId, sortBadgesByPriority(list, allBadgeDefs));
        }
    }

    return messages.map(m => ({
        ...m,
        badges: badgesByUser.get(m.user_id) || [],
    }));
}

// GET ?after=<id> — after verilirse sadece o id'den sonraki (yeni) mesajlar döner (polling için).
// verilmezse en son PAGE_SIZE mesaj döner.
export async function GET(request) {
    { const __rl = await chatLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const after = parseInt(searchParams.get('after') || '', 10);

        let rows;
        if (Number.isFinite(after)) {
            rows = await db.prepare(`
                SELECT m.id, m.user_id, m.message, m.created_at,
                       u.username, u.display_name, u.avatar_url, u.yomi_points, u.role
                FROM chat_messages m
                JOIN users u ON u.id = m.user_id
                WHERE m.id > ?
                ORDER BY m.id ASC
                LIMIT 100
            `).all(after);
        } else {
            const desc = await db.prepare(`
                SELECT m.id, m.user_id, m.message, m.created_at,
                       u.username, u.display_name, u.avatar_url, u.yomi_points, u.role
                FROM chat_messages m
                JOIN users u ON u.id = m.user_id
                ORDER BY m.id DESC
                LIMIT ?
            `).all(PAGE_SIZE);
            rows = desc.reverse();
        }

        const messages = await attachAuthorExtras(db, rows);

        // Mesaj silme butonunu göstermek için: SADECE bilgilendirme amaçlı bir
        // bayrak — asıl yetki kontrolü DELETE endpoint'inde SUNUCU TARAFINDA
        // ayrıca ve bağımsız olarak yapılır. Bu bayrağa güvenerek istemci
        // tarafında yetki VERİLMEZ, sadece butonun görünürlüğü belirlenir.
        // PERFORMANS: canModerate yalnızca İLK yüklemede (after yok) hesaplanır. Polling isteğinde
        // (after=...) 2 ekstra veritabanı sorgusu atlanır — istemci mevcut değeri korur.
        let canModerate = false;
        const isPolling = Number.isFinite(after);
        const payload = isPolling ? null : getUserFromRequest(request);
        if (payload) {
            try {
                const requester = await db.prepare('SELECT id, role FROM users WHERE id = ?').get(payload.id);
                if (requester) canModerate = await hasPermission(requester, 'manage_chat', db);
            } catch {}
        }

        return NextResponse.json(isPolling ? { success: true, messages } : { success: true, messages, canModerate });
    } catch (err) {
        console.error('chat/messages GET error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST { message } — yeni mesaj gönder
export async function POST(request) {
    { const __rl = await chatLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }

    try {
        const db = await getDb();
        const payload = getUserFromRequest(request);
        if (!payload) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const message = (body?.message || '').toString().trim();
        if (!message) return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });
        if (message.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir` }, { status: 400 });
        }

        // Canlı sohbette GIF gönderimi KAPALI — GIF yalnızca bölüm yorumlarında kullanılabilir.
        // Hem GIPHY biçimindeki hem de başka `![...](...)` görsel/GIF markdown'ları reddedilir.
        if (GIF_MESSAGE_REGEX.test(message) || /!\[[^\]]*\]\(/.test(message)) {
            return NextResponse.json({ error: 'Canlı sohbette GIF gönderilemez. GIF\'ler yalnızca bölüm yorumlarında kullanılabilir.' }, { status: 400 });
        }
        const isGif = false;

        // Kullanıcı satırı + son mesaj zamanı (spam kontrolü) birbirinden
        // bağımsız okumalar — paralel çalıştırıp bir round-trip kazanıyoruz.
        const [user, lastMsg] = await Promise.all([
            db.prepare(`
                SELECT id, username, display_name, avatar_url, yomi_points, role, banned_until
                FROM users WHERE id = ?
            `).get(payload.id),
            db.prepare('SELECT created_at FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(payload.id),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.banned_until) {
            const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
            if (until > new Date()) return NextResponse.json({ error: 'Hesabınız askıya alınmış' }, { status: 403 });
        }
        if (lastMsg?.created_at) {
            const lastMs = new Date(lastMsg.created_at.includes('T') ? lastMsg.created_at : lastMsg.created_at.replace(' ', 'T') + 'Z').getTime();
            const elapsed = Date.now() - lastMs;
            if (elapsed < RATE_LIMIT_MS) {
                return NextResponse.json({ error: 'Çok hızlı mesaj gönderiyorsunuz, biraz yavaşlayın' }, { status: 429 });
            }
        }

        const result = await db.prepare(
            'INSERT INTO chat_messages (user_id, message) VALUES (?, ?)'
        ).run(user.id, message);

        // @etiketlenen kullanıcılara bildirim gönder (yanıtı bloklamasın diye
        // hata olsa bile mesaj gönderimi başarısız sayılmaz — notifyMentions
        // kendi içinde try/catch ile hataları yutar)
        if (!isGif) await notifyMentions(db, message, user);

        const [withExtras] = await attachAuthorExtras(db, [{
            id: result.lastInsertRowid,
            user_id: user.id,
            message,
            created_at: new Date().toISOString(),
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            yomi_points: user.yomi_points,
            role: user.role,
        }]);

        return NextResponse.json({ success: true, message: withExtras });
    } catch (err) {
        console.error('chat/messages POST error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// DELETE { messageId } — bir sohbet mesajını sil.
// Yalnızca 'manage_chat' iznine sahip roller (ör. admin panelden oluşturulan
// "Msg" özel rolü) veya admin/manager çağırabilir. Yetki kontrolü TAMAMEN
// sunucu tarafında, her istekte veritabanından TAZE okunan role göre yapılır
// (JWT içindeki role alanına asla güvenilmez — bir kullanıcının rolü geri
// alınsa bile eski token'ı hâlâ geçerliyse bu kontrol onu artık reddeder).
export async function DELETE(request) {
    { const __rl = await chatDeleteLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    // GÜVENLİK: durum değiştiren (state-changing) her istekte olduğu gibi CSRF
    // koruması — sadece aynı origin'den gelen isteklere izin verilir.
    if (!isSameOrigin(request)) {
        return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }

    let moderator;
    try {
        // requirePermission: kullanıcıyı DB'den taze çeker (role dahil) ve
        // hasPermission'ı DB bağlantısıyla çağırır — böylece admin/manager
        // yerleşik rollerinin yanı sıra, admin panelden 'manage_chat' izni
        // verilmiş özel roller (ör. "Msg") de doğru şekilde yetkilendirilir.
        moderator = await requirePermission(request, 'manage_chat');
    } catch (err) {
        const status = err?.message === 'Unauthorized' ? 401 : 403;
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status });
    }

    try {
        const db = await getDb();

        // Hem JSON body ({ messageId }) hem de ?messageId= query param destekle.
        let messageId = null;
        try {
            const body = await request.json();
            messageId = body?.messageId;
        } catch {
            // Body boş/JSON değilse query param'a bak
            const { searchParams } = new URL(request.url);
            messageId = searchParams.get('messageId');
        }

        const id = parseInt(messageId, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ error: 'Geçersiz mesaj ID' }, { status: 400 });
        }

        // Silmeden önce mesajı ve yazarını al — hem 404 kontrolü hem de
        // denetim kaydı (admin_logs) için gerekli.
        const target = await db.prepare(`
            SELECT m.id, m.message, u.username
            FROM chat_messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.id = ?
        `).get(id);
        if (!target) {
            return NextResponse.json({ error: 'Mesaj bulunamadı (silinmiş olabilir)' }, { status: 404 });
        }

        const result = await db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
        if (!result.changes) {
            return NextResponse.json({ error: 'Mesaj bulunamadı (silinmiş olabilir)' }, { status: 404 });
        }

        // Denetim kaydı — kim, ne zaman, kimin hangi mesajını sildi (hesap
        // verebilirlik; yetki kötüye kullanımını sonradan tespit edilebilir kılar).
        try {
            const snippet = (target.message || '').replace(/\s+/g, ' ').slice(0, 120);
            await db.prepare(
                'INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)'
            ).run(
                moderator.id, moderator.username, 'delete_chat_message',
                `Mesaj ID ${id} (@${target.username}) silindi: "${snippet}"`
            );
        } catch (logErr) {
            console.error('chat delete admin_logs insert error:', logErr);
        }

        return NextResponse.json({ success: true, deletedId: id });
    } catch (err) {
        console.error('chat/messages DELETE error:', err);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
