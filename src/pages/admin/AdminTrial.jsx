// src/pages/admin/AdminTrial.jsx
//
// Landing page'dagi bepul trial sozlamalari (`config/trial` hujjati).
//
// Bu sahifa bo'lmasa admin Firestore konsolida qo'lda map ichida map yaratishi
// kerak bo'lardi — xatoga juda moyil ish. Bu yerdagi eng muhim yordam:
// testlar ro'yxati BITTA BO'LAKLI testlar bilan cheklab beriladi, ya'ni
// noto'g'ri (to'liq) test ID sini tanlashning iloji yo'q.

import React, { useEffect, useState, useMemo } from "react";
import { db, functions } from "../../firebase/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { getTestScope } from "../../utils/subscription";
import {
  Gift, BookOpen, Headphones, Loader2, Save, AlertTriangle, Power, Clock, Info,
  RefreshCw,
} from "lucide-react";

const CONFIG_REF = ["config", "trial"];

const DEFAULTS = {
  enabled: false,
  minOverallBand: 0,
  // ⚠️ `functions/signupDiscount.js` dagi `DISCOUNT_CONFIG.percent` bilan
  // bir xil. Chegirma faqat dastlabki 1 oyni qoplaydi, shuning uchun 20.
  discountPercent: 20,
  discountDays: 7,
  discountCycles: 1,
  stages: {
    reading: { testId: "", durationSeconds: 1200 },
    listening: { testId: "", durationSeconds: 900 },
  },
};

const STAGE_META = {
  reading: { label: "Reading", icon: BookOpen, hint: "Bitta passage li test" },
  listening: { label: "Listening", icon: Headphones, hint: "Bitta section li test" },
};

