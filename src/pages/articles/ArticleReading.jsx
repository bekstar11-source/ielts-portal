/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BookMarked, Share2, 
  Type, MessageSquare, CheckCircle2,
  ArrowRight, ExternalLink, Clock, User,
  Star, PlayCircle, MoreHorizontal, Send, 
  X, MessageSquare as MessageSquareIcon, Sparkles, Volume2,
  Pause, Play, Award, ShieldCheck
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from "firebase/firestore";
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useAuth } from '../../context/AuthContext';
import SiteFooter from '../../components/common/SiteFooter';
import { useGamification } from '../../hooks/useGamification';
import { stripHtml } from '../../utils/textUtils';
import ArticleVocabulary from '../../components/articles/ArticleVocabulary';
import ArticleLevelPicker from '../../components/articles/ArticleLevelPicker';
import {
  ARTICLE_LEVELS,
  getArticleContent,
  getArticleVocabulary,
  getArticleReadTime,
  getDefaultReadingLevel,
  savePreferredReadingLevel,
} from '../../utils/articleLevels';
import { hasClappedArticle, addArticleClap, removeArticleClap } from '../../utils/articleClaps';

export default function ArticleReading() {
  const { user, userData, updateUserLocalData } = useAuth();
  const isTeacher = userData?.role === 'teacher';
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textSize, setTextSize] = useState('text-lg'); // text-base, text-lg, text-xl
  const [completed, setCompleted] = useState(false);
  const { awardXP } = useGamification();
  const commentsRef = useRef(null);
  
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [isWordBankLoading, setIsWordBankLoading] = useState(false);
  const [isWordBankAdded, setIsWordBankAdded] = useState(false);
  const articleContainerRef = useRef(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Interaction states
  const [claps, setClaps] = useState(0);
  const [hasClapped, setHasClapped] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isClapping, setIsClapping] = useState(false);
  
  // Speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const synth = window.speechSynthesis;
  const [voices, setVoices] = useState([]);

  // Time & Scroll states for XP Claiming
  const [timeSpent, setTimeSpent] = useState(0);
  const [isScrollMet, setIsScrollMet] = useState(false);
  const [readingLevel, setReadingLevel] = useState('B2');

  const activeContent = article ? getArticleContent(article, readingLevel) : [];
  const activeVocabulary = article ? getArticleVocabulary(article, readingLevel) : [];
  const activeReadTime = article ? getArticleReadTime(article, readingLevel) : '';
  const levelReadTimes = article
    ? ARTICLE_LEVELS.reduce((acc, lv) => {
        acc[lv] = getArticleReadTime(article, lv);
        return acc;
      }, {})
    : {};

  // Menyuni yopish va selectionni tozalash
  const dismissMenu = () => {
    setSelectionMenu(null);
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
      } catch (e) { /* ignore */ }
    }
  };

  const handleAddToWordBank = async () => {
    if (!selectionMenu || !user || isWordBankLoading || isWordBankAdded) return;
    setIsWordBankLoading(true);

    const { word, context } = selectionMenu;

    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "vocabulary"), {
        word: word,
        contextSentence: context || "",
        testTitle: article?.title || "Maqola",
        sectionTitle: article?.title || "Maqola",
        addedAt: serverTimestamp(),

        // AI Fields (initially empty)
        definition: null,
        example: null,
        translation: null,
        hasAI: false,

        // Spaced Repetition System (SRS) fields
        learningStatus: 'learning',
        easeFactor: 2.5,
        interval: 0,
        nextReviewDate: serverTimestamp()
      });

      // Background translate
      (async () => {
        try {
          const { getFunctions, httpsCallable } = await import("firebase/functions");
          const functions = getFunctions();
          const translateWordFn = httpsCallable(functions, "translateWord");
          const result = await translateWordFn({ 
            word: word, 
            contextSentence: context 
          });

          if (result.data) {
            await updateDoc(docRef, {
              definition: result.data.definition || null,
              example: result.data.example || context || null,
              translation: result.data.translation || null,
              hasAI: true
            });
          }
        } catch (aiError) {
          console.error("AI Auto-Translate error: ", aiError);
        }
      })();

      setIsWordBankAdded(true);
      // 1 soniya "Added!" ko'rsatib, keyin tozalash
      setTimeout(() => {
        dismissMenu();
      }, 1000);

    } catch (error) {
      console.error("WordBank add error:", error);
      alert("So'zni saqlashda xatolik yuz berdi.");
    } finally {
      setIsWordBankLoading(false);
    }
  };

  useEffect(() => {
    const container = articleContainerRef.current;
    if (!container) return;

    const showMenu = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectionMenu(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length < 2 || selectedText.length > 60) {
        setSelectionMenu(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setSelectionMenu(null);
        return;
      }

      // Kontekst jumlasini olish
      let contextSentence = "";
      try {
        let node = selection.anchorNode;
        while (node && node !== container && !['P', 'DIV', 'LI'].includes(node.nodeName)) {
          node = node.parentNode;
        }
        if (node && node !== container) {
          contextSentence = node.textContent.trim();
          if (contextSentence.length > 250) {
            contextSentence = contextSentence.substring(0, 250) + "...";
          }
        }
      } catch (e) { /* ignore */ }

      // Menyu pozitsiyasini hisoblash
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelectionMenu({
        top: rect.top - containerRect.top + container.scrollTop - 50,
        left: rect.left - containerRect.left + container.scrollLeft + (rect.width / 2),
        word: selectedText,
        context: contextSentence
      });
      setIsWordBankAdded(false);
      setIsWordBankLoading(false);
    };

    const onMouseUp = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // Menu div ichida bosilsa — ignore
      if (e.target.closest('.article-selection-menu')) return;
      setTimeout(showMenu, 30);
    };

    const onTouchEnd = (e) => {
      if (e.target.closest('.article-selection-menu')) return;
      setTimeout(showMenu, 30);
    };

    // Tashqariga bosilsa menyuni yopish
    const onDocumentMouseDown = (e) => {
      if (!selectionMenu) return;
      // Agar menu ichida yoki article ichida bo'lmasa — yopish
      if (e.target.closest('.article-selection-menu')) return;
      if (!container.contains(e.target)) {
        dismissMenu();
      }
    };

    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousedown', onDocumentMouseDown);

    return () => {
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, [article?.title, selectionMenu, dismissMenu]);

  useEffect(() => {
    if (userData) {
      setReadingLevel(getDefaultReadingLevel(userData));
    }
  }, [userData]);

  useEffect(() => {
    if (id) {
      setHasClapped(hasClappedArticle(id, user, userData));
    }
  }, [id, user, userData?.clappedArticles]);

  useEffect(() => {
    if (!article) return;
    setTimeSpent(0);
    setIsScrollMet(false);
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentBlockIndex(-1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [readingLevel, article?.id, synth]);

  const handleLevelChange = (level) => {
    setReadingLevel(level);
    savePreferredReadingLevel(level);
  };

  useEffect(() => {
    const loadVoices = () => {
      if (synth) {
        setVoices(synth.getVoices());
      }
    };
    loadVoices();
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [synth]);

  useEffect(() => {
    if (loading || !article || article.isMemberOnly) return;
    
    const interval = setInterval(() => {
      setTimeSpent(prev => {
        if (prev >= 120) {
          clearInterval(interval);
          return 120;
        }
        return prev + 1;
      });
    }, 1000);

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight <= 0) return;
      const percentage = (scrollTop / scrollHeight) * 100;
      if (percentage >= 85) {
        setIsScrollMet(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    setTimeout(handleScroll, 500);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loading, article]);

  useEffect(() => {
    fetchArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (hasClapped) {
      setHasClapped(false);
      setClaps((prev) => Math.max(0, prev - 1));

      try {
        await removeArticleClap({
          db,
          articleId: id,
          user,
          userData,
          updateUserLocalData,
        });
      } catch (err) {
        console.error("Error updating claps:", err);
        setHasClapped(true);
        setClaps((prev) => prev + 1);
      }
    } else {
      setHasClapped(true);
      setClaps((prev) => prev + 1);

      try {
        await addArticleClap({
          db,
          articleId: id,
          user,
          userData,
          updateUserLocalData,
        });
      } catch (err) {
        console.error("Error updating claps:", err);
        setHasClapped(false);
        setClaps((prev) => Math.max(0, prev - 1));
      }
    }

    setTimeout(() => setIsClapping(false), 300);
  };

  const handleClaimXP = async () => {
    if (!user || !article) return;

    if (timeSpent < 120 || !isScrollMet) {
      const remainingSeconds = 120 - timeSpent;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      let timeString = "";
      if (minutes > 0) {
        timeString = `${minutes} daqiqa ${seconds > 0 ? `${seconds} soniya` : ''}`;
      } else {
        timeString = `${seconds} soniya`;
      }
      
      let message = "Iltimos, maqolani diqqat bilan o'qib chiqing. XP olish uchun:\n";
      if (timeSpent < 120) {
        message += `- Kamida yana ${timeString} o'qishda davom eting.\n`;
      }
      if (!isScrollMet) {
        message += `- Maqola oxirigacha varaqlang (scroll pastga).`;
      }
      alert(message);
      return;
    }

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
      createdAt: new Date().toISOString(),
      claps: 0,
      replies: []
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

  const handleClapComment = async (commentId) => {
    if (!user) {
      alert("Izohga qarsak chalish uchun tizimga kiring.");
      return;
    }

    let updatedComments = [];
    setComments(prev => {
      updatedComments = prev.map(c => {
        if (c.id === commentId) {
          return { ...c, claps: (c.claps || 0) + 1 };
        }
        return c;
      });
      return updatedComments;
    });

    try {
      const docRef = doc(db, "articles", id);
      // Wait a tick or compute directly to ensure accurate update
      const targetComments = comments.map(c => {
        if (c.id === commentId) {
          return { ...c, claps: (c.claps || 0) + 1 };
        }
        return c;
      });
      await updateDoc(docRef, { 
        comments: targetComments
      });
    } catch (err) {
      console.error("Error clapping comment:", err);
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
    const fullContent = getArticleContent(article, readingLevel);
    const blocksToRead = isLocked 
      ? fullContent?.slice(0, Math.ceil(fullContent.length / 3)) 
      : fullContent;

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
      const availableVoices = voices.length > 0 ? voices : synth.getVoices();
      const naturalVoice = availableVoices.find(v => v.name.includes('Natural') || v.name.includes('Google US English'));
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
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-black text-[#1D1D1F] dark:text-[#f5f5f7] font-sans antialiased selection:bg-blue-100 dark:selection:bg-blue-900/30 selection:text-blue-900 dark:selection:text-blue-100 transition-colors duration-300">
      {!isTeacher && <DashboardHeader user={user} userData={userData} activeTab="articles" />}
      
      {/* Sub Header / Action Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08] py-3">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate(isTeacher ? '/teacher/browse-articles' : '/articles')}
            className="flex items-center gap-1.5 text-sm font-bold text-[#0066CC] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-4 py-2 rounded-full transition-all"
          >
            <ChevronLeft size={18} /> All Articles
          </button>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setTextSize(prev => prev === 'text-base' ? 'text-lg' : prev === 'text-lg' ? 'text-xl' : 'text-base')}
              className="p-2.5 hover:bg-[#F5F5F7] dark:hover:bg-neutral-800 rounded-full transition-all text-[#86868B] dark:text-neutral-400"
              title="Font Size"
            >
              <Type size={20} />
            </button>
            <button className="p-2.5 hover:bg-[#F5F5F7] dark:hover:bg-neutral-800 rounded-full transition-all text-[#86868B] dark:text-neutral-400">
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
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F2F2F2] dark:bg-neutral-900 rounded-md text-[13px] font-medium text-[#242424] dark:text-neutral-200 border border-black/[0.05] dark:border-white/[0.08]">
                <Star size={14} className="text-yellow-500 fill-yellow-500" /> Member-only story
              </div>
            )}
            {article.isFeatured && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F2F2F2] dark:bg-neutral-900 rounded-md text-[13px] font-medium text-[#242424] dark:text-neutral-200 border border-black/[0.05] dark:border-white/[0.08]">
                <BookMarked size={14} className="text-gray-500" /> Featured
              </div>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-[42px] font-bold tracking-tight leading-[1.2] text-[#242424] dark:text-neutral-100 font-serif"
            >
              {article.title}
            </motion.h1>
            {article.subtitle && (
              <p className="text-xl md:text-2xl text-[#6B6B6B] dark:text-neutral-450 leading-snug">
                {stripHtml(article.subtitle)}
              </p>
            )}
          </div>

          {/* Author Bio Row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                {article.authorAvatar ? (
                  <img src={article.authorAvatar} className="w-12 h-12 rounded-full object-cover border border-black/[0.05] dark:border-white/[0.08]" alt={article.author} />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold text-gray-400 dark:text-neutral-500">
                    {article.author?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[16px] text-[#242424] dark:text-neutral-200 hover:underline cursor-pointer">{article.author}</span>
                  <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 dark:fill-blue-550 text-white" />
                </div>
                <div className="flex items-center gap-2 text-[#6B6B6B] dark:text-neutral-450 text-[14px]">
                  <span>{activeReadTime || article.readTime || '5 min read'}</span>
                  <span>·</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{readingLevel}</span>
                  <span>·</span>
                  <span>{article.createdAt ? new Date(article.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 13, 2026'}</span>
                </div>
              </div>
            </div>
          </div>

          <ArticleLevelPicker
            value={readingLevel}
            onChange={handleLevelChange}
            readTimes={levelReadTimes}
          />

          {/* Interaction Bar */}
          <div className="flex items-center justify-between py-4 border-y border-black/[0.05] dark:border-white/[0.08]">
            <div className="flex items-center gap-6">
              <button 
                type="button"
                onClick={handleClap}
                className={`flex items-center gap-2 transition-all group hover:text-[#242424] dark:hover:text-white ${
                  hasClapped
                    ? 'text-[#242424] dark:text-white'
                    : 'text-[#6B6B6B] dark:text-neutral-450'
                } ${isClapping ? 'scale-110' : ''}`}
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
                onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 text-[#6B6B6B] dark:text-neutral-450 hover:text-[#242424] dark:hover:text-white transition-all group"
              >
                <MessageSquareIcon size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[13px] font-medium">{comments.length}</span>
              </button>
            </div>
            <div className="flex items-center gap-4 text-[#6B6B6B] dark:text-neutral-450">
              <button 
                onClick={handleListen}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isSpeaking ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:text-[#242424] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'}`}
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
              <button className="p-1 hover:text-[#242424] dark:hover:text-white transition-all"><BookMarked size={20} /></button>
              <button className="p-1 hover:text-[#242424] dark:hover:text-white transition-all"><Share2 size={20} /></button>
              <button className="p-1 hover:text-[#242424] dark:hover:text-white transition-all"><MoreHorizontal size={20} /></button>
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
            <p className="text-center text-[14px] text-[#6B6B6B] dark:text-neutral-450 mt-4">
              All illustrations by <span className="underline cursor-pointer">{article.author}</span>
            </p>
          </div>
        )}

        <article 
          ref={articleContainerRef}
          className={`${textSize} text-[#242424] dark:text-neutral-200 font-serif article-container relative`}
        >
          {selectionMenu && (
            <div
              className={`article-selection-menu ${isMobile ? 'fixed' : 'absolute'} z-[1000] flex items-center gap-1.5 bg-gray-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] -translate-x-1/2 touch-none select-none border border-white/[0.08]`}
              style={isMobile ? {
                bottom: '32px',
                left: '50%',
                top: 'auto'
              } : {
                top: selectionMenu.top,
                left: selectionMenu.left
              }}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
            >
              <button
                onClick={handleAddToWordBank}
                disabled={isWordBankLoading || isWordBankAdded}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  isWordBankAdded 
                    ? 'text-green-400' 
                    : 'text-blue-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isWordBankLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isWordBankAdded ? (
                  <>
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <BookMarked size={14} />
                    <span>WordBank'ga qo'shish</span>
                  </>
                )}
              </button>
              <div className="w-[1px] h-4 bg-white/20"></div>
              <button
                onClick={dismissMenu}
                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {(() => {
            const isPro = userData?.accountType === 'pro' || userData?.isPro;
            const isStandard = userData?.accountType === 'standard';
            const canAccess = isPro || isStandard || userData?.isPremium || userData?.accountType === 'premium';
            
            const isLocked = article.isMemberOnly && !canAccess;
            const fullContent = activeContent;
            const contentToShow = isLocked 
              ? fullContent?.slice(0, Math.ceil((fullContent?.length || 0) / 3)) 
              : fullContent;

            return (
              <>
                {contentToShow?.map((block, i) => {
                  const cleanText = stripHtml(block.text);
                  const cleanHtml = (block.text || '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\u00A0/g, ' ');

                  const blockFontSize = typeof block.style?.fontSize === 'number'
                    ? `${block.style.fontSize}px`
                    : (block.style?.fontSize || (block.type === 'heading' ? '26px' : undefined));

                  const blockFontWeight = block.style?.fontWeight || (block.type === 'heading' ? '700' : '400');

                  const blockLineHeight = block.style?.lineHeight || (block.type === 'heading' ? 1.25 : 1.8);
                  const blockMarginTop = block.style?.marginTop !== undefined 
                    ? (typeof block.style.marginTop === 'number' ? `${block.style.marginTop}px` : block.style.marginTop)
                    : (block.type === 'heading' ? '2.5rem' : '0');
                  const blockMarginBottom = block.style?.marginBottom !== undefined 
                    ? (typeof block.style.marginBottom === 'number' ? `${block.style.marginBottom}px` : block.style.marginBottom)
                    : (block.type === 'heading' ? '1rem' : '1.5rem');

                  return block.type === 'heading' ? (
                    <h2 
                      key={i} 
                      className={`font-bold text-[#242424] dark:text-neutral-100 font-serif transition-all duration-500 ${currentBlockIndex === i ? 'border-b-2 border-blue-500 pb-1' : ''}`}
                      style={{
                        fontSize: blockFontSize,
                        lineHeight: blockLineHeight,
                        marginTop: blockMarginTop,
                        marginBottom: blockMarginBottom,
                        fontWeight: blockFontWeight,
                        letterSpacing: block.style?.letterSpacing || '-0.015em',
                        fontFamily: 'Charter, Georgia, Cambria, "Times New Roman", Times, serif'
                      }}
                    >
                      {cleanText}
                    </h2>
                  ) : (
                    <div 
                      key={i} 
                      className={`article-body-block font-serif transition-all duration-500 ${currentBlockIndex === i ? 'border-b-2 border-blue-500 pb-1 bg-blue-50/10 dark:bg-blue-950/20' : ''}`}
                      style={{
                        fontSize: blockFontSize,
                        lineHeight: blockLineHeight,
                        marginBottom: blockMarginBottom,
                        fontWeight: blockFontWeight,
                        letterSpacing: block.style?.letterSpacing || undefined,
                        fontFamily: 'Charter, Georgia, Cambria, "Times New Roman", Times, serif'
                      }}
                      dangerouslySetInnerHTML={{ __html: cleanHtml }}
                    />
                  );
                })}

                {isLocked && (
                  <div className="relative mt-0">
                    {/* The "Fade to Blur" Transition Section */}
                    <div className="relative h-64 overflow-hidden pointer-events-none select-none">
                      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-black/80 dark:to-black" />
                      <div className="blur-[1.5px] opacity-40">
                        {fullContent?.slice(Math.ceil((fullContent?.length || 0) / 3), Math.ceil((fullContent?.length || 0) / 3) + 2).map((block, i) => (
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
                              dangerouslySetInnerHTML={{ __html: (block.text || '').replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') }}
                            />
                        ))}
                      </div>
                    </div>

                    {/* Premium Paywall Section */}
                    <div className="relative z-20 text-center max-w-2xl mx-auto space-y-12 pt-10 pb-32 bg-white dark:bg-black">
                      <div className="space-y-6">
                        <h2 className="text-3xl md:text-[42px] font-bold text-[#242424] dark:text-neutral-100 leading-tight">
                          Become a member to read this story, and all of IELTS Portal.
                        </h2>
                        <p className="text-[#6B6B6B] dark:text-neutral-450 text-lg max-w-xl mx-auto">
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
                            <p className="text-[#242424] dark:text-neutral-200 font-medium">{benefit}</p>
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
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-neutral-800 shadow-lg">
                              <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                            </div>
                            <span className="text-[13px] font-bold text-[#242424] dark:text-neutral-200 text-center line-clamp-1">{item.title}</span>
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

        <ArticleVocabulary vocabulary={activeVocabulary} level={readingLevel} articleTitle={article.title} />
        
        {/* Inline Comments Section (Medium Style) */}
        <section ref={commentsRef} className="mt-16 border-t border-gray-150 dark:border-neutral-850 pt-10 pb-16 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-neutral-100 font-sans">
              Responses ({comments.length})
            </h3>
            <button 
              title="Response guidelines"
              className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-350 transition-colors"
            >
              <ShieldCheck size={20} />
            </button>
          </div>

          {/* Comment Form (Medium style input container) */}
          {user ? (
            <div className="bg-[#f9f9f9] dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-850 rounded-xl p-4 shadow-sm mb-10 transition-all text-left">
              <div className="flex items-center gap-3 mb-3">
                {userData?.avatar ? (
                  <img src={userData.avatar} className="w-8 h-8 rounded-full object-cover" alt="me" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    {userData?.fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-800 dark:text-neutral-250">
                  {userData?.fullName || user?.email?.split('@')[0] || "User"}
                </span>
              </div>
              <textarea 
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  setIsInputFocused(true);
                }}
                onFocus={() => setIsInputFocused(true)}
                placeholder="What are your thoughts?"
                className="w-full bg-transparent border-none focus:ring-0 text-[14px] min-h-[80px] resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-600 p-0 focus:outline-none"
              />
              {isInputFocused && (
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-150/40 dark:border-neutral-850/40 mt-2">
                  <button 
                    onClick={() => {
                      setNewComment("");
                      setIsInputFocused(false);
                    }}
                    className="px-4 py-1.5 hover:bg-gray-200/50 dark:hover:bg-neutral-850 text-gray-500 dark:text-neutral-450 rounded-full text-[13px] font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!newComment.trim()}
                    onClick={async () => {
                      await handlePostComment();
                      setIsInputFocused(false);
                    }}
                    className="px-4 py-1.5 bg-[#1A8917] hover:bg-[#156d12] disabled:opacity-40 text-white rounded-full text-[13px] font-medium transition-all"
                  >
                    Respond
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#f9f9f9] dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-850 rounded-xl p-6 text-center mb-10">
              <p className="text-sm text-gray-500 dark:text-neutral-450 mb-3">Please sign in to write a response.</p>
              <button 
                onClick={() => navigate('/auth/login')}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[13px] font-medium transition-all"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6 text-left">
            {comments.length > 0 ? (
              comments.slice().reverse().map((comment) => (
                <div key={comment.id} className="border-b border-gray-100 dark:border-neutral-850/60 pb-6 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-neutral-850" alt={comment.userName} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-neutral-450">
                          {comment.userName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-semibold text-gray-800 dark:text-neutral-200 hover:underline cursor-pointer">
                            {comment.userName}
                          </span>
                        </div>
                        <span className="text-[12px] text-gray-400 dark:text-neutral-500">
                          {(() => {
                            if (!comment.createdAt) return "Just now";
                            try {
                              const d = typeof comment.createdAt.toDate === 'function' ? comment.createdAt.toDate() : new Date(comment.createdAt);
                              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } catch (e) {
                              return "Just now";
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-350 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <p className="text-[15px] leading-relaxed text-gray-800 dark:text-neutral-250 mt-3 pl-12 whitespace-pre-line font-sans">
                    {comment.text}
                  </p>

                  <div className="flex items-center gap-6 mt-4 pl-12 text-gray-400 dark:text-neutral-500">
                    <button 
                      onClick={() => handleClapComment(comment.id)}
                      className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
                      title="Clap"
                    >
                      <span className="text-[15px]">👏</span>
                      <span className="text-[13px]">{comment.claps || 0}</span>
                    </button>

                    <button className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors">
                      <MessageSquareIcon size={14} />
                      <span className="text-[13px]">{comment.replies?.length || 0} replies</span>
                    </button>

                    <button className="hover:text-gray-700 dark:hover:text-neutral-200 transition-colors text-[13px] font-medium">
                      Reply
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-gray-55 dark:bg-neutral-900/30 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-neutral-700">
                  <MessageSquareIcon size={32} />
                </div>
                <p className="text-gray-400 dark:text-neutral-500 text-sm">No responses yet. Be the first to respond.</p>
              </div>
            )}
          </div>
        </section>

        {/* Claim XP Section */}
        {user && article && !article.isMemberOnly && (
          <div className="mt-8 mb-24 flex flex-col items-center justify-center p-8 bg-blue-50/50 dark:bg-blue-950/10 rounded-3xl border border-blue-100 dark:border-blue-900/40 max-w-2xl mx-auto text-center">
            <Sparkles className="text-blue-500 mb-4" size={32} />
            <h3 className="text-xl font-bold text-[#242424] dark:text-neutral-200 mb-2">Maqolani o'qib chiqdingizmi?</h3>
            <p className="text-[#6B6B6B] dark:text-neutral-400 mb-6 text-center text-sm">
              {!completed && !userData?.awardedItems?.includes(article.id) && (
                <>
                  XP olish uchun maqolani oxirigacha o'qing.<br />
                  <span className="font-semibold">O'qish vaqti:</span> {Math.floor(timeSpent / 60)} daqiqa {timeSpent % 60} soniya / 2 daqiqa.
                  <span className="mx-2">|</span>
                  <span className="font-semibold">Varaqlash:</span> {isScrollMet ? "✓ Oxiriga yetdi" : "✗ Oxirigacha scroll qiling"}
                </>
              )}
              {(completed || userData?.awardedItems?.includes(article.id)) && "Siz ushbu maqola uchun XP olgansiz."}
            </p>
            <button 
              onClick={handleClaimXP}
              disabled={completed || userData?.awardedItems?.includes(article.id)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-neutral-800 disabled:text-gray-500 dark:disabled:text-neutral-500 text-white rounded-full font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-500/20 dark:shadow-none"
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
          .article-container,
          .article-container * {
            -webkit-user-select: text !important;
            user-select: text !important;
            cursor: auto;
          }
          .article-container::selection,
          .article-container *::selection {
            background-color: #b3d4fc !important;
            color: #000 !important;
          }
          .dark .article-container::selection,
          .dark .article-container *::selection {
            background-color: rgba(96, 165, 250, 0.45) !important;
            color: #fff !important;
          }
          /* Persistent selection highlight (so'z belgilangandan keyin ko'k bo'lib turadi) */
          mark.article-active-selection {
            background-color: #b3d4fc !important;
            color: inherit !important;
            border-radius: 3px;
            padding: 1px 0;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
          }
          .dark mark.article-active-selection {
            background-color: rgba(96, 165, 250, 0.45) !important;
            color: #fff !important;
          }
          .dark .article-container span,
          .dark .article-container p,
          .dark .article-container div,
          .dark .article-container h2 {
            color: #e5e5e5 !important;
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
          .dark .article-body-block a { color: #60a5fa !important; }
          .article-body-block strong { font-weight: 700; }
          .article-body-block em { font-style: italic; }
          .article-body-block s { text-decoration: line-through; }
          .article-body-block u { text-decoration: underline; }
        `}</style>
      </main>

      {!isTeacher && <SiteFooter />}    </div>
  );
}

