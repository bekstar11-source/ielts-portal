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
  signInWithPopup,
  browserSessionPersistence,
  setPersistence,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { logAction } from "../utils/logger"; // Import logger
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase User (auth)
  const [userData, setUserData] = useState(null); // Firestore User Data (role, name, photo)
  const [loading, setLoading] = useState(true);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

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

  // Helper function to check and handle subscription expiration
  const processUserData = async (uid, data) => {
    if (!data) return null;
    const isGrouped = data.groupId && data.groupId !== 'none';
    const hasPremium = data.accountType === 'pro' || data.accountType === 'standard' || data.isPro;
    
    if (!isGrouped && hasPremium && data.subscriptionEnd) {
      const expiryDate = data.subscriptionEnd.seconds 
        ? new Date(data.subscriptionEnd.seconds * 1000) 
        : new Date(data.subscriptionEnd);
        
      if (new Date() > expiryDate) {
        const updatedFields = {
          accountType: 'public',
          isPro: false,
          tier: 'public'
        };
        try {
          await updateDoc(doc(db, "users", uid), updatedFields);
          try {
            logAction(uid, 'SUBSCRIPTION_EXPIRED', { expiredAt: expiryDate.toISOString() });
          } catch (logErr) {
            console.error("Logger error:", logErr);
          }
          return { ...data, ...updatedFields };
        } catch (err) {
          console.error("Error auto-downgrading expired subscription:", err);
        }
      }
    }
    return data;
  };

  // 5. User datasini qayta Firestore dan yuklash (manual refresh uchun)
  const refreshUserData = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const processed = await processUserData(user.uid, docSnap.data());
        setUserData(processed);
      }
    } catch (e) {
      console.error("refreshUserData xatolik:", e);
    }
  };


  // 1. Recaptcha
  function setupRecaptcha(containerId) {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      containerId,
      { 
        size: "normal", // Visible checkbox for better reliability on localhost
        callback: (response) => {
            // reCAPTCHA solved
        },
        'expired-callback': () => {
            // Response expired.
        }
      }
    );
    return window.recaptchaVerifier;
  }

  // 2. SMS yuborish
  function signInWithPhone(phoneNumber, containerId = "recaptcha-container") {
    const appVerifier = setupRecaptcha(containerId);
    return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  }

  // 3. Google Sign In
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Use popup for immediate sign-in to avoid redirect flow issues
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const newUserData = {
            uid: user.uid,
            email: user.email || "",
            fullName: user.displayName || "O'quvchi",
            photoURL: user.photoURL || "",
            role: "student",
            accountType: "public",
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            lastActiveAt: serverTimestamp(),
            isOnline: true
          };
          await setDoc(docRef, newUserData);
          setUserData(newUserData);
          logAction(user.uid, 'USER_REGISTER', { email: user.email, method: 'google_popup' });
        } else {
          const processed = await processUserData(user.uid, docSnap.data());
          setUserData(processed);
          logAction(user.uid, 'USER_LOGIN', { email: user.email, method: 'google_popup' });
        }
      }
      return result;
    } catch (error) {
      console.error("Google Sign In Error", error);
      throw error;
    }
  };

  // Auth State & Firestore User Data synchronization
  useEffect(() => {
    // 1. Listen to auth state changes immediately (synchronous check on mount)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
      } else {
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) {
            const processed = await processUserData(currentUser.uid, docSnap.data());
            setUserData(processed);
            setLoading(false);
          } else {
            // Document does not exist yet. Check if they signed up using Google or another provider,
            // or if they are a password user whose document is in creation.
            const isPasswordUser = currentUser.providerData.some(p => p.providerId === 'password');
            if (!isPasswordUser) {
              // Create the document automatically for Google popup / custom token / social login users
              const docRef = doc(db, "users", currentUser.uid);
              const newUserData = {
                uid: currentUser.uid,
                email: currentUser.email || "",
                fullName: currentUser.displayName || "O'quvchi",
                photoURL: currentUser.photoURL || "",
                role: "student",
                accountType: "public",
                onboardingCompleted: false,
                createdAt: new Date().toISOString(),
                lastActiveAt: serverTimestamp(),
                isOnline: true
              };
              await setDoc(docRef, newUserData);
              setUserData(newUserData);
            }
            setLoading(false);
          }
        } catch (error) {
          console.error("Firestore user data loading error:", error);
          setLoading(false);
        }
      }
    });

    // 2. Handle Google Sign-in redirect result in parallel (non-blocking for guests)
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            const newUserData = {
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
            };
            await setDoc(docRef, newUserData);
            setUserData(newUserData);
            logAction(user.uid, 'USER_REGISTER', { email: user.email, method: 'google' });
          } else {
            logAction(user.uid, 'USER_LOGIN', { email: user.email, method: 'google' });
          }
        }
      } catch (error) {
        console.error("Google Redirect Result handling error:", error);
      } finally {
        // If auth user was detected but Firestore doc was missing, we finish loading here
        setLoading(false);
      }
    };
    handleRedirect();

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    signup,
    login,
    logout,
    updateUserLocalData,
    refreshUserData,
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