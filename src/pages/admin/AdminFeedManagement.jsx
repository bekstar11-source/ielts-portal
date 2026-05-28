import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase/firebase';
import { 
    collection, getDocs, addDoc, deleteDoc, doc, 
    query, orderBy, serverTimestamp, Timestamp, where, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    FaArrowLeft, FaPlus, FaTrash, FaCheck, FaInfoCircle, 
    FaExclamationTriangle, FaTimes, FaCamera, FaLink, FaImage, FaFilm,
    FaBookOpen, FaVolumeUp, FaFileAlt, FaChevronLeft, FaChevronRight,
    FaBullhorn, FaHeart, FaComment, FaEye, FaShareAlt
} from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';

export default function AdminFeedManagement() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Tabs: 'posts' | 'stories'
    const [activeSubTab, setActiveSubTab] = useState('posts');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Lists
    const [posts, setPosts] = useState([]);
    const [stories, setStories] = useState([]);

    // Modals
    const [showPostModal, setShowPostModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);

    // Forms
    const [postForm, setPostForm] = useState({
        type: 'post', // 'post' | 'announcement'
        title: '',
        content: '',
        announcementType: 'info',
        ctaUrl: '',
        ctaText: '',
        mediaFile: null,
        mediaFiles: [] // Multiple images
    });

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

    // Object URL previews for live mockup
    const [storyMediaPreview, setStoryMediaPreview] = useState("");
    const [postMediaPreviews, setPostMediaPreviews] = useState([]);
    const [previewCarouselIndex, setPreviewCarouselIndex] = useState(0);

    // Unified Material Selector States
    const [showMaterialSelector, setShowMaterialSelector] = useState(null); // 'post' | 'story' | null
    const [materialTab, setMaterialTab] = useState('tests'); // 'tests' | 'podcasts' | 'articles'
    const [allTests, setAllTests] = useState([]);
    const [allPodcasts, setAllPodcasts] = useState([]);
    const [allArticles, setAllArticles] = useState([]);
    const [selectorSearchTerm, setSelectorSearchTerm] = useState('');
    const [loadingSelector, setLoadingSelector] = useState(false);

    const openMaterialSelector = async (target) => {
        setShowMaterialSelector(target);
        setLoadingSelector(true);
        try {
            if (allTests.length === 0) {
                const q = query(
                    collection(db, "tests_metadata"), 
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const snap = await getDocs(q);
                const testsList = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
                setAllTests(testsList);
            }
            if (allPodcasts.length === 0) {
                const q = query(
                    collection(db, "podcasts"),
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const snap = await getDocs(q);
                setAllPodcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            if (allArticles.length === 0) {
                const q = query(
                    collection(db, "articles"),
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const snap = await getDocs(q);
                setAllArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (err) {
            console.error("Error fetching selector data:", err);
            toast.error("Ma'lumotlarni yuklab bo'lmadi.");
        } finally {
            setLoadingSelector(false);
        }
    };

    const handleSelectMaterial = (item, type) => {
        let url = "";
        let text = "";
        
        if (type === 'tests') {
            url = `/test/${item.id}`;
            text = "Testni Boshlash";
        } else if (type === 'podcasts') {
            url = `/podcast/${item.id}`;
            text = "Podcastni Eshitish";
        } else if (type === 'articles') {
            url = `/article/${item.id}`;
            text = "Maqolani O'qish";
        }

        if (showMaterialSelector === 'post') {
            setPostForm(prev => ({
                ...prev,
                ctaUrl: url,
                ctaText: text,
                title: prev.title || item.title
            }));
        } else if (showMaterialSelector === 'story') {
            setStoryForm(prev => ({
                ...prev,
                ctaUrl: url,
                ctaText: text,
                text: prev.text || item.title
            }));
        }
        setShowMaterialSelector(null);
        setSelectorSearchTerm('');
    };

    // Filter selector items
    const getFilteredSelectorItems = () => {
        const queryStr = selectorSearchTerm.toLowerCase();
        if (materialTab === 'tests') {
            return allTests.filter(t => (t.title || '').toLowerCase().includes(queryStr) || (t.type || '').toLowerCase().includes(queryStr));
        } else if (materialTab === 'podcasts') {
            return allPodcasts.filter(p => (p.title || '').toLowerCase().includes(queryStr) || (p.level || '').toLowerCase().includes(queryStr));
        } else {
            return allArticles.filter(a => (a.title || '').toLowerCase().includes(queryStr) || (a.category || '').toLowerCase().includes(queryStr));
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Feed Posts
            const postsQ = query(collection(db, 'feed_posts'), orderBy('createdAt', 'desc'));
            const postsSnap = await getDocs(postsQ);
            setPosts(postsSnap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : new Date()
            })));

            // Fetch Stories
            const storiesQ = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
            const storiesSnap = await getDocs(storiesQ);
            setStories(storiesSnap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : new Date(),
                expiresAt: d.data().expiresAt?.seconds ? new Date(d.data().expiresAt.seconds * 1000) : null
            })));
        } catch (err) {
            console.error("Error fetching admin feed data:", err);
            toast.error("Ma'lumotlarni yuklashda xatolik.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Create Direct Post
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
                        const uploadSnap = await uploadBytes(fileRef, file);
                        return getDownloadURL(uploadSnap.ref);
                    });
                    mediaUrls = await Promise.all(uploadPromises);
                    mediaType = 'carousel';
                } else if (postForm.mediaFile) {
                    // Single media fallback
                    const fileRef = ref(storage, `feed_posts/${Date.now()}_${postForm.mediaFile.name}`);
                    const uploadSnap = await uploadBytes(fileRef, postForm.mediaFile);
                    const singleUrl = await getDownloadURL(uploadSnap.ref);
                    mediaUrls = [singleUrl];
                    mediaType = postForm.mediaFile.type.startsWith('video/') ? 'video' : 'image';
                }
            }

            const docData = {
                type: postForm.type,
                content: postForm.content,
                createdAt: serverTimestamp(),
                likes: [],
                commentsCount: 0
            };

            if (postForm.type === 'announcement') {
                docData.title = postForm.title;
                docData.announcementType = postForm.announcementType;
            } else {
                if (mediaUrls.length > 0) {
                    docData.mediaUrls = mediaUrls;
                    docData.mediaUrl = mediaUrls[0]; // backward compatibility
                    docData.mediaType = mediaType;
                }
                if (postForm.ctaUrl) {
                    docData.ctaUrl = postForm.ctaUrl;
                    docData.ctaText = postForm.ctaText || "O'tish";
                }
            }

            await addDoc(collection(db, 'feed_posts'), docData);
            toast.success("Post Feedga chop etildi! 🚀");
            setShowPostModal(false);
            setPostForm({
                type: 'post',
                title: '',
                content: '',
                announcementType: 'info',
                ctaUrl: '',
                ctaText: '',
                mediaFile: null,
                mediaFiles: []
            });
            setPostMediaPreviews([]);
            fetchData();
        } catch (err) {
            console.error("Error creating post:", err);
            toast.error("Post yaratishda xatolik yuz berdi.");
        } finally {
            setUploading(false);
        }
    };

    // Create Story
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
                const uploadSnap = await uploadBytes(fileRef, storyForm.mediaFile);
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
            setShowStoryModal(false);
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
            fetchData();
        } catch (err) {
            console.error("Error creating story:", err);
            toast.error("Story yaratishda xatolik yuz berdi.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePost = async (id) => {
        if (!window.confirm("Haqiqatan ham ushbu postni o'chirmoqchimisiz?")) return;
        try {
            await deleteDoc(doc(db, 'feed_posts', id));
            toast.success("Post o'chirildi.");
            fetchData();
        } catch (err) {
            toast.error("O'chirishda xatolik: " + err.message);
        }
    };

    const handleDeleteStory = async (id) => {
        if (!window.confirm("Haqiqatan ham ushbu hikoyani o'chirmoqchimisiz?")) return;
        try {
            await deleteDoc(doc(db, 'stories', id));
            toast.success("Story o'chirildi.");
            fetchData();
        } catch (err) {
            toast.error("O'chirishda xatolik: " + err.message);
        }
    };

    // Helper to add/remove sticker options
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
                // Adjust correct option index if it is now out of bounds
                correctOptionIndex: parseInt(storyForm.correctOptionIndex) >= updated.length ? '0' : storyForm.correctOptionIndex
            });
        }
    };

    return (
        <div className={`min-h-screen font-sans p-4 md:p-6 transition-colors duration-200 ${
            isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'
        }`}>
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/admin')} 
                            className={`p-2 rounded-xl transition ${
                                isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                            }`}
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Feed & Stories Boshqaruvi</h1>
                            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                O'quvchilar dashboard tasmasi va stories kontentini yaratish hamda boshqarish.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setStoryMediaPreview("");
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
                                setShowStoryModal(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-md transition"
                        >
                            <FaPlus /> Yangi Story
                        </button>
                        <button
                            onClick={() => {
                                setPostMediaPreviews([]);
                                setPostForm({
                                    type: 'post',
                                    title: '',
                                    content: '',
                                    announcementType: 'info',
                                    ctaUrl: '',
                                    ctaText: '',
                                    mediaFile: null,
                                    mediaFiles: []
                                });
                                setShowPostModal(true);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-md transition"
                        >
                            <FaPlus /> Yangi Post
                        </button>
                    </div>
                </div>

                {/* Sub Tab Controls */}
                <div className="flex border-b border-gray-200 dark:border-white/5 gap-6">
                    <button
                        onClick={() => setActiveSubTab('posts')}
                        className={`pb-3 text-sm font-bold transition-all relative ${
                            activeSubTab === 'posts' 
                                ? 'text-blue-500' 
                                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-300'
                        }`}
                    >
                        Yangiliklar Tasmasi (Feed)
                        {activeSubTab === 'posts' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />}
                    </button>
                    <button
                        onClick={() => setActiveSubTab('stories')}
                        className={`pb-3 text-sm font-bold transition-all relative ${
                            activeSubTab === 'stories' 
                                ? 'text-pink-500' 
                                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-300'
                        }`}
                    >
                        Admin Stories
                        {activeSubTab === 'stories' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-500" />}
                    </button>
                </div>

                {/* Main Content Area */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : activeSubTab === 'posts' ? (
                    /* FEED POSTS PANEL */
                    <div className="grid gap-4">
                        {posts.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-dashed border-gray-250 dark:border-white/5 rounded-3xl text-gray-400">
                                Hozircha Feedda hech qanday postlar yaratilmagan.
                            </div>
                        ) : (
                            posts.map((post) => (
                                <div 
                                    key={post.id} 
                                    className={`p-5 rounded-3xl border flex justify-between items-start gap-4 transition shadow-sm ${
                                        isDark ? 'bg-[#1E1E1E] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex-1 flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                                            isDark ? 'bg-white/5' : 'bg-gray-55 border border-gray-100'
                                        }`}>
                                            {post.type === 'announcement' ? '📢' : '📝'}
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-sm md:text-base line-clamp-1">{post.title || post.content?.slice(0, 40)}...</h3>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                                    post.type === 'announcement' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 border-amber-500/20' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-blue-500/20'
                                                }`}>
                                                    {post.type}
                                                </span>
                                                {post.mediaType === 'carousel' && (
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-purple-500/20">
                                                        Karusel ({post.mediaUrls?.length || 0})
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                                {post.content}
                                            </p>
                                            <div className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} flex items-center gap-3`}>
                                                <span>{post.createdAt.toLocaleString()}</span>
                                                <span>•</span>
                                                <span>❤️ {post.likes?.length || 0} ta</span>
                                                <span>•</span>
                                                <span>💬 {post.commentsCount || 0} ta izoh</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className={`p-2.5 rounded-xl transition ${
                                            isDark ? 'bg-white/5 hover:bg-red-500/10 hover:text-red-500' : 'bg-gray-55 border border-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                                        }`}
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* STORIES PANEL */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {stories.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white dark:bg-zinc-900 border border-dashed border-gray-250 dark:border-white/5 rounded-3xl text-gray-400">
                                Hozircha hikoyalar yuklanmagan.
                            </div>
                        ) : (
                            stories.map((story) => {
                                const isExpired = story.expiresAt && story.expiresAt < new Date();
                                return (
                                    <div 
                                        key={story.id} 
                                        className={`rounded-3xl border overflow-hidden relative group aspect-[2/3] flex flex-col justify-between shadow-sm transition ${
                                            isDark ? 'bg-zinc-900 border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Background media preview */}
                                        <div className="absolute inset-0 z-0 bg-black/10">
                                            {story.mediaType === 'text' ? (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4 text-center">
                                                    <p className="text-white text-[10px] font-bold leading-relaxed line-clamp-6">{story.text}</p>
                                                </div>
                                            ) : story.mediaType === 'video' ? (
                                                <video src={story.mediaUrl} className="w-full h-full object-cover opacity-60" muted playsInline />
                                            ) : (
                                                <img src={story.mediaUrl} alt="story preview" className="w-full h-full object-cover opacity-75" />
                                            )}
                                        </div>

                                        {/* Content info overlay */}
                                        <div className="relative z-10 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start">
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase text-white ${
                                                isExpired ? 'bg-gray-600' : 'bg-emerald-600'
                                            }`}>
                                                {isExpired ? "Eski" : "Faol"}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteStory(story.id)}
                                                className="p-1.5 rounded-lg bg-black/40 hover:bg-red-600 text-white transition"
                                            >
                                                <FaTrash size={10} />
                                            </button>
                                        </div>

                                        <div className="relative z-10 p-3 bg-gradient-to-t from-black/95 via-black/40 to-transparent text-white space-y-1">
                                            <p className="text-[9px] text-white/50">{story.createdAt.toLocaleDateString()}</p>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-[10px] font-bold line-clamp-1 flex-1">{story.text || 'Story Media'}</p>
                                                {story.interactiveData && (
                                                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-yellow-500 rounded text-white shrink-0 uppercase">
                                                        {story.interactiveData.type}
                                                    </span>
                                                )}
                                            </div>
                                            {story.ctaUrl && <p className="text-[8px] text-blue-400 font-bold truncate">🔗 {story.ctaText || 'CTA'}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

            </div>

            {/* CREATE POST MODAL WITH PREVIEW */}
            {showPostModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className={`w-full max-w-5xl rounded-3xl p-6 border relative transition-colors grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 ${
                        isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
                    }`}>
                        <button 
                            onClick={() => setShowPostModal(false)} 
                            className={`absolute top-4 right-4 hover:opacity-80 transition-opacity z-10 ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                        >
                            <FaTimes />
                        </button>

                        {/* Left Side: Form */}
                        <div className="lg:col-span-7 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-4">Yangiliklar Tasmasiga Post Yaratish</h2>
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
                                            {/* Upload Media to Storage */}
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Rasmlar (Bir nechta tanlab Karusel qilish mumkin)</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={e => {
                                                        const files = e.target.files;
                                                        setPostForm({ ...postForm, mediaFiles: files, mediaFile: null });
                                                        if (files && files.length > 0) {
                                                            const urls = Array.from(files).map(file => URL.createObjectURL(file));
                                                            setPostMediaPreviews(urls);
                                                            setPreviewCarouselIndex(0);
                                                        } else {
                                                            setPostMediaPreviews([]);
                                                        }
                                                    }}
                                                    className="text-xs w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                                />
                                            </div>

                                            {/* Unified Material Selector button */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-xs font-bold uppercase text-gray-400">CTA Link (Ixtiyoriy)</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => openMaterialSelector('post')}
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
                                        {uploading ? "Yuklanmoqda..." : "Postni chop etish"}
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
                                <div className="flex-1 flex flex-col bg-white dark:bg-[#09090b] overflow-y-auto overflow-x-hidden p-3 relative scrollbar-none">
                                    
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
                                                                    onClick={() => setPreviewCarouselIndex(prev => (prev - 1 + postMediaPreviews.length) % postMediaPreviews.length)}
                                                                    className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black/40 text-white flex items-center justify-center text-[8px]"
                                                                >
                                                                    ‹
                                                                </button>
                                                                <button 
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
                                        {postForm.ctaUrl && postForm.type !== 'announcement' && (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-150 text-[9px]">
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
                                        )}

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
                </div>
            )}

            {/* CREATE STORY STORY MODAL WITH PREVIEW */}
            {showStoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className={`w-full max-w-5xl rounded-3xl p-6 border relative transition-colors grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 ${
                        isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
                    }`}>
                        <button 
                            onClick={() => setShowStoryModal(false)} 
                            className={`absolute top-4 right-4 hover:opacity-80 transition-opacity z-10 ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                        >
                            <FaTimes />
                        </button>

                        {/* Left Side: Form */}
                        <div className="lg:col-span-7 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-4">Yangicha Admin Story Yaratish</h2>
                                <form onSubmit={handleCreateStory} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Story Turi</label>
                                        <div className="grid grid-cols-3 gap-2">
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

                                    {/* Unified Material Selector button */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold uppercase text-gray-400">CTA Link (Ixtiyoriy)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => openMaterialSelector('story')}
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
                                        <h4 className="text-xs font-black text-pink-500 uppercase tracking-widest">Interaktiv Sticker (So'rovnoma / Quiz)</h4>
                                        
                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Sticker Turi</label>
                                            <div className="grid grid-cols-3 gap-2">
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
                        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#18181b] rounded-3xl p-6 border border-zinc-800">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">LIVE PREVIEW</span>
                            
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
                                            <div>
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
                </div>
            )}

            {/* UNIFIED MATERIAL SELECTOR MODAL */}
            {showMaterialSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border relative flex flex-col max-h-[85vh] transition-colors ${
                        isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
                    }`}>
                        <button 
                            type="button"
                            onClick={() => { setShowMaterialSelector(null); setSelectorSearchTerm(''); }} 
                            className={`absolute top-4 right-4 hover:opacity-80 transition-opacity ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                        >
                            <FaTimes />
                        </button>
                        
                        <h3 className="text-lg font-bold mb-1">Portal Materialini tanlang</h3>
                        <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            Story yoki Postga biriktirish uchun kerakli materialni tanlang.
                        </p>

                        {/* Material Selector Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-white/5 gap-4 mb-4 text-xs font-bold">
                            {[
                                { id: 'tests', label: '📖 Testlar', color: 'text-blue-500', bar: 'bg-blue-500' },
                                { id: 'podcasts', label: '🎙️ Podcastlar', color: 'text-purple-500', bar: 'bg-purple-500' },
                                { id: 'articles', label: '📰 Maqolalar', color: 'text-emerald-500', bar: 'bg-emerald-500' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => { setMaterialTab(tab.id); setSelectorSearchTerm(''); }}
                                    className={`pb-2 transition relative ${
                                        materialTab === tab.id ? tab.color : 'text-gray-400 dark:text-zinc-500 hover:text-gray-300'
                                    }`}
                                >
                                    {tab.label}
                                    {materialTab === tab.id && <div className={`absolute bottom-0 inset-x-0 h-0.5 ${tab.bar}`} />}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <input
                            type="text"
                            value={selectorSearchTerm}
                            onChange={(e) => setSelectorSearchTerm(e.target.value)}
                            placeholder={`${
                                materialTab === 'tests' ? 'Test nomi yoki turi...' : 
                                materialTab === 'podcasts' ? 'Podcast nomi...' : 'Maqola nomi...'
                            } bo'yicha qidirish...`}
                            className={`w-full border rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-opacity-50 mb-4 transition-all ${
                                isDark 
                                    ? 'bg-white/5 border-white/10 text-white focus:border-pink-500 focus:ring-pink-500' 
                                    : 'bg-gray-55 border-gray-250 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                        />

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[45vh]">
                            {loadingSelector ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : getFilteredSelectorItems().length === 0 ? (
                                <div className="text-center py-10 text-xs text-gray-400">
                                    Hech qanday material topilmadi.
                                </div>
                            ) : (
                                getFilteredSelectorItems().map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectMaterial(item, materialTab)}
                                        className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between text-xs font-bold gap-3 ${
                                            isDark ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-150 hover:bg-gray-100 hover:border-gray-250'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <span className="line-clamp-1">{item.title || 'Sarlavhasiz'}</span>
                                            <p className={`text-[9px] mt-0.5 font-normal ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                {materialTab === 'tests' ? `Kolleksiya: ${item.collectionName || 'Kolleksiyasiz'}` : 
                                                 materialTab === 'podcasts' ? `Level: ${item.level || 'Barcha darajalar'}` : `Kategoriya: ${item.category || 'Kategoriyasiz'}`}
                                            </p>
                                        </div>
                                        
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                                            materialTab === 'tests' 
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-blue-500/20' 
                                                : materialTab === 'podcasts' 
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-purple-500/20' 
                                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-500/20'
                                        }`}>
                                            {materialTab === 'tests' ? item.type : materialTab}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
