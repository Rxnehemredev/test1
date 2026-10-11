// Lightens/darkens a hex color for derived CSS variables
export function hexToHsl(hex) {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue, sat, lit;
    lit = (max + min) / 2;
    if (max === min) {
      hue = sat = 0;
    } else {
      const d = max - min;
      sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: hue = ((b - r) / d + 2) / 6; break;
        default: hue = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(hue * 360), Math.round(sat * 100), Math.round(lit * 100)];
  } catch {
    return null;
  }
}

export function sanitizeCssColor(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  const safe = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.,\s%]+\)|hsla?\(\s*[\d.,\s%]+\)|[a-zA-Z]{2,30})$/.test(v);
  return safe ? v : null;
}

export function buildDynamicCss(settings) {
  const lines = [];

  // Accent color → derive all related vars
  if (settings.accent_color && settings.accent_color.startsWith('#')) {
    const hsl = hexToHsl(settings.accent_color);
    if (hsl) {
      const [h, s, l] = hsl;
      const dark = `hsl(${h}, ${s}%, ${Math.max(0, l - 10)}%)`;
      const darker = `hsl(${h}, ${s}%, ${Math.max(0, l - 18)}%)`;
      const light = `hsl(${h}, ${s}%, ${Math.min(100, l + 15)}%)`;
      const bright = `hsl(${h}, ${s}%, ${Math.min(100, l + 22)}%)`;
      const glow = `hsla(${h}, ${s}%, ${l}%, 0.35)`;
      const subtle = `hsla(${h}, ${s}%, ${l}%, 0.12)`;
      const subtle2 = `hsla(${h}, ${s}%, ${l}%, 0.08)`;
      const gradient = `linear-gradient(135deg, ${darker}, ${settings.accent_color}, ${dark})`;
      lines.push(
        `  --primary: ${settings.accent_color};`,
        `  --primary-dark: ${dark};`,
        `  --primary-light: ${light};`,
        `  --accent: ${settings.accent_color};`,
        `  --accent-light: ${light};`,
        `  --accent-bright: ${bright};`,
        `  --primary-glow: ${glow};`,
        `  --primary-subtle: ${subtle};`,
        `  --gradient-primary: ${gradient};`,
      );
    }
  }

  // Button color
  if (settings.button_color) lines.push(`  --btn-primary-bg: ${settings.button_color};`);
  // Button hover color
  if (settings.button_hover_color) lines.push(`  --btn-primary-hover: ${settings.button_hover_color};`);
  // Button text color
  if (settings.button_text_color) lines.push(`  --btn-primary-text: ${settings.button_text_color};`);
  // Link color
  if (settings.link_color) lines.push(`  --link-color: ${settings.link_color};`);
  // Link hover color
  if (settings.link_hover_color) lines.push(`  --link-hover-color: ${settings.link_hover_color};`);
  // Navbar background
  if (settings.navbar_bg_color) lines.push(`  --navbar-bg: ${settings.navbar_bg_color};`);
  // Reader background
  if (settings.reader_bg_color) lines.push(`  --reader-bg: ${settings.reader_bg_color};`);
  // Announcement bar color
  if (settings.announcement_bg_color) lines.push(`  --announcement-bg: ${settings.announcement_bg_color};`);
  // Latest Updates color variables (sanitized to prevent CSS injection)
  const luTitleColor = sanitizeCssColor(settings.latest_updates_title_color);
  const luCardBg = sanitizeCssColor(settings.latest_updates_card_bg);
  const luCardBorder = sanitizeCssColor(settings.latest_updates_card_border);
  const luBadgeBg = sanitizeCssColor(settings.latest_updates_badge_bg);
  const luBadgeText = sanitizeCssColor(settings.latest_updates_badge_text);
  const luHoverBg = sanitizeCssColor(settings.latest_updates_hover_bg);
  if (luTitleColor) lines.push(`  --latest-updates-title-color: ${luTitleColor};`);
  if (luCardBg) lines.push(`  --latest-updates-card-bg: ${luCardBg};`);
  if (luCardBorder) lines.push(`  --latest-updates-card-border: ${luCardBorder};`);
  if (luBadgeBg) lines.push(`  --latest-updates-badge-bg: ${luBadgeBg};`);
  if (luBadgeText) lines.push(`  --latest-updates-badge-text: ${luBadgeText};`);
  if (luHoverBg) lines.push(`  --latest-updates-hover-bg: ${luHoverBg};`);

  let css = '';
  if (lines.length > 0) css += `:root {\n${lines.join('\n')}\n}\n`;

  // Apply comprehensive overrides so the accent color reaches all themed elements
  const overrides = [];

  if (settings.accent_color) {
    // Buttons
    overrides.push(
      `.btn-primary { background: var(--primary) !important; border-color: var(--primary) !important; }`,
      `.btn-primary:hover { background: var(--primary-dark) !important; border-color: var(--primary-dark) !important; }`,
    );
    // Hero slider elements
    overrides.push(
      `.hero-meta-badge { border-color: var(--primary) !important; }`,
      `.hero-dot.active { background: var(--primary) !important; }`,
      `.hero-genre-tag { background: var(--primary-subtle) !important; border-color: var(--primary) !important; color: var(--accent-bright) !important; }`,
    );
    // Accent-colored text & borders
    overrides.push(
      `.section-title svg { stroke: var(--primary) !important; }`,
      `.genre-tag, .genre-tag-filter.active { background: var(--primary-subtle) !important; border-color: var(--primary) !important; color: var(--accent-light) !important; }`,
      `.genre-tag-filter.active { background: var(--primary) !important; color: #fff !important; }`,
    );
    // Stats bar
    overrides.push(
      `.stats-bar { background: linear-gradient(135deg, var(--bg-card), var(--primary-subtle)) !important; border-top-color: var(--primary) !important; }`,
      `.stat-number { color: var(--primary) !important; }`,
    );
    // Series card & chapter links
    overrides.push(
      `.asura-title:hover, .tc-title { color: var(--accent-light) !important; }`,
      `.asura-chapter-row:hover { color: var(--accent-light) !important; border-left-color: var(--primary) !important; }`,
    );
    // Most Read widget tabs
    overrides.push(
      `.mr3-tab.active { background: var(--primary) !important; color: #fff !important; }`,
      `.mr3-badge-1 { background: var(--primary) !important; }`,
    );
    // Navbar active/hover
    overrides.push(
      `.nav-link.active, .nav-link:hover { color: var(--primary) !important; }`,
      `.nav-link.active::after { background: var(--primary) !important; }`,
    );
    // Announcement bar
    overrides.push(
      `.ann-badge { color: var(--primary) !important; }`,
    );
    // Sidebar widget headers
    overrides.push(
      `.widget-header h3 { color: var(--accent-light) !important; }`,
      `.epw-read-btn { color: var(--accent-light) !important; }`,
    );
    // Filter bar active
    overrides.push(
      `.filter-bar select:focus, .filter-bar input:focus { border-color: var(--primary) !important; }`,
    );
    // Rankings / profile
    overrides.push(
      `.rank-badge { background: var(--primary) !important; }`,
      `.yomi-points { color: var(--primary) !important; }`,
    );
    // Trending card rank numbers
    overrides.push(
      `.tc-number.rank-1, .tc-number.rank-2, .tc-number.rank-3 { color: var(--primary) !important; -webkit-text-stroke-color: var(--primary-dark) !important; }`,
    );
    // Comment section
    overrides.push(
      `.comment-action:hover, .comment-action.active { color: var(--primary) !important; }`,
    );
    // Continue reading card
    overrides.push(
      `.continue-reading-card { border-left-color: var(--primary) !important; }`,
      `.cr-subtitle { color: var(--primary) !important; }`,
    );
    // Footer
    overrides.push(
      `.footer a:hover { color: var(--primary) !important; }`,
      `.footer-social-link:hover { background: var(--primary-subtle) !important; color: var(--primary) !important; }`,
    );
    // Series detail
    overrides.push(
      `.series-status-badge { background: var(--primary-subtle) !important; color: var(--primary) !important; border-color: var(--primary) !important; }`,
      `.chapter-item:hover { border-left-color: var(--primary) !important; }`,
    );
    // Search results
    overrides.push(
      `.search-result-item:hover { background: var(--primary-subtle) !important; }`,
    );
    // Progress/loading bar
    overrides.push(
      `.spinner { border-top-color: var(--primary) !important; }`,
    );
  }

  if (settings.button_color) overrides.push(`.btn-primary { background: var(--btn-primary-bg) !important; border-color: var(--btn-primary-bg) !important; }`);
  if (settings.button_hover_color) overrides.push(`.btn-primary:hover { background: var(--btn-primary-hover) !important; border-color: var(--btn-primary-hover) !important; }`);
  if (settings.button_text_color) overrides.push(`.btn-primary, .btn-primary:hover { color: var(--btn-primary-text) !important; }`);
  if (settings.link_color) overrides.push(`a { color: var(--link-color); }`);
  if (settings.link_hover_color) overrides.push(`a:hover { color: var(--link-hover-color) !important; }`);
  if (settings.navbar_bg_color) overrides.push(`.navbar { background: var(--navbar-bg) !important; backdrop-filter: none !important; }`);
  if (settings.announcement_bg_color) overrides.push(`.announcements-bar, .ann-item { background: var(--announcement-bg) !important; }`);

  // Latest Updates color overrides (use pre-sanitized local vars)
  if (luTitleColor) {
    overrides.push(`.holo-title, .asura-title, .glass-card-title, .cosmic-card .ctt-title, .cinematic-card .cine-title, .skill-tree-card .st-title { color: var(--latest-updates-title-color) !important; }`);
  }
  if (luCardBg) {
    overrides.push(`.holo-card { background: var(--latest-updates-card-bg) !important; }`);
    // .holo-card-inner intentionally excluded — preserves the glassmorphism depth effect
    overrides.push(`.asura-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.glass-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.cosmic-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.cinematic-card { background: var(--latest-updates-card-bg) !important; }`);
    overrides.push(`.skill-tree-card { background: var(--latest-updates-card-bg) !important; }`);
  }
  if (luCardBorder) {
    overrides.push(`.holo-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.asura-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.glass-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.cosmic-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.cinematic-card { border-color: var(--latest-updates-card-border) !important; }`);
    overrides.push(`.skill-tree-card { border-color: var(--latest-updates-card-border) !important; }`);
  }
  if (luBadgeBg) {
    overrides.push(`.new-chapter-badge-pill { background: var(--latest-updates-badge-bg) !important; border-color: var(--latest-updates-badge-bg) !important; }`);
  }
  if (luBadgeText) {
    overrides.push(`.new-chapter-badge-pill { color: var(--latest-updates-badge-text) !important; }`);
  }
  if (luHoverBg) {
    overrides.push(`.holo-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.asura-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.glass-card-chapters a:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.cosmic-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.cine-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
    overrides.push(`.st-chapter-row:hover { background: var(--latest-updates-hover-bg) !important; }`);
  }

  if (overrides.length > 0) css += overrides.join('\n') + '\n';

  // Custom CSS (always last so it can override everything)
  if (settings.custom_css) css += '\n' + settings.custom_css;

  return css;
}
