import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BookMarked, Share2, 
  Type, MessageSquare, CheckCircle2,
  ArrowRight, ExternalLink, Clock, User,
  Star, PlayCircle, MoreHorizontal
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { useAuth } from '../context/AuthContext';
import SiteFooter from '../components/common/SiteFooter';

export default function ArticleReading() {
  const { user, userData } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textSize, setTextSize] = useState('text-lg'); // text-base, text-lg, text-xl
  const [completed, setCompleted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
        const docRef = doc(db, "articles", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setArticle({ id: docSnap.id, ...docSnap.data() });
        } else {
            console.error("Article not found");
            navigate('/articles');
        }
    } catch (err) {
        console.error("Error fetching article:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    setCompleted(true);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1D1D1F] font-sans antialiased selection:bg-blue-50 selection:text-blue-600">
      <DashboardHeader user={user} userData={userData} activeTab="articles" />
      
      {/* Sub Header / Action Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.05] py-3">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/articles')}
            className="flex items-center gap-1.5 text-sm font-bold text-[#0066CC] hover:bg-blue-50 px-4 py-2 rounded-full transition-all"
          >
            <ChevronLeft size={18} /> All Articles
          </button>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setTextSize(prev => prev === 'text-base' ? 'text-lg' : prev === 'text-lg' ? 'text-xl' : 'text-base')}
              className="p-2.5 hover:bg-[#F5F5F7] rounded-full transition-all text-[#86868B]"
              title="Font Size"
            >
              <Type size={20} />
            </button>
            <button className="p-2.5 hover:bg-[#F5F5F7] rounded-full transition-all text-[#86868B]">
              <BookMarked size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 pt-8 pb-20 md:pt-12 md:pb-32">
        {/* MEDIUM STYLE HEADER */}
        <div className="space-y-8 mb-12">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {article.isMemberOnly && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F2F2F2] rounded-md text-[13px] font-medium text-[#242424] border border-black/[0.05]">
                <Star size={14} className="text-yellow-500 fill-yellow-500" /> Member-only story
              </div>
            )}
            {article.isFeatured && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F2F2F2] rounded-md text-[13px] font-medium text-[#242424] border border-black/[0.05]">
                <BookMarked size={14} className="text-gray-500" /> Featured
              </div>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-[42px] font-bold tracking-tight leading-[1.2] text-[#242424] font-serif"
            >
              {article.title}
            </motion.h1>
            {article.subtitle && (
              <p className="text-xl md:text-2xl text-[#6B6B6B] leading-snug">
                {article.subtitle}
              </p>
            )}
          </div>

          {/* Author Bio Row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                {article.authorAvatar ? (
                  <img src={article.authorAvatar} className="w-12 h-12 rounded-full object-cover border border-black/[0.05]" alt={article.author} />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400">
                    {article.author?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[16px] text-[#242424] hover:underline cursor-pointer">{article.author}</span>
                  <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 text-white" />
                  <span className="text-[#6B6B6B] text-[16px] mx-1">·</span>
                  <button className="text-[#1A8917] text-[16px] font-medium hover:text-[#156d12] transition-colors">Follow</button>
                </div>
                <div className="flex items-center gap-2 text-[#6B6B6B] text-[14px]">
                  <span>{article.readTime || '5 min read'}</span>
                  <span>·</span>
                  <span>{article.createdAt ? new Date(article.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 13, 2026'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interaction Bar */}
          <div className="flex items-center justify-between py-4 border-y border-black/[0.05]">
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#242424] transition-all group">
                <div className="p-1 group-hover:scale-110 transition-transform">👏</div>
                <span className="text-[13px]">5.8K</span>
              </button>
              <button className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#242424] transition-all group">
                <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[13px]">223</span>
              </button>
            </div>
            <div className="flex items-center gap-4 text-[#6B6B6B]">
              <button className="p-1 hover:text-[#242424] transition-all"><BookMarked size={20} /></button>
              <button className="p-1 hover:text-[#242424] transition-all"><PlayCircle size={20} /></button>
              <button className="p-1 hover:text-[#242424] transition-all"><Share2 size={20} /></button>
              <button className="p-1 hover:text-[#242424] transition-all"><MoreHorizontal size={20} /></button>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {article.imageUrl && (
          <div className="mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full aspect-video rounded-lg overflow-hidden"
            >
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            </motion.div>
            <p className="text-center text-[14px] text-[#6B6B6B] mt-4">
              All illustrations by <span className="underline cursor-pointer">{article.author}</span>
            </p>
          </div>
        )}

        {/* Article Body */}
        <article className={`${textSize} leading-[1.8] text-[#242424] space-y-8 font-serif`}>
          {article.content?.map((block, i) => (
            block.type === 'heading' ? (
              <h2 key={i} className="text-2xl md:text-3xl font-bold text-[#242424] pt-6">{block.text}</h2>
            ) : (
              <p key={i} className="opacity-100">{block.text}</p>
            )
          ))}
        </article>

        {/* Quiz Section */}
        {article.quiz && article.quiz.length > 0 && (
            <div className="mt-32">
                {!quizSubmitted ? (
                    <div className="p-8 md:p-12 rounded-[40px] bg-[#F5F5F7] border border-black/[0.03] shadow-inner">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold mb-2">Comprehension Check</h3>
                            <p className="text-[#86868B] text-sm font-medium">Test your understanding of the article above.</p>
                        </div>
                        
                        <div className="space-y-12">
                            {article.quiz.map((q, qIdx) => (
                                <div key={qIdx} className="space-y-6">
                                    <p className="font-bold text-xl leading-snug">
                                        <span className="text-blue-600 mr-2">Q{qIdx + 1}.</span> 
                                        {q.question}
                                    </p>
                                    <div className="grid grid-cols-1 gap-3">
                                        {q.options.map((opt, optIdx) => (
                                            <button 
                                                key={optIdx}
                                                onClick={() => setSelectedAnswers({...selectedAnswers, [qIdx]: optIdx})}
                                                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                                                    selectedAnswers[qIdx] === optIdx 
                                                    ? 'bg-white border-blue-500 shadow-xl shadow-blue-500/5' 
                                                    : 'bg-white border-black/[0.03] hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all ${
                                                        selectedAnswers[qIdx] === optIdx ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-400'
                                                    }`}>
                                                        {String.fromCharCode(65 + optIdx)}
                                                    </div>
                                                    <span className="font-bold">{opt}</span>
                                                </div>
                                                <ArrowRight size={18} className={`text-blue-600 transition-all ${selectedAnswers[qIdx] === optIdx ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            disabled={Object.keys(selectedAnswers).length < article.quiz.length}
                            onClick={handleQuizSubmit}
                            className="w-full mt-12 py-5 bg-[#1d1d1f] text-white rounded-[24px] font-black text-lg shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            Submit Answers
                        </button>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-12 rounded-[48px] bg-blue-50 border border-blue-100 text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <CheckCircle2 size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/30">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-3xl font-bold text-blue-900 mb-4">Reading Complete!</h3>
                            <p className="text-blue-700/80 mb-10 font-bold text-lg max-w-md mx-auto">
                                Great job! You've successfully read the article and completed the comprehension check.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button 
                                    onClick={() => navigate('/articles')}
                                    className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all w-full sm:w-auto"
                                >
                                    Browse More Articles
                                </button>
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    className="px-10 py-5 bg-white text-blue-600 border border-blue-100 rounded-3xl font-black hover:bg-white/50 transition-all w-full sm:w-auto"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

