import jwt from 'jsonwebtoken';
import { realEnv } from './envGuard.js';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getDb } from './db.js';

// Oturum cookie'sinin ömrü JWT ömrüyle (TOKEN_EXPIRY = '7d') AYNI olmalı: cookie JWT'den
// uzun yaşarsa tarayıcı süresi dolmuş bir token'ı boşuna taşır; kısa olursa oturum erken düşer.
export const SESSION_COOKIE_NAME = 'yomi_token';
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 gün = TOKEN_EXPIRY

// JWT_SECRET artık modül yüklenirken değil, ilk kullanımda kontrol ediliyor.
// Böylece env eksik olsa bile `next build` çökmez; eksikse net bir hata verilir.
function getJwtSecret() {
    const secret = realEnv('JWT_SECRET');
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required but not set. Vercel → Settings → Environment Variables kısmına ekleyip Redeploy yap.');
    }
    return secret;
}
const TOKEN_EXPIRY = '7d';
const PREAUTH_TOKEN_EXPIRY = '5m'; // 2FA kodu girilmeden önceki geçici "ön-oturum" token'ı
// GÜVENLİK DÜZELTMESİ: jwt.verify() çağrılarında `algorithms` açıkça
// belirtilmiyordu. Modern jsonwebtoken sürümleri 'none' algoritmasını zaten
// reddediyor, ama bunu AÇIKÇA HS256 ile sınırlamak (algorithm confusion /
// gelecekte farklı bir key tipine geçilirse oluşabilecek belirsizliklere
// karşı) hem gerçek riski hem de pentest araçlarının "missing algorithms
// allowlist" bulgusunu ortadan kaldırır.
const JWT_ALGORITHMS = ['HS256'];

export function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

export function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        getJwtSecret(),
        { expiresIn: TOKEN_EXPIRY, algorithm: 'HS256' }
    );
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
    } catch {
        return null;
    }
}

/**
 * 2FA akışının 1. adımı (email+şifre doğru) ile 2. adımı (TOTP kodu) arasında
 * kullanılan KISA ÖMÜRLÜ, sınırlı yetkili token. Normal oturum token'ından
 * kasıtlı olarak farklı bir `purpose` alanı taşır — böylece biri bu token'ı
 * ele geçirse bile onunla API isteği atamaz, sadece 2FA doğrulama adımını
 * tamamlayabilir (ki zaten TOTP kodunu da bilmesi gerekir).
 */
export function generatePreAuthToken(user) {
    return jwt.sign(
        { id: user.id, purpose: '2fa_pending' },
        getJwtSecret(),
        { expiresIn: PREAUTH_TOKEN_EXPIRY, algorithm: 'HS256' }
    );
}

export function verifyPreAuthToken(token) {
    try {
        const payload = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
        if (payload?.purpose !== '2fa_pending') return null;
        return payload;
    } catch {
        return null;
    }
}

/** Reads token from Authorization header OR httpOnly cookie */
export function getUserFromRequest(request) {
    // 1. Try Authorization: Bearer header (API calls from AuthProvider)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        return verifyToken(token);
    }
    // 2. Fallback: httpOnly cookie (server components / direct browser requests)
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
        return verifyToken(decodeURIComponent(match[1]));
    }
    return null;
}

/**
 * Like getUserFromRequest but also checks banned_until and role freshness from DB.
 * Returns { user: dbRow } or { error, status }.
 */
export async function getVerifiedUser(request, db) {
    const payload = getUserFromRequest(request);
    if (!payload) return { error: 'Not authenticated', status: 401 };

    const user = await db.prepare(
        'SELECT id, username, email, role, avatar_url, yomi_points, banned_until FROM users WHERE id = ?'
    ).get(payload.id);

    if (!user) return { error: 'User not found', status: 401 };

    if (user.banned_until) {
        const until = new Date(user.banned_until + (user.banned_until.includes('T') ? '' : 'Z'));
        if (until > new Date()) {
            return { error: 'Account suspended', bannedUntil: user.banned_until, status: 403 };
        }
    }

    return { user };
}

export async function requireAuth(request) {
    const payload = getUserFromRequest(request);
    if (!payload) throw new Error('Unauthorized');

    const db = await getDb();
    const user = await db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(payload.id);
    
    if (!user) throw new Error('Unauthorized');
    return user;
}

