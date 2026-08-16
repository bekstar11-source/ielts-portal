import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../firebase/firebase';
import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    FaTimes, FaTrash, FaCheck, FaLink, FaImage
} from 'react-icons/fa';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import MaterialSelectorModal from './MaterialSelectorModal';

export default function StoryFormModal({
    isOpen,
    onClose,
    onSubmitSuccess
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [uploading, setUploading] = useState(false);
    const [storyForm, setStoryForm] = useState({
        mediaType: 'image', // 'image' | 'video' | 'text'
        text: '',
        ctaUrl: '',
        ctaText: '',
        durationHours: '24',
        mediaFile: null,
        // Sticker States
        interactiveType: 'none', // 'none' | 'quiz' | 'poll'
        stickerQuestion: '',
        stickerOptions: ['', ''],
        correctOptionIndex: '0'
    });

    const [storyMediaPreview, setStoryMediaPreview] = useState("");
    const [showMaterialSelector, setShowMaterialSelector] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStoryForm({
                mediaType: 'image',
                text: '',
                ctaUrl: '',
                ctaText: '',
                durationHours: '24',
                mediaFile: null,
                interactiveType: 'none',
                stickerQuestion: '',
                stickerOptions: ['', ''],
                correctOptionIndex: '0'
            });
            setStoryMediaPreview("");
        }
    }, [isOpen]);

    const handleSelectMaterial = (item, type) => {
        let url = "";
        let text = "";
        
        if (type === 'tests') {
            url = `/test/${item.id}`;
            text = "Testni Boshlash";
        } else if (type === 'podcasts') {
            url = `/podcast/spotify/${item.id}`;
            text = "Podcastni Eshitish";
        } else if (type === 'articles') {
            url = `/article/${item.id}`;
            text = "Maqolani O'qish";
        }

        const itemMediaUrl = item.thumbnail || item.image || item.coverUrl || "";
        setStoryForm(prev => ({
            ...prev,
            ctaUrl: url,
            ctaText: text,
            text: prev.text || item.title
        }));
        if (itemMediaUrl) {
            setStoryMediaPreview(itemMediaUrl);
        } else {
            setStoryMediaPreview("");
        }
        setShowMaterialSelector(false);
    };

    const handleUpdateStickerOption = (index, value) => {
        const updated = [...storyForm.stickerOptions];
        updated[index] = value;
        setStoryForm({ ...storyForm, stickerOptions: updated });
    };

    const handleAddStickerOption = () => {
        if (storyForm.stickerOptions.length < 4) {
            setStoryForm({
                ...storyForm,
                stickerOptions: [...storyForm.stickerOptions, '']
            });
        }
    };

    const handleRemoveStickerOption = (index) => {
        if (storyForm.stickerOptions.length > 2) {
            const updated = storyForm.stickerOptions.filter((_, i) => i !== index);
            setStoryForm({
                ...storyForm,
                stickerOptions: updated,
                correctOptionIndex: parseInt(storyForm.correctOptionIndex) >= updated.length ? '0' : storyForm.correctOptionIndex
            });
        }
    };

    const handleCreateStory = async (e) => {
        e.preventDefault();
        if (storyForm.mediaType !== 'text' && !storyForm.mediaFile) {
            return toast.error("Media fayl tanlanishi shart!");
        }
        if (storyForm.mediaType === 'text' && !storyForm.text) {
            return toast.error("Matnli hikoya uchun matn kiritilishi shart!");
        }

        if (storyForm.interactiveType !== 'none') {
            if (!storyForm.stickerQuestion.trim()) {
                return toast.error("Sticker savolini kiritish majburiy!");
            }
            const activeOptions = storyForm.stickerOptions.filter(o => o.trim() !== "");
            if (activeOptions.length < 2) {
                return toast.error("Kamida 2 ta javob varianti bo'lishi shart!");
            }
        }

        setUploading(true);
        try {
            let mediaUrl = "";

            if (storyForm.mediaFile && storyForm.mediaType !== 'text') {
                const fileRef = ref(storage, `stories/${Date.now()}_${storyForm.mediaFile.name}`);
                const metadata = { cacheControl: 'public,max-age=31536000' };
                const uploadSnap = await uploadBytes(fileRef, storyForm.mediaFile, metadata);
                mediaUrl = await getDownloadURL(uploadSnap.ref);
            }

            const durationHours = parseInt(storyForm.durationHours) || 24;
            const expiresAt = durationHours === 9999 
                ? null 
                : Timestamp.fromDate(new Date(Date.now() + durationHours * 60 * 60 * 1000));

            const docData = {
                mediaType: storyForm.mediaType,
                text: storyForm.text,
                createdAt: serverTimestamp(),
                expiresAt,
                active: true
            };

            if (mediaUrl) docData.mediaUrl = mediaUrl;
            if (storyForm.ctaUrl) {
                docData.ctaUrl = storyForm.ctaUrl;
                docData.ctaText = storyForm.ctaText || "Ko'rish";
            }

            if (storyForm.interactiveType !== 'none') {
                const activeOptions = storyForm.stickerOptions.filter(o => o.trim() !== "");
                const votesMap = {};
                activeOptions.forEach((_, i) => {
                    votesMap[i] = 0;
                });
                
                docData.interactiveData = {
                    type: storyForm.interactiveType,
                    question: storyForm.stickerQuestion.trim(),
                    options: activeOptions,
                    correctIndex: storyForm.interactiveType === 'quiz' ? parseInt(storyForm.correctOptionIndex) : null,
                    votes: votesMap
                };
            }

            await addDoc(collection(db, 'stories'), docData);
            toast.success("Story chop etildi! 📸");
            onSubmitSuccess();
            onClose();
        } catch (err) {
            console.error("Error creating story:", err);
            toast.error("Story yaratishda xatolik yuz berdi.");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain">
            <div className={`w-full max-w-5xl max-h-[90dvh] overflow-y-auto rounded-3xl p-4 sm:p-6 border relative transition-colors grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 my-4 sm:my-8 ${
                isDark ? 'bg-[#1f1e1b] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
            }`}>
                <button 
                    onClick={onClose} 
                    className={`absolute top-4 right-4 hover:opacity-80 transition-opacity z-10 ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                >
                    <FaTimes />
                </button>

                {/* Left Side: Form */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold mb-4 pr-8">Yangicha Admin Story Yaratish</h2>
                        <form onSubmit={handleCreateStory} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Story Turi</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'image', label: '🖼️ Rasm' },
                                        { id: 'video', label: '🎥 Video' },
                                        { id: 'text', label: '✍️ Faqat Matn' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setStoryForm({ ...storyForm, mediaType: type.id, mediaFile: null })}
                                            className={`py-2 rounded-xl text-xs font-bold transition border ${
                                                storyForm.mediaType === type.id 
                                                    ? 'bg-pink-600 text-white border-pink-600 shadow-sm' 
                                                    : (isDark ? 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10' : 'bg-white border-gray-250 text-gray-500 hover:bg-gray-50')
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {storyForm.mediaType !== 'text' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Fayl yuklash</label>
                                    <input
                                        type="file"
                                        accept={storyForm.mediaType === 'video' ? 'video/*' : 'image/*'}
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            setStoryForm({ ...storyForm, mediaFile: file });
                                            if (file) {
                                                setStoryMediaPreview(URL.createObjectURL(file));
                                            } else {
                                                setStoryMediaPreview("");
                                            }
                                        }}
                                        className="text-xs w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-600 file:text-white hover:file:bg-pink-500"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Hikoya Matni / Caption</label>
                                <textarea
                                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-500 transition-all h-20 resize-none ${
                                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                    }`}
                                    placeholder={storyForm.mediaType === 'text' ? 'Story uchun matn yozing...' : 'Rasm/Video ustiga yoziladigan matn...'}
                                    value={storyForm.text}
                                    onChange={e => setStoryForm({ ...storyForm, text: e.target.value })}
                                    required={storyForm.mediaType === 'text'}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold uppercase text-gray-400">CTA Link (Ixtiyoriy)</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowMaterialSelector(true)}
                                            className="text-[10px] text-pink-500 hover:text-pink-400 font-bold transition flex items-center gap-1"
                                        >
                                            🔍 Material tanlash
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-500 transition ${
                                            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                        }`}
                                        placeholder="/test/ID, /podcast/ID yoki /article/ID"
                                        value={storyForm.ctaUrl}
                                        onChange={e => setStoryForm({ ...storyForm, ctaUrl: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1 text-gray-400">CTA Matni</label>
                                    <input
                                        type="text"
                                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-500 transition ${
                                            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                        }`}
                                        placeholder="Masalan: Testni Boshlash"
                                        value={storyForm.ctaText}
                                        onChange={e => setStoryForm({ ...storyForm, ctaText: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Interactive Sticker Section */}
                            <div className="border border-gray-200 dark:border-white/5 rounded-2xl p-4 space-y-4">
                                <h4 className="text-xs font-black text-pink-500 uppercase tracking-widest text-left">Interaktiv Sticker (So'rovnoma / Quiz)</h4>
                                
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Sticker Turi</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'none', label: '❌ Oddiy' },
                                            { id: 'quiz', label: '📝 Quiz (Test)' },
                                            { id: 'poll', label: '📊 Poll (So\'rovnoma)' }
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setStoryForm({ ...storyForm, interactiveType: type.id })}
                                                className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                                                    storyForm.interactiveType === type.id 
                                                        ? 'bg-pink-600 text-white border-pink-600 shadow-sm' 
                                                        : (isDark ? 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10' : 'bg-white border-gray-250 text-gray-500 hover:bg-gray-50')
                                                }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {storyForm.interactiveType !== 'none' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Sticker Savoli</label>
                                            <input
                                                type="text"
                                                value={storyForm.stickerQuestion}
                                                onChange={e => setStoryForm({ ...storyForm, stickerQuestion: e.target.value })}
                                                placeholder="Savolni kiriting (e.g. Choose the correct preposition)"
                                                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-500 transition ${
                                                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                                }`}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold uppercase text-gray-400">Variantlar</label>
                                                {storyForm.stickerOptions.length < 4 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddStickerOption}
                                                        className="text-[10px] text-pink-500 font-bold hover:text-pink-400 flex items-center gap-1 transition"
                                                    >
                                                        ➕ Qo'shish
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                {storyForm.stickerOptions.map((opt, index) => (
                                                    <div key={index} className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={e => handleUpdateStickerOption(index, e.target.value)}
                                                            placeholder={`Variant ${index + 1}`}
                                                            className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-500 transition ${
                                                                isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                                            }`}
                                                        />
                                                        {storyForm.stickerOptions.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveStickerOption(index)}
                                                                className="p-2 text-gray-400 hover:text-red-500"
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {storyForm.interactiveType === 'quiz' && (
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1 text-gray-400">To'g'ri javob variantini belgilang</label>
                                                <select
                                                    value={storyForm.correctOptionIndex}
                                                    onChange={e => setStoryForm({ ...storyForm, correctOptionIndex: e.target.value })}
                                                    className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-500 transition ${
                                                        isDark ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                                    }`}
                                                >
                                                    {storyForm.stickerOptions.map((_, i) => (
                                                        <option key={i} value={i}>Variant {i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Ko'rinish muddati</label>
                                <select
                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-500 transition ${
                                        isDark ? 'bg-zinc-800 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                    }`}
                                    value={storyForm.durationHours}
                                    onChange={e => setStoryForm({ ...storyForm, durationHours: e.target.value })}
                                >
                                    <option value="24">24 soat</option>
                                    <option value="48">48 soat</option>
                                    <option value="168">7 kun (1 hafta)</option>
                                    <option value="9999">Muddatsiz (Admin o'chirguncha)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition disabled:opacity-50 text-sm shadow-md"
                            >
                                {uploading ? "Yuklanmoqda..." : "Story chop etish"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Side: iPhone Live Preview */}
                <div className="hidden lg:col-span-5 lg:flex flex-col items-center justify-center bg-[#1f1e1b] rounded-3xl p-4 sm:p-6 border border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-warm-muted uppercase tracking-widest mb-4">LIVE PREVIEW</span>
                    
                    {/* iPhone Shell */}
                    <div className="w-[280px] h-[560px] rounded-[40px] border-[8px] border-zinc-800 bg-zinc-950 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
                        {/* Dynamic Island / Notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-zinc-800 rounded-full z-30" />
                        
                        {/* Status bar */}
                        <div className="h-6 px-6 pt-1 flex justify-between items-center text-[9px] font-bold text-white/60 z-20">
                            <span>09:41</span>
                            <div className="flex items-center gap-1">
                                <span>📶</span>
                                <span>🔋</span>
                            </div>
                        </div>

                        {/* Mock Story Screen */}
                        <div className="flex-1 flex flex-col justify-between relative overflow-hidden bg-zinc-900">
                            
                            {/* Mock Background */}
                            <div className="absolute inset-0 z-0">
                                {storyForm.mediaType === 'text' ? (
                                    <div className="w-full h-full bg-gradient-to-br from-[#1e1b4b] via-[#311042] to-[#0f172a] flex items-center justify-center p-4 text-center">
                                        <p className="text-white text-[11px] font-bold leading-normal whitespace-pre-wrap px-4">
                                            {storyForm.text || "Story matni shu yerda bo'ladi..."}
                                        </p>
                                    </div>
                                ) : storyMediaPreview ? (
                                    storyForm.mediaType === 'video' ? (
                                        <video src={storyMediaPreview} className="w-full h-full object-cover opacity-60" muted playsInline />
                                    ) : (
                                        <img src={storyMediaPreview} alt="preview" className="w-full h-full object-cover opacity-80" />
                                    )
                                ) : (
                                    <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center text-gray-600 gap-1">
                                        <FaImage size={24} />
                                        <span className="text-[8px]">Fayl tanlanmagan</span>
                                    </div>
                                )}
                            </div>

                            {/* Mock Top bar */}
                            <div className="relative z-10 px-4 pt-3 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-[1px]">
                                        <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[7px] text-white font-bold">
                                            IP
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <span className="font-bold text-[9px] text-white block leading-none">IELTS Portal Admin</span>
                                        <span className="text-[7px] text-white/50 block mt-0.5">Bugun</span>
                                    </div>
                                </div>
                                <span className="text-white/60 text-xs">✕</span>
                            </div>

                            {/* Mock Interactive Sticker Overlay */}
                            {storyForm.interactiveType !== 'none' && (
                                <div className="relative z-10 mx-4 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white text-center shadow-lg my-auto">
                                    <span className="inline-block text-[7px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 text-white mb-1.5">
                                        {storyForm.interactiveType === 'quiz' ? 'QUIZ' : 'POLL'}
                                    </span>
                                    <p className="font-bold text-[10px] leading-snug line-clamp-3 mb-2">{storyForm.stickerQuestion || "Savol matni..."}</p>
                                    
                                    <div className="flex flex-col gap-1.5 text-left text-[9px]">
                                        {storyForm.stickerOptions.filter(o => o.trim() !== "").map((opt, i) => {
                                            const isCorrect = storyForm.interactiveType === 'quiz' && parseInt(storyForm.correctOptionIndex) === i;
                                            return (
                                                <div key={i} className={`p-2 rounded-lg border flex items-center justify-between ${
                                                    isCorrect ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/10 border-white/5 text-white/80'
                                                }`}>
                                                    <span>{opt || `Variant ${i + 1}`}</span>
                                                    {isCorrect && <FaCheck className="text-emerald-400 text-[8px]" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Mock Bottom Overlay */}
                            <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-2 mt-auto">
                                {storyForm.mediaType !== 'text' && storyForm.text && (
                                    <p className="text-white text-[10px] text-center font-medium line-clamp-2 px-2">
                                        {storyForm.text}
                                    </p>
                                )}
                                {storyForm.ctaUrl && (
                                    <div className="px-4 py-1.5 bg-white text-black font-bold rounded-full text-[8px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                                        {storyForm.ctaText || "Ko'rish"}
                                        <FaLink size={7} />
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <MaterialSelectorModal
                isOpen={showMaterialSelector}
                onClose={() => setShowMaterialSelector(false)}
                target="story"
                onSelect={handleSelectMaterial}
            />
        </div>
    );
}
