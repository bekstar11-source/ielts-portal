// src/firebase/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// DIQQAT: Quyidagi ma'lumotlarni o'zingizning Firebase Console-dan olib o'zgartiring!
const firebaseConfig = {
  apiKey: "AIzaSyBg6wOnibu37MHU-x3om1vRhxvzwhsHSzw",
  authDomain: "ielts-portal-v1.firebaseapp.com",
  projectId: "ielts-portal-v1",
  storageBucket: "ielts-portal-v1.firebasestorage.app",
  messagingSenderId: "114093038420",
  appId: "1:114093038420:web:8f437371ad18447ffa86c1"
};

// Firebaseni ishga tushiramiz
const app = initializeApp(firebaseConfig);

// Bizga kerak bo'ladigan xizmatlarni eksport qilamiz
export const auth = getAuth(app); // Foydalanuvchi tizimi (Login/Register)
export const db = getFirestore(app); // Ma'lumotlar bazasi
export const storage = getStorage(app);

export default app;