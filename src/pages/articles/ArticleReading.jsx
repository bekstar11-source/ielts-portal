/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, BookMarked, Share2,
  Type, CheckCircle2, Star, X, Check,
  MessageSquare as MessageSquareIcon, Volume2,
  Pause, Play, ShieldCheck, ArrowUp, Trash2, Link2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from "../../firebase/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from "firebase/firestore";
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import { useSeo } from '../../hooks/useSeo';
import SiteFooter from '../../components/common/SiteFooter';
import { useTranslation } from '../../context/LanguageContext';
import { stripHtml } from '../../utils/textUtils';
import ArticleVocabulary from '../../components/articles/ArticleVocabulary';
import ArticleLevelPicker from '../../components/articles/ArticleLevelPicker';
import {
  ARTICLE_LEVELS,
  getArticleContent,
  getArticleVocabulary,
  getArticleReadTime,
  formatReadTimeLabel,
  getDefaultReadingLevel,
  savePreferredReadingLevel,
} from '../../utils/articleLevels';
import { hasClappedArticle, addArticleClap, removeArticleClap } from '../../utils/articleClaps';
import { parseArticleClaps, formatClapsDisplay } from '../../utils/articlePopularity';
import { isArticleSaved, toggleArticleSave } from '../../utils/articleSaves';
import { createArticleReader, revokeArticleAudio } from '../../services/articleTts';

/* Matn o'lchami — bosqichlar (localStorage'da saqlanadi).
   `base` — asosiy matn (paragraf) o'lchami px'da. */
const FONT_STEPS = [
  { key: 'sm', label: 'Kichik', base: 18 },
  { key: 'md', label: "O'rtacha", base: 20 },
  { key: 'lg', label: 'Katta', base: 22 },
  { key: 'xl', label: 'Juda katta', base: 25 },
];
const FONT_STORAGE_KEY = 'article_font_step';

/* Muharrirdagi standart paragraf o'lchami — blok stillari shunga nisbatan miqyoslanadi */
const EDITOR_BASE_FONT_SIZE = 16;
/* Muharrirdagi standart qator balandligi — o'qish uchun bundan bo'shroq ko'rsatiladi */
const EDITOR_DEFAULT_LINE_HEIGHT = 1.6;

/* Tanlangan so'z menyusi (desktop) — pozitsiyani hisoblash uchun taxminiy o'lchamlar */
const MENU_HALF_WIDTH = 180;
const MENU_HEIGHT = 46;
const MENU_GAP = 10;
const STICKY_HEADER_OFFSET = 88;

/* Uzun tanlovni menyuda qisqartirib ko'rsatamiz */
const truncateWord = (text = '', max = 32) =>
  text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;

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

/* --- Ovozli o'qish yordamchilari ---
   Chrome uzun utterance'ni ~15 soniyadan keyin jimgina to'xtatadi va `onend`
   umuman ishlamay qolishi mumkin. Shuning uchun matnni qisqa bo'laklarga
   ajratamiz — har bir bo'lak ~10 soniyadan oshmaydi. */
const MAX_UTTERANCE_CHARS = 200;

const htmlToPlainText = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
};

const splitIntoSpeechChunks = (text) => {
  if (!text) return [];
  if (text.length <= MAX_UTTERANCE_CHARS) return [text];

  const sentences = text.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [text];
  const chunks = [];
  let buffer = '';

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) chunks.push(trimmed);
    buffer = '';
  };

  for (const sentence of sentences) {
    if (buffer && (buffer + sentence).length > MAX_UTTERANCE_CHARS) flush();

    if (sentence.length > MAX_UTTERANCE_CHARS) {
      // Juda uzun jumla — so'zlar bo'yicha bo'lamiz
      for (const word of sentence.split(/\s+/)) {
        if (buffer && (buffer + ' ' + word).length > MAX_UTTERANCE_CHARS) flush();
        buffer += (buffer ? ' ' : '') + word;
      }
      continue;
    }

    buffer += sentence;
  }
  flush();

  return chunks;
};

const pickEnglishVoice = (list = []) =>
  list.find((v) => /Google (US|UK) English/i.test(v.name)) ||
  list.find((v) => /Natural/i.test(v.name) && v.lang?.startsWith('en')) ||
  list.find((v) => v.lang === 'en-US') ||
  list.find((v) => v.lang?.startsWith('en')) ||
  null;

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const UZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