export async function hasPermission(user, requiredPermission, db = null) {
    if (!user || !user.role) return false;
    if (user.role === 'admin') return true;

    if (user.role === 'manager') {
        // manager has all permissions EXCEPT managing admins
        return requiredPermission !== 'manage_admins';
    }

    if (user.role === 'moderator') {
        return requiredPermission === 'manage_comments';
    }

    if (user.role === 'team_member') {
        return ['manage_series', 'upload_chapters'].includes(requiredPermission);
    }

    // Custom role: DB'den yetkileri oku
    if (db) {
        try {
            const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
            if (row?.setting_value) {
                const customRoles = JSON.parse(row.setting_value);
                const customRole = customRoles.find(r => r.name === user.role);
                if (customRole && Array.isArray(customRole.permissions)) {
                    return customRole.permissions.includes(requiredPermission);
                }
            }
        } catch {}
    }

    return false;
}

export async function requirePermission(request, requiredPermission) {
    const user = await requireAuth(request);
    // GÜVENLİK DÜZELTMESİ: db parametresi hasPermission'a iletilmiyordu, bu yüzden
    // özel (custom) roller — ör. admin panelden oluşturulan "Msg" rolü — bu
    // fonksiyon üzerinden ASLA yetki alamıyordu (hasPermission'daki custom-role
    // dalı `db` gerektirir; db=null iken sessizce false dönüyordu). Yerleşik
    // roller (admin/manager/moderator/team_member) bu hatadan etkilenmiyordu
    // çünkü onların kontrolü db'ye ihtiyaç duymuyor — sorun sessiz kaldığı için
    // fark edilmemişti. db'yi ilettiğimizde davranış SADECE özel roller için
    // (admin tarafından o role açıkça verilmiş izin varsa) genişliyor; yerleşik
    // rollerin veya izinsiz kullanıcıların erişimi hiçbir şekilde değişmiyor.
    const db = await getDb();
    if (!await hasPermission(user, requiredPermission, db)) {
        throw new Error('Forbidden');
    }
    return user;
}

export async function requireAdmin(request) {
    const user = await requireAuth(request);
    if (user.role !== 'admin') throw new Error('Forbidden');

    // Madde 12: admin_2fa_required açıksa, admin rolü de 2FA kurmadan geçemez.
    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'admin_2fa_required'").get();
        if (row?.setting_value === '1') {
            const dbUser = await db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id);
            if (!dbUser?.totp_enabled) throw new Error('2FA_REQUIRED');
        }
    } catch (e) {
        if (e.message === '2FA_REQUIRED') throw e;
        // Ayar okunamazsa (ör. geçici DB hatası) sessizce eskisi gibi devam et — kilitlenme yaratma.
    }

    return user;
}

/**
 * Returns true if user has access to the admin panel.
 * Built-in roles always have access; custom roles are checked from app_settings.
 *
 * Madde 12 (Admin panel açık erişim) önlemi: `admin_2fa_required` ayarı '1' ise,
 * personel hesabının 2FA'sı kurulu olmadan panele erişimi reddedilir — bu
 * sayede tek başına şifre çalınması admin paneline giriş için yetmez.
 * Ayar kapalıysa (varsayılan) davranış eskisiyle birebir aynıdır; böylece
 * mevcut kurulumlar 2FA'yı kendileri kurup açana kadar hiçbir şey bozulmaz.
 */
export async function hasAdminPanelAccess(user, db) {
    if (!user || !user.role) return false;
    const builtinRoles = ['admin', 'manager', 'moderator', 'team_member'];
    let isStaff = builtinRoles.includes(user.role);
    if (!isStaff) {
        try {
            const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
            if (row?.setting_value) {
                const customRoles = JSON.parse(row.setting_value);
                isStaff = customRoles.some(r => r.name === user.role);
            }
        } catch {}
    }
    if (!isStaff) return false;

    try {
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'admin_2fa_required'").get();
        if (row?.setting_value === '1') {
            const dbUser = await db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id);
            if (!dbUser?.totp_enabled) return false;
        }
    } catch {}

    return true;
}

