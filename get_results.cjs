const https = require('https');

const accessToken = process.env.GCLOUD_ACCESS_TOKEN;
if (!accessToken) {
    console.error("GCLOUD_ACCESS_TOKEN o'rnatilmagan.");
    console.error("Ishlatish: export GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)");
    process.exit(1);
}

function request(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    let url = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/results?pageSize=10";
    const res = await request(url);
    if (!res.documents) {
        console.log("No results found!");
        return;
    }
    
    console.log("LATEST RESULTS:");
    res.documents.forEach((d, idx) => {
        const fields = d.fields || {};
        const testId = fields.testId ? fields.testId.stringValue : 'NO TESTID';
        const testTitle = fields.testTitle ? fields.testTitle.stringValue : 'NO TITLE';
        const userId = fields.userId ? fields.userId.stringValue : 'NO USERID';
        const createdAt = fields.createdAt ? fields.createdAt.timestampValue : 'NO TIMESTAMP';
        console.log(`[${idx}] testId: ${testId} - Title: ${testTitle} - User: ${userId} - CreatedAt: ${createdAt}`);
    });
}
run().catch(console.error);
