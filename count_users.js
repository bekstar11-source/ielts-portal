import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./src/firebase/firebaseConfig.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function count() {
  const coll = collection(db, 'users');
  const snapshot = await getCountFromServer(coll);
  console.log('Total users:', snapshot.data().count);
  process.exit(0);
}
count();
