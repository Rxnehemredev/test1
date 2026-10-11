import { getDb } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { requiredJwtSecret } from '@/lib/envGuard';
import {
  getSettingsCache,
  setSettingsCache,
  setRawSettingsCache,
  SETTINGS_CACHE_TTL
} from '@/lib/settings-cache';

export const DEFAULT_NAVBAR_MENU = [
  { label: 'Ana Sayfa', url: '/' },
  { label: 'Göz At', url: '/series' },
  { label: 'Blog', url: '/blog' },
  { label: 'Sıralama', url: '/ranking' },
  { label: 'İstekler', url: '/requests' },
];

export const DEFAULT_FOOTER_MENU = [
  { label: 'Gizlilik Politikası', url: '/privacy' },
  { label: 'Kullanım Koşulları', url: '/terms' },
  { label: 'Göz At', url: '/series' },
];

export async function isStaffFromCookie(cookieStore) {
  try {
    const token = cookieStore.get('yomi_token')?.value;
    if (!token) return false;
    const payload = jwt.verify(token, requiredJwtSecret(), { algorithms: ['HS256'] });
    if (!payload?.role) return false;
    // Yerleşik yetkili roller
    const builtinStaff = ['admin', 'manager', 'moderator', 'team_member'];
    if (builtinStaff.includes(payload.role)) return true;
    // Özel roller: DB'den kontrol et
    try {
      const db = await getDb();
      const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'custom_roles'").get();
      if (row?.setting_value) {
        const customRoles = JSON.parse(row.setting_value);
        return customRoles.some(r => r.name === payload.role);
      }
    } catch {}
    return false;
  } catch {
    return false;
  }
}

export async function isMaintenanceModeOn(settings) {
  try {
    // settings nesnesi varsa önce onu kullan (DB'den cache'lenmiş veri — ekstra sorgu yok)
    if (settings && typeof settings === 'object' && 'maintenance_mode' in settings) {
      return settings.maintenance_mode === '1';
    }
    const db = await getDb();
    const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'").get();
    return row?.setting_value === '1';
  } catch {
    return false;
  }
}

export async function getMaintenanceMessage(settings) {
  try {
    // settings nesnesi varsa önce onu kullan (DB'den cache'lenmiş veri — ekstra sorgu yok)
    if (settings && typeof settings === 'object' && 'maintenance_message' in settings) {
      return settings.maintenance_message || '';
    }
    const db = await getDb();
    const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_message'").get();
    return row?.setting_value || '';
  } catch {
    return '';
  }
}

export async function getSiteSettings() {
  // Paylaşılan cache geçerliyse DB'ye gitme
  const now = Date.now();
  const { cache: _settingsCache, cacheAt: _settingsCacheAt } = getSettingsCache();
  if (_settingsCache && now - _settingsCacheAt < SETTINGS_CACHE_TTL) {
    return _settingsCache;
  }
  try {
    const db = await getDb();
    const rows = await db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
    const s = {};
    rows.forEach(r => { s[r.setting_key] = r.setting_value; });
    // Ham ayar map'ini de (aynı DB satırlarından, ekstra sorgu YAPMADAN)
    // /api/settings ile aynı şekilde cache'liyoruz — SettingsProvider'a
    // initialSettings olarak geçirebilmek için (ad_* gibi anahtarlar aşağıdaki
    // "result" whitelist'inde yok, client tarafı ham map'i bekliyor).
    setRawSettingsCache(s);

    let navbarMenu = DEFAULT_NAVBAR_MENU;
    let footerMenu = DEFAULT_FOOTER_MENU;
    try { if (s.navbar_menu) navbarMenu = JSON.parse(s.navbar_menu); } catch {}
    try { if (s.footer_menu) footerMenu = JSON.parse(s.footer_menu); } catch {}

    // Merge custom pages into navbar/footer menus
    try {
      const customPages = await db.prepare(
        "SELECT title, slug, show_in_navbar, show_in_footer FROM custom_pages WHERE is_active = 1 AND (show_in_navbar = 1 OR show_in_footer = 1)"
      ).all();
      for (const page of customPages) {
        const pageEntry = { label: page.title, url: `/p/${page.slug}` };
        if (page.show_in_navbar) {
          const alreadyInNavbar = navbarMenu.some(item => item.url === pageEntry.url);
          if (!alreadyInNavbar) navbarMenu = [...navbarMenu, pageEntry];
        }
        if (page.show_in_footer) {
          const alreadyInFooter = footerMenu.some(item => item.url === pageEntry.url);
          if (!alreadyInFooter) footerMenu = [...footerMenu, pageEntry];
        }
      }
    } catch {}

    const result = {
      site_name: s.site_name || '',
      site_description: s.site_description || '',
      accent_color: s.accent_color || '',
      button_color: s.button_color || '',
      button_hover_color: s.button_hover_color || '',
      button_text_color: s.button_text_color || '',
      link_color: s.link_color || '',
      link_hover_color: s.link_hover_color || '',
      navbar_bg_color: s.navbar_bg_color || '',
      favicon_url: s.favicon_url || '',
      logo_url: s.logo_url || '',
      footer_text: s.footer_text || '',
      contact_email: s.contact_email || '',
      discord_url: s.discord_url || '',
      reddit_url: s.reddit_url || '',
      twitter_url: s.twitter_url || '',
      instagram_url: s.instagram_url || '',
      tiktok_url: s.tiktok_url || '',
      youtube_url: s.youtube_url || '',
      facebook_url: s.facebook_url || '',
      custom_css: s.custom_css || '',
      custom_head_scripts: s.custom_head_scripts || '',
      custom_body_js: s.custom_body_js || '',
      reader_bg_color: s.reader_bg_color || '',
      announcement_bg_color: s.announcement_bg_color || '',
      seo_title_home: s.seo_title_home || '',
      seo_desc_home: s.seo_desc_home || '',
      seo_title_series: s.seo_title_series || '',
      seo_title_chapter: s.seo_title_chapter || '',
      google_analytics_id: s.google_analytics_id || '',
      google_tag_manager_id: s.google_tag_manager_id || '',
      google_site_verification: s.google_site_verification || '',
      og_image_url: s.og_image_url || '',
      navbar_menu: navbarMenu,
      footer_menu: footerMenu,
      maintenance_mode: s.maintenance_mode || '0',
      maintenance_message: s.maintenance_message || '',
      maintenance_mode_design: s.maintenance_mode_design || 'default',
      latest_updates_title_color: s.latest_updates_title_color || '',
      latest_updates_card_bg: s.latest_updates_card_bg || '',
      latest_updates_card_border: s.latest_updates_card_border || '',
      latest_updates_badge_bg: s.latest_updates_badge_bg || '',
      latest_updates_badge_text: s.latest_updates_badge_text || '',
      latest_updates_hover_bg: s.latest_updates_hover_bg || '',
      points_name: s.points_name || '',
      points_short: s.points_short || '',
    };
    setSettingsCache(result);
    return result;
  } catch {
    return {
      navbar_menu: DEFAULT_NAVBAR_MENU,
      footer_menu: DEFAULT_FOOTER_MENU,
    };
  }
}