/**
 * hasAdminPanelAccess ile aynı kuralları uygular ama İSTEĞE BAĞLI olarak
 * SEBEBİ de döner ('not_staff' | '2fa_required' | null). Sadece daha iyi
 * hata mesajı göstermek isteyen route'larda (ör. ana admin API'si) kullanılır;
 * mevcut boolean-only hasAdminPanelAccess çağrıları hiç değişmeden çalışmaya devam eder.
 */
export async function getAdminPanelAccessStatus(user, db) {
    if (!user || !user.role) return { allowed: false, reason: 'not_staff' };
    const builtinRoles = ['admin', 'manager', 'moderator', 'team_member'];
    let isStaff = builtinRoles.includes(user.role);
    if (!isStaff) {
        try {
            const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
            if (row?.setting_value) {
                const customRoles = JSON.parse(row.setting_value);
                isStaff = customRoles.some(r => r.name === user.role);
            }
        } catch {}
    }
    if (!isStaff) return { allowed: false, reason: 'not_staff' };

    try {
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'admin_2fa_required'").get();
        if (row?.setting_value === '1') {
            const dbUser = await db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(user.id);
            if (!dbUser?.totp_enabled) return { allowed: false, reason: '2fa_required' };
        }
    } catch {}

    return { allowed: true, reason: null };
}

/**
 * Oturum cookie'sini (httpOnly, 7 gün) response'a yazar. Cookie set eden TEK yer
 * burası: login, 2FA login-verify, register ve /api/auth/me hep bunu kullanır
 * (eskiden register ve me kendi kopyalarını taşıyordu → süre/bayrak sapması riski).
 * @param {NextResponse} response
 * @param {string} token
 * @returns {NextResponse}
 */
export function setSessionCookie(response, token) {
    response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_COOKIE_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
    });
    return response;
}

/**
 * Şifre (+ gerekiyorsa 2FA) doğrulandıktan SONRA çağrılan, oturumu fiilen
 * açan ortak fonksiyon. /api/auth/login (2FA kapalıyken), /api/auth/2fa/login-verify
 * (TOTP doğrulandıktan sonra) ve /api/auth/register tarafından paylaşılır — bakım modu
 * kontrolü ve cookie mantığı TEK YERDE yaşar.
 *
 * Response gövdesi ASLA JWT içermez; token yalnızca httpOnly cookie ile taşınır
 * (JS'in token'a erişimi yok → XSS ile oturum çalınamaz).
 *
 * @param {object} db
 * @param {object} user
 * @param {{ status?: number, skipMaintenanceCheck?: boolean, extra?: object }} [options]
 *   status: HTTP durum kodu (register için 201). skipMaintenanceCheck: yeni kayıtta
 *   bakım modu engeli uygulanmaz (eski register davranışı korunur). extra: response
 *   gövdesine eklenecek ek alanlar (ör. passwordWarning). `token` anahtarı yok sayılır.
 */
export async function finalizeLoginResponse(db, user, options = {}) {
    const { status = 200, skipMaintenanceCheck = false, extra = {} } = options;
    const { token: _ignoredToken, ...safeExtra } = extra; // gövdeye token sızmasın
    const token = generateToken(user);
    const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        display_name: user.display_name,
        cover_url: user.cover_url,
        yomi_points: user.yomi_points,
        activity_points: user.activity_points,
        created_at: user.created_at,
    };

    if (!skipMaintenanceCheck) try {
        const maintenanceRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'").get();
        if (maintenanceRow?.setting_value === '1') {
            const builtinStaff = ['admin', 'manager', 'moderator', 'team_member'];
            let isStaff = builtinStaff.includes(user.role);
            if (!isStaff) {
                try {
                    const customRolesRow = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
                    if (customRolesRow?.setting_value) {
                        const customRoles = JSON.parse(customRolesRow.setting_value);
                        isStaff = customRoles.some(r => r.name === user.role);
                    }
                } catch {}
            }
            if (!isStaff) {
                return NextResponse.json({ error: 'Site is under maintenance. Only staff can log in.' }, { status: 403 });
            }
        }
    } catch {}

    return setSessionCookie(NextResponse.json({ user: userData, ...safeExtra }, { status }), token);
}
