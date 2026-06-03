import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Send, AlertTriangle, User, ShieldAlert, CheckCircle2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const safeToDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export default function TestCommentSection({ testId, user, userData }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isReport, setIsReport] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId) return;

    const q = query(
      collection(db, "testComments"),
      where("testId", "==", testId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: safeToDate(doc.data().createdAt)
      }));
      setComments(docs);
    });

    return () => unsubscribe();
  }, [testId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "testComments"), {
        testId,
        userId: user.uid,
        userName: userData?.fullName || user.displayName || "Student",
        userRole: userData?.role || 'student',
        text: newComment,
        isReport: isReport,
        status: isReport ? 'pending' : 'normal',
        createdAt: serverTimestamp()
      });

      // If it's a report, we could also send a notification to admin or a telegram bot
      if (isReport) {
        // Optional: Trigger a function or notification
        console.log("Mistake reported to admin");
      }

      setNewComment("");
      setIsReport(false);
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Xato yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-12 mb-20 max-w-[900px] mx-auto w-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[#0f0f0f] text-[15px]">Comments</h3>
          <span className="text-[13px] text-[#606060] font-medium">
            {comments.length}
          </span>
        </div>
      </div>

      {/* Comment Form - Compact YouTube Style */}
      <div className="p-5 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
            {userData?.fullName?.charAt(0) || user?.displayName?.charAt(0) || "S"}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="relative border-b border-gray-100 focus-within:border-[#0f0f0f] transition-all">
              <textarea
                value={newComment}
                onFocus={(e) => e.target.parentElement.classList.add('border-b-2')}
                onBlur={(e) => e.target.parentElement.classList.remove('border-b-2')}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full py-1 text-[13.5px] focus:outline-none resize-none bg-transparent min-h-[24px]"
              />
            </div>


            <div className="flex items-center justify-between">
              <label className={`flex items-center gap-1.5 cursor-pointer transition-all ${isReport ? 'text-orange-600' : 'text-gray-400'}`}>
                <input
                  type="checkbox"
                  checked={isReport}
                  onChange={(e) => setIsReport(e.target.checked)}
                  className="hidden"
                />
                <ShieldAlert size={12} className={isReport ? 'animate-pulse' : ''} />
                <span className="text-[11px] font-medium">Report error</span>
              </label>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => {setNewComment(""); setIsReport(false);}}
                  className="px-3 py-1.5 text-[13px] font-bold text-[#0f0f0f] hover:bg-gray-100 rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newComment.trim()}
                  className="px-3 py-1.5 bg-[#065fd4] text-white rounded-full font-bold text-[13px] hover:bg-[#0556bf] disabled:bg-gray-100 disabled:text-gray-400 transition-all"
                >
                  {loading ? "..." : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Comments List - Compact YouTube Style */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        <AnimatePresence initial={false}>
          {comments.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center opacity-40">
                <p className="text-[13px] font-medium">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-5 pb-8">
              {comments.map((comment, idx) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 group"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${comment.userRole === 'admin' ? 'bg-[#0f0f0f] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {comment.userName?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12.5px] font-bold text-[#0f0f0f]">
                        {comment.userName || 'Student'}
                      </span>
                      {comment.rating > 0 && (
                          <div className="flex items-center gap-0.5 ml-1">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              <span className="text-[10px] font-bold text-amber-600">{comment.rating}</span>
                          </div>
                      )}
                      <span className="text-[11px] text-[#606060]">
                        {comment.createdAt ? comment.createdAt.toLocaleDateString('uz-UZ') : "Just now"}
                      </span>
                      {comment.userRole === 'admin' && (
                        <span className="bg-[#0f0f0f]/5 px-1.5 py-0.5 rounded text-[10px] font-bold text-[#0f0f0f]">Admin</span>
                      )}
                    </div>
                    <p className="text-[13.5px] text-[#0f0f0f] leading-relaxed whitespace-pre-wrap mb-1.5">
                      {comment.text}
                    </p>
                    
                    <div className="flex items-center gap-3">
                        {comment.isReport && (
                            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                <AlertTriangle size={9} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">Mistake</span>
                            </div>
                        )}
                        {comment.status === 'resolved' && (
                            <div className="flex items-center gap-1 text-emerald-600 text-[9px] font-bold uppercase tracking-tight">
                                <CheckCircle2 size={10} />
                                Fixed
                            </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
