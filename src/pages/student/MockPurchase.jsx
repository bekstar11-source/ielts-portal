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
  ShoppingBag
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
          price: data.price !== undefined ? data.price : 20000,
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
  const handleConfirmPurchase = async () => {
    if (!selectedMock || purchasing || !user?.uid) return;

    setPurchasing(true);
    try {
      const now = new Date().toISOString();
      const mockKey = "PURCHASED_" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Construct the mock assignment object
      const mockAssignment = {
        id: "MOCK_" + mockKey,
        type: "mock_full",
        title: selectedMock.title,
        collectionId: selectedMock.collectionId || "",
        startDate: now,
        status: "unlocked_mock",
        mockKey: mockKey,
        subTests: {
          reading: selectedMock.subTests?.readingId || "",
          listening: selectedMock.subTests?.listeningId || "",
          writing: selectedMock.subTests?.writingId || ""
        }
      };

      // Add to user's mockTests array in firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        mockTests: arrayUnion(mockAssignment)
      });

      // Close modal & refresh local catalog
      setSelectedMock(null);
      
      // Navigate back to the mock dashboard
      navigate("/mock");
    } catch (err) {
      console.error("Error purchasing mock exam:", err);
    } finally {
      setPurchasing(false);
    }
  };

  // Formatting Price
  const formatPrice = (val) => {
    return new Intl.NumberFormat("uz-UZ").format(val) + " UZS";
  };

  return (
    <div className={`min-h-screen font-['Plus_Jakarta_Sans'] flex flex-col transition-colors duration-200 select-none ${
      isDark ? "bg-[#09090b] text-zinc-150" : "bg-white text-gray-800"
    }`}>
      <DashboardHeader
        user={user}
        userData={userData}
        activeTab="mock"
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      {/* MOBILE STICKY HEADER */}
      <header className={`w-full border-b px-6 py-3 sticky top-0 z-50 md:hidden flex justify-between items-center ${
        isDark ? "bg-[#09090b] border-zinc-800" : "bg-white border-gray-300"
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/mock")} 
            className={`p-2 rounded-full transition-colors ${
              isDark ? "hover:bg-zinc-900 text-zinc-400 hover:text-white" : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-bold text-xs">Mocks</span>
        </div>
        <div className="flex items-baseline">
          <span className="text-[#e31b23] font-black text-2xl tracking-normal">IELTS</span>
          <span className={`font-bold text-xs ml-1 ${isDark ? "text-white" : "text-gray-900"}`}>Store</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 space-y-10 pb-24">
        {/* Navigation Breadcrumb */}
        <section className="hidden md:flex justify-between items-center">
          <button 
            onClick={() => navigate("/mock")}
            className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isDark 
                ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300" 
                : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-655"
            }`}
          >
            <ArrowLeft size={14} /> Mock imtihonlar paneliga qaytish
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-red-500/5 to-amber-500/5 border-red-500/10 text-red-500">
            <Sparkles size={11} className="text-yellow-550 fill-yellow-500" /> IELTS Simulator
          </div>
        </section>

        {/* Hero Section */}
        <section className="space-y-2">
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
            Premium Mock Testlar
          </h1>
          <p className={`text-sm max-w-2xl font-medium ${isDark ? "text-zinc-500" : "text-gray-500"}`}>
            Reading, Listening va Writing bo'limlarini o'z ichiga olgan to'liq IELTS on Computer simulyatsiyalari. Istalgan mock testni tanlab, o'z bilimingizni rasmiy imtihon darajasida tekshirib ko'ring.
          </p>
          <div className={`h-[1px] w-full pt-4 border-b ${isDark ? "border-zinc-900" : "border-gray-150"}`}></div>
        </section>

        {/* MOCK LIST SECTION */}
        <section>
          {loading ? (
            <div className="py-24 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
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
                    className={`border transition-all flex flex-col justify-between p-5 rounded-lg shadow-sm hover:translate-y-[-2px] hover:shadow-md duration-250 ${
                      isDark 
                        ? "bg-[#0b0b0d] border-zinc-850 hover:border-zinc-800 text-zinc-150" 
                        : "bg-white border-zinc-200 hover:border-zinc-250 text-gray-800"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Badge and Price */}
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-650 border border-red-100"
                        }`}>
                          Premium Mock
                        </span>
                        <span className={`text-xs font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                          {formatPrice(mock.price)}
                        </span>
                      </div>

                      {/* Title and Description */}
                      <div className="space-y-1.5">
                        <h3 className={`text-base font-black tracking-tight leading-snug ${isDark ? "text-white" : "text-gray-900"}`}>
                          {mock.title}
                        </h3>
                        {mock.description && (
                          <p className={`text-xs leading-relaxed font-semibold line-clamp-3 ${isDark ? "text-zinc-450" : "text-gray-500"}`}>
                            {mock.description}
                          </p>
                        )}
                      </div>

                      {/* Mock structure badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-zinc-950 border-zinc-850 text-zinc-400" : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}>
                          <BookOpen size={10} /> Reading
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-zinc-950 border-zinc-850 text-zinc-400" : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}>
                          <Headphones size={10} /> Listening
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDark ? "bg-zinc-950 border-zinc-850 text-zinc-400" : "bg-gray-50 border-gray-200 text-gray-600"
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
                          className={`w-full py-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                            isDark 
                              ? "bg-zinc-900 border-zinc-850 text-zinc-550" 
                              : "bg-gray-50 border-gray-200 text-gray-400"
                          }`}
                        >
                          <Check size={14} /> Sotib olingan
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedMock(mock)}
                          className="w-full py-3.5 rounded-lg text-xs font-bold transition-all bg-[#e31b23] hover:bg-[#c4151c] text-white active:scale-98 flex items-center justify-center gap-1.5 shadow-sm shadow-red-950/20"
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
              isDark ? "border-zinc-850 bg-zinc-950/20" : "border-gray-250 bg-gray-50/50"
            }`}>
              <Layers size={40} className="mx-auto mb-4 text-zinc-400 opacity-20" />
              <p className="text-zinc-500 text-sm font-semibold italic">Ayni paytda sotuvdagi premium mock testlar mavjud emas.</p>
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
            onClick={() => setSelectedMock(null)}
          />
          
          {/* Checkout Panel */}
          <div className={`relative w-full max-w-md rounded-lg border p-8 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
            isDark ? "bg-[#0b0b0c] border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-gray-800"
          }`}>
            <div className="text-center space-y-6">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-[#e31b23] border border-red-100"
              }`}>
                <ShoppingBag size={24} />
              </div>

              <div className="space-y-2">
                <h3 className={`text-xl font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                  To'lovni tasdiqlash
                </h3>
                <p className={`text-xs font-semibold leading-relaxed px-2 ${isDark ? "text-zinc-450" : "text-gray-550"}`}>
                  Ushbu mock testni sotib olishni tasdiqlaysizmi? Mock darhol profilingizga biriktiriladi.
                </p>
              </div>

              {/* Order Box */}
              <div className={`p-4 rounded border text-left space-y-2.5 ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-gray-50 border-gray-250"
              }`}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-550" : "text-zinc-450"}`}>Mock:</span>
                  <span className={`text-xs font-bold truncate flex-1 text-right ${isDark ? "text-zinc-200" : "text-gray-800"}`}>
                    {selectedMock.title}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-dashed pt-2.5 border-inherit">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-zinc-550" : "text-zinc-450"}`}>Jami narxi:</span>
                  <span className={`text-sm font-extrabold text-red-500`}>
                    {formatPrice(selectedMock.price)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={purchasing}
                  onClick={handleConfirmPurchase}
                  className="w-full bg-[#e31b23] hover:bg-[#c4151c] text-white py-3.5 rounded-lg font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {purchasing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      To'lov qilinmoqda...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} /> To'lovni tasdiqlash
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={purchasing}
                  onClick={() => setSelectedMock(null)}
                  className={`w-full py-3.5 rounded-lg font-bold text-xs transition-all active:scale-[0.98] border ${
                    isDark 
                      ? "bg-transparent border-zinc-800 hover:bg-zinc-900 text-zinc-400" 
                      : "bg-transparent border-gray-250 hover:bg-gray-50 text-gray-500"
                  }`}
                >
                  Bekor qilish
                </button>
              </div>
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
