// Test yardımcısı: '@/...' alias'ını proje köküne, 'next/server'i küçük bir stub'a çevirir.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') {
        return { url: pathToFileURL(path.join(root, 'scripts/tests/_next-server-stub.mjs')).href, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
        let p = path.join(root, specifier.slice(2));
        if (!fs.existsSync(p) && fs.existsSync(p + '.js')) p += '.js';
        return { url: pathToFileURL(p).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    if (url.startsWith('file://') && url.includes(root) && url.endsWith('.js') && !url.includes('node_modules')) {
        const source = fs.readFileSync(fileURLToPath(url), 'utf8');
        return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
}
