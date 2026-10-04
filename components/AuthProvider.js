'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Sunucu JSON yerine HTML döndürürse (404/500 sayfası vb.) tarayıcının anlaşılmaz
// "Unexpected token '<'" hatası yerine anlaşılır bir mesaj göster.
async function readJson(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Sunucu beklenmeyen bir yanıt verdi (HTTP ${res.status}). Lütfen birkaç saniye sonra tekrar dene.`);
    }
}

// API hata mesajları İngilizce geliyor; giriş/kayıt ekranında Türkçe göster.
const AUTH_ERROR_TR = {
    'Invalid email or password': 'E-posta veya şifre hatalı.',
    'Email and password are required': 'E-posta ve şifre gerekli.',
    'All fields are required': 'Tüm alanları doldur.',
    'Invalid email address': 'Geçerli bir e-posta adresi gir.',
    'Password must be at least 6 characters': 'Şifre en az 6 karakter olmalı.',
    'Password is too long (max 128 characters)': 'Şifre çok uzun (en fazla 128 karakter).',
    'Username or email already exists': 'Bu kullanıcı adı veya e-posta zaten kayıtlı.',
    'Too many requests. Please try again later.': 'Çok fazla deneme yaptın. Lütfen biraz sonra tekrar dene.',
    'Account suspended': 'Hesabın askıya alınmış.',
    'Login failed': 'Giriş yapılamadı. Lütfen tekrar dene.',
    'Registration failed': 'Kayıt olunamadı. Lütfen tekrar dene.',
    'Human verification required': 'Lütfen insan doğrulamasını tamamla.',
    'Human verification failed. Please try again.': 'İnsan doğrulaması başarısız. Lütfen tekrar dene.',
    'Site is under maintenance. Only staff can log in.': 'Site bakımda. Şu an yalnızca yetkililer giriş yapabilir.',
};
function authError(message) {
    return new Error(AUTH_ERROR_TR[message] || message || 'Bir hata oluştu.');
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = useCallback(async (callApi = true) => {
        setUser(null);
        if (callApi) {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
    }, []);

    // On mount: validate session via server (uses httpOnly cookie automatically)
    useEffect(() => {
        async function restoreSession() {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) setUser(data.user);
                }
            } catch {
                // Network error — leave session empty
            } finally {
                setLoading(false);
            }
        }
        restoreSession();
    }, []);

    // Periodic re-validation every 30 min to catch bans / role changes
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        async function validateWithServer() {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (cancelled) return;
                if (res.status === 401 || res.status === 403) {
                    clearSession(true);
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    if (data.user && !cancelled) setUser(data.user);
                }
            } catch {
                // Network error — keep session, will retry
            }
        }

        const interval = setInterval(validateWithServer, 30 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [!!user, clearSession]);

    const login = useCallback(async (email, password, turnstileToken = '') => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, turnstileToken }),
        });
        const data = await readJson(res);
        if (!res.ok) throw authError(data.error);

        // 2FA aktifse oturum burada AÇILMAZ — çağıran taraf (login sayfası)
        // data.requires2FA + data.preAuthToken'ı görüp kod giriş ekranına geçmeli.
        if (data.requires2FA) {
            return data;
        }

        setUser(data.user);
        return data;
    }, []);

    // 2FA akışının 2. adımı: preAuthToken + TOTP/yedek kod ile gerçek oturumu açar.
    const verify2FALogin = useCallback(async (preAuthToken, { token: totpToken, backupCode } = {}) => {
        const res = await fetch('/api/auth/2fa/login-verify', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preAuthToken, token: totpToken, backupCode }),
        });
        const data = await readJson(res);
        if (!res.ok) throw authError(data.error);
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (username, email, password, turnstileToken = '') => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, turnstileToken }),
        });
        const data = await readJson(res);
        if (!res.ok) throw authError(data.error);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(async () => {
        await clearSession(true);
    }, [clearSession]);

    // authFetch: cookie ile istek atar ve 401'de oturumu kapatır
    const authFetch = useCallback(async (url, options = {}) => {
        // Oturum httpOnly cookie ile taşınır; JS token'a hiç erişmez.
        const res = await fetch(url, { ...options, credentials: 'include' });
        if (res.status === 401) {
            await clearSession(true);
        }
        return res;
    }, [clearSession]);

    const updateUser = useCallback((newUser) => {
        setUser(newUser);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (res.status === 401) {
                await clearSession(true);
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (data.user) setUser(data.user);
            }
        } catch {}
    }, [clearSession]);

    return (
        <AuthContext.Provider value={{ user, loading, login, verify2FALogin, register, logout, authFetch, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);