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
    console.log("Fetching collections...");
    let colUrl = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/test_collections?pageSize=100";
    const colRes = await request(colUrl);
    if (!colRes.documents) {
        console.log("No test collections found or error:", colRes);
        return;
    }
    
    console.log("TEST COLLECTIONS:");
    colRes.documents.forEach((d) => {
        const fields = d.fields || {};
        const name = fields.name ? fields.name.stringValue : 'NO NAME';
        const type = fields.type ? fields.type.stringValue : 'NO TYPE';
        const docId = d.name.split('/').pop();
        console.log(`- ID: ${docId}, Name: "${name}", Type: "${type}"`);
    });

    console.log("\nFetching some tests metadata...");
    let testUrl = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests_metadata?pageSize=20";
    const testRes = await request(testUrl);
    if (!testRes.documents) {
        console.log("No tests metadata found or error:", testRes);
        return;
    }
    console.log("TESTS METADATA TYPES AND TITLES:");
    testRes.documents.forEach((d) => {
        const fields = d.fields || {};
        const title = fields.title ? fields.title.stringValue : 'NO TITLE';
        const type = fields.type ? fields.type.stringValue : 'NO TYPE';
        const collectionId = fields.collectionId ? fields.collectionId.stringValue : 'NO COLLECTION ID';
        const docId = d.name.split('/').pop();
        console.log(`- ID: ${docId}, Title: "${title}", Type: "${type}", CollectionId: "${collectionId}"`);
    });
}
run().catch(console.error);
