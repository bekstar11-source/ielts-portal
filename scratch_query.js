import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit } from "firebase/firestore";

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

async function main() {
  console.log("Fetching collections...");
  const colsSnap = await getDocs(collection(db, "test_collections"));
  console.log("Collections types and names:");
  colsSnap.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id}, Name: "${data.name}", Type: "${data.type}"`);
  });

  console.log("\nFetching some tests metadata...");
  const testsSnap = await getDocs(collection(db, "tests_metadata"));
  console.log("Tests types and titles:");
  testsSnap.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id}, Title: "${data.title}", Type: "${data.type}", CollectionId: "${data.collectionId}"`);
  });
  
  process.exit(0);
}

main().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});
