// Test yardımcısı: '@/...' alias'ını proje köküne, 'next/server'i küçük bir stub'a çevirir.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
        return { url: pathToFileURL(path.join(root, 'node_modules/server-only/empty.js')).href, shortCircuit: true };
    }
    if (specifier === 'next/server') {
        return { url: pathToFileURL(path.join(root, 'scripts/tests/_next-server-stub.mjs')).href, shortCircuit: true };
    }
    if (specifier === 'next/navigation') {
        return { url: pathToFileURL(path.join(root, 'node_modules/next/navigation.js')).href, shortCircuit: true };
    }
    if (specifier === 'next/link') {
        return { url: pathToFileURL(path.join(root, 'node_modules/next/link.js')).href, shortCircuit: true };
    }
    if (specifier === 'next/image') {
        return { url: pathToFileURL(path.join(root, 'node_modules/next/image.js')).href, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
        let p = path.join(root, specifier.slice(2));
        if (fs.existsSync(p + '.js')) {
            p += '.js';
        } else if (fs.existsSync(p + '.jsx')) {
            p += '.jsx';
        } else if (fs.existsSync(p + '.json')) {
            p += '.json';
        } else if (fs.existsSync(p) && fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.js'))) {
            p = path.join(p, 'index.js');
        }
        return { url: pathToFileURL(p).href, shortCircuit: true };
    }
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        if (context.parentURL && context.parentURL.startsWith('file://')) {
            const parentPath = fileURLToPath(context.parentURL);
            let p = path.resolve(path.dirname(parentPath), specifier);
            if (fs.existsSync(p + '.js')) {
                p += '.js';
                return { url: pathToFileURL(p).href, shortCircuit: true };
            } else if (fs.existsSync(p + '.jsx')) {
                p += '.jsx';
                return { url: pathToFileURL(p).href, shortCircuit: true };
            } else if (fs.existsSync(p + '.json')) {
                p += '.json';
                return { url: pathToFileURL(p).href, shortCircuit: true };
            }
        }
    }
    return nextResolve(specifier, context);
}

import * as babel from '@babel/core';

export async function load(url, context, nextLoad) {
    if (url.startsWith('file://')) {
        const filePath = fileURLToPath(url);
        if (filePath.startsWith(root) && (filePath.endsWith('.js') || filePath.endsWith('.jsx')) && !filePath.includes('node_modules')) {
            let source = fs.readFileSync(filePath, 'utf8');
            if (source.includes('<') && (source.includes('/>') || source.includes('</') || source.includes('return <') || source.includes('className='))) {
                try {
                    const transformed = babel.transformSync(source, {
                        presets: [['@babel/preset-react', { runtime: 'automatic' }]],
                        filename: filePath,
                    });
                    if (transformed?.code) {
                        source = transformed.code;
                    }
                } catch (err) {
                    // ignore
                }
            }
            return { format: 'module', source, shortCircuit: true };
        }
    }
    return nextLoad(url, context);
}
