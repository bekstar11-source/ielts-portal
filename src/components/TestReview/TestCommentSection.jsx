import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Send, AlertTriangle, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        createdAt: doc.data().createdAt?.toDate()
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
      <div className="px-6 py-4 border-b border-gray-50 bg-[#FBFBFD] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-500" />
          <h3 className="font-bold text-[#1d1d1f] text-sm uppercase tracking-widest">Muhokama</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
          {comments.length} izoh
        </span>
      </div>

      {/* Comment Form */}
      <div className="p-6 border-b border-gray-50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative group">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Test haqida fikringizni yozing yoki xato topsangiz xabar bering..."
              className="w-full border-2 border-gray-50 p-4 rounded-2xl text-sm min-h-[100px] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none resize-none bg-[#F5F5F7] focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl transition-all ${isReport ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50 text-gray-500'}`}>
              <input
                type="checkbox"
                checked={isReport}
                onChange={(e) => setIsReport(e.target.checked)}
                className="hidden"
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isReport ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'}`}>
                {isReport && <ShieldAlert size={12} />}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Xatolik haqida xabar berish</span>
            </label>

            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1d1d1f] text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-lg shadow-black/5"
            >
              {loading ? "Yuborilmoqda..." : "Yuborish"}
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="p-6 max-h-[500px] overflow-y-auto bg-[#FBFBFD]/50">
        <AnimatePresence initial={false}>
          {comments.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center opacity-40">
                <MessageSquare size={40} className="mb-2" />
                <p className="text-sm font-medium">Hozircha hech qanday izoh yo'q. Birinchi bo'lib yozing!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment, idx) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex gap-4 ${comment.isReport ? 'bg-orange-50/50 p-4 rounded-2xl border border-orange-100' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${comment.userRole === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold ${comment.userRole === 'admin' ? 'text-blue-600' : 'text-[#1d1d1f]'}`}>
                          {comment.userName}
                          {comment.userRole === 'admin' && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-100 px-1.5 py-0.5 rounded text-blue-600">Admin</span>}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {comment.createdAt ? comment.createdAt.toLocaleDateString('uz-UZ') : "Hozirgina"}
                        </span>
                      </div>
                      {comment.isReport && (
                        <div className="flex items-center gap-1.5 text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                          <AlertTriangle size={10} />
                          <span className="text-[9px] font-black uppercase tracking-widest">Reported</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[#1d1d1f] leading-relaxed whitespace-pre-wrap font-medium opacity-80">
                      {comment.text}
                    </p>
                    
                    {comment.status === 'resolved' && (
                        <div className="mt-2 flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                            <CheckCircle2 size={12} />
                            Admin tomonidan tuzatildi
                        </div>
                    )}
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
