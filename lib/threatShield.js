// lib/threatShield.js
//
// ══════════════════════════════════════════════════════════════════════════
// THREAT SHIELD — uygulama içi ikinci savunma hattı (Vercel'den BAĞIMSIZ)
//
// 1) GLOBAL TRAFİK İZLEME + OTOMATİK "SALDIRI MODU"
//    Site genelinde saniyedeki istek sayısı eşiği aşarsa (THREAT_SHIELD_RPS_THRESHOLD,
//    varsayılan 80) saldırı modu açılır: admin ayarı ne olursa olsun tüm sayfalar
//    DDoS-gate'e (Turnstile) yönlenir ve API'ye doğrulanmamış erişim kesilir
//    (Vercel'in "Attack Challenge Mode"unun karşılığı). Sakinleşince 1 dk sonra kapanır.
//
// 2) KADEMELİ + AĞIRLIKLI IP BANI
//    Her ihlalin bir AĞIRLIĞI vardır (hafif: 1, belirgin saldırı payload'ı: 3).
//    Pencere (10 dk) içinde toplam ağırlık eşiğe (3) ulaşırsa IP banlanır; süre her
//    tekrarda artar: 10 dk → 1 sa → 6 sa → 24 sa → 7 gün. Ban kontrolü her isteğin
//    EN başında yapılır. IPv6 adresleri /64 olarak sayılır (adres döndürerek kaçış yok).
//
// 3) DEPOLAMA: Upstash Redis varsa onu, YOKSA (veya Redis'e ulaşılamazsa) süreç
//    içi bellek deposunu (lib/security/memStore.js) kullanır. ESKİDEN Redis yoksa
//    bu katman tamamen kapalıydı; artık Vercel dışında da TAM çalışır.
//
// 4) fail2ban / güvenlik duvarı entegrasyonu: Her ban ve engelleme `[ASTERIA-SHIELD]`
//    önekli, `ip=<adres>` içeren tek satır olarak loglanır. deploy/fail2ban/ bu
//    satırları okuyup saldırganı AĞ SEVİYESİNDE (nftables/iptables) keser — istekler
//    artık Node'a bile ulaşmaz.
// ══════════════════════════════════════════════════════════════════════════

import { ipBucket } from '@/lib/security/ipUtil';
import { counters, bans } from '@/lib/security/memStore';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_ENABLED = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const ATTACK_RPS_THRESHOLD = Number(process.env.THREAT_SHIELD_RPS_THRESHOLD || 80);
const ATTACK_MODE_COOLDOWN_MS = 60 * 1000;
// 1. ban 10 dk, 2. 1 sa, 3. 6 sa, 4. 24 sa, 5.+ 7 gün
const BAN_DURATIONS_SEC = [10 * 60, 60 * 60, 6 * 60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60];
const VIOLATION_THRESHOLD = Number(process.env.THREAT_SHIELD_VIOLATION_THRESHOLD || 3);
const VIOLATION_WINDOW_SEC = 10 * 60;
const BAN_HISTORY_SEC = 14 * 24 * 60 * 60; // tekrar suçlu takibi 14 gün

// Redis kısa zaman aşımıyla çağrılır; hata → bellek deposuna düşülür (koruma sürer).
const REDIS_TIMEOUT_MS = 700;

