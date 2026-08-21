/**
 * Bir martalik migratsiya: `articles` hujjatlariga aniq `isMemberOnly` qiymatini
 * yozadi.
 *
 * ─── NEGA KERAK ────────────────────────────────────────────────────────────
 *
 * Maqolalar endi mehmonga ham ochiq (`firestore.rules` → `allow read: if
 * isAuth() || resource.data.isMemberOnly == false`). Mehmon ro'yxati esa
 * `where('isMemberOnly','==',false)` so'rovi bilan olinadi.
 *
 * Firestore'da MAVJUD BO'LMAGAN maydon `== false` shartiga TUSHMAYDI. Ya'ni bu
 * skript ishlatilmasa, eski maqolalarning hammasi mehmon uchun ko'rinmas bo'lib
 * qoladi — sahifa bo'sh chiqadi, hech qanday xatosiz. Aynan shuning uchun bu
 * migratsiya majburiy.
 *
 * Maydoni yo'q maqola OCHIQ deb hisoblanadi: hozirgi kodda paywall faqat
 * `isMemberOnly === true` bo'lganda yoqiladi, ya'ni bu qiymat mavjud xatti-
 * harakatni o'zgartirmaydi — shunchaki uni ma'lumotda aniq qilib yozadi.
 *
 * Ishlatish:
 *   export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)
 *   node backfill_article_visibility.cjs           # faqat ko'rsatadi
 *   node backfill_article_visibility.cjs --apply   # yozadi
 */

const https = require('https');

const PROJECT = 'ielts-portal-v1';
const COLLECTION = 'articles';
const APPLY = process.argv.includes('--apply');

const accessToken = process.env.GCLOUD_ACCESS_TOKEN;
if (!accessToken) {
    console.error("GCLOUD_ACCESS_TOKEN o'rnatilmagan.");
    console.error('Ishlatish: export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)');
    process.exit(1);
}

function request(url, { method = 'GET', body = null } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request(url, {
            method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            },
        }, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`));
                    else resolve(parsed);
                } catch (err) { reject(err); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Kolleksiyani sahifalab to'liq o'qiydi (maqolalar 300 tadan oshishi mumkin). */
async function fetchAll() {
    const all = [];
    let pageToken = null;
    do {
        const url = `${base}/${COLLECTION}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const res = await request(url);
        all.push(...(res.documents || []));
        pageToken = res.nextPageToken || null;
    } while (pageToken);
    return all;
}

async function run() {
    const docs = await fetchAll();

    if (docs.length === 0) {
        console.log(`${COLLECTION} bo'sh — qiladigan ish yo'q.`);
        return;
    }

    // `booleanValue` mavjud bo'lsa maydon allaqachon aniq yozilgan.
    const missing = docs.filter((d) => {
        const field = (d.fields || {}).isMemberOnly;
        return !field || typeof field.booleanValue !== 'boolean';
    });

    console.log(`Jami: ${docs.length} ta maqola, isMemberOnly aniq emas: ${missing.length} ta.`);
    if (missing.length === 0) {
        console.log('Hamma maqolada maydon bor — mehmon so\'rovi to\'liq ishlaydi.');
        return;
    }

    for (const d of missing) {
        const id = d.name.split('/').pop();
        const title = d.fields?.title?.stringValue || '(sarlavhasiz)';

        if (!APPLY) {
            console.log(`  [dry-run] ${id} — "${title}" → isMemberOnly = false`);
            continue;
        }

        await request(
            `${base}/${COLLECTION}/${id}?updateMask.fieldPaths=isMemberOnly`,
            { method: 'PATCH', body: { fields: { isMemberOnly: { booleanValue: false } } } },
        );
        console.log(`  ✓ ${id} — "${title}"`);
    }

    if (!APPLY) {
        console.log('\nYozish uchun: node backfill_article_visibility.cjs --apply');
    } else {
        console.log(`\n${missing.length} ta maqola ommaviy ro'yxatga qo'shildi.`);
    }
}

run().catch((err) => {
    console.error('Xatolik:', err.message);
    process.exit(1);
});
