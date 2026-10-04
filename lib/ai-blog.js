import { getDb, generateSlug } from '@/lib/db';
import { realEnv, isPlaceholder } from '@/lib/envGuard';

// Gemini çağrısı sırasında oluşan hataları, ÇAĞIRAN ROUTE'UN kullanıcıya
// gösterebileceği açık bir Türkçe mesajla taşımak için özel hata sınıfı.
// Eskiden bu fonksiyonlar hata durumunda sessizce `null` dönüyordu ve tüm
// route'lar tek bir jenerik "GEMINI_API_KEY tanımlı mı kontrol edin" mesajı
// gösteriyordu — bu da anahtar zaten doğru eklenmişken bile aynı mesajı
// görüp kafa karıştırıyordu. Artık gerçek sebep (anahtar eksik/geçersiz,
// Gemini hata kodu, içerik filtresi, JSON parse hatası...) kullanıcıya kadar
// ulaşıyor.
export class AiBlogError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AiBlogError';
    }
}

// Etiket (tag) slug'ı — Türkçe karakterleri de normalleştirir
function tagSlug(name) {
    return name
        .toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
}

// Etiketleri DB'ye upsert et, blog_tag_map'e ekle
async function saveTags(db, blogId, tags) {
    if (!Array.isArray(tags) || tags.length === 0) return;
    for (const name of tags.slice(0, 8)) { // max 8 etiket
        const slug = tagSlug(name);
        if (!slug) continue;
        try {
            // Etiket yoksa ekle
            await db.prepare(
                'INSERT OR IGNORE INTO blog_tags (name, slug) VALUES (?, ?)'
            ).run(name.trim(), slug);
            const tag = await db.prepare('SELECT id FROM blog_tags WHERE slug = ?').get(slug);
            if (!tag) continue;
            // Eşleme ekle (zaten varsa yoksay)
            await db.prepare(
                'INSERT OR IGNORE INTO blog_tag_map (blog_id, tag_id) VALUES (?, ?)'
            ).run(blogId, tag.id);
        } catch { /* yoksay */ }
    }
}

// ─────────────────────────────────────────────────────────────────────────
// AI Blog Üretici
// Üç tür blog üretebilir:
//   1) generateBlogForSeries   — bir seri için tanıtım yazısı
//   2) generateBlogForChapter  — belirli bir bölüm için recap/duyuru yazısı
//   3) generateGeneralTopicBlog — sitedeki hiçbir seriye bağlı olmayan,
//      genel manga/manhwa/webtoon dünyası hakkında yazı (SEO'da geniş
//      anahtar kelimeleri yakalamak için — "en iyi isekai mangalar",
//      "manga nasıl okunur" gibi aramalar sadece kendi serilerimizi
//      tanıtan yazılarla yakalanamıyordu).
//
// Ortam değişkeni gerekli: GEMINI_API_KEY (https://aistudio.google.com/apikey)
// Opsiyonel: AI_BLOG_MODEL (varsayılan: gemini-3.6-flash)
// ─────────────────────────────────────────────────────────────────────────

const AI_MODEL = (process.env.AI_BLOG_MODEL || '').trim() || 'gemini-3.6-flash';
// Model adı yanlış/kaldırılmışsa (404) sırayla bu yedeklere düşülür.
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
// API route'larındaki maxDuration (60sn) değerinden bilerek daha kısa.
const GEMINI_TIMEOUT_MS = 50_000;
const TYPE_LABELS = { manga: 'manga', manhwa: 'manhwa', manhua: 'manhua', novel: 'roman (webnovel)' };

