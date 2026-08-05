/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, BookMarked, Share2,
  Type, CheckCircle2, Star, X, Check,
  MessageSquare as MessageSquareIcon, Sparkles, Volume2,
  Pause, Play, Award, ShieldCheck, ArrowUp, Trash2, Link2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp } from "firebase/firestore";
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
import { parseArticleClaps, formatClapsDisplay } from '../../utils/articlePopularity';

/* XP shartlari */
const REQUIRED_SECONDS = 120;
const REQUIRED_SCROLL = 85;

/* Matn o'lchami — bosqichlar (localStorage'da saqlanadi) */
const FONT_STEPS = [
  { key: 'sm', label: 'Kichik', base: 17, scale: 0.9 },
  { key: 'md', label: "O'rtacha", base: 19, scale: 1 },
  { key: 'lg', label: 'Katta', base: 21, scale: 1.12 },
  { key: 'xl', label: 'Juda katta', base: 23, scale: 1.24 },
];
const FONT_STORAGE_KEY = 'article_font_step';

const toDate = (value) => {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const formatRelativeTime = (value) => {
  const d = toDate(value);
  if (!d) return 'Hozirgina';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} kun oldin`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ArticleReading() {
  const { user, userData, updateUserLocalData } = useAuth();
  const isTeacher = userData?.role === 'teacher';
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const { awardXP } = useGamification();
  const commentsRef = useRef(null);

  const [selectionMenu, setSelectionMenu] = useState(null);
  const [isWordBankLoading, setIsWordBankLoading] = useState(false);
  const [isWordBankAdded, setIsWordBankAdded] = useState(false);
  const articleContainerRef = useRef(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  // Toast (alert() o'rniga — o'qishni to'xtatmaydi)
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = 'info') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Matn o'lchami
  const [fontStepKey, setFontStepKey] = useState(() => {
    if (typeof window === 'undefined') return 'md';
    return localStorage.getItem(FONT_STORAGE_KEY) || 'md';
  });
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const fontMenuRef = useRef(null);
  const fontStep = FONT_STEPS.find(s => s.key === fontStepKey) || FONT_STEPS[1];

  useEffect(() => {
    if (!isFontMenuOpen) return;
    const onDown = (e) => {
      if (!fontMenuRef.current?.contains(e.target)) setIsFontMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setIsFontMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isFontMenuOpen]);

  const changeFontStep = (key) => {
    setFontStepKey(key);
    try { localStorage.setItem(FONT_STORAGE_KEY, key); } catch { /* ignore */ }
  };

  // Speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const [voices, setVoices] = useState([]);
  // Har bir o'qish sessiyasining tokeni — cancel qilingan zanjir davom etmasligi uchun
  const speechRunIdRef = useRef(0);
  const blockRefs = useRef({});

  // Time & Scroll states for XP Claiming
  const [timeSpent, setTimeSpent] = useState(0);
  const [isScrollMet, setIsScrollMet] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTopButton, setShowTopButton] = useState(false);
  const [readingLevel, setReadingLevel] = useState('B2');
  const [clappedCommentIds, setClappedCommentIds] = useState(() => new Set());

  // Premium ruxsat (bir joyda hisoblanadi — pastda bir necha marta ishlatiladi)
  const canAccessPremium =
    userData?.accountType === 'pro' ||
    userData?.isPro ||
    userData?.accountType === 'standard' ||
    userData?.isPremium ||
    userData?.accountType === 'premium';
  const isLocked = Boolean(article?.isMemberOnly) && !canAccessPremium;

  const activeContent = article ? getArticleContent(article, readingLevel) : [];
  const activeVocabulary = article ? getArticleVocabulary(article, readingLevel) : [];
  const activeReadTime = article ? getArticleReadTime(article, readingLevel) : '';
  const levelReadTimes = article
    ? ARTICLE_LEVELS.reduce((acc, lv) => {
        acc[lv] = getArticleReadTime(article, lv);
        return acc;
      }, {})
    : {};

  const alreadyAwarded = completed || Boolean(userData?.awardedItems?.includes(article?.id));
  const timeProgress = Math.min(100, (timeSpent / REQUIRED_SECONDS) * 100);
  const canClaimXP = timeSpent >= REQUIRED_SECONDS && isScrollMet;

  const publishedDate = useMemo(() => {
    const d = toDate(article?.createdAt);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  }, [article?.createdAt]);

  // Menyuni yopish va selectionni tozalash
  const dismissMenu = useCallback(() => {
    setSelectionMenu(null);
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
      } catch { /* ignore */ }
    }
  }, []);

  const handleAddToWordBank = async () => {
    if (!selectionMenu || isWordBankLoading || isWordBankAdded) return;
    if (!user) {
      showToast("So'zni saqlash uchun tizimga kiring.", 'error');
      return;
    }
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
      showToast("So'zni saqlashda xatolik yuz berdi.", 'error');
    } finally {
      setIsWordBankLoading(false);
    }
  };

  // Listenerlar ichida eng so'nggi qiymatni o'qish uchun (effektni qayta ulamaslik uchun)
  const selectionMenuRef = useRef(null);
  useEffect(() => {
    selectionMenuRef.current = selectionMenu;
  }, [selectionMenu]);

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
      } catch { /* ignore */ }

      // Menyu pozitsiyasini hisoblash (konteyner chegarasidan chiqib ketmasin)
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const rawTop = rect.top - containerRect.top + container.scrollTop - 50;
      const rawLeft = rect.left - containerRect.left + container.scrollLeft + (rect.width / 2);
      const halfMenu = 120;

      setSelectionMenu({
        top: Math.max(4, rawTop),
        left: Math.min(Math.max(halfMenu, rawLeft), Math.max(halfMenu, containerRect.width - halfMenu)),
        word: selectedText,
        context: contextSentence
      });
      setIsWordBankAdded(false);
      setIsWordBankLoading(false);
    };

    let menuTimer = null;
    const scheduleShowMenu = () => {
      clearTimeout(menuTimer);
      menuTimer = setTimeout(showMenu, 30);
    };

    const onMouseUp = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // Menu div ichida bosilsa — ignore
      if (e.target.closest('.article-selection-menu')) return;
      scheduleShowMenu();
    };

    const onTouchEnd = (e) => {
      if (e.target.closest('.article-selection-menu')) return;
      scheduleShowMenu();
    };

    // Tashqariga bosilsa menyuni yopish
    const onDocumentMouseDown = (e) => {
      if (!selectionMenuRef.current) return;
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
      clearTimeout(menuTimer);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, [article?.id, dismissMenu]);

  useEffect(() => {
    if (userData) {
      setReadingLevel(getDefaultReadingLevel(userData));
    }
  }, [userData]);

  useEffect(() => {
    if (id) {
      setHasClapped(hasClappedArticle(id, user, userData));
      setIsSaved(Boolean(user) && Array.isArray(userData?.savedArticles) && userData.savedArticles.includes(id));
    }
  }, [id, user, userData?.clappedArticles, userData?.savedArticles]);

  const stopSpeech = useCallback(() => {
    // Tokenni o'zgartiramiz — bekor qilingan utterance'ning onend'i keyingi blokni o'qimasin
    speechRunIdRef.current += 1;
    if (synth) synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentBlockIndex(-1);
  }, [synth]);

  useEffect(() => {
    if (!article) return;
    setTimeSpent(0);
    setIsScrollMet(false);
    stopSpeech();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [readingLevel, article?.id, stopSpeech]);

  const handleLevelChange = (level) => {
    setReadingLevel(level);
    savePreferredReadingLevel(level);
  };

  useEffect(() => {
    if (!synth) return;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    return () => synth.removeEventListener?.('voiceschanged', loadVoices);
  }, [synth]);

  // O'qish progressi (progress bar + "yuqoriga" tugmasi) — har doim ishlaydi
  useEffect(() => {
    if (loading || !article) return;
    let raf = null;

    const compute = () => {
      raf = null;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = scrollHeight <= 0 ? 100 : Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      setProgress(pct);
      setShowTopButton(scrollTop > 800);
      if (pct >= REQUIRED_SCROLL) setIsScrollMet(true);
    };

    const onScroll = () => {
      if (raf === null) raf = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf !== null) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [loading, article?.id, readingLevel]);

  // XP taymeri — faqat kontent ochiq bo'lganda
  useEffect(() => {
    if (loading || !article || isLocked) return;

    const interval = setInterval(() => {
      setTimeSpent(prev => {
        if (prev >= REQUIRED_SECONDS) {
          clearInterval(interval);
          return REQUIRED_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, article?.id, isLocked]);

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
            // claps eski yozuvlarda "4.8K" kabi matn bo'lishi mumkin → raqamga aylantiramiz
            setClaps(parseArticleClaps(data.claps));
            setComments(Array.isArray(data.comments) ? data.comments : []);
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

  const clapPendingRef = useRef(false);

  const handleClap = async () => {
    // Tez-tez bosilganda Firestore'ga qarama-qarshi so'rovlar ketmasligi uchun qulf
    if (!article || clapPendingRef.current) return;
    clapPendingRef.current = true;

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

    clapPendingRef.current = false;
    setTimeout(() => setIsClapping(false), 300);
  };

  // Maqolani saqlash / saqlanganlardan olib tashlash
  const handleToggleSave = async () => {
    if (!user) {
      showToast("Maqolani saqlash uchun tizimga kiring.", 'error');
      return;
    }
    if (savePending) return;

    const next = !isSaved;
    setSavePending(true);
    setIsSaved(next);

    try {
      await toggleArticleSave({ db, articleId: id, user, userData, updateUserLocalData, save: next });
      showToast(next ? "Maqola saqlandi." : "Saqlanganlardan olib tashlandi.", 'success');
    } catch (err) {
      console.error("Error saving article:", err);
      setIsSaved(!next);
      showToast("Saqlashda xatolik yuz berdi.", 'error');
    } finally {
      setSavePending(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: article?.title || 'IELTS Portal',
      text: article?.subtitle ? stripHtml(article.subtitle) : undefined,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast("Havola nusxalandi.", 'success');
    } catch (err) {
      if (err?.name === 'AbortError') return; // foydalanuvchi bekor qildi
      showToast("Havolani nusxalab bo'lmadi.", 'error');
    }
  };

  const handleClaimXP = async () => {
    if (!user || !article) return;

    if (!canClaimXP) {
      showToast("XP olish uchun quyidagi shartlarni bajaring.", 'error');
      return;
    }

    const result = await awardXP('article', article.id, article.title);
    if (result.success) {
      showToast(`Tabriklaymiz! +${result.amount} XP qo'shildi.`, 'success');
      setCompleted(true);
    } else if (result.alreadyAwarded) {
      showToast("Siz allaqachon bu maqola uchun XP olgansiz.", 'info');
      setCompleted(true);
    } else {
      showToast("Xatolik: " + result.error, 'error');
    }
  };

  const handlePostComment = async () => {
    const text = newComment.trim();
    if (!text || !user) return;

    const commentData = {
      // Date.now() bir necha izoh bir vaqtda yozilsa to'qnashishi mumkin → uid bilan noyob qilamiz
      id: `${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      userId: user.uid,
      userName: userData?.fullName || user.email?.split('@')[0] || "User",
      userAvatar: userData?.avatar || null,
      createdAt: new Date().toISOString(),
      claps: 0,
      replies: []
    };

    // Optimistic update — ro'yxat teskari tartibda chiziladi (eng yangisi tepada),
    // shuning uchun arrayUnion kabi oxiriga qo'shamiz
    setComments(prev => [...prev, commentData]);
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
      showToast("Izohni saqlashda xatolik yuz berdi.", 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const target = comments.find(c => c.id === commentId);
    if (!target || !user || target.userId !== user.uid) return;

    const previous = comments;
    const updated = comments.filter(c => c.id !== commentId);
    setComments(updated);

    try {
      await updateDoc(doc(db, "articles", id), { comments: updated });
      showToast("Izoh o'chirildi.", 'success');
    } catch (err) {
      console.error("Error deleting comment:", err);
      setComments(previous);
      showToast("Izohni o'chirishda xatolik.", 'error');
    }
  };

  const handleClapComment = async (commentId) => {
    if (!user) {
      showToast("Izohga qarsak chalish uchun tizimga kiring.", 'error');
      return;
    }

    // Bir izohga bir marta qarsak (aks holda cheksiz bosish mumkin edi)
    if (clappedCommentIds.has(commentId)) return;

    const updatedComments = comments.map(c =>
      c.id === commentId ? { ...c, claps: (c.claps || 0) + 1 } : c
    );

    setComments(updatedComments);
    setClappedCommentIds(prev => new Set(prev).add(commentId));

    try {
      const docRef = doc(db, "articles", id);
      await updateDoc(docRef, { comments: updatedComments });
    } catch (err) {
      console.error("Error clapping comment:", err);
      // Rollback
      setComments(comments);
      setClappedCommentIds(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const handleListen = () => {
    if (!synth) {
      showToast("Brauzeringiz ovozli o'qishni qo'llab-quvvatlamaydi.", 'error');
      return;
    }

    if (isSpeaking && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isSpeaking && isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    if (!article) return;

    const fullContent = getArticleContent(article, readingLevel);
    const blocksToRead = isLocked
      ? fullContent?.slice(0, Math.ceil((fullContent?.length || 0) / 3))
      : fullContent;

    if (!blocksToRead || blocksToRead.length === 0) return;

    // Avvalgi sessiyani to'xtatamiz va yangi token olamiz
    speechRunIdRef.current += 1;
    const runId = speechRunIdRef.current;
    synth.cancel();

    const readBlock = (index) => {
      // Bekor qilingan (yoki eskirgan) sessiya davom etmasin
      if (runId !== speechRunIdRef.current) return;

      if (index >= blocksToRead.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentBlockIndex(-1);
        return;
      }

      setCurrentBlockIndex(index);

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = blocksToRead[index].text;
      const text = (tempDiv.textContent || tempDiv.innerText || "").trim();

      if (!text) {
        readBlock(index + 1);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const availableVoices = voices.length > 0 ? voices : synth.getVoices();
      const naturalVoice = availableVoices.find(v => v.name.includes('Natural') || v.name.includes('Google US English'));
      if (naturalVoice) utterance.voice = naturalVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.95;

      utterance.onend = () => {
        if (runId !== speechRunIdRef.current) return;
        readBlock(index + 1);
      };

      utterance.onerror = () => {
        if (runId !== speechRunIdRef.current) return;
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentBlockIndex(-1);
      };

      synth.speak(utterance);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    readBlock(0);
  };

  // O'qilayotgan blok ekrandan chiqib ketmasin
  useEffect(() => {
    if (!isSpeaking || currentBlockIndex < 0) return;
    const el = blockRefs.current[currentBlockIndex];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const outOfView = rect.top < 80 || rect.bottom > window.innerHeight - 80;
    if (outOfView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentBlockIndex, isSpeaking]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      speechRunIdRef.current += 1;
      if (synth) synth.cancel();
    };
  }, [synth]);

  if (loading) {
    return (
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-warm-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (!article) return null;

  const stickyTop = isTeacher ? 'top-0' : 'top-0 md:top-12';
  const iconBtn = "p-2.5 rounded-full transition-colors r-muted r-hover-ink hover:bg-[var(--r-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--r-focus)]";

  return (
    <div className="reading-root min-h-screen font-sans antialiased" style={{ backgroundColor: 'var(--r-paper)', color: 'var(--r-ink)' }}>
      {!isTeacher && <DashboardHeader user={user} userData={userData} activeTab="articles" />}

      {/* Sub Header / Action Bar */}
      <div className={`sticky ${stickyTop} z-30 backdrop-blur-xl border-b`} style={{ backgroundColor: 'var(--r-paper-blur)', borderColor: 'var(--r-hairline)' }}>
        <div className="max-w-[760px] mx-auto px-5 md:px-6 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(isTeacher ? '/teacher/browse-articles' : '/articles')}
            className="flex items-center gap-1.5 text-sm font-semibold r-muted r-hover-ink hover:bg-[var(--r-hover)] px-3 py-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--r-focus)]"
          >
            <ChevronLeft size={18} /> <span className="hidden sm:inline">Barcha maqolalar</span>
          </button>

          {/* Sarlavha — scroll qilganda kontekst yo'qolmasin */}
          <span className="hidden md:block flex-1 min-w-0 truncate text-[13px] font-medium r-muted text-center px-2">
            {progress > 8 ? article.title : ''}
          </span>

          <div className="flex items-center gap-1">
            {/* Matn o'lchami menyusi */}
            <div className="relative" ref={fontMenuRef}>
              <button
                onClick={() => setIsFontMenuOpen(v => !v)}
                className={iconBtn}
                aria-haspopup="menu"
                aria-expanded={isFontMenuOpen}
                aria-label="Matn o'lchami"
                title="Matn o'lchami"
              >
                <Type size={20} />
              </button>
              <AnimatePresence>
                {isFontMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    className="absolute right-0 mt-2 w-44 rounded-2xl border shadow-xl overflow-hidden py-1"
                    style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)' }}
                  >
                    {FONT_STEPS.map((step) => (
                      <button
                        key={step.key}
                        role="menuitemradio"
                        aria-checked={step.key === fontStepKey}
                        onClick={() => { changeFontStep(step.key); setIsFontMenuOpen(false); }}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-[var(--r-hover)] transition-colors"
                      >
                        <span style={{ fontSize: `${Math.round(step.base * 0.78)}px`, color: 'var(--r-ink)' }}>{step.label}</span>
                        {step.key === fontStepKey && <Check size={16} className="r-accent shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleToggleSave}
              className={iconBtn}
              aria-pressed={isSaved}
              aria-label={isSaved ? "Saqlanganlardan olib tashlash" : "Maqolani saqlash"}
              title={isSaved ? "Saqlangan" : "Saqlash"}
            >
              <BookMarked size={20} className={isSaved ? 'r-accent' : ''} fill={isSaved ? 'currentColor' : 'none'} />
            </button>

            <button onClick={handleShare} className={iconBtn} aria-label="Ulashish" title="Ulashish">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* O'qish progressi */}
        <div className="h-[3px] w-full" style={{ backgroundColor: 'transparent' }}>
          <div
            className="h-full transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%`, backgroundColor: 'var(--r-accent)' }}
            role="progressbar"
            aria-label="O'qish progressi"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <main className="max-w-[720px] mx-auto px-5 md:px-6 pt-8 pb-20 md:pt-12 md:pb-28">
        {/* MEDIUM STYLE HEADER */}
        <div className="space-y-7 mb-10">
          {/* Badges */}
          {(article.isMemberOnly || article.isFeatured) && (
            <div className="flex flex-wrap gap-2">
              {article.isMemberOnly && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-medium border" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)', color: 'var(--r-ink-soft)' }}>
                  <Star size={13} className="text-amber-500 fill-amber-500" /> Faqat a'zolar uchun
                </div>
              )}
              {article.isFeatured && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-medium border" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)', color: 'var(--r-ink-soft)' }}>
                  <BookMarked size={13} /> Tanlangan
                </div>
              )}
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[32px] md:text-[42px] font-bold tracking-tight leading-[1.18] article-serif"
              style={{ color: 'var(--r-ink)' }}
            >
              {article.title}
            </motion.h1>
            {article.subtitle && (
              <p className="text-[19px] md:text-[22px] leading-snug r-muted">
                {stripHtml(article.subtitle)}
              </p>
            )}
          </div>

          {/* Author Bio Row */}
          <div className="flex items-center gap-4 pt-1">
            {article.authorAvatar ? (
              <img src={article.authorAvatar} className="w-11 h-11 rounded-full object-cover" style={{ border: '1px solid var(--r-hairline)' }} alt={article.author} />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold r-muted" style={{ backgroundColor: 'var(--r-surface)' }}>
                {article.author?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[15px] truncate" style={{ color: 'var(--r-ink)' }}>{article.author}</span>
                <CheckCircle2 size={14} className="r-accent shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 r-muted text-[13.5px]">
                <span>{activeReadTime || article.readTime || '5 daqiqa'}</span>
                <span aria-hidden>·</span>
                <span className="font-semibold" style={{ color: 'var(--r-accent)' }}>{readingLevel}</span>
                {publishedDate && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{publishedDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <ArticleLevelPicker
            value={readingLevel}
            onChange={handleLevelChange}
            readTimes={levelReadTimes}
          />

          {/* Interaction Bar */}
          <div className="flex items-center justify-between gap-3 py-3 border-y" style={{ borderColor: 'var(--r-hairline)' }}>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={handleClap}
                aria-pressed={hasClapped}
                aria-label={hasClapped ? "Qarsakni qaytarib olish" : "Qarsak chalish"}
                className={`flex items-center gap-2 transition-colors group ${hasClapped ? 'r-ink' : 'r-muted r-hover-ink'}`}
              >
                <motion.span
                  animate={isClapping ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                  className="text-xl leading-none"
                >
                  👏
                </motion.span>
                <span className="text-[13px] font-medium tabular-nums">{formatClapsDisplay(claps)}</span>
              </button>
              <button
                onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                aria-label="Izohlarga o'tish"
                className="flex items-center gap-2 r-muted r-hover-ink transition-colors"
              >
                <MessageSquareIcon size={19} />
                <span className="text-[13px] font-medium tabular-nums">{comments.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleListen}
                aria-label={isSpeaking ? (isPaused ? "Davom ettirish" : "Pauza") : "Ovozli o'qish"}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full transition-colors text-[13px] font-medium ${
                  isSpeaking ? 'r-accent-bg' : 'r-muted r-hover-ink hover:bg-[var(--r-hover)]'
                }`}
              >
                {!isSpeaking ? <Volume2 size={17} /> : isPaused ? <Play size={17} /> : <Pause size={17} />}
                <span className="hidden sm:inline">
                  {isPaused ? 'Pauza' : isSpeaking ? "O'qilmoqda" : 'Tinglash'}
                </span>
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeech}
                  aria-label="To'xtatish"
                  title="To'xtatish"
                  className={iconBtn}
                >
                  <X size={18} />
                </button>
              )}
              <button
                onClick={handleToggleSave}
                aria-pressed={isSaved}
                aria-label={isSaved ? "Saqlanganlardan olib tashlash" : "Maqolani saqlash"}
                className={iconBtn}
              >
                <BookMarked size={19} className={isSaved ? 'r-accent' : ''} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleShare} aria-label="Ulashish" className={iconBtn}>
                <Share2 size={19} />
              </button>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {article.imageUrl && (
          <figure className="mb-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full aspect-video rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--r-surface)' }}
            >
              <img src={article.imageUrl} alt={article.title} loading="lazy" className="w-full h-full object-cover" />
            </motion.div>
            {article.imageCaption && (
              <figcaption className="text-center text-[13.5px] r-muted mt-3">{article.imageCaption}</figcaption>
            )}
          </figure>
        )}

        <article
          ref={articleContainerRef}
          className="article-container relative"
          style={{ fontSize: `${fontStep.base}px`, color: 'var(--r-ink-soft)' }}
        >
          {selectionMenu && (
            <div
              className={`article-selection-menu ${isMobile ? 'fixed' : 'absolute'} z-[1000] flex items-center gap-1.5 bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.35)] -translate-x-1/2 touch-none select-none border border-white/[0.08]`}
              style={isMobile ? {
                bottom: '24px',
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
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-colors active:scale-95 ${
                  isWordBankAdded
                    ? 'text-emerald-400'
                    : 'text-sky-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isWordBankLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : isWordBankAdded ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Qo'shildi</span>
                  </>
                ) : (
                  <>
                    <BookMarked size={14} />
                    <span>Lug'atga qo'shish</span>
                  </>
                )}
              </button>
              <div className="w-px h-4 bg-white/20" />
              <button
                onClick={dismissMenu}
                aria-label="Yopish"
                className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {(() => {
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

                  const rawFontSize = typeof block.style?.fontSize === 'number'
                    ? `${block.style.fontSize}px`
                    : (block.style?.fontSize || (block.type === 'heading' ? '26px' : undefined));
                  // Matn o'lchami tugmasi blok stillarini ham miqyoslashi uchun
                  const blockFontSize = rawFontSize ? `calc(${rawFontSize} * ${fontStep.scale})` : undefined;

                  const blockFontWeight = block.style?.fontWeight || (block.type === 'heading' ? '700' : '400');

                  const blockLineHeight = block.style?.lineHeight || (block.type === 'heading' ? 1.25 : 1.75);
                  const blockMarginTop = block.style?.marginTop !== undefined
                    ? (typeof block.style.marginTop === 'number' ? `${block.style.marginTop}px` : block.style.marginTop)
                    : (block.type === 'heading' ? '2.5rem' : '0');
                  const blockMarginBottom = block.style?.marginBottom !== undefined
                    ? (typeof block.style.marginBottom === 'number' ? `${block.style.marginBottom}px` : block.style.marginBottom)
                    : (block.type === 'heading' ? '1rem' : '1.5rem');

                  const isActiveBlock = currentBlockIndex === i;

                  return block.type === 'heading' ? (
                    <h2
                      key={i}
                      ref={(el) => { blockRefs.current[i] = el; }}
                      className={`article-serif transition-colors duration-300 ${isActiveBlock ? 'is-speaking' : ''}`}
                      style={{
                        color: 'var(--r-ink)',
                        fontSize: blockFontSize,
                        lineHeight: blockLineHeight,
                        marginTop: blockMarginTop,
                        marginBottom: blockMarginBottom,
                        fontWeight: blockFontWeight,
                        letterSpacing: block.style?.letterSpacing || '-0.015em',
                      }}
                    >
                      {cleanText}
                    </h2>
                  ) : (
                    <div
                      key={i}
                      ref={(el) => { blockRefs.current[i] = el; }}
                      className={`article-body-block article-serif transition-colors duration-300 ${isActiveBlock ? 'is-speaking' : ''}`}
                      style={{
                        fontSize: blockFontSize,
                        lineHeight: blockLineHeight,
                        marginBottom: blockMarginBottom,
                        fontWeight: blockFontWeight,
                        letterSpacing: block.style?.letterSpacing || undefined,
                      }}
                      dangerouslySetInnerHTML={{ __html: cleanHtml }}
                    />
                  );
                })}

                {isLocked && (
                  <div className="relative mt-0">
                    {/* The "Fade to Blur" Transition Section */}
                    <div className="relative h-56 overflow-hidden pointer-events-none select-none" aria-hidden="true">
                      <div className="absolute inset-0 z-10 r-fade" />
                      <div className="blur-[2px] opacity-40">
                        {fullContent?.slice(Math.ceil((fullContent?.length || 0) / 3), Math.ceil((fullContent?.length || 0) / 3) + 2).map((block, i) => (
                           <div
                              key={i}
                              className="article-body-block article-serif"
                              style={{
                                fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
                                lineHeight: block.style?.lineHeight || 1.75,
                                marginBottom: block.style?.marginBottom ? `${block.style.marginBottom}px` : '1.5rem',
                                fontWeight: block.style?.fontWeight || '400',
                              }}
                              dangerouslySetInnerHTML={{ __html: (block.text || '').replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') }}
                            />
                        ))}
                      </div>
                    </div>

                    {/* Premium Paywall Section */}
                    <div className="relative z-20 text-center max-w-xl mx-auto space-y-8 pt-8 pb-20 font-sans" style={{ backgroundColor: 'var(--r-paper)' }}>
                      <div className="space-y-4">
                        <h2 className="text-[26px] md:text-[34px] font-bold leading-tight" style={{ color: 'var(--r-ink)' }}>
                          Ushbu maqolani o'qish uchun a'zo bo'ling
                        </h2>
                        <p className="r-muted text-[16px] max-w-md mx-auto leading-relaxed">
                          {article.author} bu maqolani a'zolar uchun yopiq qildi. To'liq matn, lug'at va ovozli o'qish premium obuna bilan ochiladi.
                        </p>
                      </div>

                      <div className="space-y-3 text-left max-w-md mx-auto">
                        {[
                          "Barcha a'zolar uchun maqolalarga to'liq kirish",
                          "Har bir daraja (A2–C1) uchun moslashtirilgan matn",
                          "Lug'at, ovozli o'qish va WordBank imkoniyatlari",
                          "Reklamasiz, xotirjam o'qish muhiti"
                        ].map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <Check size={18} className="r-accent mt-0.5 shrink-0" />
                            <p className="text-[15px]" style={{ color: 'var(--r-ink-soft)' }}>{benefit}</p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => navigate('/pricing')}
                          className="px-10 py-3 r-accent-bg rounded-full font-bold text-[15px] transition-transform active:scale-95"
                        >
                          Obunani ochish
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </article>

        {/* Yopiq (member-only) maqolada lug'at ham ko'rsatilmasin */}
        {!isLocked && (
          <ArticleVocabulary vocabulary={activeVocabulary} level={readingLevel} articleTitle={article.title} />
        )}

        {/* Claim XP Section — izohlardan oldin, chunki o'qish oqimiga tegishli */}
        {user && article && !isLocked && (
          <div className="mt-14 rounded-2xl border p-6 md:p-7" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)' }}>
            <div className="flex items-start gap-3 mb-5">
              <Sparkles className="r-accent shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-[17px] font-bold" style={{ color: 'var(--r-ink)' }}>Maqolani o'qib chiqdingizmi?</h3>
                <p className="text-[13.5px] r-muted mt-0.5">
                  {alreadyAwarded ? "Siz ushbu maqola uchun XP olgansiz." : "Ikkala shart bajarilgach, XP tugmasi faollashadi."}
                </p>
              </div>
            </div>

            {!alreadyAwarded && (
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                    <span className="r-muted">O'qish vaqti</span>
                    <span className="font-semibold tabular-nums" style={{ color: timeSpent >= REQUIRED_SECONDS ? 'var(--r-accent)' : 'var(--r-ink-soft)' }}>
                      {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, '0')} / 2:00
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--r-track)' }}>
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${timeProgress}%`, backgroundColor: 'var(--r-accent)' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                    <span className="r-muted">Varaqlash</span>
                    <span className="font-semibold tabular-nums" style={{ color: isScrollMet ? 'var(--r-accent)' : 'var(--r-ink-soft)' }}>
                      {isScrollMet ? 'Bajarildi' : `${Math.round(progress)}% / ${REQUIRED_SCROLL}%`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--r-track)' }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-150"
                      style={{ width: `${Math.min(100, (progress / REQUIRED_SCROLL) * 100)}%`, backgroundColor: 'var(--r-accent)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleClaimXP}
              disabled={alreadyAwarded || !canClaimXP}
              className="w-full sm:w-auto px-7 py-3 r-accent-bg rounded-full font-bold text-[14px] transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {alreadyAwarded ? (
                <><CheckCircle2 size={17} /> XP olindi</>
              ) : (
                <><Award size={17} /> XP olish (+10)</>
              )}
            </button>
          </div>
        )}

        {/* Inline Comments Section (Medium Style) */}
        <section ref={commentsRef} className="mt-14 border-t pt-10 pb-8" style={{ borderColor: 'var(--r-hairline)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <h3 className="text-[19px] font-bold font-sans" style={{ color: 'var(--r-ink)' }}>
              Izohlar ({comments.length})
            </h3>
            <span
              title="Izohlar hurmatli va mavzuga oid bo'lishi kerak"
              className="flex items-center gap-1.5 text-[12px] r-muted"
            >
              <ShieldCheck size={16} /> <span className="hidden sm:inline">Muloqot qoidalari</span>
            </span>
          </div>

          {/* Comment Form (Medium style input container) */}
          {user ? (
            <div className="rounded-2xl border p-4 mb-9 transition-colors text-left" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)' }}>
              <div className="flex items-center gap-3 mb-3">
                {userData?.avatar ? (
                  <img src={userData.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold r-accent" style={{ backgroundColor: 'var(--r-accent-soft)' }}>
                    {userData?.fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                )}
                <span className="text-sm font-medium" style={{ color: 'var(--r-ink)' }}>
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
                maxLength={1000}
                placeholder="Fikringiz qanday?"
                className="w-full bg-transparent border-none focus:ring-0 text-[14.5px] min-h-[76px] resize-none p-0 focus:outline-none"
                style={{ color: 'var(--r-ink)' }}
              />
              {isInputFocused && (
                <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t" style={{ borderColor: 'var(--r-hairline)' }}>
                  <span className="text-[11.5px] r-muted tabular-nums">{newComment.length}/1000</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNewComment("");
                        setIsInputFocused(false);
                      }}
                      className="px-4 py-1.5 r-muted r-hover-ink hover:bg-[var(--r-hover)] rounded-full text-[13px] font-medium transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      disabled={!newComment.trim()}
                      onClick={async () => {
                        await handlePostComment();
                        setIsInputFocused(false);
                      }}
                      className="px-4 py-1.5 r-accent-bg rounded-full text-[13px] font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
                    >
                      Yuborish
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border p-6 text-center mb-9" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)' }}>
              <p className="text-sm r-muted mb-3">Izoh yozish uchun tizimga kiring.</p>
              <button
                onClick={() => navigate('/auth/login')}
                className="px-5 py-2 r-accent-bg rounded-full text-[13px] font-semibold transition-transform active:scale-95"
              >
                Kirish
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6 text-left">
            {comments.length > 0 ? (
              comments.slice().reverse().map((comment) => {
                const isOwn = user && comment.userId === user.uid;
                const isClappedByMe = clappedCommentIds.has(comment.id);
                return (
                  <div key={comment.id} className="border-b pb-6 last:border-b-0" style={{ borderColor: 'var(--r-hairline)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {comment.userAvatar ? (
                          <img src={comment.userAvatar} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold r-muted shrink-0" style={{ backgroundColor: 'var(--r-surface-strong)' }}>
                            {comment.userName?.charAt(0) || "U"}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--r-ink)' }}>
                            {comment.userName}
                          </span>
                          <span className="text-[12px] r-muted">{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          aria-label="Izohni o'chirish"
                          title="O'chirish"
                          className="p-2 rounded-full r-muted r-hover-danger hover:bg-[var(--r-hover)] transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <p className="text-[15px] leading-relaxed mt-3 sm:pl-12 whitespace-pre-line font-sans" style={{ color: 'var(--r-ink-soft)' }}>
                      {comment.text}
                    </p>

                    <div className="flex items-center gap-5 mt-3.5 sm:pl-12">
                      <button
                        onClick={() => handleClapComment(comment.id)}
                        disabled={isClappedByMe}
                        aria-pressed={isClappedByMe}
                        className={`flex items-center gap-1.5 transition-colors ${isClappedByMe ? 'r-ink cursor-default' : 'r-muted r-hover-ink'}`}
                        title={isClappedByMe ? "Siz qarsak chalgansiz" : "Qarsak chalish"}
                      >
                        <span className="text-[15px] leading-none">👏</span>
                        <span className="text-[13px] tabular-nums">{comment.claps || 0}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto r-muted" style={{ backgroundColor: 'var(--r-surface)' }}>
                  <MessageSquareIcon size={26} />
                </div>
                <p className="r-muted text-sm">Hozircha izoh yo'q. Birinchi bo'lib fikr bildiring.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Yuqoriga qaytish */}
      <AnimatePresence>
        {showTopButton && !(isMobile && selectionMenu) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Yuqoriga qaytish"
            className="fixed bottom-6 right-5 md:right-8 z-40 w-11 h-11 rounded-full border shadow-lg flex items-center justify-center r-muted r-hover-ink transition-colors"
            style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)' }}
          >
            <ArrowUp size={19} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-medium text-white shadow-xl max-w-[90vw]"
            style={{ backgroundColor: toast.type === 'error' ? '#c64545' : toast.type === 'success' ? '#3f7d46' : '#2c2b28' }}
          >
            {toast.type === 'success' ? <Check size={16} className="shrink-0" /> : toast.type === 'error' ? <X size={16} className="shrink-0" /> : <Link2 size={16} className="shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* --- Xotirjam o'qish palitrasi (Medium-style, iliq qog'oz) --- */
        .reading-root {
          --r-paper: #faf9f5;
          --r-paper-blur: rgba(250, 249, 245, 0.85);
          --r-surface: #f5f2eb;
          --r-surface-strong: #ece7dd;
          --r-hairline: #e6dfd8;
          --r-ink: #1f1e1c;
          --r-ink-soft: #33322e;
          --r-muted: #6c6a64;
          --r-accent: #1a7f4b;
          --r-accent-soft: rgba(26, 127, 75, 0.12);
          --r-accent-contrast: #ffffff;
          --r-hover: rgba(31, 30, 28, 0.05);
          --r-focus: rgba(26, 127, 75, 0.45);
          --r-track: #e6dfd8;
          --r-selection: #d8e8dc;
          --r-fade: linear-gradient(to bottom, rgba(250,249,245,0) 0%, rgba(250,249,245,0.85) 55%, #faf9f5 100%);
        }
        .dark .reading-root {
          --r-paper: #171614;
          --r-paper-blur: rgba(23, 22, 20, 0.85);
          --r-surface: #201f1c;
          --r-surface-strong: #2a2825;
          --r-hairline: #2e2c28;
          --r-ink: #e8e5de;
          --r-ink-soft: #d3cfc7;
          --r-muted: #948f85;
          --r-accent: #6cbf8b;
          --r-accent-soft: rgba(108, 191, 139, 0.14);
          --r-accent-contrast: #10221a;
          --r-hover: rgba(232, 229, 222, 0.07);
          --r-focus: rgba(108, 191, 139, 0.45);
          --r-track: #2e2c28;
          --r-selection: rgba(108, 191, 139, 0.28);
          --r-fade: linear-gradient(to bottom, rgba(23,22,20,0) 0%, rgba(23,22,20,0.85) 55%, #171614 100%);
        }

        .r-ink { color: var(--r-ink); }
        .r-muted { color: var(--r-muted); }
        .r-accent { color: var(--r-accent); }
        .r-hover-ink:hover { color: var(--r-ink); }
        .r-hover-danger:hover { color: #d05353; }
        .r-fade { background-image: var(--r-fade); }
        .r-accent-bg {
          background-color: var(--r-accent);
          color: var(--r-accent-contrast);
        }
        .r-accent-bg:hover:not(:disabled) { filter: brightness(1.06); }

        .article-serif,
        .article-container,
        .article-container h2,
        .article-container div,
        .article-container p,
        .article-container span,
        .article-container li {
          font-family: Charter, Georgia, Cambria, "Times New Roman", Times, serif;
        }
        .article-container,
        .article-container * {
          -webkit-user-select: text;
          user-select: text;
        }
        .article-container ::selection {
          background-color: var(--r-selection);
        }

        /* Ovozli o'qishda joriy blok — chalg'itmaydigan yumshoq belgi */
        .article-container .is-speaking {
          background-color: var(--r-accent-soft);
          box-shadow: inset 3px 0 0 var(--r-accent);
          border-radius: 4px;
          padding-left: 14px;
          margin-left: -14px;
        }

        .article-body-block {
          word-break: normal;
          overflow-wrap: break-word;
          hyphens: none;
          -webkit-hyphens: none;
        }
        .article-body-block p { margin-bottom: 0.75em; }
        .article-body-block ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .article-body-block ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
        .article-body-block li { margin-bottom: 0.25rem; }
        .article-body-block a {
          color: var(--r-accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .article-body-block img { max-width: 100%; height: auto; border-radius: 8px; }
        .article-body-block blockquote {
          border-left: 3px solid var(--r-hairline);
          padding-left: 1rem;
          font-style: italic;
          color: var(--r-muted);
          margin: 1.25rem 0;
        }
        .article-body-block strong { font-weight: 700; color: var(--r-ink); }
        .article-body-block em { font-style: italic; }
        .article-body-block s { text-decoration: line-through; }
        .article-body-block u { text-decoration: underline; }

        @media (prefers-reduced-motion: reduce) {
          .reading-root * { scroll-behavior: auto !important; }
        }
      `}</style>

      {!isTeacher && <SiteFooter />}
    </div>
  );
}
