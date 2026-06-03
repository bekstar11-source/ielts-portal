const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "ielts-portal-v1"
});

const db = admin.firestore();

async function run() {
  const q = db.collection('users').limit(30);
  const snap = await q.get();
  console.log("USERS LIST:");
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}, Name: ${data.fullName}, Email: ${data.email}, Role: ${data.role}`);
  });
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
