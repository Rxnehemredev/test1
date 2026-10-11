import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasAdminPanelAccess, hasPermission } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

  try {
    const user = await requireAuth(request);
    const db = await getDb();
    if (!await hasAdminPanelAccess(user, db)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const canViewLogs = ['admin', 'manager'].includes(user.role) || await hasPermission(user, 'view_audit_log', db);
    if (!canViewLogs) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const logs = await db.prepare(`
      SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200
    `).all();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('GET /api/admin/logs error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

  try {
    const user = await requireAuth(request);
    const db = await getDb();
    if (!await hasAdminPanelAccess(user, db)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { action, details } = await request.json();
    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }
    await db.prepare(`
      INSERT INTO admin_logs (admin_id, admin_username, action, details)
      VALUES (?, ?, ?, ?)
    `).run(user.id, user.username, action, details || null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/admin/logs error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}