import fs from 'fs';

// Read config store for Firebase CLI tokens
const configPath = '/Users/bekstar11gmail.com/.config/configstore/firebase-tools.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;
const projectId = 'ielts-portal-v1';

async function run() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      limit: 100
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryBody)
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status} ${await response.text()}`);
    }

    const results = await response.json();
    console.log('All Users:');
    results.forEach(res => {
      if (res.document) {
        const doc = res.document;
        const email = doc.fields.email?.stringValue || 'N/A';
        const role = doc.fields.role?.stringValue || 'N/A';
        const name = doc.fields.fullName?.stringValue || 'N/A';
        console.log(`- Name: ${name}, Email: ${email}, Role: ${role}`);
      }
    });
  } catch (error) {
    console.error('Error running script:', error);
  }
}

run();
