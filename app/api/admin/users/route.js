export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifiedUser, hasAdminPanelAccess, hasPermission } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


// GET: Kullanıcı listesi veya belirli bir kullanıcının detayı/aktiviteleri
export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user: adminUser } = result;

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');

        // list-custom-roles: giriş yapmış tüm kullanıcılara açık (admin panel erişim kontrolü için gerekli)
        if (action === 'list-custom-roles') {
            try {
                const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
                const roles = row?.setting_value ? JSON.parse(row.setting_value) : [];
                return NextResponse.json({ success: true, roles });
            } catch {
                return NextResponse.json({ success: true, roles: [] });
            }
        }

        // Diğer tüm işlemler admin panel erişimi gerektirir
        if (!await hasAdminPanelAccess(adminUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        if (userId && action === 'activity') {
            // Kullanıcı aktivite logu
            const activities = await db.prepare(`
                SELECT * FROM user_activity_log
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 100
            `).all(userId);

            // Yorum sayısı
            const commentCount = (await (db.prepare('SELECT COUNT(*) as cnt FROM comments WHERE user_id = ? AND is_deleted = 0').get(userId)))?.cnt || 0;
            // Favori sayısı
            const favoriteCount = (await (db.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?').get(userId)))?.cnt || 0;
            // Okunmuş bölüm sayısı
            let readCount = 0;
            try { readCount = (await (db.prepare('SELECT COUNT(*) as cnt FROM read_history WHERE user_id = ?').get(userId)))?.cnt || 0; } catch {}
            // Admin logları (admin ise)
            const adminLogs = await db.prepare(`
                SELECT * FROM admin_logs WHERE admin_id = ? ORDER BY created_at DESC LIMIT 50
            `).all(userId);

            const user = await db.prepare('SELECT id, username, email, role, yomi_points, avatar_url, created_at, banned_until, last_daily_login FROM users WHERE id = ?').get(userId);

            return NextResponse.json({
                success: true,
                user,
                activities,
                stats: { commentCount, favoriteCount, readCount },
                adminLogs,
            });
        }

        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    } catch (error) {
        console.error('Admin users GET error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}

// POST: Şifre sıfırlama, kullanıcı yönetimi
export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const db = await getDb();
        const result = await getVerifiedUser(request, db);
        if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
        const { user: adminUser } = result;
        if (!await hasAdminPanelAccess(adminUser, db)) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
        }

        const body = await request.json();
        const { action, userId, newPassword, role, banDays } = body;

        // ── Custom role management (no userId required) ──────────────
        async function getCustomRoles(db) {
            try {
                const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
                return row?.setting_value ? JSON.parse(row.setting_value) : [];
            } catch { return []; }
        }
        async function saveCustomRoles(db, roles) {
            await db.prepare(
                "INSERT INTO app_settings (setting_key, setting_value) VALUES ('custom_roles', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value"
            ).run(JSON.stringify(roles));
        }

        if (action === 'create-custom-role') {
            if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
                return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
            }
            const { name, label, color, permissions } = body;
            if (!name || !label) return NextResponse.json({ error: 'name ve label gerekli' }, { status: 400 });
            if (!permissions || permissions.length === 0) return NextResponse.json({ error: 'En az bir yetki seçilmeli' }, { status: 400 });
            const roles = await getCustomRoles(db);
            if (roles.some(r => r.name === name)) return NextResponse.json({ error: 'Bu isimde bir rol zaten mevcut' }, { status: 400 });
            const newRole = { id: `custom_${Date.now()}`, name, label, color: color || '#818cf8', permissions };
            roles.push(newRole);
            await saveCustomRoles(db, roles);
            return NextResponse.json({ success: true, message: `"${label}" rolü oluşturuldu`, role: newRole });
        }

        if (action === 'delete-custom-role') {
            if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
                return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
            }
            const { roleId } = body;
            if (!roleId) return NextResponse.json({ error: 'roleId gerekli' }, { status: 400 });
            const roles = await getCustomRoles(db);
            const filtered = roles.filter(r => r.id !== roleId);
            if (filtered.length === roles.length) return NextResponse.json({ error: 'Rol bulunamadı' }, { status: 404 });
            await saveCustomRoles(db, filtered);
            return NextResponse.json({ success: true, message: 'Rol silindi' });
        }

        if (!userId) return NextResponse.json({ error: 'userId gerekli' }, { status: 400 });

        const targetUser = await db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId);
        if (!targetUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

        // Admin olmayan herkes (manager, custom roller dahil) admin kullanıcıları değiştiremez
        if (adminUser.role !== 'admin' && targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Admin kullanıcıları değiştiremezsiniz' }, { status: 403 });
        }

        // reset-password ve change-role: manage_users yetkisi gerekli
        if (['reset-password', 'change-role', 'change-user-role'].includes(action)) {
            if (adminUser.role !== 'admin' && adminUser.role !== 'manager' && !await hasPermission(adminUser, 'manage_users', db)) {
                return NextResponse.json({ error: 'Bu işlem için manage_users yetkisi gerekli' }, { status: 403 });
            }
        }

        // ban: ban_users veya manage_users yetkisi gerekli
        if (action === 'ban') {
            if (adminUser.role !== 'admin' && adminUser.role !== 'manager' && !await hasPermission(adminUser, 'ban_users', db) && !await hasPermission(adminUser, 'manage_users', db)) {
                return NextResponse.json({ error: 'Bu işlem için ban_users yetkisi gerekli' }, { status: 403 });
            }
        }

        if (action === 'reset-password') {
            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
            }
            const hash = await bcrypt.hash(newPassword, 12);
            await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);

            // Log
            try {
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    adminUser.id, adminUser.username, 'reset_password', `Kullanıcı: ${targetUser.username} (ID: ${userId})`
                );
            } catch {}

            return NextResponse.json({ success: true, message: `${targetUser.username} şifresi sıfırlandı` });
        }

        if (action === 'change-role' || action === 'change-user-role') {
            const validRoles = ['user', 'moderator', 'team_member', 'manager'];
            if (adminUser.role === 'admin') validRoles.push('admin');
            // Also allow custom role names from custom_roles setting
            try {
                const customRolesRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
                if (customRolesRow?.setting_value) {
                    const customRoles = JSON.parse(customRolesRow.setting_value);
                    customRoles.forEach(r => validRoles.push(r.name));
                }
            } catch {}

            if (!validRoles.includes(role)) return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });

            await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
            try {
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    adminUser.id, adminUser.username, 'change_role', `${targetUser.username}: ${targetUser.role} → ${role}`
                );
            } catch {}

            return NextResponse.json({ success: true, message: 'Rol güncellendi' });
        }

        if (action === 'ban') {
            const bannedUntil = banDays > 0 ? new Date(Date.now() + banDays * 86400000).toISOString() : null;
            await db.prepare('UPDATE users SET banned_until = ? WHERE id = ?').run(bannedUntil, userId);
            try {
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    adminUser.id, adminUser.username, banDays > 0 ? 'ban_user' : 'unban_user',
                    `${targetUser.username} ${banDays > 0 ? `${banDays} gün yasaklandı` : 'yasağı kaldırıldı'}`
                );
            } catch {}
            return NextResponse.json({ success: true, message: banDays > 0 ? `${targetUser.username} ${banDays} gün yasaklandı` : 'Yasak kaldırıldı' });
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    } catch (error) {
        console.error('Admin users POST error:', error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}