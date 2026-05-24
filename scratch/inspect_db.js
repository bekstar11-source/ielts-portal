import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query, where } from "firebase/firestore";

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

async function inspect() {
  console.log("Fetching reading tests...");
  const q = query(collection(db, "tests"), where("type", "==", "reading"), limit(10));
  const snap = await getDocs(q);
  console.log("Found", snap.docs.length, "docs");
  for (const doc of snap.docs) {
    const data = doc.data();
    console.log("ID:", doc.id);
    console.log("Title:", data.title);
    console.log("PassageNumber:", data.passageNumber);
    console.log("Passage_Number:", data.passage_number);
    console.log("Passages length:", data.passages?.length);
    if (data.passages) {
      console.log("Passages fields:", data.passages.map(p => ({ id: p.id, title: p.title })));
    }
    if (data.questions && data.questions.length > 0) {
      console.log("First question passageId:", data.questions[0].passageId);
    }
    console.log("---");
  }
}

inspect().catch(console.error);
