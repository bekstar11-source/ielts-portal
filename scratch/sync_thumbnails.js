import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

const run = async () => {
  console.log("Fetching all documents from tests collection...");
  const testsSnap = await getDocs(collection(db, "tests"));
  console.log(`Found ${testsSnap.docs.length} tests.`);
  
  let count = 0;
  for (const d of testsSnap.docs) {
    const data = d.data();
    const thumbnail = data.thumbnail || "";
    if (thumbnail) {
      console.log(`Updating metadata for test: ${data.title} (${d.id}) with thumbnail: ${thumbnail}`);
      try {
        await updateDoc(doc(db, "tests_metadata", d.id), {
          thumbnail: thumbnail
        });
        count++;
      } catch (err) {
        console.error(`Failed to update metadata for ${d.id}:`, err.message);
      }
    }
  }
  console.log(`Successfully updated ${count} tests with thumbnails.`);
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