const formatUzDate = (date) => {
  if (!date) return '';
  return `${date.getDate()}-${UZ_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
};

const formatArticleDate = (date, t) => {
  if (!date) return '';
  const months = t('articles.justNow') === 'Just now' ? EN_MONTHS : UZ_MONTHS;
  if (months === EN_MONTHS) {
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  return `${date.getDate()}-${months[date.getMonth()]}, ${date.getFullYear()}`;
};

const formatRelativeTime = (value, t) => {
  const d = toDate(value);
  if (!d) return t('articles.justNow') || 'Hozirgina';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return t('articles.justNow') || 'Hozirgina';
  if (min < 60) return (t('articles.minutesAgo') || "{count} daqiqa oldin").replace('{count}', min);
  const hours = Math.round(min / 60);
  if (hours < 24) return (t('articles.hoursAgo') || "{count} soat oldin").replace('{count}', hours);
  const days = Math.round(hours / 24);
  if (days < 7) return (t('articles.daysAgo') || "{count} kun oldin").replace('{count}', days);
  return formatArticleDate(d, t);
};

export default function ArticleReading() {
  const { user, userData, updateUserLocalData, isGuest } = useAuth();
  const { lang, t } = useTranslation();
  const isTeacher = userData?.role === 'teacher';
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  // 'notfound' | 'members' | null — maqola ochilmaganda NIMA sababdan
  // ochilmaganini ajratamiz: mehmonni bo'sh ekranga qoldirish o'rniga
  // ro'yxatdan o'tishga taklif qilamiz.
  const [loadError, setLoadError] = useState(null);

  // Anonim (trial) sessiyada `user` bor, lekin Firestore uni avtorizatsiya
  // qilingan deb hisoblamaydi — qarsak/saqlash yozuvlari rad etiladi.
  const isVisitor = !user || isGuest;
  const commentsRef = useRef(null);

  const [selectionMenu, setSelectionMenu] = useState(null);
  const [isWordBankLoading, setIsWordBankLoading] = useState(false);
  const [isWordBankAdded, setIsWordBankAdded] = useState(false);
  const [isWordSpeaking, setIsWordSpeaking] = useState(false);
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
  // Utterance'ni ref'da ushlab turamiz: aks holda brauzer uni o'qish tugamasdan
  // "garbage collect" qilib yuboradi va ovoz o'rtada uziladi (Chrome/Safari bug'i).
  const utteranceRef = useRef(null);
  const keepAliveRef = useRef(null);
  const isPausedRef = useRef(false);
  // Neural (Edge TTS) o'quvchi — mavjud bo'lsa shu ishlaydi, aks holda brauzer ovozi
  const readerRef = useRef(null);
  const [isPreparingSpeech, setIsPreparingSpeech] = useState(false);

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


  const publishedDate = useMemo(() => {
    const d = toDate(article?.createdAt);
    if (!d) return null;
    return lang === 'uz' ? formatUzDate(d) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [article?.createdAt, lang]);

  // Menyuni yopish va selectionni tozalash
  const dismissMenu = useCallback(() => {
    setSelectionMenu(null);
    setIsWordSpeaking(false);
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
      } catch { /* ignore */ }
    }
  }, []);

  // Tanlangan so'zni ovoz bilan eshittirish (maqola o'qilayotgan bo'lsa — o'chiq)
  const speakSelectedWord = useCallback(() => {
    const text = selectionMenu?.word;
    if (!synth || !text) return;
    try {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const voice = pickEnglishVoice(voices);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || 'en-US';
      utter.rate = 0.85;
      utter.onend = () => setIsWordSpeaking(false);
      utter.onerror = () => setIsWordSpeaking(false);
      setIsWordSpeaking(true);
      synth.speak(utter);
    } catch {
      setIsWordSpeaking(false);
    }
  }, [synth, voices, selectionMenu?.word]);

  const handleAddToWordBank = async () => {
    if (!selectionMenu || isWordBankLoading || isWordBankAdded) return;
    if (isVisitor) {
      showToast(t('articles.loginToSaveWord') || "So'zni saqlash uchun tizimga kiring.", 'error');
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
      showToast((t('articles.wordAddedToVocab') || "«{word}» lug'atga qo'shildi").replace('{word}', truncateWord(word, 24)), 'success');
      // Muvaffaqiyat holatini ko'rsatib turamiz, so'ng menyuni yopamiz
      setTimeout(() => {
        dismissMenu();
      }, 1100);

    } catch (error) {
      console.error("WordBank add error:", error);
      showToast(t('articles.errorSavingWord') || "So'zni saqlashda xatolik yuz berdi.", 'error');
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

      // Menyu pozitsiyasi: tanlangan matnning ustida turadi, joy yetmasa —
      // pastiga "ag'daradi". Gorizontal chetga chiqmasligi uchun qisiladi,
      // ko'rsatkich (arrow) esa aynan tanlangan so'zga qarab siljiydi.
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const anchorLeft = rect.left - containerRect.left + (rect.width / 2);
      const clampedLeft = Math.min(
        Math.max(MENU_HALF_WIDTH, anchorLeft),
        Math.max(MENU_HALF_WIDTH, containerRect.width - MENU_HALF_WIDTH)
      );

      const topAbove = rect.top - containerRect.top - MENU_HEIGHT - MENU_GAP;
      // Sahifa tepasidagi yopishqoq header ostida qolib ketmasin
      const fitsAbove = topAbove >= 0 && rect.top > MENU_HEIGHT + MENU_GAP + STICKY_HEADER_OFFSET;
      const placement = fitsAbove ? 'top' : 'bottom';

      setSelectionMenu({
        top: fitsAbove ? topAbove : rect.bottom - containerRect.top + MENU_GAP,
        left: clampedLeft,
        arrowShift: Math.max(-MENU_HALF_WIDTH + 22, Math.min(MENU_HALF_WIDTH - 22, anchorLeft - clampedLeft)),
        placement,
        word: selectedText,
        context: contextSentence
      });

      // Faqat yangi so'z tanlanganda holatni tozalaymiz — aks holda scroll
      // paytida "Qo'shildi" belgisi yo'qolib qoladi
      if (selectionMenuRef.current?.word !== selectedText) {
        setIsWordBankAdded(false);
        setIsWordBankLoading(false);
      }
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

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && selectionMenuRef.current) dismissMenu();
    };

    // Sahifa siljiganda menyu matndan "uzilib" qolmasin
    const onScroll = () => {
      if (selectionMenuRef.current) scheduleShowMenu();
    };

    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousedown', onDocumentMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(menuTimer);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onDocumentMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
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
      setIsSaved(Boolean(user) && isArticleSaved(id, userData));
    }
  }, [id, user, userData?.clappedArticles, userData?.savedArticles]);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    // Tokenni o'zgartiramiz — bekor qilingan utterance'ning onend'i keyingi blokni o'qimasin
    speechRunIdRef.current += 1;
    clearKeepAlive();
    utteranceRef.current = null;
    setIsPreparingSpeech(false);
    if (readerRef.current) {
      readerRef.current.stop();
      readerRef.current = null;
    }
    if (synth) {
      // Chrome'da "paused" holatida cancel() qilinsa, dvigatel qotib qoladi va
      // keyingi speak() umuman ishlamaydi — avval resume qilamiz.
      try { synth.resume(); } catch { /* ignore */ }
      synth.cancel();
    }
    isPausedRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentBlockIndex(-1);
  }, [synth, clearKeepAlive]);

  useEffect(() => {
    if (!article) return;
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
            setLoadError(null);
            setArticle({ id: docSnap.id, ...data });
            // claps eski yozuvlarda "4.8K" kabi matn bo'lishi mumkin → raqamga aylantiramiz
            setClaps(parseArticleClaps(data.claps));
            setComments(Array.isArray(data.comments) ? data.comments : []);
        } else {
            // Ilgari bu yerda `/articles` ga qaytarilardi. Endi maqola manzili
            // qidiruv natijalarida chiqadi — o'chirilgan maqolaga kirgan odam
            // sababini ko'rishi kerak, aks holda bu "yumshoq 404" bo'ladi.
            setLoadError('notfound');
        }
    } catch (err) {
        // Mehmon premium maqolani so'raganda Firestore qoidasi
        // `permission-denied` qaytaradi — bu xato emas, kutilgan holat.
        if (err?.code === 'permission-denied') {
            setLoadError('members');
        } else {
            console.error("Error fetching article:", err);
            setLoadError('notfound');
        }
    } finally {
        setLoading(false);
    }
  };

  const clapPendingRef = useRef(false);

  const handleClap = async () => {
    // Tez-tez bosilganda Firestore'ga qarama-qarshi so'rovlar ketmasligi uchun qulf
    if (!article || clapPendingRef.current) return;
    // Mehmonda qarsak Firestore qoidasidan o'tmaydi (`allow update: if isAuth()`) —
    // optimistik hisobni ko'tarib, keyin orqaga qaytarish o'rniga darhol aytamiz.
    if (isVisitor) {
      showToast(t('articles.loginToClapComment') || "Qarsak chalish uchun tizimga kiring.", 'error');
      return;
    }
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
    if (isVisitor) {
      showToast(t('articles.loginToSaveArticle') || "Maqolani saqlash uchun tizimga kiring.", 'error');
      return;
    }
    if (savePending) return;

    const next = !isSaved;
    setSavePending(true);
    setIsSaved(next);

    try {
      await toggleArticleSave({ db, articleId: id, user, userData, updateUserLocalData, save: next });
      showToast(next ? (t('articles.articleSaved') || "Maqola saqlandi.") : (t('articles.articleUnsaved') || "Saqlanganlardan olib tashlandi."), 'success');
    } catch (err) {
      console.error("Error saving article:", err);
      setIsSaved(!next);
      showToast(t('articles.errorSavingArticle') || "Saqlashda xatolik yuz berdi.", 'error');
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
      showToast(lang === 'uz' ? "Havola nusxalandi." : "Link copied.", 'success');
    } catch (err) {
      if (err?.name === 'AbortError') return; // foydalanuvchi bekor qildi
      showToast(lang === 'uz' ? "Havolani nusxalab bo'lmadi." : "Failed to copy link.", 'error');
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
      showToast(t('articles.errorSavingComment') || "Izohni saqlashda xatolik yuz berdi.", 'error');
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
      showToast(t('articles.commentDeleted') || "Izoh o'chirildi.", 'success');
    } catch (err) {
      console.error("Error deleting comment:", err);
      setComments(previous);
      showToast(t('articles.errorDeletingComment') || "Izohni o'chirishda xatolik.", 'error');
    }
  };

  const handleClapComment = async (commentId) => {
    if (isVisitor) {
      showToast(t('articles.loginToClapComment') || "Izohga qarsak chalish uchun tizimga kiring.", 'error');
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

  /**
   * Zaxira dvigatel — brauzerning o'z `speechSynthesis` ovozi.
   * Neural ovoz ishlamaganda ishga tushadi: sifati past, lekin tarmoqsiz ham ishlaydi.
   * @param {Array<{ blockIndex: number, text: string }>} items
   */
  const speakWithBrowser = (items) => {
    if (!synth) {
      showToast("Brauzeringiz ovozli o'qishni qo'llab-quvvatlamaydi.", 'error');
      stopSpeech();
      return;
    }

    // Har bir blokni qisqa bo'laklarga ajratib, bitta navbat quramiz.
    // Har bir bo'lak qaysi blokka tegishli ekani saqlanadi (ajratib ko'rsatish uchun).
    const queue = [];
    items.forEach(({ blockIndex, text }) => {
      splitIntoSpeechChunks(text).forEach((chunk) => queue.push({ blockIndex, text: chunk }));
    });

    if (queue.length === 0) {
      stopSpeech();
      return;
    }

    // Avvalgi sessiyani to'xtatamiz va yangi token olamiz
    speechRunIdRef.current += 1;
    const runId = speechRunIdRef.current;
    clearKeepAlive();
    try { synth.resume(); } catch { /* ignore */ }
    synth.cancel();

    const availableVoices = voices.length > 0 ? voices : synth.getVoices();
    const voice = pickEnglishVoice(availableVoices);

    const finish = () => {
      clearKeepAlive();
      utteranceRef.current = null;
      isPausedRef.current = false;
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentBlockIndex(-1);
    };

    const speakAt = (index) => {
      // Bekor qilingan (yoki eskirgan) sessiya davom etmasin
      if (runId !== speechRunIdRef.current) return;
      if (index >= queue.length) {
        finish();
        return;
      }

      const item = queue[index];
      setCurrentBlockIndex(item.blockIndex);

      const utterance = new SpeechSynthesisUtterance(item.text);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = 0.95;

      utterance.onend = () => {
        if (runId !== speechRunIdRef.current) return;
        speakAt(index + 1);
      };

      utterance.onerror = (event) => {
        if (runId !== speechRunIdRef.current) return;
        // cancel() natijasida kelgan xatolar — bu normal, e'tibor bermaymiz
        if (event?.error === 'interrupted' || event?.error === 'canceled') return;
        console.error('Speech error:', event?.error);
        // Bitta bo'lak o'qilmasa, butun maqolani to'xtatmaymiz — keyingisiga o'tamiz
        speakAt(index + 1);
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    };

    isPausedRef.current = false;
    setIsSpeaking(true);
    setIsPaused(false);
    speakAt(0);

    // Chrome'ning ~15 soniyalik "timeout" bug'iga qarshi: davriy ravishda
    // pause/resume qilib dvigatelni uyg'oq ushlab turamiz.
    keepAliveRef.current = setInterval(() => {
      if (runId !== speechRunIdRef.current) {
        clearKeepAlive();
        return;
      }
      if (isPausedRef.current || !synth.speaking) return;
      try {
        synth.pause();
        synth.resume();
      } catch { /* ignore */ }
    }, 9000);

    // Agar 1.5 soniyada ovoz umuman boshlanmasa — foydalanuvchini xabardor qilamiz
    setTimeout(() => {
      if (runId !== speechRunIdRef.current) return;
      if (!synth.speaking && !synth.pending) {
        console.error('Speech synthesis did not start');
        showToast("Ovozli o'qishni boshlab bo'lmadi. Brauzer sozlamalarini tekshiring.", 'error');
        finish();
      }
    }, 1500);
  };

  const handleListen = () => {
    // Pauza / davom ettirish — qaysi dvigatel ishlayotganiga qarab
    if (isSpeaking && !isPaused) {
      isPausedRef.current = true;
      setIsPaused(true);
      if (readerRef.current) readerRef.current.pause();
      else synth?.pause();
      return;
    }

    if (isSpeaking && isPaused) {
      isPausedRef.current = false;
      setIsPaused(false);
      if (readerRef.current) readerRef.current.resume();
      else synth?.resume();
      return;
    }

    if (!article) return;

    const fullContent = getArticleContent(article, readingLevel);
    const blocksToRead = isLocked
      ? fullContent?.slice(0, Math.ceil((fullContent?.length || 0) / 3))
      : fullContent;

    const items = (blocksToRead || [])
      .map((block, blockIndex) => ({ blockIndex, text: htmlToPlainText(block?.text) }))
      .filter((item) => item.text);

    if (items.length === 0) {
      showToast("Bu maqolada o'qiladigan matn topilmadi.", 'error');
      return;
    }

    // Neural ovoz serverdan keladi va avtorizatsiya talab qiladi. Anonim
    // sessiya ham avtorizatsiya hisoblanmaydi, shuning uchun `isVisitor` —
    // mehmon uchun to'g'ridan-to'g'ri brauzer ovoziga o'tamiz.
    if (isVisitor) {
      speakWithBrowser(items);
      return;
    }

    speechRunIdRef.current += 1;
    const runId = speechRunIdRef.current;
    isPausedRef.current = false;
    setIsSpeaking(true);
    setIsPaused(false);
    setIsPreparingSpeech(true);

    const reader = createArticleReader({
      blocks: items,
      onBlockChange: (blockIndex) => {
        if (runId !== speechRunIdRef.current) return;
        setCurrentBlockIndex(blockIndex);
      },
      onLoadingChange: (loading) => {
        if (runId !== speechRunIdRef.current) return;
        setIsPreparingSpeech(loading);
      },
      onEnd: () => {
        if (runId !== speechRunIdRef.current) return;
        stopSpeech();
      },
      onError: (error) => {
        if (runId !== speechRunIdRef.current) return;
        // Sabab konsolga to'liq chiqadi: `unavailable` — Edge TTS javob bermadi,
        // `NotAllowedError` — brauzer ijroga ruxsat bermadi, `unauthenticated` —
        // sessiya eskirgan. Zaxira ovozga o'tish sababni yashirmasin.
        console.error('Neural TTS ishlamadi:', error?.code || error?.name, error?.message || error);
        readerRef.current?.stop();
        readerRef.current = null;
        setIsPreparingSpeech(false);
        showToast("Tabiiy ovoz ishlamadi — brauzer ovoziga o'tildi.", 'error');
        speakWithBrowser(items);
      },
    });

    readerRef.current = reader;
    reader.start();
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
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
      utteranceRef.current = null;
      readerRef.current?.stop();
      readerRef.current = null;
      revokeArticleAudio();
      if (synth) {
        try { synth.resume(); } catch { /* ignore */ }
        synth.cancel();
      }
    };
  }, [synth]);

  // ⚠️ Hook'lar quyidagi erta `return` lardan OLDIN chaqirilishi shart.
  const seoDescription = useMemo(() => {
    if (!article) return '';
    // ⚠️ `activeContent` ga BOG'LANMAYMIZ: u har renderda yangi massiv bo'lib
    // qayta yaratiladi (memo qilinmagan), ya'ni bu useMemo hech qachon
    // keshlanmasdi. Shuning uchun manbadan qayta hisoblaymiz.
    const blocks = getArticleContent(article, readingLevel) || [];
    const raw = article.subtitle
      ? stripHtml(article.subtitle)
      : blocks.map((b) => stripHtml(b?.text || '')).join(' ');
    const clean = raw.replace(/\s+/g, ' ').trim();
    // Google qidiruv natijasida ~155 belgidan keyingisini kesadi — jumlani
    // yarmida uzmaslik uchun oxirgi probelgacha qaytamiz.
    if (clean.length <= 155) return clean;
    const cut = clean.slice(0, 155);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }, [article, readingLevel]);

  useSeo({
    enabled: Boolean(article),
    title: article?.title,
    description: seoDescription,
    path: `/article/${id}`,
    image: article?.coverImage || article?.image || article?.thumbnail || undefined,
    jsonLd: article && {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: seoDescription,
      inLanguage: "en",
      datePublished: toDate(article.createdAt)?.toISOString(),
      author: { "@type": "Person", name: article.author || "ENGLEV" },
      publisher: {
        "@type": "Organization",
        name: "ENGLEV",
        logo: { "@type": "ImageObject", url: "https://englev.uz/englev-logo.png" },
      },
      mainEntityOfPage: `https://englev.uz/article/${id}`,
      // Daraja bo'yicha variantlar — bu maqolaning asosiy farqlovchi xususiyati.
      educationalLevel: ARTICLE_LEVELS.join(', '),
    },
  });

  if (loading) {
    return (
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-warm-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (!article) {
    // ⚠️ Mehmon uchun Firestore o'chirilgan maqolani ham, premium maqolani ham
    // bir xil `permission-denied` bilan rad etadi — ikkisini ajratib
    // bo'lmaydi. Shuning uchun matn ikkala holatda ham to'g'ri bo'lishi kerak.
    const isMembersOnly = loadError === 'members';
    return (
      <div className="reading-root min-h-screen font-sans antialiased" style={{ backgroundColor: 'var(--r-paper)', color: 'var(--r-ink)' }}>
        {isVisitor
          ? <Navbar />
          : !isTeacher && <DashboardHeader user={user} userData={userData} activeTab="articles" />}
        <div className="max-w-[560px] mx-auto px-5 py-24 text-center space-y-6">
          <h1 className="text-[26px] md:text-[32px] font-bold leading-tight" style={{ color: 'var(--r-ink)' }}>
            {isMembersOnly
              ? (lang === 'uz' ? "Bu maqola a'zolar uchun" : 'This article is for members')
              : (lang === 'uz' ? 'Maqola topilmadi' : 'Article not found')}
          </h1>
          <p className="r-muted text-[16px] leading-relaxed">
            {isMembersOnly
              ? (lang === 'uz'
                  ? "Ro'yxatdan o'ting va yopiq maqolalarni ham to'liq o'qing. Maqola o'chirilgan bo'lishi ham mumkin — u holda ro'yxatdan boshqasini tanlang."
                  : "Sign up to read member-only articles. The article may also have been removed — in that case pick another from the list.")
              : (lang === 'uz'
                  ? "Bu maqola o'chirilgan yoki manzili noto'g'ri bo'lishi mumkin."
                  : 'This article may have been removed, or the link is incorrect.')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {isMembersOnly && isVisitor && (
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 r-accent-bg rounded-full font-bold text-[15px] transition-transform active:scale-95"
              >
                {lang === 'uz' ? "Bepul ro'yxatdan o'tish" : 'Sign up free'}
              </button>
            )}
            <button
              onClick={() => navigate('/articles')}
              className="px-8 py-3 rounded-full font-bold text-[15px] border transition-colors hover:bg-[var(--r-hover)]"
              style={{ borderColor: 'var(--r-hairline)', color: 'var(--r-ink)' }}
            >
              {lang === 'uz' ? 'Barcha maqolalar' : 'All articles'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mehmonda `DashboardHeader` (md: 48px) yo'q — sticky panel tepaga yopishadi.
  const stickyTop = (isTeacher || isVisitor) ? 'top-0' : 'top-0 md:top-12';
  const iconBtn = "p-2.5 rounded-full transition-colors r-muted r-hover-ink hover:bg-[var(--r-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--r-focus)]";

  return (
    <div className="reading-root min-h-screen font-sans antialiased" style={{ backgroundColor: 'var(--r-paper)', color: 'var(--r-ink)' }}>
      {/*
        * Mehmonga landing `Navbar` i beriladi: `DashboardHeader` havolalari
        * yopiq marshrutlarga olib boradi va bosilsa odam bosh sahifaga
        * uloqtiriladi — qidiruvdan kelgan o'quvchi uchun bu o'lik yo'l.
        */}
      {isVisitor
        ? <Navbar />
        : !isTeacher && <DashboardHeader user={user} userData={userData} activeTab="articles" />}

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
                aria-label={lang === 'uz' ? "Matn o'lchami" : "Text size"}
                title={lang === 'uz' ? "Matn o'lchami" : "Text size"}
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
                        <span style={{ fontSize: `${Math.round(step.base * 0.78)}px`, color: 'var(--r-ink)' }}>
                          {step.key === 'sm' ? t('articles.fontSmall') : step.key === 'md' ? t('articles.fontMedium') : step.key === 'lg' ? t('articles.fontLarge') : t('articles.fontExtraLarge')}
                        </span>
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
              aria-label={isSaved ? (t('articles.articleUnsaved') || "Saqlanganlardan olib tashlash") : (t('articles.articleSaved') || "Maqolani saqlash")}
              title={isSaved ? (t('articles.saved') || "Saqlangan") : (t('common.save') || "Saqlash")}
            >
              <BookMarked size={20} className={isSaved ? 'r-accent' : ''} fill={isSaved ? 'currentColor' : 'none'} />
            </button>

            <button onClick={handleShare} className={iconBtn} aria-label={lang === 'uz' ? "Ulashish" : "Share"} title={lang === 'uz' ? "Ulashish" : "Share"}>
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
            aria-label={lang === 'uz' ? "O'qish progressi" : "Reading progress"}
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
                  <Star size={13} className="text-amber-500 fill-amber-500" /> {lang === 'uz' ? "Faqat a'zolar uchun" : "Members only"}
                </div>
              )}
              {article.isFeatured && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-medium border" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)', color: 'var(--r-ink-soft)' }}>
                  <BookMarked size={13} /> {lang === 'uz' ? "Tanlangan" : "Featured"}
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
              {/* Daraja bu yerda ko'rsatilmaydi — pastdagi tanlagichda allaqachon ko'rinib turadi */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 r-muted text-[13.5px]">
                <span>
                  {(() => {
                    const time = activeReadTime || article.readTime || '5 min read';
                    const num = String(time).match(/\d+/)?.[0] || '5';
                    return lang === 'uz' ? `${num} daqiqa` : `${num} min read`;
                  })()}
                </span>
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

          {/* Interaction Bar — saqlash/ulashish yuqoridagi doimiy panelda,
              bu yerda takrorlanmaydi (ortiqcha tugmalar o'qishni chalg'itardi) */}
          <div className="flex items-center justify-between gap-3 py-2.5 border-y" style={{ borderColor: 'var(--r-hairline)' }}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClap}
                aria-pressed={hasClapped}
                aria-label={hasClapped ? (lang === 'uz' ? "Qarsakni qaytarib olish" : "Remove clap") : (lang === 'uz' ? "Qarsak chalish" : "Clap")}
                title={hasClapped ? (lang === 'uz' ? "Qarsakni qaytarib olish" : "Remove clap") : (lang === 'uz' ? "Qarsak chalish" : "Clap")}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-full transition-colors hover:bg-[var(--r-hover)] ${hasClapped ? 'r-ink' : 'r-muted r-hover-ink'}`}
              >
                <motion.span
                  animate={isClapping ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                  className="text-[19px] leading-none"
                >
                  👏
                </motion.span>
                <span className="text-[13px] font-medium tabular-nums">{formatClapsDisplay(claps)}</span>
              </button>
              <button
                onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                aria-label={t('articles.commentsTitle').replace('{count}', comments.length)}
                title={t('articles.commentsTitle').replace(' ({count})', '')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-full r-muted r-hover-ink hover:bg-[var(--r-hover)] transition-colors"
              >
                <MessageSquareIcon size={18} />
                <span className="text-[13px] font-medium tabular-nums">{comments.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleListen}
                aria-label={isSpeaking ? (isPaused ? (lang === 'uz' ? "Davom ettirish" : "Resume") : (lang === 'uz' ? "Pauza" : "Pause")) : (lang === 'uz' ? "Ovozli o'qish" : "Audio reading")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full transition-colors text-[13px] font-medium border ${
                  isSpeaking ? 'r-accent-bg border-transparent' : 'r-muted r-hover-ink hover:bg-[var(--r-hover)]'
                }`}
                style={isSpeaking ? undefined : { borderColor: 'var(--r-hairline)' }}
              >
                {isPreparingSpeech ? (
                  <span className="w-[17px] h-[17px] border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : !isSpeaking ? (
                  <Volume2 size={17} />
                ) : isPaused ? (
                  <Play size={17} />
                ) : (
                  <Pause size={17} />
                )}
                <span>
                  {isPreparingSpeech
                    ? (lang === 'uz' ? 'Tayyorlanmoqda' : 'Preparing...')
                    : isPaused
                      ? (lang === 'uz' ? 'Davom ettirish' : 'Resume')
                      : isSpeaking
                        ? (lang === 'uz' ? "O'qilmoqda" : 'Reading...')
                        : (lang === 'uz' ? 'Tinglash' : 'Listen')}
                </span>
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeech}
                  aria-label={lang === 'uz' ? "To'xtatish" : "Stop"}
                  title={lang === 'uz' ? "To'xtatish" : "Stop"}
                  className={iconBtn}
                >
                  <X size={18} />
                </button>
              )}
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
          <AnimatePresence>
            {selectionMenu && (
              <motion.div
                key="selection-menu"
                role="dialog"
                aria-label="Tanlangan so'z"
                /* x: '-50%' — markazlash framer transformi bilan birga ishlashi uchun */
                initial={isMobile ? { opacity: 0, y: 24, x: '-50%' } : { opacity: 0, y: selectionMenu.placement === 'top' ? 6 : -6, scale: 0.96, x: '-50%' }}
                animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                exit={isMobile ? { opacity: 0, y: 16, x: '-50%' } : { opacity: 0, scale: 0.96, x: '-50%' }}
                transition={{ type: 'spring', stiffness: 480, damping: 34, mass: 0.6 }}
                className={`article-selection-menu selection-pop ${
                  isMobile
                    ? 'fixed left-1/2 right-auto z-[1000] w-[calc(100vw-28px)] max-w-sm rounded-2xl px-3.5 py-3'
                    : 'absolute z-[1000] rounded-2xl px-2 py-1.5'
                } touch-none select-none`}
                style={isMobile ? {
                  bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
                  top: 'auto'
                } : {
                  top: selectionMenu.top,
                  left: selectionMenu.left,
                  '--arrow-shift': `${selectionMenu.arrowShift || 0}px`
                }}
                data-placement={isMobile ? 'sheet' : selectionMenu.placement}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
              >
                {isMobile ? (
                  <div className="flex flex-col gap-2.5">
                    {/* Tanlangan so'z — foydalanuvchi nimani saqlayotganini ko'rib tursin */}
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="selection-word text-[15px] font-semibold leading-snug break-words">
                          {truncateWord(selectionMenu.word, 60)}
                        </p>
                        {selectionMenu.word.includes(' ') && (
                          <p className="selection-meta text-[11px] mt-0.5">
                            {selectionMenu.word.trim().split(/\s+/).length} so'zli ibora
                          </p>
                        )}
                      </div>
                      <button
                        onClick={dismissMenu}
                        aria-label="Yopish"
                        className="selection-ghost -mr-1 -mt-1 p-1.5 rounded-lg shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSpeaking && synth && (
                        <button
                          onClick={speakSelectedWord}
                          aria-label="Talaffuzni eshitish"
                          className={`selection-ghost h-10 w-10 shrink-0 rounded-xl grid place-items-center ${isWordSpeaking ? 'is-active' : ''}`}
                        >
                          <Volume2 size={17} />
                        </button>
                      )}
                      <button
                        onClick={handleAddToWordBank}
                        disabled={isWordBankLoading || isWordBankAdded}
                        aria-live="polite"
                        className={`selection-primary flex-1 h-10 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 ${isWordBankAdded ? 'is-done' : ''}`}
                      >
                        {isWordBankLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>{t('articles.saving') || "Saqlanmoqda…"}</span>
                          </>
                        ) : isWordBankAdded ? (
                          <>
                            <CheckCircle2 size={17} />
                            <span>{lang === 'uz' ? "Lug'atga qo'shildi" : "Added to vocabulary"}</span>
                          </>
                        ) : (
                          <>
                            <BookMarked size={16} />
                            <span>{t('articles.addToVocab') || "Lug'atga qo'shish"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="selection-word max-w-[168px] truncate px-2 text-[13px] font-semibold">
                      {truncateWord(selectionMenu.word)}
                    </span>
                    <span className="selection-divider" />
                    {!isSpeaking && synth && (
                      <button
                        onClick={speakSelectedWord}
                        title={lang === 'uz' ? "Talaffuzni eshitish" : "Listen to pronunciation"}
                        aria-label={lang === 'uz' ? "Talaffuzni eshitish" : "Listen to pronunciation"}
                        className={`selection-ghost h-8 w-8 rounded-lg grid place-items-center ${isWordSpeaking ? 'is-active' : ''}`}
                      >
                        <Volume2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={handleAddToWordBank}
                      disabled={isWordBankLoading || isWordBankAdded}
                      aria-live="polite"
                      title={lang === 'uz' ? "Lug'atga qo'shish (so'z lug'at bo'limingizga saqlanadi)" : "Add to vocabulary (word will be saved to your vocabulary section)"}
                      className={`selection-primary h-8 rounded-lg px-3 text-[12.5px] font-semibold flex items-center gap-1.5 ${isWordBankAdded ? 'is-done' : ''}`}
                    >
                      {isWordBankLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>{t('articles.saving') || "Saqlanmoqda…"}</span>
                        </>
                      ) : isWordBankAdded ? (
                        <>
                          <CheckCircle2 size={15} />
                          <span>{lang === 'uz' ? "Qo'shildi" : "Added"}</span>
                        </>
                      ) : (
                        <>
                          <BookMarked size={14} />
                          <span>{lang === 'uz' ? "Lug'atga" : "Add"}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={dismissMenu}
                      aria-label={t('common.close') || "Yopish"}
                      className="selection-ghost h-8 w-8 rounded-lg grid place-items-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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

                  // Muharrirdagi o'lcham (odatda 16px) o'qish uchun juda kichik.
                  // Shuning uchun uni mutlaq px sifatida emas, standart 16px'ga
                  // nisbatan koeffitsient sifatida olamiz va o'quvchi tanlagan
                  // asosiy o'lchamga ko'paytiramiz.
                  const rawFontSize = typeof block.style?.fontSize === 'number'
                    ? block.style.fontSize
                    : parseFloat(block.style?.fontSize) || (block.type === 'heading' ? 26 : EDITOR_BASE_FONT_SIZE);
                  const sizeRatio = rawFontSize / EDITOR_BASE_FONT_SIZE;
                  const blockFontSize = `${(fontStep.base * sizeRatio).toFixed(1)}px`;

                  const blockFontWeight = block.style?.fontWeight || (block.type === 'heading' ? '700' : '400');

                  // Muharrirning standart 1.6 qiymati o'qish uchun zich —
                  // faqat qo'lda o'zgartirilgan bo'lsa hurmat qilamiz.
                  const rawLineHeight = block.style?.lineHeight;
                  const blockLineHeight = block.type === 'heading'
                    ? (rawLineHeight && rawLineHeight !== EDITOR_DEFAULT_LINE_HEIGHT ? rawLineHeight : 1.24)
                    : (rawLineHeight && rawLineHeight !== EDITOR_DEFAULT_LINE_HEIGHT ? rawLineHeight : 1.72);

                  // Oraliqlar `em`da — matn kattalashganda bo'shliq ham o'sadi
                  const toSpacing = (value, fallback) => {
                    if (value === undefined || value === null || value === '') return fallback;
                    if (typeof value === 'number') return `${(value / EDITOR_BASE_FONT_SIZE).toFixed(3)}em`;
                    return value;
                  };
                  const blockMarginTop = block.type === 'heading'
                    ? toSpacing(block.style?.marginTop, '1.9em')
                    : toSpacing(block.style?.marginTop, '0');
                  const blockMarginBottom = block.type === 'heading'
                    ? toSpacing(block.style?.marginBottom, '0.6em')
                    : toSpacing(block.style?.marginBottom, '1.35em');

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
                        color: 'var(--r-ink)',
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
                                fontSize: `${fontStep.base}px`,
                                lineHeight: 1.72,
                                marginBottom: '1.35em',
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
                          {lang === 'uz' ? "Ushbu maqolani o'qish uchun a'zo bo'ling" : "Join to read this article"}
                        </h2>
                        <p className="r-muted text-[16px] max-w-md mx-auto leading-relaxed">
                          {t('articles.memberOnlyNotice').replace('{author}', article.author || 'The author')}
                        </p>
                      </div>

                      <div className="space-y-3 text-left max-w-md mx-auto">
                        {(lang === 'uz' ? [
                          "Barcha a'zolar uchun maqolalarga to'liq kirish",
                          "Har bir daraja (A2–C1) uchun moslashtirilgan matn",
                          "Lug'at, ovozli o'qish va WordBank imkoniyatlari",
                          "Reklamasiz, xotirjam o'qish muhiti"
                        ] : [
                          "Full access to all articles for members",
                          "Tailored text for each level (A2-C1)",
                          "Vocabulary, audio reading, and WordBank features",
                          "Ad-free, calm reading environment"
                        ]).map((benefit, idx) => (
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
                          {lang === 'uz' ? "Obunani ochish" : "Unlock Subscription"}
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

        {/*
          * MEHMON UCHUN KONVERSIYA BLOKI.
          *
          * Maqola oxiri — qidiruvdan kelgan odam qiymatni ALLAQACHON olgan
          * nuqta. Ro'yxatdan o'tishni shu yerda taklif qilamiz: maqolani
          * o'qishdan OLDIN so'ralgan taklif shunchaki chiqib ketishga sabab
          * bo'ladi. Taklif matni maqolani o'qiyotganda ishlamagan aynan shu
          * funksiyalarni sanaydi (WordBank, daraja, ovoz).
          */}
        {isVisitor && !isLocked && (
          <section
            className="mt-14 rounded-2xl border px-6 py-10 text-center"
            style={{ borderColor: 'var(--r-hairline)', backgroundColor: 'var(--r-hover)' }}
          >
            <h2 className="text-[22px] md:text-[26px] font-bold leading-tight font-sans" style={{ color: 'var(--r-ink)' }}>
              {lang === 'uz'
                ? "Notanish so'zni bosib, lug'atingizga qo'shing"
                : 'Tap any word to save it to your vocabulary'}
            </h2>
            <p className="r-muted text-[15px] leading-relaxed max-w-md mx-auto mt-3">
              {lang === 'uz'
                ? "Bepul hisob bilan: WordBank'ga so'z saqlash, o'z darajangizni tanlash (B1–C1), ovozli o'qish va o'qigan maqolalaringiz tarixi."
                : 'A free account adds: saving words to WordBank, choosing your level (B1–C1), audio reading, and your reading history.'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-7">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 r-accent-bg rounded-full font-bold text-[15px] transition-transform active:scale-95"
              >
                {lang === 'uz' ? "Bepul ro'yxatdan o'tish" : 'Sign up free'}
              </button>
              <button
                onClick={() => navigate('/articles')}
                className="px-8 py-3 rounded-full font-bold text-[15px] border transition-colors hover:bg-[var(--r-paper)]"
                style={{ borderColor: 'var(--r-hairline)', color: 'var(--r-ink)' }}
              >
                {lang === 'uz' ? 'Boshqa maqolalar' : 'More articles'}
              </button>
            </div>
          </section>
        )}

        {/* Inline Comments Section (Medium Style) */}
        <section ref={commentsRef} className="mt-14 border-t pt-10 pb-8 scroll-mt-24" style={{ borderColor: 'var(--r-hairline)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <h3 className="text-[19px] font-bold font-sans" style={{ color: 'var(--r-ink)' }}>
              {t('articles.commentsTitle').replace('{count}', comments.length)}
            </h3>
            <span
              title={lang === 'uz' ? "Izohlar hurmatli va mavzuga oid bo'lishi kerak" : "Comments must be respectful and relevant"}
              className="flex items-center gap-1.5 text-[12px] r-muted"
            >
              <ShieldCheck size={16} /> <span className="hidden sm:inline">{lang === 'uz' ? "Muloqot qoidalari" : "Rules of conduct"}</span>
            </span>
          </div>

          {/* Comment Form (Medium style input container) */}
          {!isVisitor ? (
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
                placeholder={t('articles.commentsPlaceholder') || "Fikr qoldiring..."}
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
                      {t('common.cancel') || "Bekor qilish"}
                    </button>
                    <button
                      disabled={!newComment.trim()}
                      onClick={async () => {
                        await handlePostComment();
                        setIsInputFocused(false);
                      }}
                      className="px-4 py-1.5 r-accent-bg rounded-full text-[13px] font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
                    >
                      {lang === 'uz' ? "Yuborish" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border p-6 text-center mb-9" style={{ backgroundColor: 'var(--r-surface)', borderColor: 'var(--r-hairline)' }}>
              <p className="text-sm r-muted mb-3">{t('articles.loginToComment') || "Izoh yozish uchun tizimga kiring."}</p>
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-2 r-accent-bg rounded-full text-[13px] font-semibold transition-transform active:scale-95"
              >
                {t('auth.signInNow', 'Kirish')}
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
                          <span className="text-[12px] r-muted">{formatRelativeTime(comment.createdAt, t)}</span>
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
                <p className="r-muted text-sm">{t('articles.noComments') || "Hozircha izoh yo'q. Birinchi bo'lib fikr bildiring."}</p>
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
        /* Muharrirdan saqlangan HTML'da ba'zan qattiq kodlangan rang (masalan
           qora matn) inline style sifatida keladi — night mode'da fon bilan
           bir xil bo'lib, matn ko'rinmay qolishiga sabab bo'ladi. Shu tufayli
           kontent ichidagi barcha rangni majburan mavzu ranggiga bog'laymiz. */
        .article-body-block, .article-body-block * {
          color: var(--r-ink) !important;
        }

        /* --- Tanlangan so'z menyusi --- */
        .selection-pop {
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background: var(--r-paper);
          border: 1px solid var(--r-hairline);
          color: var(--r-ink);
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.06),
            0 12px 28px -8px rgba(0, 0, 0, 0.22);
        }
        .dark .selection-pop {
          background: var(--r-surface);
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.4),
            0 16px 32px -10px rgba(0, 0, 0, 0.65);
        }
        /* Tanlangan matnga qaragan uchburchak */
        .selection-pop[data-placement="top"]::after,
        .selection-pop[data-placement="bottom"]::after {
          content: '';
          position: absolute;
          left: calc(50% + var(--arrow-shift, 0px));
          width: 10px;
          height: 10px;
          margin-left: -5px;
          background: inherit;
          border: 1px solid var(--r-hairline);
          transform: rotate(45deg);
        }
        .selection-pop[data-placement="top"]::after {
          bottom: -6px;
          border-top: none;
          border-left: none;
        }
        .selection-pop[data-placement="bottom"]::after {
          top: -6px;
          border-bottom: none;
          border-right: none;
        }

        .selection-word { color: var(--r-ink); }
        .selection-meta { color: var(--r-muted); }
        .selection-divider {
          width: 1px;
          height: 18px;
          background: var(--r-hairline);
          margin: 0 2px;
        }

        .selection-ghost {
          color: var(--r-muted);
          transition: background-color .15s ease, color .15s ease, transform .12s ease;
        }
        .selection-ghost:hover { background: var(--r-hover); color: var(--r-ink); }
        .selection-ghost:active { transform: scale(0.94); }
        .selection-ghost.is-active { color: var(--r-accent); background: var(--r-accent-soft); }

        .selection-primary {
          background: var(--r-accent);
          color: var(--r-accent-contrast);
          white-space: nowrap;
          transition: filter .15s ease, transform .12s ease, background-color .2s ease;
        }
        .selection-primary:hover:not(:disabled) { filter: brightness(1.07); }
        .selection-primary:active:not(:disabled) { transform: scale(0.97); }
        .selection-primary:disabled { cursor: default; }
        .selection-primary.is-done {
          background: var(--r-accent-soft);
          color: var(--r-accent);
        }

        .selection-pop button:focus-visible {
          outline: 2px solid var(--r-focus);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .selection-ghost, .selection-primary { transition: none; }
        }

        /* Ovozli o'qishda joriy blok — chalg'itmaydigan yumshoq belgi.
           Matn siljib ketmasligi uchun padding doim turadi, faqat rang o'zgaradi. */
        .article-container .article-body-block,
        .article-container h2 {
          padding-left: 14px;
          margin-left: -14px;
          border-radius: 4px;
          scroll-margin-top: 96px;
        }
        .article-container .is-speaking {
          background-color: var(--r-accent-soft);
          box-shadow: inset 3px 0 0 var(--r-accent);
        }

        /* Sarlavhalarda "yolg'iz so'z" qolmasin */
        .article-container h2 { text-wrap: pretty; }

        .article-body-block {
          word-break: normal;
          overflow-wrap: break-word;
          hyphens: none;
          -webkit-hyphens: none;
          text-wrap: pretty;
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
