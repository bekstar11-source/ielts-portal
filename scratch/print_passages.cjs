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

function unpack(value) {
    if (!value) return null;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.arrayValue !== undefined) {
        return (value.arrayValue.values || []).map(unpack);
    }
    if (value.mapValue !== undefined) {
        const obj = {};
        const fields = value.mapValue.fields || {};
        for (const k in fields) {
            obj[k] = unpack(fields[k]);
        }
        return obj;
    }
    return null;
}

async function run() {
    let url = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests_metadata?pageSize=300";
    let allDocs = [];
    while (url) {
        const res = await request(url);
        if (res.documents) {
            allDocs.push(...res.documents);
        }
        if (res.nextPageToken) {
            url = `https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests_metadata?pageSize=300&pageToken=${res.nextPageToken}`;
        } else {
            url = null;
        }
    }
    
    console.log("Total tests metadata fetched:", allDocs.length);
    const readingTests = allDocs.filter(d => {
        const fields = d.fields || {};
        return fields.type && fields.type.stringValue === 'reading';
    });

    console.log("\nREADING TESTS PASSAGE METADATA:");
    readingTests.forEach(d => {
        const docId = d.name.split('/').pop();
        const fields = d.fields || {};
        const title = fields.title ? fields.title.stringValue : 'NO TITLE';
        const passagesUnpacked = fields.passages ? unpack(fields.passages) : null;
        console.log(`[${docId}] Title: ${title}`);
        console.log(`  Passages:`, JSON.stringify(passagesUnpacked, null, 2));
    });
}
run().catch(console.error);
