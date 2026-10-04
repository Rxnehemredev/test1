import { NextResponse } from 'next/server';

// Canlı sohbette GIF gönderimi kapatıldı. GIF araması artık yalnızca bölüm yorumlarında
// (/api/gif üzerinden) kullanılıyor. Bu endpoint eski istemciler için 410 döner.
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json(
        { success: false, error: 'Canlı sohbette GIF gönderimi kapatıldı.' },
        { status: 410 }
    );
}
