import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hasPermission } from '@/lib/auth';

export async function handleDeleteUser(formData, user) {
            const db = await getDb();
            const userId = formData.get('userId');
            await db.prepare('DELETE FROM users WHERE id = ? AND role != ?').run(userId, 'admin');
            return NextResponse.json({ message: 'User deleted' });

}

export async function handleChangeUserRole(formData, user) {
            const db = await getDb();
            const userId = formData.get('userId');
            const role = formData.get('role');

            // Built-in roles
            const builtInRoles = ['user', 'team_member', 'moderator', 'manager'];
            if (user.role === 'admin') builtInRoles.push('admin');

            // Also allow custom role names from custom_roles setting
            try {
                const customRolesRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
                if (customRolesRow?.setting_value) {
                    const customRoles = JSON.parse(customRolesRow.setting_value);
                    customRoles.forEach(r => builtInRoles.push(r.name));
                }
            } catch {}

            if (!builtInRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

            // Admin log
            try {
                const targetUser = await db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
                await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                    user.id, user.username, 'change_role', `${targetUser?.username || userId}: role → ${role}`
                );
            } catch {}

            return NextResponse.json({ message: `User role updated to ${role}` });

}

export async function handleResetUserPoints(formData, user) {
            const db = await getDb();
            const userId = formData.get('userId');
            await db.prepare('UPDATE users SET yomi_points = 0 WHERE id = ?').run(userId);
            return NextResponse.json({ message: 'User points reset' });

}

export async function handleAddUserPoints(formData, user) {
            const db = await getDb();
            const userId = formData.get('userId');
            const points = Math.max(-1000000, Math.min(1000000, parseInt(formData.get('points')) || 0));
            await db.prepare('UPDATE users SET yomi_points = yomi_points + ? WHERE id = ?').run(points, userId);
            return NextResponse.json({ message: `Added ${points} Asteria Scans Points to user` });

}

export async function handleDeleteComment(formData, user) {
            const db = await getDb();
            const commentId = formData.get('commentId');
            await db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
            return NextResponse.json({ message: 'Comment deleted' });

}

export async function handleDeleteAllUserComments(formData, user) {
            const db = await getDb();
            const userId = formData.get('userId');
            await db.prepare('DELETE FROM comments WHERE user_id = ?').run(userId);
            return NextResponse.json({ message: 'All user comments deleted' });

}

export async function handleBanUser(formData, user) {
            const db = await getDb();
            const userId = formData.get('userId');
            const days = formData.get('days') ? parseInt(formData.get('days')) : null;
            if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

            let bannedUntil = null;
            if (days && days > 0) {
                const date = new Date();
                date.setDate(date.getDate() + days);
                bannedUntil = date.toISOString();
            }

            await db.prepare('UPDATE users SET banned_until = ? WHERE id = ?').run(bannedUntil, userId);

            // Aktivite logu
            const actionText = days && days > 0
                ? `Banned user ID ${userId} for ${days} days`
                : `Unbanned user ID ${userId}`;
            await db.prepare('INSERT INTO admin_logs (admin_id, admin_username, action, details) VALUES (?, ?, ?, ?)').run(
                user.id, user.username, days && days > 0 ? 'ban_user' : 'unban_user', actionText
            );

            return NextResponse.json({ success: true, bannedUntil });

}
