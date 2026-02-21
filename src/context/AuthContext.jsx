import { createContext, useContext, useEffect, useState, useCallback } from "react";
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
import { logAction } from "../utils/logger"; // Import logger
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
      accountType: "public",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      // 🔥 Ro'yxatdan o'tganda darhol "Online" deb belgilash
      lastActiveAt: serverTimestamp(),
      isOnline: true
    });

    logAction(user.uid, 'USER_REGISTER', { email, role, method: 'email' }); // Log action
    return user;
  };

  // 2. Kirish
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (result.user) {
      logAction(result.user.uid, 'USER_LOGIN', { email, method: 'email' });
    }
    return result;
  };

  // 3. Chiqish
  const logout = async () => {
    if (user) {
      logAction(user.uid, 'USER_LOGOUT', { email: user.email });
    }
    return signOut(auth);
  };

  // 4. Lokal ma'lumotni yangilash (Settings uchun)
  const updateUserLocalData = (newFields) => {
    setUserData((prev) => ({ ...prev, ...newFields }));
  };

  // 🔥 5. Faollikni kuzatish
  const trackUserActivity = useCallback(async (activityName) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastActiveAt: serverTimestamp(),
        currentActivity: activityName || "Faol"
      });
    } catch (error) {
      console.error("Faollikni yozishda xato:", error);
    }
  }, [user]);

  // 1. Recaptcha
  function setupRecaptcha(phoneNumber) {
    const recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible" }
    );
    return recaptchaVerifier;
  }

  // 2. SMS yuborish
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
          accountType: "public",
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          lastActiveAt: serverTimestamp(),
          isOnline: true
        });
        logAction(user.uid, 'USER_REGISTER', { email: user.email, method: 'google' });
      } else {
        logAction(user.uid, 'USER_LOGIN', { email: user.email, method: 'google' });
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