import fs from 'fs';
import path from 'path';

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
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: 'bekstar11@gmail.com' }
        }
      },
      limit: 1
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
    if (!results || results.length === 0 || !results[0].document) {
      console.log('User bekstar11@gmail.com not found in users collection.');
      return;
    }

    const doc = results[0].document;
    const name = doc.name; // Full resource path, e.g. projects/.../databases/(default)/documents/users/UID
    console.log('Found user document:', name);
    console.log('Current fields:', JSON.stringify(doc.fields, null, 2));

    // Prepare update
    const updatedFields = {
      ...doc.fields,
      role: { stringValue: 'admin' }
    };

    // Update document role to 'admin'
    // PATCH https://firestore.googleapis.com/v1/projects/projectId/databases/(default)/documents/users/UID?updateMask.fieldPaths=role
    const documentPath = name.split('/documents/')[1];
    const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}?updateMask.fieldPaths=role`;

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          role: { stringValue: 'admin' }
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status} ${await updateResponse.text()}`);
    }

    console.log('Successfully updated role to "admin"!');
  } catch (error) {
    console.error('Error running script:', error);
  }
}

run();
