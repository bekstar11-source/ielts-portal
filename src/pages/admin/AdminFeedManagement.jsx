import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase/firebase';
import { 
    collection, getDocs, addDoc, deleteDoc, doc, 
    query, orderBy, serverTimestamp, Timestamp, where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    FaArrowLeft, FaPlus, FaTrash, FaCheck, FaInfoCircle, 
    FaExclamationTriangle, FaTimes, FaCamera, FaLink, FaImage, FaFilm 
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
        mediaFile: null
    });

    const [storyForm, setStoryForm] = useState({
        mediaType: 'image', // 'image' | 'video' | 'text'
        text: '',
        ctaUrl: '',
        ctaText: '',
        durationHours: '24',
        mediaFile: null
    });

    // Test Selector States
    const [showTestSelector, setShowTestSelector] = useState(null); // 'post' | 'story' | null
    const [allTests, setAllTests] = useState([]);
    const [selectorSearchTerm, setSelectorSearchTerm] = useState('');
    const [loadingSelectorTests, setLoadingSelectorTests] = useState(false);

    const openTestSelector = async (target) => {
        setShowTestSelector(target);
        if (allTests.length === 0) {
            setLoadingSelectorTests(true);
            try {
                const q = query(
                    collection(db, "tests_metadata"), 
                    orderBy("createdAt", "desc"),
                    limit(500)
                );
                const snap = await getDocs(q);
                const testsList = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(t => !t.id.startsWith("_tag") && t.id !== "tag_metadata");
                setAllTests(testsList);
            } catch (err) {
                console.error("Error fetching tests for selector:", err);
                toast.error("Testlarni yuklab bo'lmadi.");
            } finally {
                setLoadingSelectorTests(false);
            }
        }
    };

    const handleSelectTestForCta = (test) => {
        if (showTestSelector === 'post') {
            setPostForm(prev => ({
                ...prev,
                ctaUrl: `/test/${test.id}`,
                ctaText: 'Testni Boshlash'
            }));
        } else if (showTestSelector === 'story') {
            setStoryForm(prev => ({
                ...prev,
                ctaUrl: `/test/${test.id}`,
                ctaText: 'Testni Boshlash',
                text: prev.text || test.title
            }));
        }
        setShowTestSelector(null);
        setSelectorSearchTerm('');
    };

    const filteredSelectorTests = allTests.filter(t => 
        (t.title || '').toLowerCase().includes(selectorSearchTerm.toLowerCase()) ||
        (t.type || '').toLowerCase().includes(selectorSearchTerm.toLowerCase())
    );

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
            let mediaUrl = "";
            let mediaType = "none";

            if (postForm.mediaFile && postForm.type === 'post') {
                const fileRef = ref(storage, `feed_posts/${Date.now()}_${postForm.mediaFile.name}`);
                const uploadSnap = await uploadBytes(fileRef, postForm.mediaFile);
                mediaUrl = await getDownloadURL(uploadSnap.ref);
                mediaType = postForm.mediaFile.type.startsWith('video/') ? 'video' : 'image';
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
                if (mediaUrl) {
                    docData.mediaUrl = mediaUrl;
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
                mediaFile: null
            });
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

            await addDoc(collection(db, 'stories'), docData);
            toast.success("Story chop etildi! 📸");
            setShowStoryModal(false);
            setStoryForm({
                mediaType: 'image',
                text: '',
                ctaUrl: '',
                ctaText: '',
                durationHours: '24',
                mediaFile: null
            });
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
                            onClick={() => setShowStoryModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-md transition"
                        >
                            <FaPlus /> Yangi Story
                        </button>
                        <button
                            onClick={() => setShowPostModal(true)}
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
                                            isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-100'
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
                                            isDark ? 'bg-white/5 hover:bg-red-500/10 hover:text-red-500' : 'bg-gray-50 border border-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
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
                                            <p className="text-[10px] font-bold line-clamp-1">{story.text || 'Rasm / Video'}</p>
                                            {story.ctaUrl && <p className="text-[8px] text-blue-400 font-bold truncate">🔗 {story.ctaText || 'CTA'}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

            </div>

            {/* CREATE POST MODAL */}
            {showPostModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border relative transition-colors ${
                        isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
                    }`}>
                        <button 
                            onClick={() => setShowPostModal(false)} 
                            className={`absolute top-4 right-4 hover:opacity-80 transition-opacity ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                        >
                            <FaTimes />
                        </button>
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
                                        <label className="block text-xs font-bold uppercase mb-1.5 text-gray-400">Rasm yoki Video</label>
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={e => setPostForm({ ...postForm, mediaFile: e.target.files[0] })}
                                            className="text-xs w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                        />
                                    </div>

                                    {/* Optional CTA links to tests/articles */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold uppercase text-gray-400">CTA Link (Ixtiyoriy)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => openTestSelector('post')}
                                                    className="text-[10px] text-blue-500 hover:text-blue-400 font-bold transition flex items-center gap-1"
                                                >
                                                    🔍 Test tanlash
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 transition ${
                                                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                                }`}
                                                placeholder="/test/TEST_ID yoki /library"
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
            )}

            {/* CREATE STORY MODAL */}
            {showStoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border relative transition-colors ${
                        isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
                    }`}>
                        <button 
                            onClick={() => setShowStoryModal(false)} 
                            className={`absolute top-4 right-4 hover:opacity-80 transition-opacity ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                        >
                            <FaTimes />
                        </button>
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
                                        onChange={e => setStoryForm({ ...storyForm, mediaFile: e.target.files[0] })}
                                        className="text-xs w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-600 file:text-white hover:file:bg-pink-500"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase mb-1 text-gray-400">Hikoya Matni / Caption</label>
                                <textarea
                                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-500 transition-all h-24 resize-none ${
                                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                    }`}
                                    placeholder={storyForm.mediaType === 'text' ? 'Story uchun matn yozing (masalan, e\'lon matni)...' : 'Rasm/Video ustiga yoziladigan qisqa matn...'}
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
                                            onClick={() => openTestSelector('story')}
                                            className="text-[10px] text-pink-500 hover:text-pink-400 font-bold transition flex items-center gap-1"
                                        >
                                            🔍 Test tanlash
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-pink-500 transition ${
                                            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-200'
                                        }`}
                                        placeholder="/test/TEST_ID yoki /library"
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
            )}

            {/* TEST SELECTOR MODAL */}
            {showTestSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-3xl p-6 border relative flex flex-col max-h-[80vh] transition-colors ${
                        isDark ? 'bg-[#1E1E1E] border-white/10 text-white' : 'bg-white border-gray-100 shadow-2xl'
                    }`}>
                        <button 
                            type="button"
                            onClick={() => { setShowTestSelector(null); setSelectorSearchTerm(''); }} 
                            className={`absolute top-4 right-4 hover:opacity-80 transition-opacity ${isDark ? 'text-white/40' : 'text-gray-400'}`}
                        >
                            <FaTimes />
                        </button>
                        
                        <h3 className="text-lg font-bold mb-2">Testni tanlang</h3>
                        <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            Story yoki Postga biriktirish uchun kerakli testni tanlang.
                        </p>

                        <input
                            type="text"
                            value={selectorSearchTerm}
                            onChange={(e) => setSelectorSearchTerm(e.target.value)}
                            placeholder="Test nomi yoki turi bo'yicha qidirish..."
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 mb-4 transition-all ${
                                isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-55 border-gray-250'
                            }`}
                        />

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {loadingSelectorTests ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : filteredSelectorTests.length === 0 ? (
                                <div className="text-center py-10 text-xs text-gray-400">
                                    Hech qanday test topilmadi.
                                </div>
                            ) : (
                                filteredSelectorTests.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSelectTestForCta(t)}
                                        className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between text-xs font-medium ${
                                            isDark 
                                                ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10' 
                                                : 'bg-gray-55 border-gray-150 hover:bg-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className="font-bold truncate text-sm">{t.title}</p>
                                            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                Kolleksiya: {t.collectionName || 'Kolleksiyasiz'}
                                            </p>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                                            t.type === 'reading' 
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-500/20' 
                                                : t.type === 'listening' 
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-blue-500/20' 
                                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-purple-500/20'
                                        }`}>
                                            {t.type}
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
