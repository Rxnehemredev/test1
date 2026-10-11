import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@libsql/client';
import { wrapClient } from '@/lib/db/client.js';
import { runMigrations } from '@/lib/db/migrations.js';
import { generateSlug } from '@/lib/db/slug.js';

import {
    handleListUsers,
    handleListSeries,
    handleReadingStats,
    handleAdminOverview
} from '@/lib/admin/adminStatsService.js';
import {
    formatBytes,
    getDirSize,
    makeUniqueSlug
} from '@/lib/admin/adminHelpers.js';
import {
    detectSiteType,
    normalizeScrapedResult
} from '@/lib/scrapers/utils.js';
import {
    getSettingsCache,
    setSettingsCache,
    invalidateSettingsCache
} from '@/lib/settings-cache.js';
import {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken
} from '@/lib/auth.js';
import {
    getCultivationData
} from '@/lib/gamification.js';
import {
    renderMarkdown
} from '@/lib/comments/renderMarkdown.js';
import {
    isAllowedImageUrl
} from '@/lib/commentImages.js';

// React components verification
import AdminPanel from '@/app/admin-panel/page.js';
import ProfilePage from '@/app/profile/page.js';
import ReaderPage from '@/app/read/[chapterId]/page.js';
import Navbar from '@/components/Navbar.js';
import HomeClient from '@/components/HomeClient.js';
import CommentSection from '@/components/CommentSection.js';
import SeriesDetailClient from '@/components/SeriesDetailClient.js';

// All 18 Admin Tabs
import OverviewTab from '@/components/admin/tabs/OverviewTab.js';
import AnnouncementsTab from '@/components/admin/tabs/AnnouncementsTab.js';
import ShopTab from '@/components/admin/tabs/ShopTab.js';
import SeriesTab from '@/components/admin/tabs/SeriesTab.js';
import ApiKeyTab from '@/components/admin/tabs/ApiKeyTab.js';
import UsersTab from '@/components/admin/tabs/UsersTab.js';
import CommentsTab from '@/components/admin/tabs/CommentsTab.js';
import TrafficTab from '@/components/admin/tabs/TrafficTab.js';
import AuditLogTab from '@/components/admin/tabs/AuditLogTab.js';
import RequestsTab from '@/components/admin/tabs/RequestsTab.js';
import ScraperTab from '@/components/admin/tabs/ScraperTab.js';
import MediaTab from '@/components/admin/tabs/MediaTab.js';
import PagesTab from '@/components/admin/tabs/PagesTab.js';
import BackupsTab from '@/components/admin/tabs/BackupsTab.js';
import SettingsTab from '@/components/admin/tabs/SettingsTab.js';
import BugReportsTab from '@/components/admin/tabs/BugReportsTab.js';
import CustomizeTab from '@/components/admin/tabs/CustomizeTab.js';
import AdsTab from '@/components/admin/tabs/AdsTab.js';

// 5 Profile tabs
import ProfileBadgesTab from '@/components/profile/ProfileBadgesTab.js';
import ProfileLibraryTab from '@/components/profile/ProfileLibraryTab.js';
import ProfileOverviewTab from '@/components/profile/ProfileOverviewTab.js';
import ProfileSettingsTab from '@/components/profile/ProfileSettingsTab.js';
import ProfileStatsTab from '@/components/profile/ProfileStatsTab.js';

// Reader components
import EndChapterCard from '@/components/reader/EndChapterCard.js';
import ReaderBugModal from '@/components/reader/ReaderBugModal.js';
import ReaderHud from '@/components/reader/ReaderHud.js';
import ReaderNovelView from '@/components/reader/ReaderNovelView.js';
import ReaderPageImage from '@/components/reader/ReaderPageImage.js';
import ReaderSupportCard from '@/components/reader/ReaderSupportCard.js';

