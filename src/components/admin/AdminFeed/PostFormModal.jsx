import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../firebase/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    FaTimes, FaPlus, FaTrash, FaCheck, FaLink, FaImage, FaBookOpen, FaBullhorn
} from 'react-icons/fa';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { getCategoryUrl } from '../../../utils/navigation';
import MaterialSelectorModal from './MaterialSelectorModal';

export default function PostFormModal({
    isOpen,
    onClose,
    editingPost, // null if creating, post object if editing
    onSubmitSuccess
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [uploading, setUploading] = useState(false);
    const [postForm, setPostForm] = useState({
        type: 'post', // 'post' | 'announcement'
        title: '',
        content: '',
        announcementType: 'info',
        ctaUrl: '',
        ctaText: '',
        mediaUrl: '',
        mediaFile: null,
        mediaFiles: [], // Multiple images
        attachedTests: [], // Multiple attached tests
        aspectRatio: 1.777 // Default to 16:9
    });

    const [postMediaPreviews, setPostMediaPreviews] = useState([]);
    const [previewCarouselIndex, setPreviewCarouselIndex] = useState(0);
    const [showMaterialSelector, setShowMaterialSelector] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingPost) {
                setPostForm({
                    type: editingPost.type || 'post',
                    title: editingPost.title || '',
                    content: editingPost.content || '',
                    announcementType: editingPost.announcementType || 'info',
                    ctaUrl: editingPost.ctaUrl || '',
                    ctaText: editingPost.ctaText || '',
                    mediaUrl: editingPost.mediaUrl || '',
                    mediaFile: null,
                    mediaFiles: [],
                    attachedTests: editingPost.attachedTests || [],
                    aspectRatio: editingPost.aspectRatio || 1.777
                });
                const urls = editingPost.mediaUrls || (editingPost.mediaUrl ? [editingPost.mediaUrl] : []);
                setPostMediaPreviews(urls);
            } else {
                setPostForm({
                    type: 'post',
                    title: '',
                    content: '',
                    announcementType: 'info',
                    ctaUrl: '',
                    ctaText: '',
                    mediaUrl: '',
                    mediaFile: null,
                    mediaFiles: [],
                    attachedTests: [],
                    aspectRatio: 1.777
                });
                setPostMediaPreviews([]);
            }
            setPreviewCarouselIndex(0);
        }
    }, [isOpen, editingPost]);

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
        
        if (itemMediaUrl) {
            setPostMediaPreviews([itemMediaUrl]);
            const img = new Image();
            img.src = itemMediaUrl;
            img.onload = () => {
                const ratio = img.naturalWidth / img.naturalHeight;
                const clampedRatio = Math.max(0.8, Math.min(1.91, ratio));
                setPostForm(prev => ({
                    ...prev,
                    ctaUrl: url,
                    ctaText: text,
                    title: prev.title || item.title,
                    mediaUrl: itemMediaUrl,
                    aspectRatio: clampedRatio
                }));
            };
            img.onerror = () => {
                setPostForm(prev => ({
                    ...prev,
                    ctaUrl: url,
                    ctaText: text,
                    title: prev.title || item.title,
                    mediaUrl: itemMediaUrl,
                    aspectRatio: 1.777
                }));
            };
        } else {
            setPostMediaPreviews([]);
            setPostForm(prev => ({
                ...prev,
                ctaUrl: url,
                ctaText: text,
                title: prev.title || item.title,
                mediaUrl: "",
                aspectRatio: 1.777
            }));
        }
        setShowMaterialSelector(false);
    };

    const handleConfirmTests = (tests) => {
        setPostForm(prev => ({
            ...prev,
            attachedTests: tests,
            ctaText: prev.ctaText || "Testni Boshlash"
        }));
        setShowMaterialSelector(false);
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!postForm.content && postForm.type === 'post') {
            return toast.error("Matn kiritish majburiy!");
        }
        if (postForm.type === 'announcement' && (!postForm.title || !postForm.content)) {
            return toast.error("Sarlavha va matn majburiy!");
        }

        setUploading(true);
        try {
            let mediaUrls = [];
            let mediaType = "none";

            if (postForm.type === 'post') {
                if (postForm.mediaFiles && postForm.mediaFiles.length > 0) {
                    // Upload multiple images
                    const uploadPromises = Array.from(postForm.mediaFiles).map(async (file) => {
                        const fileRef = ref(storage, `feed_posts/${Date.now()}_${file.name}`);
                        const metadata = { cacheControl: 'public,max-age=31536000' };
                        const uploadSnap = await uploadBytes(fileRef, file, metadata);
                        return getDownloadURL(uploadSnap.ref);
                    });
                    mediaUrls = await Promise.all(uploadPromises);
                    mediaType = 'carousel';
                } else if (postForm.mediaFile) {
                    // Single media fallback
                    const fileRef = ref(storage, `feed_posts/${Date.now()}_${postForm.mediaFile.name}`);
                    const metadata = { cacheControl: 'public,max-age=31536000' };
                    const uploadSnap = await uploadBytes(fileRef, postForm.mediaFile, metadata);
                    const singleUrl = await getDownloadURL(uploadSnap.ref);
                    mediaUrls = [singleUrl];
                    mediaType = postForm.mediaFile.type.startsWith('video/') ? 'video' : 'image';
                }
            }

            const docData = {
                type: postForm.type,
                content: postForm.content,
            };

            if (!editingPost) {
                docData.createdAt = serverTimestamp();
                docData.likes = [];
                docData.commentsCount = 0;
            }

            if (postForm.type === 'announcement') {
                docData.title = postForm.title;
                docData.announcementType = postForm.announcementType;
                docData.mediaUrls = [];
                docData.mediaUrl = "";
                docData.mediaType = "none";
                docData.aspectRatio = null;
            } else {
                docData.aspectRatio = postForm.aspectRatio || 1.777;
                if (mediaUrls.length > 0) {
                    docData.mediaUrls = mediaUrls;
                    docData.mediaUrl = mediaUrls[0];
                    docData.mediaType = mediaType;
                } else if (postForm.mediaUrl) {
                    docData.mediaUrls = [postForm.mediaUrl];
                    docData.mediaUrl = postForm.mediaUrl;
                    docData.mediaType = 'image';
                } else if (editingPost) {
                    if (postMediaPreviews && postMediaPreviews.length > 0) {
                        docData.mediaUrls = postMediaPreviews;
                        docData.mediaUrl = postMediaPreviews[0];
                        docData.mediaType = editingPost.mediaType || 'image';
                    } else {
                        docData.mediaUrls = [];
                        docData.mediaUrl = "";
                        docData.mediaType = "none";
                    }
                }

                if (postForm.attachedTests && postForm.attachedTests.length > 0) {
                    docData.attachedTests = postForm.attachedTests;
                    docData.ctaUrl = getCategoryUrl(postForm.attachedTests[0]);
                    docData.ctaText = postForm.ctaText || "Testni Boshlash";
                } else if (postForm.ctaUrl) {
                    docData.ctaUrl = postForm.ctaUrl;
                    docData.ctaText = postForm.ctaText || "O'tish";
                    docData.attachedTests = [];
                } else {
                    docData.ctaUrl = "";
                    docData.ctaText = "";
                    docData.attachedTests = [];
                }
            }

            if (editingPost) {
                await updateDoc(doc(db, 'feed_posts', editingPost.id), docData);
                toast.success("Post yangilandi! 🚀");
            } else {
                await addDoc(collection(db, 'feed_posts'), docData);
                toast.success("Post Feedga chop etildi! 🚀");
            }

            onSubmitSuccess();
            onClose();
        } catch (err) {
            console.error("Error creating/updating post:", err);
            toast.error(editingPost ? "Postni yangilashda xatolik." : "Post yaratishda xatolik yuz berdi.");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className={`w-full max-w-5xl rounded-3xl p-6 border relative transition-colors grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 ${
                isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
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
                        <h2 className="text-xl font-bold mb-4">{editingPost ? "Postni Tahrirlash" : "Yangiliklar Tasmasiga Post Yaratish"}</h2>
                        <form onSubmit={handleCreatePost} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Post Turi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['post', 'announcement'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setPostForm({ ...postForm, type })}
                                            className={`py-2 rounded-xl text-xs font-bold capitalize transition border ${
                                                postForm.type === type 
                                                    ? 'bg-blue-600 text-white border-blue-600' 
                                                    : (isDark ? 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10' : 'bg-white border-gray-250 text-gray-500 hover:bg-gray-50')
                                            }`}
                                        >
                                            {type === 'post' ? '📝 Rasm & Matn (Post)' : '📢 E\'lon (Sariq/Qizil/Yashil)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {postForm.type === 'announcement' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1 text-gray-400">E'lon Turi</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['info', 'success', 'warning', 'danger'].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setPostForm({ ...postForm, announcementType: t })}
                                                    className={`py-2 rounded-lg text-[10px] font-bold uppercase transition border ${
                                                        postForm.announcementType === t 
                                                            ? 'bg-amber-500 text-white border-amber-500' 
                                                            : (isDark ? 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10' : 'bg-white border-gray-250 text-gray-500 hover:bg-gray-50')
                                                    }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Sarlavha</label>
                                        <input
                                            type="text"
                                            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all ${
                                                isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                            }`}
                                            placeholder="Masalan: Ertaga 9:00 da Mock Imtihoni!"
                                            value={postForm.title}
                                            onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Rasmlar (Bir nechta tanlab Karusel qilish mumkin)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={e => {
                                                const files = e.target.files;
                                                if (files && files.length > 0) {
                                                    const urls = Array.from(files).map(file => URL.createObjectURL(file));
                                                    setPostMediaPreviews(urls);
                                                    setPreviewCarouselIndex(0);
                                                    
                                                    const img = new Image();
                                                    img.src = urls[0];
                                                    img.onload = () => {
                                                        const ratio = img.naturalWidth / img.naturalHeight;
                                                        const clampedRatio = Math.max(0.8, Math.min(1.91, ratio));
                                                        setPostForm(prev => ({ 
                                                            ...prev, 
                                                            mediaFiles: files, 
                                                            mediaFile: null, 
                                                            aspectRatio: clampedRatio 
                                                        }));
                                                    };
                                                } else {
                                                    setPostForm(prev => ({ 
                                                        ...prev, 
                                                        mediaFiles: [], 
                                                        mediaFile: null, 
                                                        aspectRatio: 1.777 
                                                    }));
                                                    setPostMediaPreviews([]);
                                                }
                                            }}
                                            className="text-xs w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold uppercase text-gray-400">CTA Link (Ixtiyoriy)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMaterialSelector(true)}
                                                    className="text-[10px] text-blue-500 hover:text-blue-400 font-bold transition flex items-center gap-1"
                                                >
                                                    🔍 Material tanlash
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 transition ${
                                                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                                }`}
                                                placeholder="/test/ID, /podcast/ID yoki /article/ID"
                                                value={postForm.ctaUrl}
                                                onChange={e => setPostForm({ ...postForm, ctaUrl: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1 text-gray-400">CTA Matni</label>
                                            <input
                                                type="text"
                                                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 transition ${
                                                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                                }`}
                                                placeholder="Masalan: Testni boshlash"
                                                value={postForm.ctaText}
                                                onChange={e => setPostForm({ ...postForm, ctaText: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {postForm.attachedTests && postForm.attachedTests.length > 0 && (
                                        <div className="space-y-1.5 p-3 rounded-xl border border-dashed border-gray-250 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-left">
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Biriktirilgan testlar ({postForm.attachedTests.length})</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {postForm.attachedTests.map((test) => (
                                                    <div key={test.id} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/30 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-1 rounded-lg">
                                                        <span className="font-bold max-w-[150px] truncate">{test.title}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPostForm(prev => ({
                                                                ...prev,
                                                                attachedTests: prev.attachedTests.filter(t => t.id !== test.id)
                                                            }))}
                                                            className="text-blue-400 hover:text-red-500 font-bold transition ml-1"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Post Xabari / Matni</label>
                                <textarea
                                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-all h-28 resize-none ${
                                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                    }`}
                                    placeholder="Bu yerga batafsil ma'lumot yozing..."
                                    value={postForm.content}
                                    onChange={e => setPostForm({ ...postForm, content: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition disabled:opacity-50 text-sm shadow-md"
                            >
                                {uploading ? "Yuklanmoqda..." : (editingPost ? "Saqlash" : "Postni chop etish")}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Side: iPhone Live Preview */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gray-100 dark:bg-black/40 rounded-3xl p-6 border border-dashed border-gray-250 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">LIVE PREVIEW</span>
                    
                    {/* iPhone Shell */}
                    <div className="w-[280px] h-[560px] rounded-[40px] border-[8px] border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl relative overflow-hidden flex flex-col justify-between select-none">
                        {/* Dynamic Island / Notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-zinc-800 rounded-full z-30" />
                        
                        {/* Status bar */}
                        <div className="h-6 px-6 pt-1 flex justify-between items-center text-[9px] font-bold text-gray-500 dark:text-gray-400 z-20">
                            <span>09:41</span>
                            <div className="flex items-center gap-1">
                                <span>📶</span>
                                <span>🔋</span>
                            </div>
                        </div>

                        {/* Mock App Screen */}
                        <div className="flex-1 flex flex-col bg-white dark:bg-[#18181b] overflow-y-auto overflow-x-hidden p-3 relative scrollbar-none text-left">
                            
                            {/* Mock Post Card */}
                            <div className="w-full border border-gray-150 dark:border-white/5 rounded-2xl p-3 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col gap-2.5">
                                
                                {/* Mock Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-[9px] font-black">
                                            IP
                                        </div>
                                        <div>
                                            <span className="font-bold text-[10px] text-gray-900 dark:text-white block leading-none">IELTS Portal Admin</span>
                                            <span className="text-[7px] text-gray-400 block mt-0.5">3 daqiqa oldin</span>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                        postForm.type === 'announcement' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {postForm.type === 'announcement' ? "E'lon" : 'Post'}
                                    </span>
                                </div>

                                {/* Mock Media / Announcement */}
                                {postForm.type === 'announcement' ? (
                                    <div className="p-3 rounded-xl border bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20 text-amber-900 dark:text-amber-200 text-[10px] flex gap-2">
                                        <FaBullhorn className="w-3 h-3 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="font-bold mb-0.5">{postForm.title || "Sarlavha shu yerda"}</h5>
                                            <p className="text-[9px] leading-relaxed line-clamp-4">{postForm.content || "Tafsilotlar shu yerda bo'ladi."}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {/* Image Carousel preview */}
                                        {postMediaPreviews.length > 0 ? (
                                            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-50 border relative">
                                                <img src={postMediaPreviews[previewCarouselIndex]} alt="preview" className="w-full h-full object-cover" />
                                                
                                                {postMediaPreviews.length > 1 && (
                                                    <>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setPreviewCarouselIndex(prev => (prev - 1 + postMediaPreviews.length) % postMediaPreviews.length)}
                                                            className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black/40 text-white flex items-center justify-center text-[8px]"
                                                        >
                                                            ‹
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setPreviewCarouselIndex(prev => (prev + 1) % postMediaPreviews.length)}
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black/40 text-white flex items-center justify-center text-[8px]"
                                                        >
                                                            ›
                                                        </button>
                                                        <div className="absolute bottom-1 inset-x-0 flex justify-center gap-1">
                                                            {postMediaPreviews.map((_, i) => (
                                                                <div key={i} className={`w-1 h-1 rounded-full ${i === previewCarouselIndex ? 'bg-white' : 'bg-white/40'}`} />
                                                            ))}
                                                        </div>
                                                        <div className="absolute top-1.5 right-1.5 bg-black/60 px-1 py-0.5 rounded text-[7px] text-white font-bold">
                                                            {previewCarouselIndex + 1}/{postMediaPreviews.length}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-[4/3] rounded-xl bg-gray-100 dark:bg-zinc-800 border border-dashed flex flex-col items-center justify-center text-gray-400">
                                                <FaImage size={18} />
                                                <span className="text-[8px] mt-1">Rasm biriktirilmagan</span>
                                            </div>
                                        )}
                                        {/* Text content */}
                                        <div className="text-[10px] leading-relaxed line-clamp-3">
                                            <span className="font-bold mr-1.5">IELTS Portal Admin</span>
                                            {postForm.content || "Tavsif matni..."}
                                        </div>
                                    </div>
                                )}

                                {/* Mock Material Selector CTA card */}
                                {postForm.attachedTests && postForm.attachedTests.length > 0 && postForm.type !== 'announcement' ? (
                                    <div className="w-full flex flex-col gap-1 bg-gray-55/50 dark:bg-zinc-900/40 p-2 rounded-xl border border-gray-150 dark:border-white/5">
                                        <span className="text-[7px] font-black uppercase text-gray-400 block tracking-wider text-left">Testlar Karuseli ({postForm.attachedTests.length})</span>
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory text-left">
                                            {postForm.attachedTests.map((test) => (
                                                <div key={test.id} className="min-w-[130px] max-w-[130px] p-2 rounded-lg border bg-white dark:bg-zinc-950 border-gray-200 dark:border-white/5 text-[8px] flex flex-col justify-between gap-1.5 snap-center">
                                                    <div>
                                                        <span className="font-extrabold text-blue-500 dark:text-blue-400 block tracking-wider text-[6px] uppercase">{test.type}</span>
                                                        <div className="font-bold line-clamp-2 leading-snug">{test.title}</div>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-white/5">
                                                        <span className="text-gray-400 text-[6px] capitalize">{test.difficulty || "medium"}</span>
                                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white font-extrabold text-[6px] rounded tracking-wide uppercase">
                                                            {postForm.ctaText || "Boshlash"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : postForm.ctaUrl && postForm.type !== 'announcement' ? (
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-55 dark:bg-zinc-800 border border-gray-150 text-[9px]">
                                        <div className="flex items-center gap-2">
                                            <FaBookOpen className="text-blue-500 shrink-0" size={10} />
                                            <div className="font-bold line-clamp-1 w-[110px]">
                                                {postForm.title || "Material nomi"}
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-black dark:bg-white text-white dark:text-black font-bold text-[7px] rounded-lg uppercase shrink-0">
                                            {postForm.ctaText || "O'tish"}
                                        </span>
                                    </div>
                                ) : null}

                                {/* Mock Action Bar */}
                                <div className="flex justify-between items-center text-gray-400 text-[10px] pt-1">
                                    <div className="flex gap-2">
                                        <span>❤️ 0</span>
                                        <span>💬 0</span>
                                    </div>
                                    <span>📤</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <MaterialSelectorModal
                isOpen={showMaterialSelector}
                onClose={() => setShowMaterialSelector(false)}
                target="post"
                initialSelectedTests={postForm.attachedTests}
                onSelect={handleSelectMaterial}
                onConfirmTests={handleConfirmTests}
            />
        </div>
    );
}