export default function AdminTrial() {
  // ⚠️ `useTheme()` `isDark` bermaydi — faqat `{ theme, toggleTheme }`.
  // To'g'ridan-to'g'ri `isDark` deb olsak, u har doim `undefined` bo'lib
  // qorong'i rejimda ham yorug' uslublar qo'llanardi.
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [config, setConfig] = useState(DEFAULTS);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regrantUid, setRegrantUid] = useState("");
  const [regranting, setRegranting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [snap, testsSnap] = await Promise.all([
          getDoc(doc(db, ...CONFIG_REF)),
          getDocs(collection(db, "tests")),
        ]);

        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            ...DEFAULTS,
            ...data,
            stages: { ...DEFAULTS.stages, ...(data.stages || {}) },
          });
        }

        setTests(testsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Trial sozlamalarini yuklashda xatolik:", err);
        toast.error("Sozlamalarni yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Tanlash uchun mos testlar: FAQAT bitta bo'lakli.
   *
   * `getTestScope` — obuna mantig'idagi bilan bitta funksiya (`utils/subscription`),
   * ya'ni "part" ta'rifi butun loyihada bir xil. To'liq test tanlansa mehmon
   * 40 ta savolga duch kelardi va landing trafigi o'rtada tashlab ketardi.
   */
  const eligibleTests = useMemo(() => {
    const byType = { reading: [], listening: [] };
    tests.forEach((t) => {
      const type = String(t.type || "").toLowerCase();
      if (type !== "reading" && type !== "listening") return;
      if (getTestScope(t) !== "part") return;
      byType[type].push(t);
    });
    byType.reading.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    byType.listening.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return byType;
  }, [tests]);

  const setStage = (stage, patch) =>
    setConfig((prev) => ({
      ...prev,
      stages: { ...prev.stages, [stage]: { ...prev.stages[stage], ...patch } },
    }));

  const missingTests = !config.stages.reading.testId || !config.stages.listening.testId;

  const handleSave = async () => {
    if (config.enabled && missingTests) {
      toast.error("Trialni yoqishdan oldin ikkala testni ham tanlang");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, ...CONFIG_REF), {
        enabled: Boolean(config.enabled),
        minOverallBand: Number(config.minOverallBand) || 0,
        discountPercent: Number(config.discountPercent) || 0,
        discountDays: Number(config.discountDays) || 0,
        // ⚠️ Bu maydon `functions/trial.js` uchun migratsiya bayrog'i ham:
        // u yozilmagan hujjat "ko'p oylik modeldan oldingi" deb qaraladi va
        // undagi foiz e'tiborsiz qoldiriladi. Shuning uchun har saqlashda
        // yoziladi, hatto qiymat o'zgarmagan bo'lsa ham.
        discountCycles: Number(config.discountCycles) || 1,
        stages: {
          reading: {
            testId: config.stages.reading.testId || null,
            durationSeconds: Number(config.stages.reading.durationSeconds) || 1200,
          },
          listening: {
            testId: config.stages.listening.testId || null,
            durationSeconds: Number(config.stages.listening.durationSeconds) || 900,
          },
        },
      }, { merge: true });
      toast.success("Saqlandi");
    } catch (err) {
      console.error("Trial sozlamalarini saqlashda xatolik:", err);
      toast.error("Saqlab bo'lmadi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Amaldagi taklifni yangi sozlama bilan qayta berish.
  //
  // NEGA KERAK: taklif `users/{uid}.signupDiscount` ga BERILGAN PAYTDAGI
  // raqamlar bilan yoziladi. Sozlama keyin o'zgarsa (3 oy → 2 oy), eski
  // takliflarda 3 qotib qoladi va sayt "dastlabki 3 oy" deb ko'rsatib turadi.
  // Bu tugma o'sha hujjatni hozirgi sozlama bilan qayta yozadi.
  const handleRegrant = async () => {
    const uid = regrantUid.trim();
    if (!uid) {
      toast.error("UID kiritilmagan");
      return;
    }
    setRegranting(true);
    try {
      const call = httpsCallable(functions, "grantSignupDiscount");
      const res = await call({
        uid,
        percent: Number(config.discountPercent) || undefined,
        days: Number(config.discountDays) || undefined,
        cycles: Number(config.discountCycles) || undefined,
        force: true,
      });
      if (res.data?.granted) {
        toast.success(`Taklif qayta berildi: ${config.discountPercent}% × ${config.discountCycles} oy`);
        setRegrantUid("");
      } else {
        // Server sababni aytadi: `used` (chegirma allaqachon sarflangan),
        // `existing_subscriber`, `user_not_found`.
        toast.error(`Berilmadi: ${res.data?.reason || "noma'lum sabab"}`);
      }
    } catch (err) {
      console.error("grantSignupDiscount:", err);
      toast.error(err?.message || "Xatolik");
    } finally {
      setRegranting(false);
    }
  };

  const card = isDark
    ? "bg-zinc-900/50 border-zinc-800"
    : "bg-white border-zinc-200";
  const label = isDark ? "text-zinc-300" : "text-zinc-700";
  const muted = isDark ? "text-zinc-500" : "text-zinc-500";
  const input = isDark
    ? "bg-zinc-950 border-zinc-800 text-zinc-100"
    : "bg-white border-zinc-300 text-zinc-900";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-zinc-400" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      {/* ── Sarlavha ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift size={20} className="text-violet-500" />
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              Bepul trial
            </h1>
          </div>
          <p className={`text-sm ${muted}`}>
            Landing page'dagi mehmonlar uchun test (<code>/trial</code>) va chegirma sozlamalari.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Saqlash
        </button>
      </div>

      {/* ── Yoqish/o'chirish ── */}
      <div className={`rounded-2xl border p-5 mb-4 ${card}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Power size={18} className={config.enabled ? "text-emerald-500" : "text-zinc-400"} />
            <div>
              <div className={`text-sm font-bold ${label}`}>
                Trial {config.enabled ? "yoqilgan" : "o'chirilgan"}
              </div>
              <div className={`text-xs ${muted}`}>
                O'chirilganda <code>/trial</code> sahifasi "hozircha yopiq" deydi.
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
              config.enabled ? "bg-emerald-500" : isDark ? "bg-zinc-700" : "bg-zinc-300"
            }`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              config.enabled ? "left-6" : "left-1"
            }`} />
          </button>
        </div>

        {config.enabled && missingTests && (
          <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Ikkala test tanlanmaguncha trial ishlamaydi.
            </span>
          </div>
        )}
      </div>

      {/* ── Bosqichlar ── */}
      {Object.entries(STAGE_META).map(([stage, meta]) => {
        const Icon = meta.icon;
        const options = eligibleTests[stage];
        const minutes = Math.round((config.stages[stage].durationSeconds || 0) / 60);

        return (
          <div key={stage} className={`rounded-2xl border p-5 mb-4 ${card}`}>
            <div className="flex items-center gap-2 mb-4">
              <Icon size={17} className="text-violet-500" />
              <h2 className={`text-sm font-bold ${label}`}>{meta.label}</h2>
              <span className={`text-xs ${muted}`}>· {meta.hint}</span>
            </div>

            {options.length === 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Bitta bo'lakli {meta.label} testi topilmadi. Avval Tests bo'limida
                  bitta {stage === "reading" ? "passage" : "section"} dan iborat test yarating.
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={config.stages[stage].testId || ""}
                  onChange={(e) => setStage(stage, { testId: e.target.value })}
                  className={`flex-1 min-w-0 px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
                >
                  <option value="">— Test tanlang —</option>
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title || "(nomsiz)"}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 shrink-0">
                  <Clock size={15} className={muted} />
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={minutes}
                    onChange={(e) => setStage(stage, { durationSeconds: Number(e.target.value) * 60 })}
                    className={`w-20 px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
                  />
                  <span className={`text-xs font-medium ${muted}`}>daqiqa</span>
                </div>
              </div>
            )}

            {config.stages[stage].testId && (
              <div className={`mt-2 text-[11px] font-mono ${muted}`}>
                ID: {config.stages[stage].testId}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Chegirma ── */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className={`text-sm font-bold mb-4 ${label}`}>Chegirma</h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${muted}`}>Chegirma (%)</label>
            <input
              type="number" min="0" max="100"
              value={config.discountPercent}
              onChange={(e) => setConfig((p) => ({ ...p, discountPercent: e.target.value }))}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${muted}`}>Necha oyga</label>
            <input
              type="number" min="1" max="12"
              value={config.discountCycles}
              onChange={(e) => setConfig((p) => ({ ...p, discountCycles: e.target.value }))}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
            />
            <p className={`mt-1 text-[11px] ${muted}`}>
              Obunaning dastlabki shuncha oyi chegirmali bo'ladi. Chegirma
              1 oylik tarifda ishlaydi — har to'lov 1 oyni yeydi.
            </p>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${muted}`}>Taklif muddati (kun)</label>
            <input
              type="number" min="1" max="90"
              value={config.discountDays}
              onChange={(e) => setConfig((p) => ({ ...p, discountDays: e.target.value }))}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${muted}`}>Kerakli band</label>
            <input
              type="number" min="0" max="9" step="0.5"
              value={config.minOverallBand}
              onChange={(e) => setConfig((p) => ({ ...p, minOverallBand: e.target.value }))}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Info size={15} className="text-violet-500 shrink-0 mt-0.5" />
          <span className="text-xs text-violet-600 dark:text-violet-400 font-medium leading-relaxed">
            {Number(config.minOverallBand) > 0 ? (
              <>
                Chegirma faqat overall <b>{Number(config.minOverallBand).toFixed(1)}</b> va
                undan yuqori olganlarga beriladi. Qolganlar natijasini va zaif
                tomonlarini ko'radi, lekin chegirmasiz.
              </>
            ) : (
              <>
                Kerakli band <b>0</b> — testni <b>yakunlagan har kim</b> chegirma oladi
                (natijaga emas, harakatga bog'langan model).
              </>
            )}
            {" "}Chegirma <b>1 oylik</b> paketda amal qiladi (3 oylik paket
            {" "}{config.discountCycles} oydan ko'proqni yeydi) va to'lov paytida
            telefon raqami bo'yicha hisoblanadi.
          </span>
        </div>
      </div>

      {/* ── Amaldagi taklifni qayta berish ── */}
      <div className={`rounded-2xl border p-5 mt-4 ${card}`}>
        <h2 className={`text-sm font-bold mb-1.5 ${label}`}>Taklifni qayta berish</h2>
        <p className={`text-[12px] mb-4 ${muted}`}>
          Taklif berilgan paytdagi raqamlar bilan muzlab qoladi. Yuqoridagi
          sozlamani o'zgartirgandan keyin allaqachon chegirma olgan o'quvchida
          eski qiymat (masalan "dastlabki 3 oy") ko'rinib turadi — bu tugma
          uning taklifini hozirgi sozlama bilan qayta yozadi. Avval
          <b> Saqlash</b>ni bosing.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Foydalanuvchi UID"
            value={regrantUid}
            onChange={(e) => setRegrantUid(e.target.value)}
            className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:border-violet-500 ${input}`}
          />
          <button
            onClick={handleRegrant}
            disabled={regranting || !regrantUid.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-violet-500/40 text-violet-500 hover:bg-violet-500/10 text-sm font-bold transition-colors disabled:opacity-50 shrink-0"
          >
            {regranting ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Qayta berish
          </button>
        </div>
        <p className={`mt-2 text-[11px] ${muted}`}>
          Sarflangan oylar reyestrda qoladi — bu tugma chegirmani "qayta
          to'ldirmaydi", faqat taklif shartlarini yangilaydi.
        </p>
      </div>
    </div>
  );
}
