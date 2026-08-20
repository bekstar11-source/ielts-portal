import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  browserSessionPersistence,
  setPersistence,
  signInWithPopup,
  signInAnonymously,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider
} from "firebase/auth";
import { logAction } from "../utils/logger"; // Import logger
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/firebase";
import {
  isSubscriptionExpired,
  getRawTier,
  getSubscriptionEnd
} from "../utils/subscription";
import { track, getAttributionForProfile } from "../lib/analytics";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase User (auth)
  const [userData, setUserData] = useState(null); // Firestore User Data (role, name, photo)
  const [loading, setLoading] = useState(true);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  // 0. Mehmon (guest) sessiyasi — landing page'dagi bepul trial uchun.
  //
  // Anonim hisob Firestore'ga UMUMAN kira olmaydi (`firestore.rules` dagi
  // `isAuth()` uni ataylab chetlab o'tadi) — trial butunlay Cloud Functions
  // orqali ishlaydi. Bu yerdagi yagona maqsad — `context.auth` ni to'ldirish,
  // ya'ni callable'lar guest'ni tanishi.
  // ⚠️ `useCallback` shart: bu funksiya `useTrialLogic` dagi testni yuklovchi
  // `useEffect` ning bog'liqliklari ro'yxatida turadi. Har renderda yangi
  // havola bo'lsa, `signInAnonymously` → `onAuthStateChanged` → `setUser` →
  // qayta render → yangi havola → effekt qayta ishga tushadi degan cheksiz
  // sikl paydo bo'lardi (va har aylanishda `getTrialTest` chaqirilardi).
  const startGuestSession = useCallback(async () => {
    if (auth.currentUser) return auth.currentUser;
    const result = await signInAnonymously(auth);
    return result.user;
  }, []);

  /** Hozirgi sessiya anonim (ro'yxatdan o'tmagan) mi. */
  const isGuest = Boolean(user?.isAnonymous);

  // 1. Ro'yxatdan o'tish
  const signup = async (email, password, fullName, role = "student") => {
    const current = auth.currentUser;
    // Anonim hisob quyida haqiqiy hisobga aylantiriladi — shundan keyin
    // `isAnonymous` false bo'lib qoladi, shuning uchun bayroqni HOZIR olamiz.
    const fromTrial = Boolean(current?.isAnonymous);
    let user;

    if (current && current.isAnonymous) {
      // ⚠️ Trialni yechgan mehmon ro'yxatdan o'tmoqda. Yangi hisob YARATMAYMIZ,
      // anonim hisobni haqiqiy hisobga AYLANTIRAMIZ — shunda `uid` o'zgarmaydi
      // va `trial_results/{uid}` hujjati o'z-o'zidan yangi hisobga tegishli
      // bo'lib qoladi. Aks holda natijani va chegirmani alohida "ko'chirish"
      // mexanizmi kerak bo'lardi (va u eski uid ni ishonchli tekshira olmasdi).
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(current, credential);
      user = result.user;
      // ⚠️ Link muvaffaqiyatli bo'lsa ham, KESHDAGI ID token'da
      // `sign_in_provider` hamon `anonymous` bo'lib qoladi — u faqat token
      // yangilanganda o'zgaradi. `firestore.rules` dagi `isAuth()` esa
      // anonimni ataylab rad etadi, ya'ni quyidagi `setDoc(users/{uid})`
      // "permission-denied" bilan yiqilardi va butun ro'yxatdan o'tish
      // xatoga uchrardi. Majburiy yangilash yangi provayderli token beradi.
      await user.getIdToken(true);
    } else {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      user = result.user;
    }

    const newUserData = {
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
    };

    // Qaysi reklama/kanal shu hisobni olib kelganini hujjatga muhrlaymiz.
    // GA4 da bu ma'lumot bor, lekin u yerdan "shu foydalanuvchi keyin to'lov
    // qildimi" degan savolga javob chiqmaydi — Firestore'dagi nusxa chiqaradi.
    const acquisition = getAttributionForProfile();
    if (acquisition) newUserData.acquisition = { ...acquisition, fromTrial };

    await setDoc(doc(db, "users", user.uid), newUserData);
    setUserData(newUserData);

    logAction(user.uid, 'USER_REGISTER', { email, role, method: 'email' }); // Log action
    track('sign_up', { method: 'email', from_trial: fromTrial, role });

    // Trial mukofoti (chegirma) shu yerda so'raladi — ro'yxatdan o'tish qaysi
    // sahifadan boshlangan bo'lsa ham ishlashi uchun. Trial yechilmagan bo'lsa
    // funksiya darhol `{granted:false, reason:'no_trial'}` qaytaradi, shuning
    // uchun oddiy ro'yxatdan o'tishga sezilarli qo'shimcha yuk bermaydi.
    //
    // Xatosi ro'yxatdan o'tishni YIQITMASLIGI shart: chegirma — bonus, hisob
    // esa asosiy natija.
    try {
      const claimReward = httpsCallable(functions, 'claimTrialReward');
      const { data: reward } = await claimReward();
      if (reward?.granted) {
        // ⚠️ `reward.percent` — `claimTrialReward` AYNAN shu nom bilan
        // qaytaradi. Ilgari bu yerda `reward.discountPercent` o'qilardi va
        // hodisa har doim `undefined` foiz bilan ketardi, ya'ni chegirmaning
        // konversiyaga ta'sirini o'lchash imkonsiz edi.
        track('trial_reward_claimed', { discount_percent: Number(reward.percent) || undefined });
        // Chegirma serverda `users/{uid}` ga yozildi — uni ko'rish uchun
        // hujjatni qayta o'qiymiz (Pricing sahifasi shunga qaraydi).
        //
        // `refreshUserData()` ishlatilmaydi: u `user` STATE'iga tayanadi,
        // u esa signup paytida hali eski qiymatda (null yoki anonim) turadi.
        const fresh = await getDoc(doc(db, "users", user.uid));
        if (fresh.exists()) setUserData(processUserData(user.uid, fresh.data()));
      }
    } catch (err) {
      console.warn("Trial reward claim failed:", err);
    }

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

  // 3.5. Parolni tiklash havolasini yuborish
  //
  // Firebase'ning o'zi xatni yuboradi (qo'shimcha email servisi kerak emas).
  // Xat matnini Firebase Console → Authentication → Templates dan o'zgartiriladi.
  //
  // ⚠️ Email enumeration protection yoqilgan bo'lsa Firebase mavjud bo'lmagan
  // email uchun ham xatosiz javob qaytaradi — bu ataylab shunday. Shuning uchun
  // UI'da "bunday foydalanuvchi yo'q" deb ko'rsatmaymiz.
  const resetPassword = async (email) => {
    const cleanEmail = (email || "").trim();
    await sendPasswordResetEmail(auth, cleanEmail, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false
    });
    logAction(null, 'PASSWORD_RESET_REQUEST', { email: cleanEmail });
  };

  // 4. Lokal ma'lumotni yangilash (Settings uchun)
  const updateUserLocalData = (newFields) => {
    setUserData((prev) => ({ ...prev, ...newFields }));
  };

  // Obuna muddati tugaganini LOKAL ravishda aks ettiradi.
  //
  // ⚠️ Ilgari bu funksiya Firestore'ga yozardi (`accountType: 'public'`).
  // Endi bu maydonlar klientdan yozilmaydi (firestore.rules) — hujjatni
  // `expireSubscriptions` scheduled function tozalaydi, kirish huquqi esa
  // har bir so'rovda serverda (`getSanitizedTest`) qayta tekshiriladi.
  // Bu yerda faqat UI darhol to'g'ri ko'rinishi uchun overlay qilamiz.
  const processUserData = (uid, data) => {
    if (!data) return null;
    if (!isSubscriptionExpired(data)) return data;
    if (getRawTier(data) === 'free') return data;

    try {
      logAction(uid, 'SUBSCRIPTION_EXPIRED', {
        expiredAt: getSubscriptionEnd(data)?.toISOString() || null
      });
    } catch (logErr) {
      console.error("Logger error:", logErr);
    }

    return { ...data, accountType: 'public', isPro: false, isPremium: false, tier: 'public' };
  };

  // 5. User datasini qayta Firestore dan yuklash (manual refresh uchun)
  const refreshUserData = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const processed = processUserData(user.uid, docSnap.data());
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
      const current = auth.currentUser;
      // Trialni yechgan mehmon Google bilan kirmoqda. `signInWithPopup` anonim
      // sessiyani YANGI uid bilan almashtiradi — `trial_results/{uid}` va u
      // bilan birga chegirma yo'qolardi. Shuning uchun email/parol yo'lidagi
      // kabi anonim hisobni AYLANTIRAMIZ (uid o'zgarmaydi).
      const fromTrial = Boolean(current?.isAnonymous);
      let result;
      if (fromTrial) {
        try {
          result = await linkWithPopup(current, provider);
          // Signup'dagi bilan AYNAN bir xil sabab: token majburan
          // yangilanmasa `sign_in_provider` hamon `anonymous` bo'lib qoladi
          // va quyidagi `users/{uid}` o'qish/yozishlari qoidalar tomonidan
          // rad etiladi — tashqaridan bu "Google bilan kirishda xatolik"
          // bo'lib ko'rinadi.
          await result.user.getIdToken(true);
        } catch (linkErr) {
          // Bu Google hisobi allaqachon ro'yxatdan o'tgan — bog'lab bo'lmaydi.
          // Oddiy kirishga tushamiz (mehmon uid'i, demak trial natijasi ham,
          // bu holatda yo'qoladi — mavjud hisobga qo'shib bo'lmaydi).
          if (linkErr.code === 'auth/credential-already-in-use' ||
              linkErr.code === 'auth/email-already-in-use') {
            result = await signInWithPopup(auth, provider);
          } else {
            throw linkErr;
          }
        }
      } else {
        result = await signInWithPopup(auth, provider);
      }
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
          const acquisition = getAttributionForProfile();
          if (acquisition) newUserData.acquisition = { ...acquisition, fromTrial };

          await setDoc(docRef, newUserData);
          setUserData(newUserData);
          logAction(user.uid, 'USER_REGISTER', { email: user.email, method: 'google_popup' });
          track('sign_up', { method: 'google', from_trial: fromTrial });

          // Trial mukofoti — email/parol yo'lidagi bilan bir xil mantiq.
          // Xatosi ro'yxatdan o'tishni yiqitmaydi: chegirma bonus, hisob asosiy.
          if (fromTrial) {
            try {
              const claimReward = httpsCallable(functions, 'claimTrialReward');
              const { data: reward } = await claimReward();
              if (reward?.granted) {
                // `reward.percent` — email/parol yo'lidagi bilan bir xil sabab.
                track('trial_reward_claimed', { discount_percent: Number(reward.percent) || undefined });
                const fresh = await getDoc(docRef);
                if (fresh.exists()) setUserData(processUserData(user.uid, fresh.data()));
              }
            } catch (err) {
              console.warn("Trial reward claim failed:", err);
            }
          }
        } else {
          const processed = processUserData(user.uid, docSnap.data());
          setUserData(processed);
          logAction(user.uid, 'USER_LOGIN', { email: user.email, method: 'google_popup' });
        }
      }
      return result;
    } catch (error) {
      // User simply closed the popup or opened a second one — not a real error.
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return null;
      }
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
      } else if (currentUser.isAnonymous) {
        // Mehmon (trial) sessiyasi: `users/{uid}` hujjati YO'Q va bo'lmasligi
        // ham kerak. Bu yerdan chiqib ketmasak, quyidagi kod hujjatni o'qishga
        // → topolmay yaratishga urinardi va ikkalasi ham qoidalar tomonidan
        // rad etilib, 5 martalik qayta urinish siklini bekorga aylantirardi.
        setUserData(null);
        setLoading(false);
      } else {
        setLoading(true); // Firestore fetch boshlanishidan oldin loading=true bo'lishini kafolatlash
        try {
          let docSnap;
          try {
            docSnap = await getDoc(doc(db, "users", currentUser.uid));
          } catch (readErr) {
            console.warn("Temporary Firestore read failure, retrying in 300ms...", readErr);
            await new Promise(resolve => setTimeout(resolve, 300));
            docSnap = await getDoc(doc(db, "users", currentUser.uid));
          }

          if (docSnap.exists()) {
            const processed = processUserData(currentUser.uid, docSnap.data());
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
              try {
                await setDoc(docRef, newUserData);
              } catch (writeErr) {
                console.warn("Temporary Firestore write failure, retrying in 300ms...", writeErr);
                await new Promise(resolve => setTimeout(resolve, 300));
                await setDoc(docRef, newUserData);
              }
              setUserData(newUserData);
              setLoading(false);
            } else {
              // Password user — doc may not exist yet due to signup race condition
              // (onAuthStateChanged fires before setDoc completes in signup()).
              // Retry with backoff before giving up.
              let found = false;
              for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
                try {
                  const retrySnap = await getDoc(doc(db, "users", currentUser.uid));
                  if (retrySnap.exists()) {
                    const processed = processUserData(currentUser.uid, retrySnap.data());
                    setUserData(processed);
                    found = true;
                    break;
                  }
                } catch (e) { /* retry */ }
              }
              if (!found) {
                console.warn("Password user Firestore doc not found after retries.");
              }
              setLoading(false);
            }
          }
        } catch (error) {
          console.error("Firestore user data loading error (permanent):", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    signup,
    login,
    logout,
    resetPassword,
    updateUserLocalData,
    refreshUserData,
    signInWithPhone,
    signInWithGoogle,
    startGuestSession,
    isGuest,
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