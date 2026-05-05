import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  BookOpen, 
  Repeat, 
  Layers, 
  Gamepad2, 
  ChevronLeft, 
  MoreVertical,
  BookMarked,
  Zap,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  BrainCircuit,
  Target,
  Trash2, 
  ArrowLeft, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Volume2, 
  ArrowRightLeft,
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WordBankFlashcards from '../components/WordBank/WordBankFlashcards';
import WordBankMatchGame from '../components/WordBank/WordBankMatchGame';
import { getUserWordBank, deleteWordFromBank } from '../utils/wordbankUtils';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import SiteFooter from '../components/common/SiteFooter';

export default function Wordbank() {
    const { user, userData } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [expandedWord, setExpandedWord] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [practiceMode, setPracticeMode] = useState('dashboard'); // 'dashboard', 'flashcards', 'match'
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'mastered', 'review'
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [mainTab, setMainTab] = useState('vocabulary'); // 'vocabulary' | 'keywords'
    const [keywords, setKeywords] = useState([]);
    const [keywordSearch, setKeywordSearch] = useState('');
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [batchTotal, setBatchTotal] = useState(0);
    const [batchCurrent, setBatchCurrent] = useState(0);

    const isDark = theme === 'dark';

    useEffect(() => {
        const fetchWords = async () => {
            if (!user) return;
            try {
                const q = query(
                    collection(db, "users", user.uid, "vocabulary"),
                    orderBy("addedAt", "desc")
                );
                const snapshot = await getDocs(q);
                const fetchedWords = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setWords(fetchedWords);

                const kw = await getUserWordBank(user.uid);
                setKeywords(kw);
            } catch (error) {
                console.error("Error fetching vocabulary:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWords();
    }, [user]);

    const handleDeleteKeyword = async (kwId) => {
        if (!user) return;
        if (!window.confirm("Bu keyword o'chirilsinmi?")) return;
        try {
            await deleteWordFromBank(user.uid, kwId);
            setKeywords(keywords.filter(k => k.id !== kwId));
        } catch (error) {
            console.error("Error deleting keyword:", error);
        }
    };

    const handleDelete = async (wordId) => {
        try {
            await deleteDoc(doc(db, "users", user.uid, "vocabulary", wordId));
            setWords(words.filter(w => w.id !== wordId));
        } catch (error) {
            console.error("Error deleting word:", error);
        }
    };

    const playPronunciation = (wordId, text) => {
        if (!('speechSynthesis' in window)) {
            alert("Afsuski, brauzeringizda ovozli o'qish imkoniyati yo'q.");
            return;
        }

        window.speechSynthesis.cancel();
        setPlayingAudioId(wordId);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;

        utterance.onend = () => {
            setPlayingAudioId(null);
        };

        utterance.onerror = () => {
            setPlayingAudioId(null);
            console.error("Speech synthesis failed");
        };

        window.speechSynthesis.speak(utterance);
    };

    const filteredWords = words.filter(w => {
        const matchesSearch = (w.word && w.word.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (w.testTitle && w.testTitle.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (filterTab === 'mastered') return w.learningStatus === 'mastered';
        if (filterTab === 'review') return w.learningStatus !== 'mastered';

        if (filterTab === 'due') {
            if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
            let reviewDate;
            if (w.nextReviewDate.toDate) {
                reviewDate = w.nextReviewDate.toDate();
            } else {
                reviewDate = new Date(w.nextReviewDate);
            }
            return reviewDate <= new Date() && w.learningStatus !== 'mastered';
        }

        return true;
    });

    const groupedWords = filteredWords.reduce((acc, word) => {
        const key = word.sectionTitle && word.sectionTitle !== "Noma'lum Qism"
            ? word.sectionTitle
            : (word.testTitle || "Umumiy so'zlar");

        if (!acc[key]) acc[key] = [];
        acc[key].push(word);
        return acc;
    }, {});

    const generateAIContext = async (wordItem) => {
        setGeneratingId(wordItem.id);
        try {
            const functions = getFunctions();
            const translateWordFn = httpsCallable(functions, "translateWord");
            const result = await translateWordFn({ 
                word: wordItem.word, 
                contextSentence: wordItem.contextSentence 
            });

            const { definition, example, translation } = result.data;

            const wordRef = doc(db, "users", user.uid, "vocabulary", wordItem.id);
            await updateDoc(wordRef, {
                definition,
                example,
                translation,
                hasAI: true
            });

            setWords(words.map(w => w.id === wordItem.id ? {
                ...w, definition, example, translation, hasAI: true
            } : w));

        } catch (error) {
            console.error("AI Generation error:", error);
            alert("AI so'zni tarjima qilishda xatolik yuz berdi. " + error.message);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleTranslateAll = async () => {
        const untranslated = words.filter(w => !w.hasAI);
        if (untranslated.length === 0) return;

        setBatchProcessing(true);
        setBatchTotal(untranslated.length);
        setBatchCurrent(0);

        const functions = getFunctions();
        const translateWordFn = httpsCallable(functions, "translateWord");

        let currentWords = [...words];

        for (let i = 0; i < untranslated.length; i++) {
            const wordItem = untranslated[i];
            setBatchCurrent(i + 1);
            
            try {
                const result = await translateWordFn({ 
                    word: wordItem.word, 
                    contextSentence: wordItem.contextSentence 
                });

                const { definition, example, translation } = result.data;

                const wordRef = doc(db, "users", user.uid, "vocabulary", wordItem.id);
                await updateDoc(wordRef, {
                    definition,
                    example,
                    translation,
                    hasAI: true
                });

                currentWords = currentWords.map(w => w.id === wordItem.id ? {
                    ...w, definition, example, translation, hasAI: true
                } : w);
                setWords(currentWords);

            } catch (error) {
                console.error("Batch translation error for: " + wordItem.word, error);
            }
        }
        setBatchProcessing(false);
    };

    const handleUpdateWordStatus = async (wordId, updateData) => {
        try {
            const wordRef = doc(db, "users", user.uid, "vocabulary", wordId);
            await updateDoc(wordRef, updateData);
            setWords(words.map(w => w.id === wordId ? { ...w, ...updateData } : w));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const dueForReviewCount = words.filter(w => {
        if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
        let reviewDate = w.nextReviewDate.toDate ? w.nextReviewDate.toDate() : new Date(w.nextReviewDate);
        return reviewDate <= new Date() && w.learningStatus !== 'mastered';
    }).length;

    const todayStr = new Date().toDateString();
    const todayAddedCount = words.filter(w => {
        if (!w.addedAt) return false;
        const addedDate = w.addedAt.toDate ? w.addedAt.toDate() : new Date(w.addedAt);
        return addedDate.toDateString() === todayStr;
    }).length;

    const renderFlashcards = () => {
        const practiceWords = filterTab === 'due' ? words.filter(w => {
            if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
            let reviewDate = w.nextReviewDate.toDate ? w.nextReviewDate.toDate() : new Date(w.nextReviewDate);
            return reviewDate <= new Date() && w.learningStatus !== 'mastered';
        }) : filteredWords;

        return (
            <WordBankFlashcards
                words={practiceWords}
                onBack={() => {
                    setPracticeMode('dashboard');
                    if (filterTab === 'due') setFilterTab('all');
                }}
                onUpdateStatus={handleUpdateWordStatus}
            />
        );
    };

    const renderMatchGame = () => (
        <WordBankMatchGame
            words={[...words, ...keywords]}
            onBack={() => setPracticeMode('dashboard')}
        />
    );

    const renderDashboard = () => {
        const backgroundStyle = {
            backgroundColor: isDark ? '#000000' : '#ffffff',
            minHeight: '100vh',
            color: isDark ? '#f5f5f7' : '#1d1d1f'
        };
        
        const learningModules = [
            { 
              title: "Review", 
              desc: "Spaced repetition practice", 
              icon: <BrainCircuit className="w-5 h-5" />, 
              stats: `${dueForReviewCount} due`,
              isPrimary: true,
              onClick: () => {
                  setFilterTab('due');
                  setPracticeMode('flashcards');
              }
            },
            { 
              title: "Flashcards", 
              desc: "Study all words", 
              icon: <Layers className="w-5 h-5" />, 
              stats: `${words.length} words`,
              onClick: () => {
                  setFilterTab('all');
                  setPracticeMode('flashcards');
              }
            },
            { 
              title: "Match Game", 
              desc: "Test your speed", 
              icon: <Gamepad2 className="w-5 h-5" />, 
              stats: "Play now",
              onClick: () => {
                  setPracticeMode('match');
              }
            }
        ];

        return (
            <div style={backgroundStyle} className="font-sans transition-colors duration-500 pb-20">
              <DashboardHeader
                user={user} userData={userData}
                activeTab="vocabulary"
                onLogoutClick={() => navigate('/login')}
                loading={loading}
              />

              <main className="max-w-[1200px] mx-auto px-6 pt-12 w-full">
                {/* Compact Hero Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#FB5102]/10 rounded-full border border-[#FB5102]/20">
                      <Sparkles className="w-3 h-3 text-[#FB5102]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FB5102]">Personal Lexicon</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Word Bank</h1>
                    <p className={`text-base max-w-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Your personal collection of vocabulary and keywords collected from IELTS materials.
                    </p>
                  </div>

                  <div className="flex items-center gap-6 pb-1">
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{words.length}</p>
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total Words</p>
                    </div>
                    <div className={`h-8 w-[1px] ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-[#FB5102]">+{todayAddedCount}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#FB5102]/70 font-bold">Today</p>
                    </div>
                  </div>
                </div>

                {/* Compact Learning Modules */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
                  {learningModules.map((module, idx) => (
                    <button 
                      key={idx}
                      onClick={module.onClick}
                      className={`group p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden
                        ${module.isPrimary 
                          ? 'bg-[#1d1d1f] text-white border-transparent hover:bg-black' 
                          : isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-[#f5f5f7] border-transparent hover:bg-gray-200'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
                          ${module.isPrimary ? 'bg-white/10' : isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                          {module.icon}
                        </div>
                        <ArrowUpRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${module.isPrimary ? 'text-white/40' : 'text-gray-400'}`} />
                      </div>
                      <h3 className="font-semibold text-lg">{module.title}</h3>
                      <p className={`text-xs ${module.isPrimary ? 'text-white/60' : 'text-gray-500'}`}>{module.desc}</p>
                      <div className={`mt-4 inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${module.isPrimary ? 'bg-white/10 text-white' : isDark ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-600 shadow-sm'}`}>
                        {module.stats}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Refined Content Section */}
                <div className={`border rounded-3xl p-6 md:p-8 transition-colors ${isDark ? 'bg-[#1c1c1e] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  {/* Tabs & Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-white/5 p-1 rounded-xl w-fit">
                      {[
                        { id: 'vocabulary', label: 'All Words' },
                        { id: 'keywords', label: 'Keywords' }
                      ].map(tab => (
                        <button 
                          key={tab.id}
                          onClick={() => { setMainTab(tab.id); setExpandedGroup(null); setExpandedWord(null); }}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === tab.id ? 'bg-white dark:bg-white/10 shadow-sm text-[#1d1d1f] dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-full sm:w-[320px] group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-gray-600 group-focus-within:text-[#FB5102]' : 'text-gray-400 group-focus-within:text-[#FB5102]'}`} />
                        <input 
                          type="text" 
                          placeholder="Search words..." 
                          className={`w-full border outline-none rounded-xl py-2.5 pl-11 pr-4 text-sm transition-all ${isDark ? 'bg-black/20 border-white/10 focus:border-[#FB5102]/40 text-white' : 'bg-[#f5f5f7] border-transparent focus:bg-white focus:border-[#FB5102]/30 text-gray-900'}`}
                          value={mainTab === 'vocabulary' ? searchTerm : keywordSearch}
                          onChange={(e) => mainTab === 'vocabulary' ? setSearchTerm(e.target.value) : setKeywordSearch(e.target.value)}
                        />
                      </div>
                      
                      <button 
                        onClick={handleTranslateAll} 
                        disabled={batchProcessing || words.every(w => w.hasAI)} 
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full sm:w-auto justify-center
                          ${(batchProcessing || words.every(w => w.hasAI)) 
                            ? 'opacity-40 cursor-not-allowed' 
                            : 'bg-[#FB5102] text-white hover:bg-[#e64a02] active:scale-95'}`}
                      >
                         {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                         <span>{batchProcessing ? "Translating..." : "Auto-translate All"}</span>
                      </button>
                    </div>
                  </div>

                  {/* List Rendering */}
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-[#FB5102] animate-spin mb-3" />
                      <p className="text-sm text-gray-500">Loading your collection...</p>
                    </div>
                  ) : mainTab === 'keywords' ? (
                    keywords.length === 0 ? (
                      <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-1">No keywords yet</h3>
                        <p className="text-sm text-gray-500">Keywords you highlight in reading tests will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(
                            keywords.filter(k => {
                                if (!keywordSearch) return true;
                                const s = keywordSearch.toLowerCase();
                                return (k.passageWord && k.passageWord.toLowerCase().includes(s)) || (k.questionWord && k.questionWord.toLowerCase().includes(s));
                            }).reduce((acc, kw) => {
                                const key = kw.testName || "Unknown Test";
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(kw);
                                return acc;
                            }, {})
                        ).map(([testName, kwList]) => {
                            const isExpanded = expandedGroup === `kw-${testName}`;
                            return (
                                <div key={testName} className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <button 
                                        onClick={() => setExpandedGroup(isExpanded ? null : `kw-${testName}`)}
                                        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isExpanded ? (isDark ? 'bg-white/5' : 'bg-white border-b border-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-[#FB5102]' : 'bg-white text-[#FB5102] shadow-sm'}`}>
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">{testName}</h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{kwList.length} keywords</p>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-2">
                                                    <div className={`overflow-x-auto rounded-xl ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                                                    <th className="text-left py-3 px-5">Passage Word</th>
                                                                    <th className="text-center py-3 px-5">Type</th>
                                                                    <th className="text-left py-3 px-5">Question Word</th>
                                                                    <th className="text-right py-3 px-5"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                                                {kwList.map(kw => (
                                                                    <tr key={kw.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                                        <td className="py-3 px-5 font-semibold">{kw.passageWord}</td>
                                                                        <td className="py-3 px-5 text-center">
                                                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${kw.type === 'synonym' ? 'bg-emerald-500/10 text-emerald-500' : kw.type === 'antonym' ? 'bg-[#FB5102]/10 text-[#FB5102]' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                                {kw.type === 'synonym' ? 'SYN' : kw.type === 'antonym' ? 'ANT' : 'PHR'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-5 text-gray-500">{kw.questionWord}</td>
                                                                        <td className="py-3 px-5 text-right">
                                                                            <button onClick={() => handleDeleteKeyword(kw.id)} className="p-1.5 rounded-md text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all sm:opacity-0 sm:group-hover:opacity-100">
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                      </div>
                    )
                  ) : (
                    filteredWords.length === 0 ? (
                      <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                        <BookMarked className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-1">Word Bank is empty</h3>
                        <p className="text-sm text-gray-500">Words you add from tests or reading will be listed here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedWords).map(([testTitle, testWords]) => {
                            const isTestExpanded = expandedGroup === `test-${testTitle}`;
                            return (
                                <div key={testTitle} className={`rounded-2xl border transition-all overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <button 
                                        onClick={() => setExpandedGroup(isTestExpanded ? null : `test-${testTitle}`)}
                                        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isTestExpanded ? (isDark ? 'bg-white/5' : 'bg-white border-b border-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-blue-500' : 'bg-white text-blue-500 shadow-sm'}`}>
                                                <BookMarked className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">{testTitle}</h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{testWords.length} new words</p>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTestExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isTestExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {testWords.map((item, index) => {
                                                        const isItemExpanded = expandedWord === item.id;
                                                        return (
                                                            <motion.div
                                                                key={item.id}
                                                                initial={{ opacity: 0, scale: 0.98 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: index * 0.02 }}
                                                                className={`p-4 rounded-xl border transition-all group relative ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 hover:shadow-sm'}`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                            <h3 className="font-bold text-base truncate">{item.word}</h3>
                                                                            {item.learningStatus === 'mastered' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 truncate">{item.translation || "No translation yet"}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button onClick={() => playPronunciation(item.id, item.word)} className={`p-2 rounded-lg transition-all ${playingAudioId === item.id ? 'bg-[#FB5102]/10 text-[#FB5102]' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                                                            <Volume2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if(window.confirm("O'chirilsinmi?")) handleDelete(item.id);
                                                                            }} 
                                                                            className="p-2 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => {
                                                                                const nextExpanded = isItemExpanded ? null : item.id;
                                                                                setExpandedWord(nextExpanded);
                                                                                if (nextExpanded && !item.hasAI) generateAIContext(item);
                                                                            }} 
                                                                            className={`p-2 rounded-lg transition-colors ${isItemExpanded ? 'bg-[#FB5102] text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                                                        >
                                                                            {isItemExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <AnimatePresence>
                                                                    {isItemExpanded && (
                                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                                                                            {!item.hasAI ? (
                                                                                <div className="space-y-3">
                                                                                    <button onClick={() => generateAIContext(item)} disabled={generatingId === item.id} className="w-full flex items-center justify-center gap-2 py-2 bg-[#FB5102]/10 text-[#FB5102] hover:bg-[#FB5102] hover:text-white transition-all rounded-lg text-xs font-bold">
                                                                                        {generatingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                                        <span>{generatingId === item.id ? "Analyzing..." : "Get AI Insights"}</span>
                                                                                    </button>
                                                                                    <button onClick={() => { if(window.confirm("O'chirilsinmi?")) handleDelete(item.id); }} className="w-full flex items-center justify-center gap-2 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider">
                                                                                        <Trash2 className="w-3 h-3" /> Remove
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-3">
                                                                                    <div>
                                                                                        <span className="text-[9px] uppercase font-bold text-[#FB5102] tracking-wider">Definition</span>
                                                                                        <p className="text-xs mt-1 leading-relaxed text-gray-600 dark:text-gray-300">{item.definition}</p>
                                                                                    </div>
                                                                                    {item.example && (
                                                                                      <div className="p-3 rounded-lg bg-[#f5f5f7] dark:bg-black/20 italic text-xs text-gray-500 border-l-2 border-[#FB5102]/30">
                                                                                          "{item.example}"
                                                                                      </div>
                                                                                    )}
                                                                                    <div className="flex items-center gap-2 pt-1">
                                                                                        <button onClick={() => { if(window.confirm("O'chirilsinmi?")) handleDelete(item.id); }} className="flex-1 flex items-center justify-center gap-2 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider">
                                                                                            <Trash2 className="w-3 h-3" /> Remove
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                      </div>
                    )
                  )}
                </div>
              </main>
              <SiteFooter />
            </div>
        );
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-black' : 'bg-white'}`}>
            {practiceMode === 'flashcards' && renderFlashcards()}
            {practiceMode === 'match' && renderMatchGame()}
            {practiceMode === 'dashboard' && renderDashboard()}
        </div>
    );
}

