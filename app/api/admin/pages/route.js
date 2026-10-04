import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, hasAdminPanelAccess } from '@/lib/auth';
import { createRateLimiter } from '@/lib/ratelimit';
const adminLimiter = createRateLimiter(100, 60000);


function slugify(text) {
    return text.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export async function GET(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const pages = await db.prepare('SELECT * FROM custom_pages ORDER BY created_at DESC').all();
        return NextResponse.json({ success: true, pages });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    { const __rl = await adminLimiter(request); if (!__rl.success) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(__rl.retryAfter) } }); }

    try {
        const user = await requireAuth(request);
        const db = await getDb();
        if (!await hasAdminPanelAccess(user, db)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { action, id, title, content, slug, is_active, show_in_footer, show_in_navbar } = body;

        if (action === 'delete') {
            await db.prepare('DELETE FROM custom_pages WHERE id = ?').run(id);
            return NextResponse.json({ success: true });
        }

        if (action === 'update') {
            await db.prepare(
                'UPDATE custom_pages SET title=?, content=?, slug=?, is_active=?, show_in_footer=?, show_in_navbar=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
            ).run(title, content || '', slug, is_active ? 1 : 0, show_in_footer ? 1 : 0, show_in_navbar ? 1 : 0, id);
            return NextResponse.json({ success: true });
        }

        // create new page
        const finalSlug = slug ? slugify(slug) : slugify(title);
        await db.prepare(
            'INSERT INTO custom_pages (title, content, slug, is_active, show_in_footer, show_in_navbar) VALUES (?,?,?,?,?,?)'
        ).run(title, content || '', finalSlug, is_active !== false ? 1 : 0, show_in_footer !== false ? 1 : 0, show_in_navbar ? 1 : 0);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
