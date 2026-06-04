import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyBg6wOnibu37MHU-x3om1vRhxvzwhsHSzw",
  authDomain: "ielts-portal-v1.firebaseapp.com",
  projectId: "ielts-portal-v1",
  storageBucket: "ielts-portal-v1.firebasestorage.app",
  messagingSenderId: "114093038420",
  appId: "1:114093038420:web:8f437371ad18447ffa86c1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  try {
    const q = query(collection(db, 'users'), where('email', '==', 'bekstar11@gmail.com'));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log('User not found.');
    } else {
      snap.forEach(doc => {
        console.log('User UID:', doc.id);
        console.log('User Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (err) {
    console.error('Error fetching user:', err);
  }
  process.exit(0);
}

checkUser();