test('Smoke Test: 1. Components and Tab Exports', () => {
    assert.ok(typeof AdminPanel === 'function', 'AdminPanel page must be a function');
    assert.ok(typeof ProfilePage === 'function', 'ProfilePage must be a function');
    assert.ok(typeof ReaderPage === 'function', 'ReaderPage must be a function');
    assert.ok(typeof Navbar === 'function', 'Navbar must be a function');
    assert.ok(typeof HomeClient === 'function', 'HomeClient must be a function');
    assert.ok(typeof CommentSection === 'function', 'CommentSection must be a function');
    assert.ok(typeof SeriesDetailClient === 'function', 'SeriesDetailClient must be a function');

    const adminTabs = [
        ['OverviewTab', OverviewTab],
        ['AnnouncementsTab', AnnouncementsTab],
        ['ShopTab', ShopTab],
        ['SeriesTab', SeriesTab],
        ['ApiKeyTab', ApiKeyTab],
        ['UsersTab', UsersTab],
        ['CommentsTab', CommentsTab],
        ['TrafficTab', TrafficTab],
        ['AuditLogTab', AuditLogTab],
        ['RequestsTab', RequestsTab],
        ['ScraperTab', ScraperTab],
        ['MediaTab', MediaTab],
        ['PagesTab', PagesTab],
        ['BackupsTab', BackupsTab],
        ['SettingsTab', SettingsTab],
        ['BugReportsTab', BugReportsTab],
        ['CustomizeTab', CustomizeTab],
        ['AdsTab', AdsTab],
    ];
    for (const [name, component] of adminTabs) {
        assert.ok(typeof component === 'function', `${name} must be a valid component function`);
    }

    const profileTabs = [
        ['ProfileBadgesTab', ProfileBadgesTab],
        ['ProfileLibraryTab', ProfileLibraryTab],
        ['ProfileOverviewTab', ProfileOverviewTab],
        ['ProfileSettingsTab', ProfileSettingsTab],
        ['ProfileStatsTab', ProfileStatsTab],
    ];
    for (const [name, component] of profileTabs) {
        assert.ok(typeof component === 'function', `${name} must be a valid component function`);
    }

    const readerComponents = [
        ['EndChapterCard', EndChapterCard],
        ['ReaderBugModal', ReaderBugModal],
        ['ReaderHud', ReaderHud],
        ['ReaderNovelView', ReaderNovelView],
        ['ReaderPageImage', ReaderPageImage],
        ['ReaderSupportCard', ReaderSupportCard],
    ];
    for (const [name, component] of readerComponents) {
        assert.ok(typeof component === 'function', `${name} must be a valid component function`);
    }
});

test('Smoke Test: 2. Database Wrapper & Migrations', async () => {
    const rawClient = createClient({ url: 'file::memory:' });
    try {
        const db = wrapClient(rawClient);
        await runMigrations(db);

        const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.map(t => t.name);
        assert.ok(tableNames.includes('series'), 'Table "series" must exist');
        assert.ok(tableNames.includes('chapters'), 'Table "chapters" must exist');
        assert.ok(tableNames.includes('users'), 'Table "users" must exist');
        assert.ok(tableNames.includes('app_settings'), 'Table "app_settings" must exist');
        assert.ok(tableNames.includes('comments'), 'Table "comments" must exist');
        assert.ok(tableNames.includes('admin_logs'), 'Table "admin_logs" must exist');
    } finally {
        rawClient.close();
    }
});

test('Smoke Test: 3. Slug Generation', () => {
    assert.equal(generateSlug('Solo Leveling: Ragnarok!'), 'solo-leveling-ragnarok');
    assert.equal(generateSlug('Omniscient Reader Viewpoint'), 'omniscient-reader-viewpoint');
});

