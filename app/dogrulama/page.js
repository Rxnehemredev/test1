import GateVerifyClient from '@/components/GateVerifyClient';

// Bilinçli olarak DB'ye HİÇ gitmiyoruz. Bu sayfa middleware tarafından
// doğrulanmamış ziyaretçilere (bot dahil) gösteriliyor — amaç, asıl pahalı
// sayfaların (6 paralel DB sorgusu yapan ana sayfa gibi) hiç çalışmamasını
// sağlamak. Bu sayfanın kendisi de aynı hataya düşüp pahalı olursa bütün
// optimizasyon anlamsızlaşır.

function sanitizeNext(raw) {
    // Open redirect'i önlemek için sadece site-içi, "/" ile başlayan,
    // "//" ile başlamayan (protocol-relative URL) yollara izin ver.
    if (!raw || typeof raw !== 'string') return '/';
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
    return raw;
}

export default async function DogrulamaPage({ searchParams }) {
    const params = await searchParams;
    const next = sanitizeNext(params?.next);

    return <GateVerifyClient nextPath={next} />;
}
