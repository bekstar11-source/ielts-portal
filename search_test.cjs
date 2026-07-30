const fs = require('fs');
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
    let url = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests?pageSize=300";
    let allDocs = [];
    while (url) {
        console.log("Fetching url...", url.substring(0, 100));
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
    console.log("Total docs:", allDocs.length);
    
    // Find doc where fields contains "ielts_listening_practice_test_50" or title matches
    const found = allDocs.filter(d => {
        const str = JSON.stringify(d);
        return str.includes("ielts_listening_practice_test_50") || str.toLowerCase().includes("practice test 50");
    });
    
    console.log("Found matches:", found.length);
    found.forEach(f => {
        console.log("MATCH NAME:", f.name);
        // Print titles and ids if exist
        console.log("Fields testId:", f.fields.testId || f.fields.id || f.fields.title);
    });
    
    if (found.length > 0) {
        fs.writeFileSync("found_test.json", JSON.stringify(found[0], null, 2));
        console.log("Wrote first match to found_test.json");
    }
}
run().catch(console.error);
