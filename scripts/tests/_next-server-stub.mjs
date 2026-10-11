// Minimal NextResponse taklidi (yalnızca middleware testi için).
export class NextResponse extends Response {
    static json(body, init = {}) {
        const headers = new Headers(init.headers || {});
        headers.set('content-type', 'application/json');
        return new NextResponse(JSON.stringify(body), { status: init.status || 200, headers });
    }
    static redirect(url, status = 307) {
        const r = new NextResponse(null, { status, headers: { location: String(url) } });
        return r;
    }
    static next(opts = {}) {
        const r = new NextResponse(null, { status: 200 });
        r.__nextRequestHeaders = opts?.request?.headers || null;
        return r;
    }
}

export function after(fn) {
    if (typeof fn === 'function') {
        try {
            const res = fn();
            if (res && typeof res.catch === 'function') res.catch(() => {});
        } catch {}
    }
}
