import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
// 🔥 YANGI IMPORTLAR (updateDoc va serverTimestamp qo'shildi)
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase User (auth)
  const [userData, setUserData] = useState(null); // Firestore User Data (role, name, photo)
  const [loading, setLoading] = useState(true);

  // 1. Ro'yxatdan o'tish
  const signup = async (email, password, fullName, role = "student") => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      fullName: fullName,
      role: role,
      createdAt: new Date().toISOString(),
      // 🔥 Ro'yxatdan o'tganda darhol "Online" deb belgilash
      lastActiveAt: serverTimestamp(),
      isOnline: true
    });

    return user;
  };

  // 2. Kirish
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // 3. Chiqish
  const logout = () => {
    return signOut(auth);
  };

  // 4. Lokal ma'lumotni yangilash (Settings uchun)
  const updateUserLocalData = (newFields) => {
    setUserData((prev) => ({ ...prev, ...newFields }));
  };

  // 🔥 5. YANGI FUNKSIYA: Faollikni kuzatish (God Mode uchun)
  // Bu funksiyani App.js da ishlatamiz.
  const trackUserActivity = async (activityName) => {
    if (!user) return; // Agar user bo'lmasa, hech narsa qilma

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastActiveAt: serverTimestamp(), // Hozirgi vaqt
        currentActivity: activityName || "Faol" // Masalan: "Home Page", "Test Page"
      });
    } catch (error) {
      console.error("Faollikni yozishda xato:", error);
    }
  };

  // 1. Recaptcha ni sozlash (Bu robot emasligini tekshirish uchun kerak)
  function setupRecaptcha(phoneNumber) {
    const recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container", // Bu ID keyinroq Login sahifasida ishlatiladi
      {
        size: "invisible", // Yoki 'normal' qilsangiz ko'rinib turadi
      }
    );
    return recaptchaVerifier;
  }

  // 2. SMS yuborish funksiyasi
  function signInWithPhone(phoneNumber) {
    const appVerifier = setupRecaptcha(phoneNumber);
    return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  }

  // 3. Google Sign In
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create new user
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName,
          photoURL: user.photoURL,
          role: "student",
          createdAt: new Date().toISOString(),
          lastActiveAt: serverTimestamp(),
          isOnline: true
        });
      }

      return user;
    } catch (error) {
      console.error("Google Sign In Error", error);
      throw error;
    }
  };

  // User holatini kuzatish
  // 1. Auth State Kuzatish
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. User Data (Firestore) Kuzatish - Real-time
  useEffect(() => {
    if (user) {
      const unsubscribeSnapshot = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
          // Vaqtni yangilashni bu yerda qilsak har safar update bo'lganda yozadi, bu yaxshi emas.
          // Lekin hozircha mayli.
        }
        setLoading(false);
      }, (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    }
  }, [user]);

  const value = {
    user,
    userData,
    signup,
    login,
    logout,
    updateUserLocalData,
    trackUserActivity, // 🔥 Exportga qo'shildi
    signInWithPhone,
    signInWithGoogle,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  return useContext(AuthContext);
}