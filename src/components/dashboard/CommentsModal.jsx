import React, { useState, useEffect } from 'react';
import { X, Send, Trash } from 'lucide-react';
import { db } from '../../firebase/firebase';
import { 
    collection, query, orderBy, getDocs, addDoc, 
    deleteDoc, doc, updateDoc, serverTimestamp, increment 
} from 'firebase/firestore';

export default function CommentsModal({ isOpen, onClose, postId, user, userData, onCommentAdded }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !postId) return;

        const fetchComments = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'feed_posts', postId, 'comments'),
                    orderBy('createdAt', 'asc')
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : new Date()
                }));
                setComments(list);
            } catch (err) {
                console.error("Error fetching comments:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchComments();
    }, [isOpen, postId]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submitting || !user) return;

        setSubmitting(true);
        const commentText = newComment.trim();
        setNewComment("");

        try {
            const commentsColRef = collection(db, 'feed_posts', postId, 'comments');
            const postRef = doc(db, 'feed_posts', postId);

            const docData = {
                userId: user.uid,
                userName: userData?.fullName || user.displayName || "O'quvchi",
                userRole: userData?.role || 'student',
                text: commentText,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(commentsColRef, docData);
            
            // Increment comment count locally and in Firestore
            await updateDoc(postRef, {
                commentsCount: increment(1)
            });

            setComments(prev => [...prev, {
                id: docRef.id,
                ...docData,
                createdAt: new Date()
            }]);

            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (err) {
            console.error("Error adding comment:", err);
            alert("Izoh qoldirishda xatolik yuz berdi.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm("Haqiqatan ham ushbu izohni o'chirmoqchimisiz?")) return;

        try {
            const commentRef = doc(db, 'feed_posts', postId, 'comments', commentId);
            const postRef = doc(db, 'feed_posts', postId);

            await deleteDoc(commentRef);
            await updateDoc(postRef, {
                commentsCount: increment(-1)
            });

            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            console.error("Error deleting comment:", err);
            alert("Izohni o'chirishda xatolik yuz berdi.");
        }
    };

    const isAdmin = userData?.role === 'admin';

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
            <div 
                className="absolute inset-0" 
                onClick={onClose} 
            />

            <div className="relative w-full max-w-[500px] h-[80vh] md:h-[600px] bg-warm-canvas dark:bg-warm-dark-elevated rounded-t-3xl md:rounded-3xl border border-warm-hairline dark:border-white/5 flex flex-col overflow-hidden shadow-2xl z-10">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-4 border-b border-warm-hairline dark:border-white/5">
                    <h3 className="font-bold text-warm-ink dark:text-warm-on-dark text-base">Izohlar</h3>
                    <button
                        onClick={onClose}
                        className="text-warm-muted-soft hover:text-warm-body dark:hover:text-warm-on-dark p-1 rounded-full hover:bg-warm-surface dark:hover:bg-white/5 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <div className="w-8 h-8 border-4 border-warm-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-warm-muted-soft">Izohlar yuklanmoqda...</span>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-warm-muted-soft dark:text-warm-on-dark-soft py-10">
                            <span className="text-sm">Birinchi bo'lib izoh qoldiring!</span>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex items-start justify-between gap-3 group">
                                <div className="flex items-start gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-warm-primary/10 dark:bg-warm-primary/20 flex items-center justify-center text-warm-primary font-bold text-xs uppercase flex-shrink-0">
                                        {comment.userName?.slice(0, 2)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-xs text-warm-body-strong dark:text-warm-on-dark">
                                                {comment.userName}
                                            </span>
                                            {comment.userRole === 'admin' && (
                                                <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.25 rounded">
                                                    Admin
                                                </span>
                                            )}
                                            <span className="text-[9px] text-warm-muted-soft">
                                                {comment.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-warm-body dark:text-warm-on-dark-soft mt-0.5 whitespace-pre-wrap leading-relaxed">
                                            {comment.text}
                                        </p>
                                    </div>
                                </div>

                                {(isAdmin || user?.uid === comment.userId) && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="p-1 text-warm-muted-soft hover:text-red-500 rounded hover:bg-warm-surface dark:hover:bg-white/5 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                        <Trash size={14} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Input area */}
                <form
                    onSubmit={handleSubmit}
                    className="p-4 border-t border-warm-hairline dark:border-white/5 bg-warm-surface dark:bg-warm-dark flex gap-2"
                >
                    <input
                        type="text"
                        placeholder="Izoh yozing..."
                        className="flex-1 bg-warm-canvas dark:bg-warm-dark-elevated border border-warm-hairline dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-warm-primary focus:ring-1 focus:ring-warm-primary transition"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={submitting}
                        required
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="p-2.5 bg-warm-primary hover:bg-warm-primary-active text-white rounded-xl transition disabled:opacity-50 flex items-center justify-center"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}
