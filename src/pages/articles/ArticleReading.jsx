import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BookMarked, Share2, 
  Type, MessageSquare, CheckCircle2,
  ArrowRight, ExternalLink, Clock, User,
  Star, PlayCircle, MoreHorizontal, Send, 
  X, MessageSquare as MessageSquareIcon, Sparkles, Volume2,
  Pause, Play, Award
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useAuth } from '../../context/AuthContext';
import SiteFooter from '../../components/common/SiteFooter';
import { useGamification } from '../../hooks/useGamification';

const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
};

export default function ArticleReading() {
  const { user, userData } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textSize, setTextSize] = useState('text-lg'); // text-base, text-lg, text-xl
  const [completed, setCompleted] = useState(false);
  const { awardXP } = useGamification();
  
  // Interaction states
  const [claps, setClaps] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isClapping, setIsClapping] = useState(false);
  
  // Speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [synth, setSynth] = useState(window.speechSynthesis);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
        const docRef = doc(db, "articles", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setArticle({ id: docSnap.id, ...data });
            setClaps(data.claps || 0);
            setComments(data.comments || []);
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

  const handleClap = async () => {
    if (!article) return;
    setIsClapping(true);
    const newClapCount = claps + 1;
    setClaps(newClapCount);
    
    try {
      const docRef = doc(db, "articles", id);
      await updateDoc(docRef, { claps: newClapCount });
    } catch (err) {
      console.error("Error updating claps:", err);
    }
    
    setTimeout(() => setIsClapping(false), 300);
  };

  const handleClaimXP = async () => {
    if (!user || !article) return;
    const result = await awardXP('article', article.id, article.title);
    if (result.success) {
      alert(`Tabriklaymiz! Siz ushbu maqolani o'qib ${result.amount} XP yig'dingiz.`);
      setCompleted(true);
    } else if (result.alreadyAwarded) {
      alert("Siz allaqachon bu maqola uchun XP olgansiz!");
      setCompleted(true);
    } else {
      alert("Xatolik: " + result.error);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    
    const commentData = {
      id: Date.now(),
      text: newComment,
      userId: user.uid,
      userName: userData?.fullName || user.email?.split('@')[0] || "User",
      userAvatar: userData?.avatar || null,
      createdAt: new Date().toISOString()
    };
    
    // Optimistic update
    setComments(prev => [commentData, ...prev]);
    const tempComment = newComment;
    setNewComment("");
    
    try {
      const docRef = doc(db, "articles", id);
      await updateDoc(docRef, { 
        comments: arrayUnion(commentData) 
      });
    } catch (err) {
      console.error("Error posting comment:", err);
      setNewComment(tempComment); // Restore text on error
      setComments(prev => prev.filter(c => c.id !== commentData.id)); // Rollback
      alert("Izohni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    }
  };

  const handleListen = () => {
    if (isSpeaking && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    if (!article) return;

    // Get content to read
    const isPro = userData?.accountType === 'pro' || userData?.isPro;
    const isStandard = userData?.accountType === 'standard';
    const canAccess = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
    
    const isLocked = article.isMemberOnly && !canAccess;
    const blocksToRead = isLocked 
      ? article.content?.slice(0, Math.ceil(article.content.length / 3)) 
      : article.content;

    if (!blocksToRead || blocksToRead.length === 0) return;

    const readBlock = (index) => {
      if (index >= blocksToRead.length) {
        setIsSpeaking(false);
        setCurrentBlockIndex(-1);
        return;
      }

      setCurrentBlockIndex(index);
      
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = blocksToRead[index].text;
      const text = tempDiv.textContent || tempDiv.innerText || "";
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const naturalVoice = voices.find(v => v.name.includes('Natural') || v.name.includes('Google US English'));
      if (naturalVoice) utterance.voice = naturalVoice;
      utterance.rate = 0.95;

      utterance.onend = () => {
        if (!synth.paused) {
          readBlock(index + 1);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentBlockIndex(-1);
      };

      synth.speak(utterance);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    synth.cancel(); // Reset any existing speech
    readBlock(0);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      synth.cancel();
    };
  }, [synth]);



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
                {stripHtml(article.subtitle)}
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
              <button 
                onClick={handleClap}
                className={`flex items-center gap-2 text-[#6B6B6B] hover:text-[#242424] transition-all group ${isClapping ? 'scale-110' : ''}`}
              >
                <motion.div 
                  animate={isClapping ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                  className="p-1 group-hover:scale-110 transition-transform text-xl"
                >
                  👏
                </motion.div>
                <span className="text-[13px] font-medium">{claps >= 1000 ? (claps/1000).toFixed(1) + 'K' : claps}</span>
              </button>
              <button 
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#242424] transition-all group"
              >
                <MessageSquareIcon size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[13px] font-medium">{comments.length}</span>
              </button>
            </div>
            <div className="flex items-center gap-4 text-[#6B6B6B]">
              <button 
                onClick={handleListen}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isSpeaking ? 'bg-black text-white' : 'hover:text-[#242424] hover:bg-black/[0.03]'}`}
              >
                {isSpeaking ? (
                  <Pause size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
                <span className="text-[13px] font-medium">
                  {isPaused ? 'Paused' : isSpeaking ? 'Listening...' : 'Listen'}
                </span>
              </button>
              <button className="p-1 hover:text-[#242424] transition-all"><BookMarked size={20} /></button>
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

        <article className={`${textSize} text-[#242424] font-serif article-container relative`}>
          {(() => {
            const isPro = userData?.accountType === 'pro' || userData?.isPro;
            const isStandard = userData?.accountType === 'standard';
            const canAccess = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
            
            const isLocked = article.isMemberOnly && !canAccess;
            const contentToShow = isLocked 
              ? article.content?.slice(0, Math.ceil(article.content.length / 3)) 
              : article.content;

            return (
              <>
                {contentToShow?.map((block, i) => {
                  const cleanText = (block.text || '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00A0/g, ' ');

                  return block.type === 'heading' ? (
                    <h2 
                      key={i} 
                      className={`font-bold text-[#242424] font-serif transition-all duration-500 ${currentBlockIndex === i ? 'border-b-2 border-blue-500 pb-1' : ''}`}
                      style={{
                        fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
                        lineHeight: block.style?.lineHeight || 1.2,
                        marginTop: block.style?.marginTop ? `${block.style.marginTop}px` : '2.5rem',
                        marginBottom: block.style?.marginBottom ? `${block.style.marginBottom}px` : '1rem',
                        fontWeight: block.style?.fontWeight || '700',
                        letterSpacing: block.style?.letterSpacing || undefined,
                        fontFamily: 'Charter, Georgia, Cambria, "Times New Roman", Times, serif'
                      }}
                    >
                      {cleanText.replace(/<[^>]*>/g, '')}
                    </h2>
                  ) : (
                    <div 
                      key={i} 
                      className={`article-body-block font-serif transition-all duration-500 ${currentBlockIndex === i ? 'border-b-2 border-blue-500 pb-1 bg-blue-50/10' : ''}`}
                      style={{
                        fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
                        lineHeight: block.style?.lineHeight || 1.8,
                        marginBottom: block.style?.marginBottom ? `${block.style.marginBottom}px` : '1.5rem',
                        fontWeight: block.style?.fontWeight || '400',
                        letterSpacing: block.style?.letterSpacing || undefined,
                        fontFamily: 'Charter, Georgia, Cambria, "Times New Roman", Times, serif'
                      }}
                      dangerouslySetInnerHTML={{ __html: cleanText }}
                    />
                  );
                })}

                {isLocked && (
                  <div className="relative mt-0">
                    {/* The "Fade to Blur" Transition Section */}
                    <div className="relative h-64 overflow-hidden pointer-events-none select-none">
                      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-white/80 to-white" />
                      <div className="blur-[1.5px] opacity-40">
                        {article.content?.slice(Math.ceil(article.content.length / 3), Math.ceil(article.content.length / 3) + 2).map((block, i) => (
                           <div 
                              key={i} 
                              className="article-body-block font-serif"
                              style={{
                                fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
                                lineHeight: block.style?.lineHeight || 1.8,
                                marginBottom: block.style?.marginBottom ? `${block.style.marginBottom}px` : '1.5rem',
                                fontWeight: block.style?.fontWeight || '400',
                                fontFamily: 'Charter, Georgia, Cambria, "Times New Roman", Times, serif'
                              }}
                              dangerouslySetInnerHTML={{ __html: block.text }}
                            />
                        ))}
                      </div>
                    </div>

                    {/* Premium Paywall Section */}
                    <div className="relative z-20 text-center max-w-2xl mx-auto space-y-12 pt-10 pb-32 bg-white">
                      <div className="space-y-6">
                        <h2 className="text-3xl md:text-[42px] font-bold text-[#242424] leading-tight">
                          Become a member to read this story, and all of IELTS Portal.
                        </h2>
                        <p className="text-[#6B6B6B] text-lg max-w-xl mx-auto">
                          {article.author} put this story behind our paywall, so it’s only available to read with a paid IELTS Portal membership, which comes with a host of benefits:
                        </p>
                      </div>

                      <div className="space-y-4 text-left max-w-lg mx-auto">
                        {[
                          "Access all member-only stories on IELTS Portal",
                          "Read everything on the platform, including premium sets",
                          "Support the expert writers and teachers you learn from",
                          "Help build an ad-free, independent learning platform"
                        ].map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-4">
                            <Star size={18} className="text-yellow-500 fill-yellow-500 mt-1 shrink-0" />
                            <p className="text-[#242424] font-medium">{benefit}</p>
                          </div>
                        ))}
                      </div>

                      {/* Premium Content Preview (Circles) */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8">
                        {[
                          { title: "Advanced Grammar", img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop" },
                          { title: "Writing Task 2", img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&h=200&fit=crop" },
                          { title: "Speaking Mastery", img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&h=200&fit=crop" },
                          { title: "Reading Hacks", img: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=200&h=200&fit=crop" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-3">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-gray-100 shadow-lg">
                              <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                            </div>
                            <span className="text-[13px] font-bold text-[#242424] text-center line-clamp-1">{item.title}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-8">
                        <button 
                          onClick={() => navigate('/pricing')}
                          className="px-12 py-3.5 bg-[#1A8917] hover:bg-[#156d12] text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-[#1A8917]/20 active:scale-95"
                        >
                          Upgrade
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </article>
        
        {/* Claim XP Section */}
        {user && article && !article.isMemberOnly && (
          <div className="mt-16 flex flex-col items-center justify-center p-8 bg-blue-50/50 rounded-3xl border border-blue-100">
            <Sparkles className="text-blue-500 mb-4" size={32} />
            <h3 className="text-xl font-bold text-[#242424] mb-2">Maqolani o'qib chiqdingizmi?</h3>
            <p className="text-[#6B6B6B] mb-6 text-center">XP yig'ing va reytingda ko'tariling.</p>
            <button 
              onClick={handleClaimXP}
              disabled={completed || userData?.awardedItems?.includes(article.id)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {completed || userData?.awardedItems?.includes(article.id) ? (
                <><CheckCircle2 size={18} /> XP Olindi</>
              ) : (
                <><Award size={18} /> XP Olish (+10)</>
              )}
            </button>
          </div>
        )}
        <style>{`
          .article-container, 
          .article-container h2, 
          .article-container div, 
          .article-container p, 
          .article-container span {
            font-family: Charter, Georgia, Cambria, "Times New Roman", Times, serif !important;
          }
          .article-body-block {
            word-break: normal;
            overflow-wrap: normal;
            hyphens: none;
            -webkit-hyphens: none;
          }
          .article-body-block p { margin-bottom: 0.75em; }
          .article-body-block ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
          .article-body-block ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
          .article-body-block li { margin-bottom: 0.25rem; }
          .article-body-block a { color: #0066CC; text-decoration: underline; }
          .article-body-block strong { font-weight: 700; }
          .article-body-block em { font-style: italic; }
          .article-body-block s { text-decoration: line-through; }
          .article-body-block u { text-decoration: underline; }
        `}</style>


        {/* Bottom Comment Section - Moved Higher */}
        <section className="mt-20 border-t border-black/[0.05] pt-12 pb-32">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-[#242424]">Responses ({comments.length})</h3>
          </div>

          {/* Inline Input Area */}
          <div className="bg-white p-6 rounded-3xl border border-black/[0.05] shadow-sm mb-12 group focus-within:border-blue-500 transition-all">
            <div className="flex gap-4 mb-4">
              {userData?.avatar ? (
                <img src={userData.avatar} className="w-10 h-10 rounded-full border border-black/[0.05]" alt="me" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                  {userData?.fullName?.charAt(0) || user?.email?.charAt(0)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#242424]">{userData?.fullName || "Your Response"}</span>
                <span className="text-xs text-gray-500">Share your thoughts</span>
              </div>
            </div>
            <textarea 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="What are your thoughts?"
              className="w-full bg-transparent border-none focus:ring-0 text-[16px] min-h-[100px] resize-none placeholder-gray-400"
            />
            <div className="flex justify-end pt-4 border-t border-black/[0.02]">
              <button 
                disabled={!newComment.trim()}
                onClick={handlePostComment}
                className="px-6 py-2.5 bg-[#1A8917] hover:bg-[#156d12] text-white rounded-full text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                Publish <Send size={16} />
              </button>
            </div>
          </div>

          {/* Comments Feed */}
          <div className="space-y-10">
            {comments.length > 0 ? comments.map((comment) => (
              <div key={comment.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  {comment.userAvatar ? (
                    <img src={comment.userAvatar} className="w-9 h-9 rounded-full border border-black/[0.05]" alt={comment.userName} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                      {comment.userName?.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#242424]">{comment.userName}</span>
                    <span className="text-[12px] text-[#6B6B6B]">{new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <p className="text-[16px] leading-relaxed text-[#242424] pl-12 font-serif">
                  {comment.text}
                </p>
                <div className="pl-12 flex items-center gap-4 text-gray-400">
                  <button className="flex items-center gap-1.5 hover:text-[#242424] transition-colors">
                    👏 <span className="text-xs font-medium">Helpful</span>
                  </button>
                  <button className="text-xs font-medium hover:text-[#242424] transition-colors">Reply</button>
                </div>
              </div>
            )) : (
              <div className="py-16 text-center space-y-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No responses yet. Be the first to share your thoughts.</p>
              </div>
            )}
          </div>
        </section>
      </main>



      <SiteFooter />

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
            >
              <div className="p-6 border-b border-black/[0.05] flex items-center justify-between">
                <h3 className="text-xl font-bold">Responses ({comments.length})</h3>
                <button 
                  onClick={() => setShowComments(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Input Area */}
                <div className="bg-white p-4 rounded-2xl border border-black/[0.05] shadow-sm mb-4">
                  <div className="flex gap-3 mb-3">
                    {userData?.avatar ? (
                      <img src={userData.avatar} className="w-8 h-8 rounded-full" alt="me" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {userData?.fullName?.charAt(0) || user?.email?.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium">{userData?.fullName || "Writing response..."}</span>
                  </div>
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full bg-transparent border-none focus:ring-0 text-sm min-h-[100px] resize-none"
                  />
                  <div className="flex justify-end pt-2">
                    <button 
                      disabled={!newComment.trim()}
                      onClick={handlePostComment}
                      className="px-4 py-2 bg-[#1A8917] hover:bg-[#156d12] text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      Respond <Send size={14} />
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-6">
                  {comments.length > 0 ? comments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        {comment.userAvatar ? (
                          <img src={comment.userAvatar} className="w-8 h-8 rounded-full border border-black/[0.05]" alt={comment.userName} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {comment.userName?.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{comment.userName}</span>
                          <span className="text-[12px] text-[#6B6B6B]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-[14px] leading-relaxed text-[#242424] pl-11">
                        {comment.text}
                      </p>
                    </div>
                  )) : (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                        <MessageSquareIcon size={32} />
                      </div>
                      <p className="text-gray-400 text-sm">No responses yet. Be the first to respond.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

