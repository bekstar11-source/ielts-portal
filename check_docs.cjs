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
    console.log("Fetching tests_metadata...");
    let metaUrl = "https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests_metadata?pageSize=300";
    const metaRes = await request(metaUrl);
    if (!metaRes.documents) {
        console.log("No tests metadata found:", metaRes);
        return;
    }
    
    console.log(`Fetched ${metaRes.documents.length} metadata docs. Checking their existence in 'tests' collection...`);
    
    for (const d of metaRes.documents) {
        const id = d.name.split('/').pop();
        const testUrl = `https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests/${id}`;
        const testRes = await request(testUrl);
        if (testRes.error) {
            console.log(`- ID: ${id} ("${d.fields.title?.stringValue}") does NOT exist in 'tests' collection! Error: ${testRes.error.message}`);
        }
    }
    console.log("Done checking.");
}
run().catch(console.error);
