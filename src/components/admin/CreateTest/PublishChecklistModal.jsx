import React from "react";
import { buildAnswerKey } from "./TestDoctor";

const Row = ({ label, value, tone = 'default', isDark }) => {
    const toneCls = tone === 'good'
        ? 'text-green-500'
        : tone === 'warn'
            ? 'text-amber-500'
            : tone === 'bad'
                ? 'text-red-500'
                : (isDark ? 'text-gray-200' : 'text-gray-800');
    return (
        <div className={`flex items-center justify-between gap-3 py-1.5 border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
            <span className="text-[11px] opacity-50 shrink-0">{label}</span>
            <span className={`text-[11px] font-bold text-right truncate ${toneCls}`}>{value}</span>
        </div>
    );
};

/**
 * Saqlashdan oldingi yakuniy tekshiruv — noto'g'ri sozlama bilan publish qilishning oldini oladi.
 */
export default function PublishChecklistModal({
    show, testData, isEditMode, isFree, isMockMode, publishToFeed,
    validation, audioMode, singleAudioUrl, partAudios,
    onConfirm, onCancel, isDark
}) {
    if (!show) return null;

    const type = testData.type;
    const passages = testData.passages || [];
    const answers = buildAnswerKey(testData);
    const missingAnswers = answers.filter(a => a.missing).length;
    const errors = validation?.errors || [];
    const warnings = validation?.warnings || [];

    const hasAudio = type !== 'listening'
        ? null
        : (audioMode === 'single' ? !!singleAudioUrl : Object.values(partAudios || {}).some(Boolean));

    const card = isDark ? 'bg-[#1f1e1b] border-white/10' : 'bg-white border-gray-200';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md max-h-[90dvh] rounded-2xl shadow-2xl border overflow-hidden ${card}`}>
                <div className="p-4 sm:p-6">
                    <h3 className="text-sm font-black tracking-tight">
                        {isEditMode ? "O'zgarishlarni saqlash" : "Testni yaratish"}
                    </h3>
                    <p className="text-xs mt-0.5 mb-4 opacity-50">Saqlashdan oldin sozlamalarni tekshiring.</p>

                    <div className={`rounded-xl p-3 mb-4 ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                        <Row isDark={isDark} label="Nomi" value={testData.title?.trim() || "— yo'q —"} tone={testData.title?.trim() ? 'default' : 'bad'} />
                        <Row isDark={isDark} label="Turi / daraja" value={`${type || '—'} · ${testData.difficulty || 'medium'}`} />
                        {(type === 'reading' || type === 'listening') && (
                            <>
                                <Row
                                    isDark={isDark}
                                    label={type === 'reading' ? "Passage-lar" : "Part-lar"}
                                    value={`${passages.length} ta`}
                                    tone={passages.length === (type === 'reading' ? 3 : 4) ? 'good' : 'warn'}
                                />
                                <Row
                                    isDark={isDark}
                                    label="Savollar"
                                    value={`${answers.length} ta${missingAnswers ? ` · ${missingAnswers} ta javobsiz` : ''}`}
                                    tone={missingAnswers ? 'bad' : answers.length === 40 ? 'good' : 'warn'}
                                />
                            </>
                        )}
                        {hasAudio !== null && (
                            <Row isDark={isDark} label="Audio" value={hasAudio ? "Biriktirilgan" : "Yo'q"} tone={hasAudio ? 'good' : 'bad'} />
                        )}
                        <Row isDark={isDark} label="Kirish" value={isFree ? "Bepul (hammaga)" : "Pullik / obuna"} tone={isFree ? 'warn' : 'default'} />
                        <Row isDark={isDark} label="Mock rejimi" value={isMockMode ? "Yoqilgan (exclusive)" : "O'chirilgan"} tone={isMockMode ? 'warn' : 'default'} />
                        {!isEditMode && (
                            <Row isDark={isDark} label="Feed'ga e'lon" value={publishToFeed ? "Ha, post yaratiladi" : "Yo'q"} tone={publishToFeed ? 'warn' : 'default'} />
                        )}
                        <Row
                            isDark={isDark}
                            label="Sifat kontroli"
                            value={errors.length ? `${errors.length} ta xato` : warnings.length ? `${warnings.length} ta ogohlantirish` : "Toza"}
                            tone={errors.length ? 'bad' : warnings.length ? 'warn' : 'good'}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className={`flex-1 h-10 rounded-xl text-sm font-bold border transition active:scale-95 ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        >
                            Qaytish
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 h-10 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95"
                        >
                            {isEditMode ? "Saqlash" : "Yaratish"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
