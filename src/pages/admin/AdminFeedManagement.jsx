import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { 
    collection, getDocs, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';

import AdminFeedPostCard from '../../components/admin/AdminFeed/AdminFeedPostCard';
import AdminStoryCard from '../../components/admin/AdminFeed/AdminStoryCard';
import PostFormModal from '../../components/admin/AdminFeed/PostFormModal';
import StoryFormModal from '../../components/admin/AdminFeed/StoryFormModal';

export default function AdminFeedManagement() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Tabs: 'posts' | 'stories'
    const [activeSubTab, setActiveSubTab] = useState('posts');
    const [loading, setLoading] = useState(true);

    // Lists
    const [posts, setPosts] = useState([]);
    const [stories, setStories] = useState([]);

    // Modals
    const [showPostModal, setShowPostModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [editingPost, setEditingPost] = useState(null);

    const handleEditPostClick = (post) => {
        setEditingPost(post);
        setShowPostModal(true);
    };

    const handleClosePostModal = () => {
        setShowPostModal(false);
        setEditingPost(null);
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
        <div className={`min-h-full font-sans p-4 md:p-6 transition-colors duration-200 ${
            isDark ? 'bg-[#121212] text-white' : 'bg-[#F5F5F7] text-gray-900'
        }`}>
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <button 
                            onClick={() => navigate('/admin')} 
                            className={`p-2 shrink-0 rounded-xl transition ${
                                isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                            }`}
                        >
                            <FaArrowLeft />
                        </button>
                        <div className="text-left min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Feed & Stories Boshqaruvi</h1>
                            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                O'quvchilar dashboard tasmasi va stories kontentini yaratish hamda boshqarish.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => setShowStoryModal(true)}
                            className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2.5 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-md transition whitespace-nowrap"
                        >
                            <FaPlus /> Yangi Story
                        </button>
                        <button
                            onClick={() => {
                                setEditingPost(null);
                                setShowPostModal(true);
                            }}
                            className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-md transition whitespace-nowrap"
                        >
                            <FaPlus /> Yangi Post
                        </button>
                    </div>
                </div>

                {/* Sub Tab Controls */}
                <div className="flex border-b border-gray-200 dark:border-white/5 gap-4 sm:gap-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveSubTab('posts')}
                        className={`pb-3 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap ${
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
                        className={`pb-3 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap ${
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
                                <AdminFeedPostCard
                                    key={post.id}
                                    post={post}
                                    onEdit={handleEditPostClick}
                                    onDelete={handleDeletePost}
                                />
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
                            stories.map((story) => (
                                <AdminStoryCard
                                    key={story.id}
                                    story={story}
                                    onDelete={handleDeleteStory}
                                />
                            ))
                        )}
                    </div>
                )}

            </div>

            {/* Modals */}
            <PostFormModal
                isOpen={showPostModal}
                onClose={handleClosePostModal}
                editingPost={editingPost}
                onSubmitSuccess={fetchData}
            />

            <StoryFormModal
                isOpen={showStoryModal}
                onClose={() => setShowStoryModal(false)}
                onSubmitSuccess={fetchData}
            />
        </div>
    );
}
