const https = require('https');
const fs = require('fs');

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
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        console.error("API Error:", parsed.error);
                    }
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
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
    
    console.log("Total tests fetched:", allDocs.length);
    for (const d of allDocs) {
        const docId = d.name.split('/').pop();
        const str = JSON.stringify(d);
        if (str.toLowerCase().includes("fishing") || str.toLowerCase().includes("bycatch")) {
            console.log(`\n>>> FOUND MATCHING TEST IN ALL! ID: ${docId}`);
            const fields = {};
            for (const k in d.fields) {
                fields[k] = unpack(d.fields[k]);
            }
            fs.writeFileSync("matched_test_prod.json", JSON.stringify(fields, null, 2));
            return;
        }
    }
    console.log("No match found anywhere.");
}
run().catch(console.error);
