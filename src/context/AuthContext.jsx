import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase"; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
// 🔥 YANGI IMPORTLAR (updateDoc va serverTimestamp qo'shildi)
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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

  // User holatini kuzatish
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          
          // 🔥 Saytga kirganda (Refresh berganda) avtomatik vaqtni yangilash
          updateDoc(docRef, { lastActiveAt: serverTimestamp() }).catch(e => console.log(e));
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    signup,
    login,
    logout,
    updateUserLocalData,
    trackUserActivity, // 🔥 Exportga qo'shildi
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