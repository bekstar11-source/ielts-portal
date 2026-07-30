// src/pages/student/MockPurchase.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/LanguageContext";
import { 
  ArrowLeft, 
  Sparkles, 
  Layers, 
  Loader2, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Check, 
  AlertCircle,
  ShieldCheck,
  ShoppingBag,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardModals from "../../components/dashboard/DashboardModals";
import SiteFooter from "../../components/common/SiteFooter";

export default function MockPurchase() {
  const navigate = useNavigate();
  const { user, userData, logout } = useAuth();
  const { theme } = useTheme();
  const { lang } = useTranslation();
  const isDark = theme === "dark";

  // Data States
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userMocks, setUserMocks] = useState([]);
  const [paymentStarted, setPaymentStarted] = useState(false);

  // Purchase Modal State
  const [selectedMock, setSelectedMock] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch Mocks and User's Purchased Mocks
  const fetchMockCatalog = async () => {
    if (!user?.uid) return;
    try {
      // 1. Fetch all mocks of type === 'mock' so existing and new ones all show up
      const q = query(
        collection(db, "tests_metadata"),
        where("type", "==", "mock")
      );
      const snap = await getDocs(q);
      const fetchedMocks = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Fallbacks for older/existing mocks
          price: data.price !== undefined ? data.price : 30000,
          description: data.description || (lang === 'uz' 
            ? "Reading, Listening va Writing bo'limlarini o'z ichiga olgan to'liq imtihon simulyatsiyasi." 
            : "Full exam simulation containing Reading, Listening and Writing modules.")
        };
      });
      
      // Sort: newest first
      fetchedMocks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setMocks(fetchedMocks);

      // 2. Fetch fresh user data to get currently unlocked mock list
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        setUserMocks(uData.mockTests || []);
      }
    } catch (err) {
      console.error("Error fetching mocks catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMockCatalog();
  }, [user]);

  // Check if a mock test is already purchased by comparing sub-tests IDs
  const isAlreadyPurchased = (mock) => {
    return userMocks.some(um => {
      // Compare by either same sub-test IDs or collectionId
      const colMatch = um.collectionId && um.collectionId === mock.collectionId;
      const rMatch = um.subTests?.reading === mock.subTests?.readingId;
      const lMatch = um.subTests?.listening === mock.subTests?.listeningId;
      const wMatch = um.subTests?.writing === mock.subTests?.writingId;
      return colMatch || (rMatch && lMatch && wMatch);
    });
  };

  // Handle Mock Purchase Confirmation
  const handleConfirmPurchase = () => {
    if (!selectedMock || !user?.uid) return;

    try {
      const params = `${user.uid}_mock_${selectedMock.id}`;
      const telegramUrl = `https://t.me/ielts_portal_auth_bot?start=${params}`;
      window.open(telegramUrl, "_blank");
      setPaymentStarted(true);
    } catch (err) {
      console.error("Error redirecting to Telegram:", err);
    }
  };

  // Formatting Price
  const formatPrice = (val) => {
    return new Intl.NumberFormat("uz-UZ").format(val) + " UZS";
  };

  return (
    <div className={`min-h-screen font-['Plus_Jakarta_Sans'] flex flex-col transition-colors duration-200 select-none ${
      isDark ? "bg-warm-dark text-warm-on-dark" : "bg-warm-canvas text-warm-ink"
    }`}>
      <DashboardHeader
        user={user}
        userData={userData}
        activeTab="mock"
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      {/* MOBILE STICKY HEADER */}
      <header className={`w-full border-b px-6 py-3 sticky top-0 z-50 md:hidden flex justify-between items-center ${
        isDark ? "bg-warm-dark border-white/10" : "bg-warm-canvas border-warm-hairline"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/mock")}
            className={`p-2 rounded-full transition-colors ${
              isDark ? "hover:bg-warm-dark-elevated text-warm-on-dark-soft hover:text-warm-on-dark" : "hover:bg-warm-card text-warm-muted hover:text-warm-ink"
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-bold text-xs">Mocks</span>
        </div>
        <div className="flex items-baseline">
          <span className="text-warm-primary font-black text-2xl tracking-normal">IELTS</span>
          <span className={`font-bold text-xs ml-1 ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>Store</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-xl space-y-xl pb-24">
        {/* Navigation Breadcrumb */}
        <section className="hidden md:flex justify-between items-center">
          <button
            onClick={() => navigate("/mock")}
            className={`flex items-center gap-2 border px-4 py-2.5 rounded-md text-xs font-bold transition-all active:scale-95 ${
              isDark
                ? "bg-warm-dark-elevated border-white/10 hover:bg-warm-dark-soft hover:border-white/20 text-warm-on-dark-soft"
                : "bg-white border-warm-hairline hover:bg-warm-card hover:border-warm-hairline text-warm-body"
            }`}
          >
            <ArrowLeft size={14} /> Mock imtihonlar paneliga qaytish
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-warm-primary/5 to-warm-accent-amber/5 border-warm-primary/10 text-warm-primary">
            <Sparkles size={11} className="text-warm-accent-amber fill-warm-accent-amber" /> IELTS Simulator
          </div>
        </section>

        {/* Hero Section */}
        <section className="space-y-2">
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>
            Premium Mock Testlar
          </h1>
          <p className={`text-sm max-w-2xl font-medium ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted"}`}>
            Reading, Listening va Writing bo'limlarini o'z ichiga olgan to'liq IELTS on Computer simulyatsiyalari. Istalgan mock testni tanlab, o'z bilimingizni rasmiy imtihon darajasida tekshirib ko'ring.
          </p>
          <div className={`h-[1px] w-full pt-4 border-b ${isDark ? "border-white/10" : "border-warm-hairline-soft"}`}></div>
        </section>

        {/* MOCK LIST SECTION */}
        <section>
          {loading ? (
            <div className="py-24 text-center text-warm-muted dark:text-warm-on-dark-soft font-bold uppercase tracking-widest text-xs">
              <Loader2 className="animate-spin mx-auto mb-4 opacity-35" size={32} />
              Katalog yuklanmoqda...
            </div>
          ) : mocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mocks.map((mock) => {
                const purchased = isAlreadyPurchased(mock);
                return (
                  <article
                    key={mock.id}
                    className={`border transition-all flex flex-col justify-between p-xl rounded-lg shadow-sm hover:translate-y-[-2px] hover:shadow-md duration-250 ${
                      isDark
                        ? "bg-warm-dark-elevated border-white/10 hover:border-warm-primary/30 text-warm-on-dark"
                        : "bg-white border-warm-hairline hover:border-warm-primary/30 text-warm-ink"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Badge and Price */}
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isDark ? "bg-warm-primary/10 text-warm-primary border border-warm-primary/20" : "bg-warm-primary/10 text-warm-primary-active border border-warm-primary/20"
                        }`}>
                          Premium Mock
                        </span>
                        <span className={`text-xs font-black tracking-tight ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>
                          {formatPrice(mock.price)}
                        </span>
                      </div>

                      {/* Title and Description */}
                      <div className="space-y-1.5">
                        <h3 className={`text-base font-black tracking-tight leading-snug ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>
                          {mock.title}
                        </h3>
                        {mock.description && (
                          <p className={`text-xs leading-relaxed font-semibold line-clamp-3 ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted"}`}>
                            {mock.description}
                          </p>
                        )}
                      </div>

                      {/* Mock structure badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-white/5 border-white/10 text-warm-on-dark-soft" : "bg-warm-canvas border-warm-hairline text-warm-body"
                        }`}>
                          <BookOpen size={10} /> Reading
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-white/5 border-white/10 text-warm-on-dark-soft" : "bg-warm-canvas border-warm-hairline text-warm-body"
                        }`}>
                          <Headphones size={10} /> Listening
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-white/5 border-white/10 text-warm-on-dark-soft" : "bg-warm-canvas border-warm-hairline text-warm-body"
                        }`}>
                          <PenTool size={10} /> Writing
                        </span>
                      </div>
                    </div>

                    {/* Buy Button */}
                    <div className="pt-5 border-t border-dashed mt-5 border-inherit">
                      {purchased ? (
                        <button
                          disabled
                          className={`w-full py-3.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 border ${
                            isDark
                              ? "bg-warm-dark-soft border-white/10 text-warm-on-dark-soft"
                              : "bg-warm-card border-warm-hairline text-warm-muted"
                          }`}
                        >
                          <Check size={14} /> Sotib olingan
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPaymentStarted(false);
                            setSelectedMock(mock);
                          }}
                          className="w-full py-3.5 rounded-md text-xs font-bold transition-all bg-warm-primary hover:bg-warm-primary-active text-white active:scale-98 flex items-center justify-center gap-1.5 shadow-sm shadow-warm-primary/20"
                        >
                          <ShoppingBag size={14} /> Sotib olish
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`border border-dashed rounded-xl py-24 text-center ${
              isDark ? "border-white/10 bg-white/5" : "border-warm-hairline bg-warm-card/50"
            }`}>
              <Layers size={40} className="mx-auto mb-4 text-warm-muted-soft dark:text-warm-on-dark-soft opacity-20" />
              <p className="text-warm-muted dark:text-warm-on-dark-soft text-sm font-semibold italic">Ayni paytda sotuvdagi premium mock testlar mavjud emas.</p>
            </div>
          )}
        </section>
      </main>

      {/* CHECKOUT CONFIRMATION MODAL */}
      {selectedMock && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => {
              setSelectedMock(null);
              setPaymentStarted(false);
            }}
          />
          
          {/* Checkout Panel */}
          <div className={`relative w-full max-w-md rounded-lg border p-8 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
            isDark ? "bg-warm-dark-elevated border-white/10 text-warm-on-dark" : "bg-white border-warm-hairline text-warm-ink"
          }`}>
            <div className="text-center space-y-6">
              {!paymentStarted ? (
                <>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                    isDark ? "bg-warm-primary/10 text-warm-primary border border-warm-primary/20" : "bg-warm-primary/10 text-warm-primary-active border border-warm-primary/20"
                  }`}>
                    <ShoppingBag size={24} />
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>
                      {lang === 'uz' ? "To'lovni boshlash" : "Start Payment"}
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed px-2 ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted"}`}>
                      {lang === 'uz'
                        ? "Ushbu mock testni sotib olish uchun Telegram botimizga yo'naltirilasiz. Bot orqali to'lov qilib, chekni yuborasiz. Admin tasdiqlagach, mock avtomatik ravishda ochiladi."
                        : "To purchase this mock test, you will be redirected to our Telegram bot. After transferring payment, upload your receipt in the bot. It will be unlocked once approved by the admin."}
                    </p>
                  </div>

                  {/* Order Box */}
                  <div className={`p-4 rounded border text-left space-y-2.5 ${
                    isDark ? "bg-white/5 border-white/10" : "bg-warm-card border-warm-hairline"
                  }`}>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted-soft"}`}>Mock:</span>
                      <span className={`text-xs font-bold truncate flex-1 text-right ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>
                        {selectedMock.title}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-dashed pt-2.5 border-inherit">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-warm-on-dark-soft" : "text-warm-muted-soft"}`}>Jami narxi:</span>
                      <span className={`text-sm font-extrabold text-warm-primary`}>
                        {formatPrice(selectedMock.price)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmPurchase}
                      className="w-full bg-warm-primary hover:bg-warm-primary-active text-white py-3.5 rounded-md font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} />
                      {lang === 'uz' ? "Telegram orqali to'lash" : "Pay via Telegram"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMock(null);
                        setPaymentStarted(false);
                      }}
                      className={`w-full py-3.5 rounded-md font-bold text-xs transition-all active:scale-[0.98] border ${
                        isDark
                          ? "bg-transparent border-white/10 hover:bg-white/5 text-warm-on-dark-soft"
                          : "bg-transparent border-warm-hairline hover:bg-warm-card text-warm-muted"
                      }`}
                    >
                      {lang === 'uz' ? "Bekor qilish" : "Cancel"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                    isDark ? "bg-warm-primary/10 text-warm-primary border border-warm-primary/20" : "bg-warm-primary/10 text-warm-primary-active border border-warm-primary/20"
                  }`}>
                    <MessageCircle size={24} />
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-xl font-black tracking-tight ${isDark ? "text-warm-on-dark" : "text-warm-ink"}`}>
                      {lang === 'uz' ? "Telegram botga yo'naltirildingiz" : "Redirected to Telegram Bot"}
                    </h3>
                    <div className={`text-xs font-semibold leading-relaxed px-2 space-y-3 text-left ${isDark ? "text-warm-on-dark-soft" : "text-warm-body"}`}>
                      <p>
                        {lang === 'uz' 
                          ? "1. Telegram botda to'lov ma'lumotlarini olish uchun botni ishga tushiring (Start tugmasini bosing)." 
                          : "1. Start the bot to receive payment instructions in Telegram."}
                      </p>
                      <p>
                        {lang === 'uz' 
                          ? "2. Belgilangan kartaga to'lovni o'tkazing va to'lov chekini (screenshot) botga yuboring." 
                          : "2. Make the transfer to the specified card and upload the screenshot to the bot."}
                      </p>
                      <p>
                        {lang === 'uz' 
                          ? "3. Admin to'lovni tasdiqlashi bilan mock imtihon ushbu sahifada 'Sotib olingan' holatiga o'tadi va mock panelida faollashadi." 
                          : "3. As soon as the admin confirms the payment, the mock exam will become available."}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const params = `${user.uid}_mock_${selectedMock.id}`;
                        window.open(`https://t.me/ielts_portal_auth_bot?start=${params}`, "_blank");
                      }}
                      className="w-full bg-warm-primary hover:bg-warm-primary-active text-white py-3.5 rounded-md font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={14} />
                      {lang === 'uz' ? "Telegramni qayta ochish" : "Re-open Telegram"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMock(null);
                        setPaymentStarted(false);
                      }}
                      className={`w-full py-3.5 rounded-md font-bold text-xs transition-all active:scale-[0.98] border ${
                        isDark
                          ? "bg-transparent border-white/10 hover:bg-white/5 text-warm-on-dark-soft"
                          : "bg-transparent border-warm-hairline hover:bg-warm-card text-warm-muted"
                      }`}
                    >
                      {lang === 'uz' ? "Tushunarli / Yopish" : "Got it / Close"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <DashboardModals
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        confirmLogout={logout}
      />
      
      <SiteFooter />
    </div>
  );
}
