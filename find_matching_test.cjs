const https = require('https');
const fs = require('fs');

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
    const candidateIds = [
        "E89AHe7boOGiTXf7w08V", "Fpk6Eth6XcVmJtveUS45", "PrrnnYF6FtQFgRMFh56Y", 
        "Wa4ypiThuV8Cd1kyLD1T", "cLQsQziJn3Lbq1KT5TRQ", "eU3c6RUmG3TM7aEFwVat", 
        "ezyjmUfnmzmu4vJyriKR", "hkkfEMhbz9oTmpx7eUD1"
    ];
    
    for (const id of candidateIds) {
        console.log(`Checking ${id}...`);
        const url = `https://firestore.googleapis.com/v1/projects/ielts-portal-v1/databases/(default)/documents/tests/${id}`;
        const data = await request(url);
        if (data.fields) {
            const fields = {};
            for (const k in data.fields) {
                fields[k] = unpack(data.fields[k]);
            }
            if (fields.questions && JSON.stringify(fields.questions).includes("national news item")) {
                console.log(`\n>>> FOUND MATCHING TEST! ID: ${id}`);
                fs.writeFileSync("matched_test_prod.json", JSON.stringify(fields, null, 2));
                return;
            }
        }
    }
    console.log("No match found in candidates.");
}
run().catch(console.error);
