import React, { useMemo, useState } from 'react';
import {
    addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { Eye, EyeOff, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { db } from '../../firebase/firebase';
import { useTheme } from '../../context/ThemeContext';
import { normalizeSpotlight, SPOTLIGHTS_COLLECTION, usePromoSpotlights } from '../../hooks/usePromoSpotlights';
import { invalidateSpotlightNotice } from '../../hooks/useSpotlightNotice';
import PromoSpotlight from '../../components/dashboard/PromoSpotlight';
import { PROMO_SPOTLIGHTS } from '../../data/promoSpotlights';

const PREVIEW_KINDS = [
    { value: 'tfng', label: 'Reading · True / False / Not Given' },
    { value: 'mcq', label: 'Listening · Multiple Choice' },
    { value: 'gapfill', label: 'Reading · Sentence Completion' },
];

const ACCENTS = ['#cc785c', '#5db8a6', '#e8a55a', '#5db872', '#0071e3', '#c64545', '#141413'];

const MODES = [
    { value: 'both', label: "E'lon + savol", hint: 'Ikki ustunli' },
    { value: 'promo', label: "Faqat e'lon", hint: 'Aksiya, yangilik' },
    { value: 'question', label: 'Faqat savol', hint: 'Savol parchasi' },
];

const EMPTY_FORM = {
    mode: 'both',
    tag: 'Yangi',
    accent: '#cc785c',
    title: '',
    description: '',
    ctaLabel: '',
    ctaTo: '/practice',
    secondaryLabel: '',
    secondaryTo: '',
    order: 0,
    isActive: true,
    // Tahrirlashda: slaydni qayta "yangi" qilib belgilash (badge + eslatma).
    // Yangi slayd baribir yangi hisoblanadi, shuning uchun u yerda ko'rinmaydi.
    republish: false,
    preview: {
        kind: 'tfng',
        label: 'Reading · True / False / Not Given',
        passage: '',
        statement: '',
        question: '',
        audioLine: '',
        transcriptHint: '',
        before: '',
        after: '.',
        optionsText: 'True\nFalse\nNot Given',
        answer: '',
        explanation: '',
    },
};

/** Firestore hujjatini → forma holatiga. */
function docToForm(slide) {
    return {
        mode: slide.mode || 'both',
        tag: slide.tag,
        accent: slide.accent,
        title: slide.title,
        description: slide.description,
        ctaLabel: slide.cta.label,
        ctaTo: slide.cta.to,
        secondaryLabel: slide.secondary?.label || '',
        secondaryTo: slide.secondary?.to || '',
        order: slide.order,
        isActive: slide.isActive,
        republish: false,
        preview: { ...slide.preview, optionsText: (slide.preview.options || []).join('\n') },
    };
}

/** Forma holatini → Firestore hujjatiga. */
function formToDoc(form) {
    const { optionsText, ...preview } = form.preview;
    return {
        mode: form.mode || 'both',
        tag: form.tag.trim(),
        accent: form.accent,
        title: form.title.trim(),
        description: form.description.trim(),
        ctaLabel: form.ctaLabel.trim(),
        ctaTo: form.ctaTo.trim(),
        secondaryLabel: form.secondaryLabel.trim(),
        secondaryTo: form.secondaryTo.trim(),
        order: Number(form.order) || 0,
        isActive: !!form.isActive,
        preview: {
            ...preview,
            options: (optionsText || '').split('\n').map(s => s.trim()).filter(Boolean),
        },
    };
}

export default function AdminSpotlights() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { slides, loading, refresh } = usePromoSpotlights({ includeInactive: true });

    const [editing, setEditing] = useState(null); // { id | null, form }
    const [saving, setSaving] = useState(false);

    const card = isDark ? 'bg-[#1f1e1b] border-white/5' : 'bg-white border-gray-200 shadow-sm';
    const input = `w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 transition-all ${
        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
    }`;
    const label = `block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`;

    const openNew = () => setEditing({ id: null, form: { ...EMPTY_FORM, order: slides.length } });
    const openEdit = (slide) => setEditing({ id: slide.id, form: docToForm(slide) });

    const setForm = (patch) => setEditing(prev => ({ ...prev, form: { ...prev.form, ...patch } }));
    const setPreview = (patch) => setEditing(prev => ({
        ...prev, form: { ...prev.form, preview: { ...prev.form.preview, ...patch } },
    }));

    // Modaldagi jonli ko'rinish — o'quvchi ko'radigan komponentning aynan o'zi.
    const livePreview = useMemo(() => {
        if (!editing) return null;
        const payload = formToDoc(editing.form);
        return [normalizeSpotlight(editing.id || 'preview', payload)];
    }, [editing]);

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = formToDoc(editing.form);
        // Talablar rejimga bog'liq: faqat savol chiqadigan slaydda sarlavha shart emas.
        if (payload.mode !== 'question') {
            if (!payload.title) return alert('Sarlavha kiritilishi shart.');
            if (!payload.ctaLabel) return alert('Asosiy tugma matni kiritilishi shart.');
        } else if (!payload.preview.answer) {
            return alert("To'g'ri javob kiritilishi shart.");
        }

        setSaving(true);
        try {
            if (editing.id) {
                // `publishedAt` faqat "qayta e'lon qilish" belgilanganda yangilanadi —
                // oddiy tahrir o'quvchilarga bildirishnoma yubormaydi.
                await updateDoc(doc(db, SPOTLIGHTS_COLLECTION, editing.id), {
                    ...payload,
                    ...(editing.form.republish ? { publishedAt: serverTimestamp() } : {}),
                    updatedAt: serverTimestamp(),
                });
            } else {
                await addDoc(collection(db, SPOTLIGHTS_COLLECTION), {
                    ...payload,
                    publishedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
            setEditing(null);
            invalidateSpotlightNotice();
            await refresh();
        } catch (err) {
            alert('Saqlashda xatolik: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (slide) => {
        try {
            await updateDoc(doc(db, SPOTLIGHTS_COLLECTION, slide.id), {
                isActive: !slide.isActive, updatedAt: serverTimestamp(),
            });
            invalidateSpotlightNotice();
            await refresh();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    const handleDelete = async (slide) => {
        if (!window.confirm(`"${slide.title}" slaydi o'chirilsinmi?`)) return;
        try {
            await deleteDoc(doc(db, SPOTLIGHTS_COLLECTION, slide.id));
            invalidateSpotlightNotice();
            await refresh();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    /** Kolleksiya bo'sh bo'lganda — koddagi 3 ta namunani bir bosishda yuklash. */
    const seedDefaults = async () => {
        if (!window.confirm("Koddagi 3 ta namunaviy slayd Firestore'ga qo'shilsinmi?")) return;
        setSaving(true);
        try {
            for (const [i, s] of PROMO_SPOTLIGHTS.entries()) {
                await addDoc(collection(db, SPOTLIGHTS_COLLECTION), {
                    ...formToDoc(docToForm(s)),
                    order: i,
                    isActive: true,
                    publishedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
            invalidateSpotlightNotice();
            await refresh();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const kind = editing?.form.preview.kind;
    const mode = editing?.form.mode || 'both';
    const showPromo = mode !== 'question';
    const showQuestion = mode !== 'promo';

    return (
        <div className={`min-h-full font-sans p-4 md:p-6 transition-colors ${isDark ? 'bg-[#181715] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 md:mb-8 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-white border border-gray-200'}`}>
                            <Megaphone size={20} className="text-[#cc785c]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-bold">Bosh sahifa spotlight</h1>
                            <p className={`text-xs md:text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                Aksiyalar va savol parchalari — o'quvchi dashboardining tepasida
                            </p>
                        </div>
                    </div>
                    <button onClick={openNew} className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition">
                        <Plus size={16} /> Yangi slayd
                    </button>
                </div>

                {/* Ro'yxat */}
                {loading ? (
                    <div className={`text-center py-16 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Yuklanmoqda...</div>
                ) : slides.length === 0 ? (
                    <div className={`text-center py-16 rounded-3xl border border-dashed ${isDark ? 'border-white/10 text-white/40' : 'border-gray-300 text-gray-500 bg-white'}`}>
                        <p className="mb-4 text-sm">Hozircha slayd yo'q — bosh sahifada bu bo'lim ko'rinmaydi.</p>
                        <button onClick={seedDefaults} disabled={saving} className="text-sm font-bold text-blue-500 hover:underline disabled:opacity-50">
                            Namunaviy 3 ta slaydni yuklash
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {slides.map((slide) => (
                            <div key={slide.id} className={`p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${card} ${!slide.isActive ? 'opacity-60' : ''}`}>
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <span className={`w-8 h-8 shrink-0 rounded-lg text-[11px] font-bold flex items-center justify-center ${isDark ? 'bg-white/5 text-white/40' : 'bg-gray-100 text-gray-500'}`}>
                                        {slide.order}
                                    </span>
                                    <span className="w-2.5 h-10 rounded-full shrink-0" style={{ backgroundColor: slide.accent }} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold truncate">
                                                {slide.title
                                                    || slide.preview.statement
                                                    || slide.preview.question
                                                    || slide.preview.before
                                                    || '(sarlavhasiz)'}
                                            </h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`}>
                                                {slide.tag}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isDark ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                                {MODES.find(m => m.value === slide.mode)?.label || slide.mode}
                                            </span>
                                            {slide.mode !== 'promo' && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isDark ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                                    {PREVIEW_KINDS.find(k => k.value === slide.preview.kind)?.label || slide.preview.kind}
                                                </span>
                                            )}
                                            {!slide.isActive && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-500">
                                                    O'chirilgan
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs mt-1 truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{slide.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                                    <button onClick={() => toggleActive(slide)} title={slide.isActive ? "O'chirish" : 'Yoqish'}
                                        className={`p-2 rounded-lg transition ${isDark ? 'text-white/40 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}>
                                        {slide.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button onClick={() => openEdit(slide)} title="Tahrirlash"
                                        className={`p-2 rounded-lg transition ${isDark ? 'text-white/40 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}>
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(slide)} title="O'chirish"
                                        className={`p-2 rounded-lg transition ${isDark ? 'text-white/20 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: yaratish / tahrirlash */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 p-3 sm:p-4 backdrop-blur-sm">
                    <div className={`w-full max-w-3xl max-h-[92dvh] overflow-y-auto my-4 sm:my-8 rounded-2xl sm:rounded-3xl border p-4 sm:p-6 ${isDark ? 'bg-[#1f1e1b] border-white/10' : 'bg-white border-gray-100 shadow-2xl'}`}>
                        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-bold">{editing.id ? 'Slaydni tahrirlash' : 'Yangi slayd'}</h2>
                            <button onClick={() => setEditing(null)} className={isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-700'}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            {/* Slaydda nima ko'rinadi */}
                            <div>
                                <label className={label}>Slayd tarkibi</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {MODES.map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => setForm({ mode: m.value })}
                                            className={`p-3 rounded-xl border text-left transition ${
                                                editing.form.mode === m.value
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : isDark ? 'bg-white/5 text-white/50 border-white/10' : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            <span className="block text-[13px] font-bold">{m.label}</span>
                                            <span className={`block text-[11px] ${editing.form.mode === m.value ? 'text-white/70' : 'opacity-70'}`}>{m.hint}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={label}>Tag</label>
                                    <input className={input} value={editing.form.tag} onChange={e => setForm({ tag: e.target.value })} placeholder="Yangi" />
                                </div>
                                <div>
                                    <label className={label}>Tartib (order)</label>
                                    <input type="number" className={input} value={editing.form.order} onChange={e => setForm({ order: e.target.value })} />
                                </div>
                                <div>
                                    <label className={label}>Rang</label>
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                        {ACCENTS.map(c => (
                                            <button key={c} type="button" onClick={() => setForm({ accent: c })}
                                                style={{ backgroundColor: c }}
                                                className={`w-6 h-6 rounded-full transition ${editing.form.accent === c ? 'ring-2 ring-offset-2 ring-blue-500 ' + (isDark ? 'ring-offset-[#1f1e1b]' : 'ring-offset-white') : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {showPromo && (
                                <>
                                    <div>
                                        <label className={label}>Sarlavha *</label>
                                        <input className={input} value={editing.form.title} onChange={e => setForm({ title: e.target.value })} placeholder="Avgust Mock Exam ochildi" required />
                                    </div>
                                    <div>
                                        <label className={label}>Tavsif</label>
                                        <textarea className={`${input} h-20 resize-none`} value={editing.form.description} onChange={e => setForm({ description: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>Tugma matni {showPromo ? '*' : '(ixtiyoriy havola)'}</label>
                                    <input className={input} value={editing.form.ctaLabel} onChange={e => setForm({ ctaLabel: e.target.value })} placeholder="Mockni boshlash" required={showPromo} />
                                </div>
                                <div>
                                    <label className={label}>Tugma manzili</label>
                                    <input className={input} value={editing.form.ctaTo} onChange={e => setForm({ ctaTo: e.target.value })} placeholder="/mock" />
                                </div>
                                {showPromo && (
                                    <>
                                        <div>
                                            <label className={label}>Ikkilamchi tugma (ixtiyoriy)</label>
                                            <input className={input} value={editing.form.secondaryLabel} onChange={e => setForm({ secondaryLabel: e.target.value })} placeholder="Qanday o'tadi?" />
                                        </div>
                                        <div>
                                            <label className={label}>Ikkilamchi tugma manzili</label>
                                            <input className={input} value={editing.form.secondaryTo} onChange={e => setForm({ secondaryTo: e.target.value })} placeholder="/practice" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Savol parchasi */}
                            <div className={`rounded-2xl border p-4 space-y-4 ${showQuestion ? '' : 'hidden'} ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                                <div>
                                    <label className={label}>Savol turi</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {PREVIEW_KINDS.map(k => (
                                            <button key={k.value} type="button"
                                                onClick={() => setPreview({
                                                    kind: k.value,
                                                    label: k.label,
                                                    optionsText: k.value === 'tfng' ? 'True\nFalse\nNot Given' : editing.form.preview.optionsText,
                                                })}
                                                className={`p-2.5 rounded-xl border text-[11px] font-bold transition ${
                                                    kind === k.value
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-white text-gray-500 border-gray-200'
                                                }`}>
                                                {k.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className={label}>Yorliq (savol ustidagi matn)</label>
                                    <input className={input} value={editing.form.preview.label} onChange={e => setPreview({ label: e.target.value })} />
                                </div>

                                {kind !== 'mcq' && (
                                    <div>
                                        <label className={label}>Matn parchasi (passage)</label>
                                        <textarea className={`${input} h-24 resize-none`} value={editing.form.preview.passage} onChange={e => setPreview({ passage: e.target.value })} />
                                    </div>
                                )}

                                {kind === 'mcq' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
                                        <div>
                                            <label className={label}>Audio qatori</label>
                                            <input className={input} value={editing.form.preview.audioLine} onChange={e => setPreview({ audioLine: e.target.value })} placeholder="Part 2 · 01:14" />
                                        </div>
                                        <div>
                                            <label className={label}>Transkript parchasi</label>
                                            <input className={input} value={editing.form.preview.transcriptHint} onChange={e => setPreview({ transcriptHint: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                {kind === 'tfng' && (
                                    <div>
                                        <label className={label}>Statement</label>
                                        <input className={input} value={editing.form.preview.statement} onChange={e => setPreview({ statement: e.target.value })} />
                                    </div>
                                )}

                                {kind === 'mcq' && (
                                    <div>
                                        <label className={label}>Savol</label>
                                        <input className={input} value={editing.form.preview.question} onChange={e => setPreview({ question: e.target.value })} />
                                    </div>
                                )}

                                {kind === 'gapfill' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-4">
                                        <div>
                                            <label className={label}>Gap boshi (bo'sh joydan oldin)</label>
                                            <input className={input} value={editing.form.preview.before} onChange={e => setPreview({ before: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={label}>Oxiri</label>
                                            <input className={input} value={editing.form.preview.after} onChange={e => setPreview({ after: e.target.value })} placeholder="." />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className={label}>Variantlar (har biri yangi qatorda)</label>
                                        <textarea className={`${input} h-24 resize-none font-mono text-xs`} value={editing.form.preview.optionsText} onChange={e => setPreview({ optionsText: e.target.value })} />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={label}>To'g'ri javob</label>
                                        <input className={input} value={editing.form.preview.answer} onChange={e => setPreview({ answer: e.target.value })} placeholder={kind === 'gapfill' ? 'sun' : 'False'} />
                                    </div>
                                    <div>
                                        <label className={label}>Izoh (javobdan keyin)</label>
                                        <input className={input} value={editing.form.preview.explanation} onChange={e => setPreview({ explanation: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Jonli ko'rinish */}
                            <div>
                                <label className={label}>O'quvchi ko'radigan ko'rinish</label>
                                <div className={`rounded-3xl p-4 ${isDark ? 'bg-warm-dark' : 'bg-warm-canvas'}`}>
                                    <PromoSpotlight slides={livePreview} />
                                </div>
                            </div>

                            {/* Bildirishnoma: yangi slayd avtomatik "yangi" bo'ladi,
                                mavjudini qayta e'lon qilish esa ixtiyoriy. */}
                            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                                {editing.id ? (
                                    <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 mt-0.5 accent-blue-600"
                                            checked={!!editing.form.republish}
                                            onChange={e => setForm({ republish: e.target.checked })}
                                        />
                                        <span>
                                            <span className="font-bold">Qayta e'lon qilish</span>
                                            <span className={`block text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                Menyudagi "Yangi" belgisi qaytadan yonadi va o'quvchilarga bir martalik
                                                eslatma chiqadi. Oddiy tahrirda buni belgilamang.
                                            </span>
                                        </span>
                                    </label>
                                ) : (
                                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                        Saqlanganda o'quvchilarning menyusida "Yangi" belgisi paydo bo'ladi va ular qaysi
                                        sahifada bo'lsa ham bir martalik eslatma ko'radi.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-2">
                                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={editing.form.isActive} onChange={e => setForm({ isActive: e.target.checked })} />
                                    Bosh sahifada ko'rsatilsin
                                </label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditing(null)} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                        Bekor qilish
                                    </button>
                                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                                        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
