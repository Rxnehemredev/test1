// Kullanım: npm run check:ratelimit
// createRateLimiter() ile üretilen limiter'lar ASYNC'tir; await'siz çağrı `rl.success`'i
// hep undefined bırakır (tüm istekler 429 olur). Bu script tüm çağrıları tarar, hata varsa
// 1 ile çıkar (CI / pre-commit'e eklenebilir).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '.git', '.next']);
const bad = [];
let sites = 0;

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(js|mjs)$/.test(e.name)) scan(p);
    }
}

function scan(file) {
    const s = fs.readFileSync(file, 'utf8');
    const names = new Set([...s.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*createRateLimiter\(/g)].map((m) => m[1]));
    for (const n of names) {
        for (const m of s.matchAll(new RegExp(`(?<![\\w.])${n}\\(\\s*(?:request|req)\\b`, 'g'))) {
            const lineStart = s.lastIndexOf('\n', m.index) + 1;
            const lineText = s.slice(lineStart, s.indexOf('\n', m.index) === -1 ? s.length : s.indexOf('\n', m.index)).trim();
            if (lineText.startsWith('*') || lineText.startsWith('//')) continue; // yorum/JSDoc örnekleri
            sites++;
            if (!s.slice(Math.max(0, m.index - 8), m.index).includes('await')) {
                bad.push(`${path.relative(ROOT, file)}:${s.slice(0, m.index).split('\n').length}  ${n}(...) await'siz`);
            }
        }
    }
}

walk(ROOT);
if (bad.length) {
    console.error(`✗ ${bad.length} await'siz rate limiter çağrısı:\n  ` + bad.join('\n  '));
    process.exit(1);
}
console.log(`✓ ${sites} rate limiter çağrısının tamamı await'li.`);
