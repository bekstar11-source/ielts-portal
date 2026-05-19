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
    let url = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests?pageSize=300";
    let allDocs = [];
    while (url) {
        const res = await request(url);
        if (res.documents) {
            allDocs.push(...res.documents);
        }
        if (res.nextPageToken) {
            url = `https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests?pageSize=300&pageToken=${res.nextPageToken}`;
        } else {
            url = null;
        }
    }
    
    const titles = allDocs.map(d => {
        const fields = d.fields || {};
        const title = fields.title ? fields.title.stringValue : 'NO TITLE';
        const type = fields.type ? fields.type.stringValue : 'NO TYPE';
        const docId = d.name.split('/').pop();
        return { docId, title, type };
    });
    
    console.log("ALL TESTS:");
    titles.forEach(t => {
        console.log(`[${t.docId}] Type: ${t.type} - Title: ${t.title}`);
    });
}
run().catch(console.error);