test('Smoke Test: 4. Admin Helpers & Handlers', async () => {
    const rawClient = createClient({ url: 'file::memory:' });
    try {
        const db = wrapClient(rawClient);
        await runMigrations(db);

        // Seed mock user
        await db.prepare(
            `INSERT INTO users (id, username, email, password_hash, role, created_at)
             VALUES (1, 'admin_user', 'admin@example.com', 'hashed_pass', 'admin', datetime('now'))`
        ).run();

        // Test list users handler
        const usersRes = await handleListUsers(new URLSearchParams(), db);
        const usersData = await usersRes.json();
        assert.equal(usersData.users.length, 1);
        assert.equal(usersData.users[0].username, 'admin_user');

        // Test list series handler (empty initially)
        const seriesRes = await handleListSeries(new URLSearchParams(), db);
        const seriesData = await seriesRes.json();
        assert.equal(seriesData.series.length, 0);

        // Test reading stats handler
        const statsRes = await handleReadingStats(db);
        const statsData = await statsRes.json();
        assert.ok(Array.isArray(statsData.dailyStats));

        // Test admin overview handler
        const overviewRes = await handleAdminOverview(db);
        const overviewData = await overviewRes.json();
        assert.equal(overviewData.totalUsers, 1);
        assert.equal(overviewData.totalSeries, 0);

        // Test admin helpers
        assert.equal(formatBytes(500), '500 B');
        assert.equal(formatBytes(2048), '2.0 KB');
        assert.equal(formatBytes(1048576 * 5), '5.0 MB');

        // Test unique slug generation
        const slug1 = await makeUniqueSlug(db, 'Magic Emperor');
        assert.equal(slug1, 'magic-emperor');
        await db.prepare("INSERT INTO series (title, slug) VALUES ('Magic Emperor', 'magic-emperor')").run();
        const slug2 = await makeUniqueSlug(db, 'Magic Emperor');
        assert.equal(slug2, 'magic-emperor-1');
    } finally {
        rawClient.close();
    }
});

test('Smoke Test: 5. Site Settings & Unified Cache', () => {
    // Cache operations
    setSettingsCache({ site_title: 'Asteria Scans Unified' });
    const cached = getSettingsCache();
    assert.equal(cached.cache.site_title, 'Asteria Scans Unified');

    invalidateSettingsCache();
    const afterInvalidate = getSettingsCache();
    assert.equal(afterInvalidate.cache, null);
});

test('Smoke Test: 6. Auth, Token & Gamification', () => {
    process.env.JWT_SECRET = 'supersecretlongenoughjwtkeyforproduction123456';
    const hashed = hashPassword('MySecurePass123!');
    assert.ok(verifyPassword('MySecurePass123!', hashed), 'Password must match');
    assert.ok(!verifyPassword('WrongPass', hashed), 'Wrong password must fail');

    const token = generateToken({ id: 42, role: 'admin', username: 'admin' });
    const decoded = verifyToken(token);
    assert.equal(decoded.id, 42);
    assert.equal(decoded.role, 'admin');

    const rank = getCultivationData(250);
    assert.ok(rank.title, 'Rank title must exist');
    assert.ok(typeof rank.progressPercent === 'number', 'Progress percent must be number');
});

test('Smoke Test: 7. Comments Markdown & Image Whitelist', () => {
    assert.ok(isAllowedImageUrl('https://i.ibb.co/xyz/image.jpg'));
    assert.ok(isAllowedImageUrl('https://media.giphy.com/media/abc/giphy.gif'));
    assert.ok(!isAllowedImageUrl('https://evil-hacker.com/malicious.png'));

    const rendered = renderMarkdown('**Bold** and *Italic* text with ||Spoiler||');
    assert.ok(rendered !== null);
});

test('Smoke Test: 8. Scraper Detection & Normalization', () => {
    assert.equal(detectSiteType('https://mangadex.org/title/123/solo-leveling'), 'mangadex');
    assert.equal(detectSiteType('https://comick.io/comic/solo-leveling'), 'comick');
    assert.equal(detectSiteType('https://asuracomic.net/series/solo-123'), 'asurascans');
    assert.equal(detectSiteType('https://demonicscans.org/manga/test'), 'demonicscans');
    assert.equal(detectSiteType('https://comix.to/comic/test'), 'comixto');
    assert.equal(detectSiteType('https://manganato.com/manga-ab123'), 'manganato');
    assert.equal(detectSiteType('https://unknownmanga.com/manga-ab123'), 'generic');

    const normalized = normalizeScrapedResult({
        title: 'Test Title',
        chapters: [{ chapter_number: '1.5', title: 'Chapter 1.5' }]
    }, 'https://unknownmanga.com');
    assert.equal(normalized.chapters[0].chapter_number, 1.5);
    assert.equal(normalized.chapters[0].title, 'Chapter 1.5');
});
