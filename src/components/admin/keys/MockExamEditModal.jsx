// src/components/admin/keys/MockExamEditModal.jsx
//
// Mock imtihon tarkibini tahrirlash.
//
// Muhim nuqta: kalit yaratilganda unga modul id'lari NUSXA qilib yoziladi
// (`assignedTests`) — `verifyAccessKey` faollashtirishda aynan o'sha nusxadan
// foydalanadi. Ya'ni mockni o'zgartirish avval tarqatilgan kalitlarga o'z-o'zidan
// ta'sir qilmaydi. Shu sababli "faollashmagan kalitlarni ham yangilash" varianti
// bor — aks holda admin o'zgartirdim deb o'ylab, eski testni tarqatib yuboradi.

import React, { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { X, Loader2, Save, Info } from "lucide-react";
import { db } from "../../../firebase/firebase";
import SearchableTestSelect from "./SearchableTestSelect";

export default function MockExamEditModal({
  open,
  mock,
  collections,
  availableTests,
  unusedKeysCount = 0,
  isDark,
  onClose,
  onSaved,
  onSyncUnusedKeys,
}) {
  const [title, setTitle] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [modules, setModules] = useState({ reading: "", listening: "", writing: "" });
  const [syncKeys, setSyncKeys] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !mock) return;
    setTitle(mock.title || "");
    setCollectionId(mock.collectionId || "");
    setModules({
      reading: mock.subTests?.readingId || "",
      listening: mock.subTests?.listeningId || "",
      writing: mock.subTests?.writingId || "",
    });
    setSyncKeys(true);
  }, [open, mock]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open || !mock) return null;

  const modulesChanged =
    modules.reading !== (mock.subTests?.readingId || "") ||
    modules.listening !== (mock.subTests?.listeningId || "") ||
    modules.writing !== (mock.subTests?.writingId || "");

  const isComplete = modules.reading && modules.listening && modules.writing;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Mock imtihon nomini kiriting");
      return;
    }
    if (!isComplete) {
      toast.error("Reading, Listening va Writing — uchalasini ham tanlang");
      return;
    }

    setSaving(true);
    try {
      const subTests = {
        readingId: modules.reading,
        listeningId: modules.listening,
        writingId: modules.writing,
      };
      const payload = {
        title: title.trim(),
        collectionId: collectionId || null,
        subTests,
        updatedAt: new Date().toISOString(),
      };

      // metadata hujjati mavjud bo'lmasligi mumkin — update emas, merge.
      await Promise.all([
        setDoc(doc(db, "tests", mock.id), payload, { merge: true }),
        setDoc(doc(db, "tests_metadata", mock.id), { id: mock.id, type: "mock", ...payload }, { merge: true }),
      ]);

      if (collectionId) {
        await setDoc(doc(db, "test_collections", collectionId), { subTests }, { merge: true });
      }

      let syncedCount = 0;
      if (syncKeys && modulesChanged && onSyncUnusedKeys) {
        syncedCount = await onSyncUnusedKeys({ mockId: mock.id, subTests, title: payload.title, collectionId: payload.collectionId });
      }

      toast.success(syncedCount ? `Saqlandi • ${syncedCount} ta kalit yangilandi` : "Mock imtihon yangilandi");
      onSaved?.({ ...mock, ...payload });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Saqlashda xatolik: " + (e?.message || "noma'lum"));
    } finally {
      setSaving(false);
    }
  };

  const labelCls = `block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`;
  const inputCls = `w-full border p-3 rounded-xl outline-none text-xs font-bold transition-all ${
    isDark ? "bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100" : "bg-zinc-50 border-zinc-200 focus:border-zinc-400 text-zinc-800"
  }`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-content-in ${
          isDark ? "bg-[#141416] border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
        }`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
          <h3 className="text-sm font-black tracking-tight">Mock imtihonni tahrirlash</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className={`p-1.5 rounded-lg transition ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}
            aria-label="Yopish"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className={labelCls}>Nomi</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mock exam nomi" />
          </div>

          <div>
            <label className={labelCls}>To'plam</label>
            <select className={inputCls} value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
              <option value="">To'plamsiz</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  🎓 {c.name}
                </option>
              ))}
            </select>
          </div>

          <SearchableTestSelect
            label="Reading"
            type="reading"
            options={availableTests.reading}
            value={modules.reading}
            onChange={(v) => setModules((p) => ({ ...p, reading: v }))}
            placeholder="Reading testini tanlang..."
            isDark={isDark}
            error={!modules.reading}
            compact
          />
          <SearchableTestSelect
            label="Listening"
            type="listening"
            options={availableTests.listening}
            value={modules.listening}
            onChange={(v) => setModules((p) => ({ ...p, listening: v }))}
            placeholder="Listening testini tanlang..."
            isDark={isDark}
            error={!modules.listening}
            compact
          />
          <SearchableTestSelect
            label="Writing"
            type="writing"
            options={availableTests.writing}
            value={modules.writing}
            onChange={(v) => setModules((p) => ({ ...p, writing: v }))}
            placeholder="Writing testini tanlang..."
            isDark={isDark}
            error={!modules.writing}
            compact
          />

          {modulesChanged && unusedKeysCount > 0 && (
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                isDark ? "bg-blue-500/5 border-blue-500/25" : "bg-blue-50/60 border-blue-200"
              }`}
            >
              <input
                type="checkbox"
                checked={syncKeys}
                onChange={(e) => setSyncKeys(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-blue-600 shrink-0"
              />
              <span className="text-[11px] font-semibold leading-relaxed">
                Faollashmagan {unusedKeysCount} ta kalit ham yangi testlarga bog'lansin.
                <span className={`block mt-1 font-bold ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                  Belgilanmasa, tarqatilgan kalitlar eski testlarni ochaveradi.
                </span>
              </span>
            </label>
          )}

          <p className={`flex items-start gap-2 text-[10px] font-semibold leading-relaxed ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            <Info size={12} className="mt-0.5 shrink-0" />
            Allaqachon ishlatilgan kalitlarga o'zgarish ta'sir qilmaydi — talaba boshlagan imtihon o'zgarmasligi kerak.
          </p>
        </div>

        <div className={`px-6 py-4 border-t flex gap-2.5 ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
          <button
            onClick={onClose}
            disabled={saving}
            className={`flex-1 h-10 rounded-xl text-xs font-bold border transition active:scale-95 disabled:opacity-50 ${
              isDark ? "border-zinc-800 hover:bg-zinc-800/60 text-zinc-300" : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
            }`}
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isComplete || !title.trim()}
            className={`flex-1 h-10 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 ${
              isDark ? "bg-zinc-100 hover:bg-white text-zinc-900" : "bg-zinc-900 hover:bg-zinc-950 text-white"
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
