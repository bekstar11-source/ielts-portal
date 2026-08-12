/**
 * Bir martalik migratsiya: `promo_spotlights` hujjatlariga eski `publishedAt`
 * yozadi, shunda ular o'quvchilarda "yangi" belgisi va eslatma chiqarmaydi.
 *
 * Kod darajasida `publishedAt` yo'q hujjat allaqachon jim hisoblanadi, ya'ni bu
 * skript majburiy emas — u faqat holatni ma'lumotda ham aniq qilib qo'yadi.
 *
 * Ishlatish:
 *   export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)
 *   node backfill_spotlight_published_at.cjs           # faqat ko'rsatadi
 *   node backfill_spotlight_published_at.cjs --apply   # yozadi
 */

const https = require('https');

const PROJECT = 'ielts-portal-v1';
const COLLECTION = 'promo_spotlights';
const OLD_STAMP = '2020-01-01T00:00:00Z';
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

async function run() {
    const res = await request(`${base}/${COLLECTION}?pageSize=300`);
    const docs = res.documents || [];

    if (docs.length === 0) {
        console.log(`${COLLECTION} bo'sh — qiladigan ish yo'q.`);
        return;
    }

    const missing = docs.filter((d) => !(d.fields || {}).publishedAt);
    console.log(`Jami: ${docs.length} ta slayd, publishedAt yo'q: ${missing.length} ta.`);

    for (const d of missing) {
        const id = d.name.split('/').pop();
        const title = d.fields?.title?.stringValue || '(sarlavhasiz)';

        if (!APPLY) {
            console.log(`  [dry-run] ${id} — "${title}" → publishedAt = ${OLD_STAMP}`);
            continue;
        }

        await request(
            `${base}/${COLLECTION}/${id}?updateMask.fieldPaths=publishedAt`,
            { method: 'PATCH', body: { fields: { publishedAt: { timestampValue: OLD_STAMP } } } },
        );
        console.log(`  ✓ ${id} — "${title}"`);
    }

    if (!APPLY && missing.length > 0) {
        console.log('\nYozish uchun: node backfill_spotlight_published_at.cjs --apply');
    }
}

run().catch((err) => {
    console.error('Xatolik:', err.message);
    process.exit(1);
});
