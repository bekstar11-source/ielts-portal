const https = require('https');

const accessToken = "***REMOVED***";

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
    let url = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/test_collections?pageSize=100";
    const res = await request(url);
    if (!res.documents) {
        console.log("No test collections found!");
        return;
    }
    
    console.log("TEST COLLECTIONS:");
    res.documents.forEach((d) => {
        const fields = d.fields || {};
        const title = fields.title ? fields.title.stringValue : 'NO TITLE';
        const docId = d.name.split('/').pop();
        console.log(`[${docId}] Title: ${title}`);
        if (fields.tests) {
            console.log("  Tests:", JSON.stringify(fields.tests));
        }
    });
}
run().catch(console.error);
