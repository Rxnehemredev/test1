import fs from 'fs';
import path from 'path';
import { generateSlug } from '@/lib/db';

export async function toWebP(buffer, quality = 85) {
    const sharp = (await import('sharp')).default;
    return sharp(buffer).webp({ quality }).toBuffer();
}

export function isSharedChapterImage(imagePath) {
    return typeof imagePath === 'string' && (
        imagePath.includes('/uploads/chapter-start-image/') ||
        imagePath.includes('/uploads/chapter-end-image/')
    );
}

export function getDirSize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    let total = 0;
    try {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                total += getDirSize(full);
            } else {
                try { total += fs.statSync(full).size; } catch {}
            }
        }
    } catch {}
    return total;
}

export function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const joinPath = (...args) => {
    const full = path.join(...args);
    const root = path.resolve(process.cwd());
    const resolved = path.resolve(full);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('Geçersiz dosya yolu');
    if (args[0] === process.cwd() && args[1] === 'public') {
        const pub = path.join(root, 'public');
        if (resolved !== pub && !resolved.startsWith(pub + path.sep)) throw new Error('Geçersiz dosya yolu');
    }
    return full;
};

export const pagesDir = (id) => {
    const s = String(id);
    if (!/^\d{1,12}$/.test(s)) throw new Error('Geçersiz bölüm ID');
    return joinPath(process.cwd(), 'public', 'uploads', 'pages', s);
};

export async function makeUniqueSlug(db, title, excludeId = null) {
    let base = generateSlug(title);
    if (!base) base = `series-${Date.now()}`;
    let slug = base;
    let counter = 1;
    while (true) {
        const query = excludeId
            ? 'SELECT id FROM series WHERE slug = ? AND id != ?'
            : 'SELECT id FROM series WHERE slug = ?';
        const args = excludeId ? [slug, excludeId] : [slug];
        const existing = await db.prepare(query).get(...args);
        if (!existing) break;
        slug = `${base}-${counter++}`;
    }
    return slug;
}