async function redisPipeline(commands) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
    try {
        const res = await fetch(`${UPSTASH_URL}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(commands),
            cache: 'no-store',
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// ── Depolama bağdaştırıcısı: Redis → (hata/yoksa) bellek ───────────────────
async function kvIncr(key, ttlSec, by = 1) {
    if (REDIS_ENABLED) {
        try {
            const r = await redisPipeline([['INCRBY', key, String(by)], ['EXPIRE', key, String(ttlSec), 'NX']]);
            const n = Number(r?.[0]?.result);
            if (Number.isFinite(n)) return n;
        } catch { /* belleğe düş */ }
    }
    return counters.incr(key, ttlSec * 1000, by).count;
}

async function kvGet(key) {
    if (REDIS_ENABLED) {
        try {
            const r = await redisPipeline([['GET', key]]);
            const v = r?.[0]?.result;
            return v === null || v === undefined ? null : v;
        } catch { /* belleğe düş */ }
    }
    return counters.get(key);
}

// ═══════════════════════════════════════════════════════════════════════
// 1) GLOBAL TRAFİK İZLEME + SALDIRI MODU
// ═══════════════════════════════════════════════════════════════════════

let attackModeCache = { active: false, fetchedAt: 0, activatedSince: 0, lastRps: 0 };
const ATTACK_MODE_CACHE_TTL = REDIS_ENABLED ? 3000 : 1000;

export async function recordRequestAndCheckAttackMode(alreadyIncremented = false) {
    const now = Date.now();
    const secondBucket = Math.floor(now / 1000);

    if (!alreadyIncremented) {
        await kvIncr(`ts:rps:${secondBucket}`, 3);
    }

    if (now - attackModeCache.fetchedAt < ATTACK_MODE_CACHE_TTL) return attackModeCache;

    let count = 0;
    try {
        count = Number(await kvGet(`ts:rps:${secondBucket - 1}`)) || 0;
    } catch {
        attackModeCache = { ...attackModeCache, fetchedAt: now };
        return attackModeCache;
    }

    const wasActive = attackModeCache.active;
    let active;
    if (count >= ATTACK_RPS_THRESHOLD) {
        active = true;
        if (!wasActive) console.warn(`[ASTERIA-SHIELD] ATTACK_MODE_ON rps=${count} threshold=${ATTACK_RPS_THRESHOLD}`);
    } else if (wasActive) {
        active = now - (attackModeCache.lastAboveAt || attackModeCache.activatedSince || now) < ATTACK_MODE_COOLDOWN_MS;
        if (!active) console.warn('[ASTERIA-SHIELD] ATTACK_MODE_OFF');
    } else {
        active = false;
    }

    attackModeCache = {
        active,
        fetchedAt: now,
        activatedSince: active ? (attackModeCache.activatedSince || now) : 0,
        lastAboveAt: count >= ATTACK_RPS_THRESHOLD ? now : attackModeCache.lastAboveAt || 0,
        lastRps: count,
    };
    return attackModeCache;
}

// ═══════════════════════════════════════════════════════════════════════
// 2) KADEMELİ + AĞIRLIKLI BAN
// ═══════════════════════════════════════════════════════════════════════

/**
 * Her istekte çağrılır: ban kontrolü + global sayaç. Hata durumunda asla
 * siteyi kilitlemez (fail-open), ama bellek içi ban'lar her zaman geçerlidir.
 */
export async function checkRequest(ip) {
    const now = Date.now();
    const secondBucket = Math.floor(now / 1000);
    const rpsKey = `ts:rps:${secondBucket}`;
    const hasIp = Boolean(ip) && ip !== '0.0.0.0';
    const key = hasIp ? ipBucket(ip) : '';
    const localBan = hasIp ? Boolean(bans.get(`ts:ban:${key}`)) : false;

    // Redis varsa: ban kontrolü + global sayaç TEK round-trip'te (pipeline).
    if (REDIS_ENABLED) {
        try {
            const cmds = hasIp
                ? [['GET', `ts:ban:${key}`], ['INCR', rpsKey], ['EXPIRE', rpsKey, '3']]
                : [['INCR', rpsKey], ['EXPIRE', rpsKey, '3']];
            const res = await redisPipeline(cmds);
            const remoteBan = hasIp ? Boolean(res?.[0]?.result) : false;
            const state = await recordRequestAndCheckAttackMode(true);
            return { banned: localBan || remoteBan, attackActive: state.active };
        } catch {
            // Redis erişilemedi → bellek deposuyla devam (koruma kesilmez).
        }
    }

    counters.incr(rpsKey, 3000);
    const state = await recordRequestAndCheckAttackMode(true);
    return { banned: localBan, attackActive: state.active };
}

/**
 * Bir ihlali kaydeder; ağırlıklı toplam eşiğe ulaşırsa IP'yi banlar.
 * @param {string} ip      Ham istemci IP'si (loglarda görünür)
 * @param {string} reason  Kısa neden etiketi
 * @param {number} weight  1 = hafif, 3 = tek başına ban eşiği (belirgin saldırı)
 */
export async function recordViolation(ip, reason = 'rate_limited', weight = 1) {
    if (!ip || ip === '0.0.0.0') return;
    const key = ipBucket(ip);
    const w = Math.max(1, Math.min(10, Math.floor(Number(weight)) || 1));
    try {
        const total = await kvIncr(`ts:viol:${key}`, VIOLATION_WINDOW_SEC, w);
        if (total < VIOLATION_THRESHOLD) return;

        const strike = await kvIncr(`ts:bancount:${key}`, BAN_HISTORY_SEC);
        const durationSec = BAN_DURATIONS_SEC[Math.min(Math.max(1, strike), BAN_DURATIONS_SEC.length) - 1];

        bans.set(`ts:ban:${key}`, reason, durationSec * 1000);
        counters.del(`ts:viol:${key}`);
        if (REDIS_ENABLED) {
            try {
                await redisPipeline([
                    ['SET', `ts:ban:${key}`, reason, 'EX', String(durationSec)],
                    ['DEL', `ts:viol:${key}`],
                ]);
            } catch { /* bellek ban'ı zaten aktif */ }
        }
        // fail2ban bu satırı yakalar → ağ seviyesinde ban.
        console.warn(`[ASTERIA-SHIELD] BAN ip=${ip} reason=${reason} seconds=${durationSec} strike=${strike}`);
    } catch (err) {
        console.error('[threatShield] recordViolation başarısız:', err?.message || err);
    }
}

/**
 * Engellenen her istek için fail2ban'ın okuyacağı log satırı. Aynı IP için
 * saniyede en fazla 1 satır yazılır (log şişirme saldırısına karşı).
 */
export function logBlock(ip, reason) {
    try {
        if (!ip) return;
        if (counters.incr(`ts:log:${ipBucket(ip)}`, 1000).count > 1) return;
        console.warn(`[ASTERIA-SHIELD] BLOCK ip=${ip} reason=${String(reason).slice(0, 60)}`);
    } catch { /* log hatası akışı bozmamalı */ }
}

/** Test/izleme için: şu anki depolama modu. */
export function shieldBackend() {
    return REDIS_ENABLED ? 'redis+memory' : 'memory';
}