function safeParseGenres(genresJson) {
    try {
        const arr = JSON.parse(genresJson || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

// ── Doğallık / çeşitlilik katmanı ──────────────────────────────────────
// Amaç: Google'ın "faydalı içerik" kriterlerini gerçekten karşılayan,
// tek düze/kalıp AI yazısı gibi durmayan metin üretmek. Bunu "AI tespitini
// atlatmaya" çalışarak değil, gerçekten daha iyi/çeşitli/özgün içerik
// üreterek yapıyoruz — kalıcı SEO faydası da zaten budur, sahte sinyal değil.

// Her üretimde rastgele bir "yazar kişiliği" seçiliyor ki tüm yazılar aynı
// kalıptan çıkmasın (aynı açılış cümlesi, aynı paragraf sırası, vs.)
const AUTHOR_PERSONAS = [
    'Yıllardır her hafta onlarca bölüm takip eden, favori tür konusunda net görüşleri olan deneyimli bir okuyucu gibi yaz. Ara sıra kişisel bir gözlem veya karşılaştırma kat.',
    'Yeni başlayanlara rehberlik eden, sıcak ve samimi bir tonda ama gösterişten kaçınan bir editör gibi yaz. Abartılı sıfatlar kullanma, somut ol.',
    'Türü iyi bilen ama eleştirel bakabilen bir yazar gibi yaz — sadece övmek yerine, neyin işe yaradığını/yaramayabileceğini de belirt.',
    'Meraklı ve sohbet havasında, okuyucuya doğrudan sesleniyormuş gibi (ama aşırıya kaçmadan) yaz. Retorik soru kullanabilirsin ama her paragrafta değil.',
    'Kısa, öz cümlelerle, gereksiz dolgu olmadan, bilgi yoğunluğu yüksek bir tarzda yaz. Uzun betimlemelerden kaçın.',
];

// Sık tekrarlanan, "yapay/şablon" hissi veren kalıp ifadeler — bunlardan
// kaçınmak metni hem daha okunur hem daha az "AI kokulu" yapar.
const BANNED_PHRASES = [
    'Günümüzde', 'günümüz dünyasında', 'Sonuç olarak', 'Kısacası', 'Özetle',
    'hayal gücünüzü zorlayacak', 'nefesinizi kesecek', 'sizi kendine hayran bırakacak',
    'benzersiz bir deneyim', 'unutulmaz bir yolculuk', 'kalbinizi ısıtacak',
    'İşte tam burada', 'Peki ya', 'Bu yazıda', 'Gelin birlikte',
];

function pickPersona() {
    return AUTHOR_PERSONAS[Math.floor(Math.random() * AUTHOR_PERSONAS.length)];
}

function styleRules(persona) {
    return `Yazar tarzı: ${persona}

Kaçınılması gereken kalıp ifadeler (bunları ve benzerlerini KULLANMA): ${BANNED_PHRASES.join(', ')}.

Genel kurallar:
- Türkçe yaz, akıcı ve doğal bir dil kullan — ansiklopedi girdisi gibi kuru ya da reklam metni gibi abartılı olmasın.
- Cümle uzunluklarını çeşitlendir: bazı cümleler kısa ve vurgulu, bazıları daha açıklayıcı olsun. Art arda aynı kalıpta ("X harika. Y muhteşem. Z etkileyici.") cümleler kurma.
- Her yazı farklı bir yapıda olsun — illa "Giriş / Konu / Sonuç" şablonuna sıkışma, bazen doğrudan konuya gir, bazen bir gözlemle başla.
- Somut ve spesifik ol; genel geçer, her seri/konu için de söylenebilecek boş cümlelerden kaçın.
- İçerik HTML formatında olsun: <p>, <h2>, <ul><li> gibi temel etiketler kullanabilirsin. <script>, <style> veya class/id attribute'u KULLANMA.
- Sadece aşağıdaki JSON formatında, başka hiçbir açıklama/markdown kod bloğu olmadan cevap ver.`;
}

// Aynı slug'ın çakışmasını önlemek için "-2", "-3" ekleyerek benzersizleştirir
async function uniqueBlogSlug(db, baseSlug) {
    let slug = baseSlug || 'blog';
    let counter = 2;
    while (await db.prepare('SELECT id FROM blogs WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    return slug;
}

// Kesilmiş JSON'u kapatır: açık string'i ve açık { [ işaretlerini DOĞRU sırayla
// (ters sırada) tamamlar. Eski sürüm dizileri de '}' ile kapattığı için düzeltilemiyordu.
function repairTruncatedJson(text) {
    const stack = [];
    let inString = false;
    let escaped = false;
    for (const ch of text) {
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === '{') stack.push('}');
        else if (ch === '[') stack.push(']');
        else if (ch === '}' || ch === ']') stack.pop();
    }
    let out = text;
    if (inString) out += '"';
    // Sondaki yarım bırakılmış virgül/iki nokta JSON'u bozar
    out = out.replace(/[,:]\s*$/, '');
    while (stack.length) out += stack.pop();
    return out;
}

// generateSlug() \w kullandığı için Türkçe harfleri (ş, ğ, ı, ö, ü, ç) siliyordu:
// "Şimdi Türkçe Oku" → "imdi-trke-oku". Blog URL'leri için önce harfleri çeviriyoruz.
function blogSlugFrom(title) {
    return generateSlug(
        String(title || '')
            .replace(/İ/g, 'i').replace(/I/g, 'i')
            .toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    );
}

// Gemini anahtarını bulur. Sıra: ortam değişkenleri (yaygın isimler dahil) →
// admin panelinden girilen `gemini_api_key` ayarı (app_settings). .env.example'daki
// örnek (BURAYA_...) değerler "tanımlı" sayılmaz.
const GEMINI_ENV_NAMES = [
    'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_KEY',
    'GOOGLE_AI_API_KEY', 'GOOGLE_AI_STUDIO_API_KEY', 'AI_STUDIO_API_KEY', 'AISTUDIO_API_KEY',
    'GENAI_API_KEY', 'GOOGLE_GENAI_API_KEY', 'GEMINI_API_TOKEN',
];

// Vercel/.env'e yapıştırırken sık olan hatalar: tırnak içine alma ("AIza..."),
// başa/sona boşluk veya satır sonu, "KEY=AIza..." şeklinde kopyalama.
function cleanKey(raw) {
    let v = String(raw ?? '').trim();
    v = v.replace(/^[A-Z_]+\s*=\s*/, '');            // "GEMINI_API_KEY=AIza..." → "AIza..."
    v = v.replace(/^["'`\u201C\u2018]+|["'`\u201D\u2019]+$/g, ''); // çevreleyen tırnaklar
    return v.replace(/\s+/g, '').trim();
}

// Ayarlı olup olmadığını TEŞHİS etmek için: hangi isimler dolu (değerleri ASLA döndürülmez).
export function geminiEnvDiagnostics() {
    const names = Object.keys(process.env).filter(n => /GEMINI|GOOGLE|GENAI|AI_?STUDIO/i.test(n));
    return names.map(n => ({ name: n, filled: Boolean(cleanKey(process.env[n])) }));
}

export async function resolveGeminiKey() {
    // 1) Bilinen isimler
    for (const name of GEMINI_ENV_NAMES) {
        const v = cleanKey(realEnv(name));
        if (v) return { key: v, source: `env:${name}` };
    }
    // 2) Farklı isimle eklenmiş olabilir: adı GEMINI/GOOGLE/GENAI/AISTUDIO içeren ve
    //    değeri Google API anahtarı biçiminde (AIza...) olan ilk değişken
    for (const name of Object.keys(process.env)) {
        if (!/GEMINI|GOOGLE|GENAI|AI_?STUDIO/i.test(name)) continue;
        const v = cleanKey(realEnv(name));
        if (/^AIza[\w-]{20,}$/.test(v)) return { key: v, source: `env:${name}` };
    }
    // 3) Admin panelinden girilen anahtar
    try {
        const db = await getDb();
        const row = await db.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'gemini_api_key'").get();
        const v = cleanKey(typeof row?.setting_value === 'string' ? row.setting_value : '');
        if (v && !isPlaceholder(v)) return { key: v, source: 'database' };
    } catch (e) {
        console.error('AI Blog: app_settings okunamadı:', e?.message);
    }
    return { key: '', source: null };
}

async function callGemini(systemInstruction, userPrompt) {
    const { key: apiKey } = await resolveGeminiKey();
    if (!apiKey) {
        console.error('AI Blog: Gemini API anahtarı bulunamadı (env veya admin ayarı).');
        const diag = geminiEnvDiagnostics();
        const seen = diag.length ? diag.map(d => `${d.name}${d.filled ? '' : ' (boş)'}`).join(', ') : 'GEMINI/GOOGLE ile ilgili hiç değişken yok';
        throw new AiBlogError(`Sunucu Gemini anahtarını göremiyor. Bulunan değişkenler: ${seen}. Çözüm: Blog Yönetimi'ndeki "Gemini API Anahtarı" kutusuna anahtarı yapıştırıp Kaydet'e basın (hemen çalışır, redeploy gerekmez). Vercel'e eklediyseniz değişkenin Production'da seçili olduğundan emin olup Redeploy yapın.`);
    }

    // Vercel fonksiyonu maxDuration (60sn) dolmadan KENDİMİZ vazgeçelim: platform
    // zaman aşımı HTML/boş 504 döndürüp panelde anlamsız "Blog üretilemedi"
    // görünmesine yol açıyordu. Böylece net bir Türkçe hata mesajı alıyoruz.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let response;
    let usedModel = AI_MODEL;
    try {
        const candidates = [AI_MODEL, ...FALLBACK_MODELS.filter(m => m !== AI_MODEL)];
        for (const model of candidates) {
            usedModel = model;
            response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 1.0,
                        topP: 0.95,
                        // Gemini 3.x "düşünme" modelleri: düşünme token'ları da bu limite
                        // sayılır. 8192 çoğu zaman JSON'u ortada kesiyordu → "geçerli JSON
                        // değildi" hatası. Limit yükseltildi + çıktı doğrudan JSON olsun.
                        maxOutputTokens: 16384,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );
            if (response.status !== 404) break;
            console.warn(`AI Blog: model bulunamadı (${model}), yedek model deneniyor.`);
        }
    } catch (networkError) {
        clearTimeout(timeoutId);
        if (networkError?.name === 'AbortError') {
            console.error('AI Blog: Gemini yanıtı', GEMINI_TIMEOUT_MS, 'ms içinde gelmedi');
            throw new AiBlogError(`Gemini ${Math.round(GEMINI_TIMEOUT_MS / 1000)} saniye içinde yanıt vermedi. Tekrar deneyin; sürekli oluyorsa AI_BLOG_MODEL olarak daha hızlı bir model (ör. gemini-3.5-flash-lite) seçin.`);
        }
        console.error('AI Blog: Gemini API\'ye ulaşılamadı', networkError.message);
        throw new AiBlogError(`Gemini API'ye ulaşılamadı: ${networkError.message}`);
    }

    if (!response.ok) {
        clearTimeout(timeoutId);
        const errText = await response.text().catch(() => '');
        console.error('AI Blog: Gemini API hatası', response.status, errText.slice(0, 300));
        // Sık görülen durumlar için anlaşılır mesajlar — jenerik "anahtar eksik"
        // mesajının gerçek sebebi gizlemesini önlemek için.
        if (response.status === 400 && /API key not valid/i.test(errText)) {
            throw new AiBlogError('Gemini API anahtarı geçersiz. GEMINI_API_KEY değerini https://aistudio.google.com/apikey üzerinden kontrol edin (boşluk/kesik kopyalama olmasın).');
        }
        if (response.status === 403) {
            throw new AiBlogError(`Gemini API erişimi reddedildi (403). Anahtar bu projede Generative Language API için etkin olmayabilir. Detay: ${errText.slice(0, 200)}`);
        }
        if (response.status === 404) {
            throw new AiBlogError(`Gemini modeli bulunamadı (404): "${usedModel}". AI_BLOG_MODEL ortam değişkenini kontrol edin veya kaldırıp varsayılanı kullanın.`);
        }
        if (response.status === 429) {
            throw new AiBlogError('Gemini API istek limitine takıldı (429). Free tier dakikalık/günlük limitine ulaşılmış olabilir — biraz bekleyip tekrar deneyin.');
        }
        throw new AiBlogError(`Gemini API hatası (HTTP ${response.status}): ${errText.slice(0, 200) || 'detay yok'}`);
    }

    let data;
    try {
        data = await response.json();
    } catch (e) {
        throw new AiBlogError(e?.name === 'AbortError'
            ? `Gemini ${Math.round(GEMINI_TIMEOUT_MS / 1000)} saniye içinde yanıtı tamamlayamadı. Tekrar deneyin.`
            : 'Gemini yanıtı okunamadı. Tekrar deneyin.');
    } finally {
        clearTimeout(timeoutId);
    }
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason && !['STOP', 'MAX_TOKENS'].includes(finishReason)) {
        // SAFETY = içerik güvenlik filtresi, RECITATION = telif hakkı ihlali,
        // OTHER = model iç hatası.
        console.error('AI Blog: Gemini içerik üretmedi. finishReason:', finishReason, '| Tam yanıt:', JSON.stringify(data?.candidates?.[0]).slice(0, 400));
        throw new AiBlogError(`Gemini içerik üretmedi (finishReason: ${finishReason}). Muhtemelen içerik güvenlik filtresine takıldı — farklı bir seri/konu ile tekrar deneyin.`);
    }
    const rawText = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();

    const cleaned = rawText.replace(/^```json\s*|^```\s*|```$/gm, '').trim();

    // Önce direkt parse dene
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        // Gemini bazen maxOutputTokens'a takılıp JSON'u ortada kesiyor.
        // Kesik JSON'u kurtarmaya çalış: eksik kapanışları tamamla.
        const fixed = repairTruncatedJson(cleaned);
        try {
            parsed = JSON.parse(fixed);
            console.warn('AI Blog: Kesik JSON kurtarıldı (token limit aşıldı olabilir).');
        } catch (e2) {
            console.error('AI Blog: JSON parse edilemedi:', e2.message, rawText.slice(0, 400));
            throw new AiBlogError('Gemini yanıtı geçerli JSON değildi (muhtemelen token limitine takıldı). Tekrar deneyin.');
        }
    }

    if (!parsed.title || !parsed.content) {
        console.error('AI Blog: eksik alanlar döndü', Object.keys(parsed));
        throw new AiBlogError('Gemini yanıtında title/content alanları eksik geldi. Tekrar deneyin.');
    }
    return parsed;
}

async function saveBlog(db, { parsed, series_id = null, chapter_id = null, cover_url = null, fallbackSlugSeed, tags = [] }) {
    const baseSlug = blogSlugFrom(parsed.title) || blogSlugFrom(fallbackSlugSeed) || `blog-${Date.now()}`;
    const slug = await uniqueBlogSlug(db, baseSlug);

    // chapter_id kolonu var mı kontrol et — migration henuz calismamiş olabilir.
    // Kolon yoksa INSERT "table has no column" hatasiyla patliyor ve blog DB'ye
    // hic kaydedilmiyor. Onlemek icin once kolon varligini dogrula, yoksa ekle.
    let hasChapterCol = false;
    try {
        const cols = await db.prepare('PRAGMA table_info(blogs)').all();
        hasChapterCol = cols.some(c => c.name === 'chapter_id');
    } catch { /* yoksay */ }

    if (!hasChapterCol) {
        try {
            await db.exec('ALTER TABLE blogs ADD COLUMN chapter_id INTEGER DEFAULT NULL');
            await db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_chapter ON blogs(chapter_id)');
            hasChapterCol = true;
        } catch { /* zaten varsa yoksay */ hasChapterCol = true; }
    }

    const result = await db.prepare(`
        INSERT INTO blogs (series_id, chapter_id, title, slug, excerpt, content, cover_url, meta_description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `).run(
        series_id,
        chapter_id,
        parsed.title,
        slug,
        parsed.excerpt || null,
        parsed.content,
        cover_url,
        parsed.meta_description || parsed.excerpt || null
    );

    const blog = await db.prepare('SELECT * FROM blogs WHERE id = ?').get(result.lastInsertRowid);
    // Gemini'nin önerdiği etiketleri + parsed.tags varsa kaydet
    const allTags = [...(tags || []), ...(parsed.tags || [])];
    if (blog && allTags.length > 0) {
        await saveTags(db, blog.id, allTags);
    }
    // Yeni yazı herkese açık /blog'da hemen görünür (status='published', sayfa force-dynamic);
    // arama motorlarına da haber ver. Başarısız olursa blog üretimini ETKİLEMEZ.
    if (blog?.slug) {
        import('@/lib/indexNow')
            .then(({ notifyIndexNow }) => notifyIndexNow(`/blog/${blog.slug}`))
            .catch(() => {});
    }
    return blog;
}

const SYSTEM_INSTRUCTION = 'Sen bir manga/webtoon sitesi için blog yazarısın. Farklı yazılarda farklı bir üslup ve yapı kullanırsın, kalıp/şablon cümlelerden kaçınırsın. Sadece istenen JSON formatında, geçerli JSON olarak cevap verirsin. Başka hiçbir metin, markdown kod bloğu veya açıklama eklemezsin.';

/**
 * Verilen seri için AI ile blog yazısı üretir ve `blogs` tablosuna ekler.
 * Hata durumunda sessizce null döner (çağıran akışı kesmemeli).
 */
export async function generateBlogForSeries(series) {
    if (!series || !series.title) return null;
    try {
        const genres = safeParseGenres(series.genres);
        const typeLabel = TYPE_LABELS[series.type] || 'seri';
        const persona = pickPersona();

        const userPrompt = `Aşağıdaki bilgilere sahip bir ${typeLabel} için, bir manga/webtoon sitesinin "Bloglar" bölümünde yayınlanacak SEO odaklı, ilgi çekici bir tanıtım yazısı hazırla.

Seri adı: ${series.title}
Tür(ler): ${genres.length ? genres.join(', ') : 'belirtilmemiş'}
Format: ${typeLabel}
Durum: ${series.status === 'completed' ? 'Tamamlandı' : 'Devam ediyor'}
${series.author ? `Yazar: ${series.author}` : ''}
${series.artist ? `Çizer: ${series.artist}` : ''}
${series.description ? `Site açıklaması: ${series.description}` : ''}

${styleRules(persona)}
Ek kural: Spoiler verme; sadece verilen bilgilerden yola çıkarak merak uyandırıcı bir tanıtım yaz. Yeni olay örgüsü, karakter adı veya detay UYDURMA — sadece verilenlerle çalış.
Uzunluk: 200-350 kelime arası. SEO için başlıkta ve ilk paragrafta seri adı geçsin. İçeriği kısa ve öz tut — JSON token limitini aşmamak kritik.

{"title": "...", "excerpt": "...(140-160 karakter)...", "content": "...(HTML içerik)...", "meta_description": "...(150-160 karakter)...", "tags": ["etiket1", "etiket2", "..."]}

tags alanı: 4-8 adet, Türkçe, küçük harf, kısa etiket. Örnek: ["manhwa oku", "fantezi manhwa", "türkçe webtoon", "aksiyon"]. Seri adını, türünü ve genel arama terimlerini kapsa.`;

        const parsed = await callGemini(SYSTEM_INSTRUCTION, userPrompt);

        const db = await getDb();
        return await saveBlog(db, { parsed, series_id: series.id, cover_url: series.cover_url || null, fallbackSlugSeed: series.title });
    } catch (error) {
        // AiBlogError zaten kullanıcıya gösterilebilir bir mesaj taşıyor —
        // olduğu gibi yukarı fırlat ki çağıran route gerçek sebebi göstersin.
        console.error('AI Blog (seri): hata:', error.message);
        if (error instanceof AiBlogError) throw error;
        throw new AiBlogError(`Beklenmeyen hata: ${error.message}`);
    }
}

/**
 * Belirli bir bölüm için recap/duyuru tarzı blog yazısı üretir.
 * @param {object} series - series tablosundan satır
 * @param {object} chapter - chapters tablosundan satır (id, chapter_number, title)
 */
export async function generateBlogForChapter(series, chapter) {
    if (!series || !chapter) return null;
    try {
        const genres = safeParseGenres(series.genres);
        const typeLabel = TYPE_LABELS[series.type] || 'seri';
        const persona = pickPersona();

        const userPrompt = `"${series.title}" adlı ${typeLabel} serisinin ${chapter.chapter_number}. bölümü${chapter.title ? ` ("${chapter.title}")` : ''} için, okuyucuları bölümü okumaya teşvik eden bir "yeni bölüm" duyuru/tartışma yazısı hazırla.

Seri: ${series.title}
Bölüm: ${chapter.chapter_number}${chapter.title ? ` — ${chapter.title}` : ''}
Tür(ler): ${genres.length ? genres.join(', ') : 'belirtilmemiş'}

${styleRules(persona)}
Ek kural: Bölümün İÇERİĞİNİ (olay örgüsünü) bilmiyorsun, bu yüzden asla sahte bir özet/spoiler UYDURMA. Bunun yerine: serinin genel havasından, bu noktaya kadarki merak unsurlarından bahset, okuyucuyu "yeni bölüm yayında, kaçırma" tarzında merakla bölümü okumaya yönlendir. Bölüm numarasını başlıkta belirt.
Uzunluk: 100-200 kelime. Kısa ve öz tut.

{"title": "...", "excerpt": "...(140-160 karakter)...", "content": "...(HTML içerik)...", "meta_description": "...(150-160 karakter)...", "tags": ["etiket1", ...]}

tags: 3-6 etiket, Türkçe, kısa.`;

        const parsed = await callGemini(SYSTEM_INSTRUCTION, userPrompt);

        const db = await getDb();
        return await saveBlog(db, {
            parsed,
            series_id: series.id,
            chapter_id: chapter.id,
            cover_url: series.cover_url || null,
            fallbackSlugSeed: `${series.title}-bolum-${chapter.chapter_number}`,
        });
    } catch (error) {
        console.error('AI Blog (bölüm): hata:', error.message);
        if (error instanceof AiBlogError) throw error;
        throw new AiBlogError(`Beklenmeyen hata: ${error.message}`);
    }
}

// Genel/rastgele manga-webtoon dünyası konuları — hiçbir seriye bağlı değil.
// Amaç: sadece "sitedeki seri sayısı kadar" değil, sitenin konu otoritesini
// (topical authority) genişletecek, geniş arama hacimli sorguları da
// yakalayabilecek içerik üretmek.
export const GENERAL_TOPICS = [
    // ── Genel bilgilendirici konular ──────────────────────────────────────────
    'Manga, manhwa ve manhua arasındaki farklar nelerdir?',
    'Yeni başlayanlar için manga okuma rehberi',
    'Isekai türü neden bu kadar popüler oldu?',
    'Webtoon formatı klasik mangadan nasıl farklılaşıyor?',
    'Shounen, seinen, shoujo ve josei türleri arasındaki farklar',
    'Manhwa okumaya nereden başlamalı?',
    'En çok merak edilen manga/manhwa türleri',
    'Renkli mi siyah-beyaz mı? Webtoon ve manga çizim stilleri',
    'Haftalık bölüm bekleme telaşı: "hiatus" ne demek, neden oluyor?',
    'Fantastik ve aksiyon türü manga/manhwalarda sık kullanılan güç sistemleri',
    'Okul temalı manga ve manhwaların bu kadar sevilmesinin sebepleri',
    'Roman uyarlaması (webnovel) manhwalar nasıl bu kadar hızlı yayılıyor?',
    'Türkçe manga/manhwa okumanın avantajları',
    'Mobil cihazdan rahat manga okuma için ipuçları',
    'Manga ve anime uyarlaması arasındaki temel farklar',
    'Karakter gelişimi güçlü manga/manhwa türleri hangileri?',
    'Dövüş sanatları temalı serilerin yükselişi',
    'Reenkarnasyon/yeniden doğuş temalı hikayelerin popülerliği',
    'Psikolojik gerilim türü manga/manhwalar neden bu kadar sürükleyici?',
    'Manhwa endüstrisinin son yıllardaki büyümesi',

    // ── Yüksek hacimli arama terimleri / landing page konuları ───────────────
    // Bu konular "manga oku", "webtoon oku" gibi direkt aramaları yakalar.
    // Rakip site isimlerini de doğal bağlamda geçirerek o aramaları hedefler.
    "Türkçe manga oku: 2026'da en iyi ücretsiz manga okuma siteleri ve alternatifleri",
    'Webtoon oku Türkçe: Asteria Scans ile ücretsiz webtoon okuma rehberi',
    'Türkçe manhwa oku: Manhwa nedir, nereden okunur?',
    'Manga okuma siteleri: Türkçe manga için en güncel adresler',
    'En iyi Türkçe manga siteleri 2026: Karşılaştırma ve öneriler',
    'Ücretsiz manga oku: Telif hakkına saygılı, güvenli platformlar',
    'Manhwa ve webtoon farkı: Hangi platformda ne okunur?',
    "Türkçe webtoon siteleri: 2026'daki en güncel liste",
    "ORV oku: Omniscient Reader's Viewpoint nereden okunur?",
    'Solo Leveling manga Türkçe: Nerede, nasıl okunur?',
    'Tower of God Türkçe okuma rehberi: Başlangıç kılavuzu',
    "Romantik manhwa önerileri: 2026'nın en çok okunan seriler",
    'Aksiyon manhwa önerileri: Güç sistemi ve dövüş sahneleriyle öne çıkan seriler',
    "Fantezi manga/manhwa önerileri: Isekai'dan epik fanteziye",
    'BL manhwa Türkçe: Boys Love türünün Türkçe kaynakları',
    'Harem manga önerileri: Türün en popüler eserleri',
    'Murim manhwa nedir? Çin ve Kore dövüş sanatları temalı seriler',
    'Reenkarnasyon manhwa önerileri: En iyi yeniden doğuş hikayeleri',
    'System manhwa nedir? Güç seviyeleri ve görev ekranlarıyla anlatılan hikayeler',
    'Manga ve manhwa okurken nereden başlamalı? Türe göre başlangıç rehberi',
];

/**
 * Genel bir manga/webtoon konusu hakkında, hiçbir seriye bağlı olmayan
 * blog yazısı üretir. topic verilmezse GENERAL_TOPICS'ten rastgele seçilir.
 */
export async function generateGeneralTopicBlog(topic) {
    const chosenTopic = topic || GENERAL_TOPICS[Math.floor(Math.random() * GENERAL_TOPICS.length)];
    try {
        const persona = pickPersona();

        const userPrompt = `Bir manga/webtoon sitesinin "Bloglar" bölümü için, şu konu hakkında SEO odaklı, bilgilendirici bir yazı hazırla:\n\nKonu: ${chosenTopic}\n\n${styleRules(persona)}\nÖnemli SEO kuralları:\n- Başlıkta ve ilk paragrafta konunun ana anahtar kelimesini geçir (örn. "manga oku", "türkçe webtoon" gibi).\n- Yazı boyunca doğal bağlamda "Asteria Scans" sitesini de 1-2 kez samimi öneri olarak belirt.\n- Gerçekten faydalı bilgi ver — direkt konuya gir, meta-cümlelerden kaçın.\n- Belirli bir seri adı veya platform UYDURMA; genel örnekler kullanabilirsin ama tarih/bölüm sayısı gibi doğrulanamayan iddialar yapma.\nUzunluk: 250-400 kelime. JSON token limitini aşmamak için kısa tut.\n\n{"title": "...", "excerpt": "...(140-160 karakter)...", "content": "...(HTML içerik)...", "meta_description": "...(150-160 karakter)...", "tags": ["etiket1", ...]}

tags: 4-8 etiket — konunun ana anahtar kelimeleri + "manga oku", "türkçe webtoon" gibi genel aramalar.`;

        const parsed = await callGemini(SYSTEM_INSTRUCTION, userPrompt);

        const db = await getDb();
        return await saveBlog(db, { parsed, fallbackSlugSeed: chosenTopic });
    } catch (error) {
        console.error('AI Blog (genel konu): hata:', error.message);
        if (error instanceof AiBlogError) throw error;
        throw new AiBlogError(`Beklenmeyen hata: ${error.message}`);
    }
}
