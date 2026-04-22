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

export default function Wordbank() {
    const { user, userData } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
            backgroundColor: isDark ? '#0F1016' : '#F8FAFC',
            backgroundImage: isDark ? `
              radial-gradient(circle at 15% 15%, rgba(251, 81, 2, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(251, 81, 2, 0.03) 0%, transparent 60%)
            ` : `
              radial-gradient(circle at 15% 15%, rgba(251, 81, 2, 0.05) 0%, transparent 40%),
              radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.05) 0%, transparent 40%)
            `,
            minHeight: '100vh',
            overflowX: 'hidden',
            position: 'relative',
            color: isDark ? '#CDCDCB' : '#334155'
        };
        
        const learningModules = [
            { 
              title: "Spaced Repetition", 
              desc: "Intervalli takrorlash algoritmi", 
              icon: <BrainCircuit className="w-6 h-6" />, 
              action: "Takrorlashni boshlash",
              color: "from-[#FB5102] to-[#ff7a41]",
              stats: `${dueForReviewCount} ta so'z tayyor`,
              isPrimary: true,
              onClick: () => {
                  setFilterTab('due');
                  setPracticeMode('flashcards');
              }
            },
            { 
              title: "Flashcards", 
              desc: "Vizual yodlash kartochkalari", 
              icon: <Layers className="w-6 h-6" />, 
              action: "O'rganish",
              color: isDark ? "from-purple-500/20 to-purple-500/5" : "from-purple-500/10 to-purple-500/5",
              iconColor: "text-purple-400",
              stats: `${words.length} ta umumiy so'z`,
              onClick: () => {
                  setFilterTab('all');
                  setPracticeMode('flashcards');
              }
            },
            { 
              title: "Match Game", 
              desc: "Tezkor moslashtirish o'yini", 
              icon: <Gamepad2 className="w-6 h-6" />, 
              action: "O'ynash",
              color: isDark ? "from-emerald-500/20 to-emerald-500/5" : "from-emerald-500/10 to-emerald-500/5",
              iconColor: "text-emerald-400",
              stats: `${words.length + keywords.length} ta aralash so'z`,
              onClick: () => {
                  setPracticeMode('match');
              }
            }
        ];

        return (
            <div style={backgroundStyle} className="font-aspekta transition-colors duration-500">
              {/* Standardized Header */}
              <DashboardHeader
                user={user} userData={userData}
                activeTab="vocabulary"
                onLogoutClick={() => navigate('/login')} // simple logout for wordbank
                loading={loading}
              />

              {/* Background Lighting */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className={`absolute top-[-5%] right-[15%] w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse ${isDark ? 'bg-[#FB5102]/10' : 'bg-[#FB5102]/5'}`}></div>
                <div className={`absolute bottom-0 left-[10%] w-[400px] h-[400px] rounded-full blur-[120px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-500/2'}`}></div>
              </div>
        
              <main className="max-w-[1440px] mx-auto px-6 pt-10 pb-20 relative z-10 w-full">
        
                {/* Hero & Learning Modules */}
                <div className="grid lg:grid-cols-12 gap-12 mb-20 px-4 md:px-0">
                  
                  {/* Left: Main Title & Quick Action */}
                  <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FB5102]/10 rounded-full border border-[#FB5102]/20">
                        <Target className="w-3 h-3 text-[#FB5102]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FB5102]">AI-Powered Learning</span>
                      </div>
                      <h2 className={`text-5xl md:text-7xl font-bold leading-[1.1] font-nasalization uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Mening <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FB5102] to-[#ff8a50]">Lug'atim</span>
                      </h2>
                      <p className={`text-lg font-light leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        IELTS lug'at boyligini tizimli oshirish uchun yaratilgan shaxsiy xotira algoritmlari majmuasi.
                      </p>
                    </div>
        
                    <button onClick={handleTranslateAll} disabled={batchProcessing || words.every(w => w.hasAI)} className={`group relative flex w-full md:w-auto items-center justify-center gap-4 border px-8 py-5 rounded-2xl transition-all overflow-hidden ${(batchProcessing || words.every(w => w.hasAI)) ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-white/5 border-white/10 hover:border-[#FB5102]/50' : 'bg-white border-gray-200 hover:border-[#FB5102]/50 shadow-md hover:shadow-lg'}`}>
                       <div className="absolute inset-0 bg-[#FB5102]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       {batchProcessing ? <Loader2 className="w-6 h-6 text-[#FB5102] animate-spin" /> : <Sparkles className="w-6 h-6 text-[#FB5102]" />}
                       <span className={`text-base font-bold relative z-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                           {batchProcessing ? `Tarjima qilinmoqda... ${batchCurrent}/${batchTotal}` : "Barchasiga AI Izoh olish"}
                       </span>
                    </button>
        
                    {/* Quick Overview Stats */}
                    <div className="flex gap-10 pt-4">
                      <div>
                        <p className={`text-3xl font-bold font-nasalization ${isDark ? 'text-white' : 'text-slate-900'}`}>{words.length}</p>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">Jami loyihalar</p>
                      </div>
                      <div className={`h-10 w-[1px] self-center ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                      <div>
                        <p className="text-3xl font-bold font-nasalization text-[#FB5102]">+{todayAddedCount}</p>
                        <p className="text-[10px] uppercase tracking-widest text-[#FB5102]/70 font-bold mt-1">Bugun qo'shildi</p>
                      </div>
                    </div>
                  </div>
        
                  {/* Right: Learning Modules Cards */}
                  <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                     {learningModules.map((module, idx) => (
                       <div 
                        onClick={module.onClick}
                        key={idx}
                        className={`group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer relative overflow-hidden backdrop-blur-xl
                          ${module.isPrimary 
                            ? 'bg-gradient-to-br from-[#FB5102] to-[#ff7a41] border-white/20 shadow-2xl shadow-[#FB5102]/20 sm:col-span-2 flex items-center justify-between' 
                            : isDark ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1' : 'bg-white border-gray-100 hover:border-[#FB5102]/30 hover:shadow-xl hover:-translate-y-1 shadow-sm'}`}
                       >
                         <div className={module.isPrimary ? 'flex items-center gap-6' : ''}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110
                              ${module.isPrimary ? 'bg-white/20' : (isDark ? 'bg-white/5 border border-white/10 ' : 'bg-slate-50 border border-slate-100 ') + module.iconColor}`}>
                              {module.icon}
                            </div>
                            <div>
                              <h4 className={`text-xl font-bold font-nasalization mb-1 tracking-tight ${module.isPrimary ? 'text-white' : (isDark ? 'text-white' : 'text-slate-900')}`}>{module.title}</h4>
                              <p className={`text-xs mb-4 ${module.isPrimary ? 'text-white/70' : (isDark ? 'text-gray-500' : 'text-slate-500')}`}>{module.desc}</p>
                              {module.isPrimary && (
                                <div className="bg-white/20 px-4 py-1.5 rounded-full inline-block text-[10px] font-bold text-white uppercase tracking-wider">
                                  {module.stats}
                                </div>
                              )}
                            </div>
                         </div>
                         
                         {!module.isPrimary && (
                           <div className={`flex items-center justify-between mt-6 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{module.stats}</span>
                              <div className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/5' : 'bg-slate-50 group-hover:bg-[#FB5102] group-hover:text-white'}`}>
                                <ArrowUpRight className={`w-4 h-4 ${isDark ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                              </div>
                           </div>
                         )}
        
                         {module.isPrimary && (
                           <div className="hidden sm:flex flex-col items-end gap-2">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shadow-white/10 group-hover:rotate-45 transition-transform">
                                 <ArrowUpRight className="w-6 h-6 text-[#FB5102]" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-white tracking-tighter">Boshlash</span>
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
        
                </div>
        
                {/* Content Section: Detailed List */}
                <div className="mx-4 md:mx-0">
                  <div className={`backdrop-blur-3xl border rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-8 lg:p-12 shadow-2xl relative overflow-hidden transition-colors ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'}`}>
                     {/* Search and Tabs */}
                     <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-12">
                        <div className={`flex p-1.5 rounded-2xl border w-full xl:w-auto ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                          <button 
                            onClick={() => { setMainTab('vocabulary'); setExpandedWord(null); }}
                            className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${mainTab === 'vocabulary' ? 'bg-[#FB5102] text-white shadow-lg' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Lug'at ro'yxati
                          </button>
                          <button 
                            onClick={() => { setMainTab('keywords'); setExpandedWord(null); }}
                            className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-xs font-bold transition-all ${mainTab === 'keywords' ? 'bg-[#FB5102] text-white' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Keywords
                          </button>
                        </div>
        
                        <div className="relative w-full xl:w-[450px] group">
                          <div className={`absolute inset-0 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity ${isDark ? 'bg-[#FB5102]/5' : 'bg-[#FB5102]/10'}`}></div>
                          <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-gray-600 group-focus-within:text-[#FB5102]' : 'text-slate-400 group-focus-within:text-[#FB5102]'}`} />
                          <input 
                            type="text" 
                            placeholder="So'zlarni qidirish..." 
                            className={`w-full border focus:border-[#FB5102]/50 outline-none rounded-2xl py-4 pl-14 pr-6 transition-all relative z-10 ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            value={mainTab === 'vocabulary' ? searchTerm : keywordSearch}
                            onChange={(e) => mainTab === 'vocabulary' ? setSearchTerm(e.target.value) : setKeywordSearch(e.target.value)}
                          />
                        </div>
                     </div>
        
                     {/* List Rendering */}
                     {loading ? (
                         <div className={`flex flex-col items-center justify-center py-32 border border-dashed rounded-[3rem] ${isDark ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-slate-50'}`}>
                            <Loader2 className="w-10 h-10 text-[#FB5102] animate-spin mb-4" />
                            <p className={isDark ? 'text-gray-400' : 'text-slate-500'}>Yuklanmoqda...</p>
                         </div>
                     ) : mainTab === 'keywords' ? (
                       keywords.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[3rem] ${isDark ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-slate-50'}`}>
                            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 relative ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                               <div className="absolute inset-0 bg-[#FB5102]/10 blur-xl animate-pulse rounded-full"></div>
                               <BookOpen className={`w-8 h-8 relative z-10 ${isDark ? 'text-gray-700' : 'text-slate-300'}`} />
                            </div>
                            <h3 className={`text-2xl font-bold mb-2 font-nasalization ${isDark ? 'text-white' : 'text-slate-800'}`}>Keywords bo'sh</h3>
                            <p className={`text-center max-w-xs text-sm font-light ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                              Siz turli reading testlaridan hech qanday keyword ajratib olmagansiz.
                            </p>
                        </div>
                       ) : (
                         <div className="space-y-4">
                             {Object.entries(
                                 keywords.filter(k => {
                                     if (!keywordSearch) return true;
                                     const s = keywordSearch.toLowerCase();
                                     return (k.passageWord && k.passageWord.toLowerCase().includes(s)) || (k.questionWord && k.questionWord.toLowerCase().includes(s));
                                 }).reduce((acc, kw) => {
                                     const key = kw.testName || "Noma'lum Test";
                                     if (!acc[key]) acc[key] = [];
                                     acc[key].push(kw);
                                     return acc;
                                 }, {})
                             ).map(([testName, kwList]) => {
                                 const isExpanded = expandedWord === `kw-${testName}`;
                                 return (
                                     <div key={testName} className={`rounded-xl border transition-all overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                                         <button 
                                             onClick={() => setExpandedWord(isExpanded ? null : `kw-${testName}`)}
                                             className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${isExpanded ? (isDark ? 'bg-white/5' : 'bg-white border-b border-slate-100') : 'hover:bg-white/5'}`}
                                         >
                                             <div className="flex items-center gap-3">
                                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-[#FB5102]' : 'bg-white text-[#FB5102] shadow-sm'}`}>
                                                     <BookOpen className="w-4 h-4" />
                                                 </div>
                                                 <div>
                                                     <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{testName}</h3>
                                                     <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mt-0.5">{kwList.length} ta keyword</p>
                                                 </div>
                                             </div>
                                             <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-[#FB5102] text-white' : isDark ? 'bg-white/5 text-gray-400' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                 <ChevronDown className="w-4 h-4" />
                                             </div>
                                         </button>
                                         <AnimatePresence>
                                             {isExpanded && (
                                                 <motion.div 
                                                     initial={{ height: 0, opacity: 0 }} 
                                                     animate={{ height: 'auto', opacity: 1 }} 
                                                     exit={{ height: 0, opacity: 0 }}
                                                     className="overflow-hidden"
                                                 >
                                                     <div className="p-1">
                                                         <div className={`overflow-x-auto rounded-xl hide-scrollbar ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                                                             <table className="w-full text-sm">
                                                                 <thead>
                                                                     <tr className={`text-gray-400 font-bold uppercase tracking-wider ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                                         <th className="text-left py-4 px-6">Passage Word</th>
                                                                         <th className="text-center py-4 px-6">Turi</th>
                                                                         <th className="text-left py-4 px-6">Question Word</th>
                                                                         <th className="text-right py-4 px-6"></th>
                                                                     </tr>
                                                                 </thead>
                                                                 <tbody>
                                                                     {kwList.map(kw => (
                                                                         <tr key={kw.id} className={`border-t transition-colors group ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-50 hover:bg-slate-50'}`}>
                                                                             <td className={`py-4 px-6 font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{kw.passageWord}</td>
                                                                             <td className="py-4 px-6 text-center">
                                                                                 <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${kw.type === 'synonym' ? 'bg-emerald-500/20 text-emerald-400 line-clamp-1' : kw.type === 'antonym' ? 'bg-[#FB5102]/20 text-[#FB5102]' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                                     {kw.type === 'synonym' ? 'SYN' : kw.type === 'antonym' ? 'ANT' : 'PHR'}
                                                                                 </span>
                                                                             </td>
                                                                             <td className={`py-4 px-6 font-semibold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{kw.questionWord}</td>
                                                                             <td className="py-4 px-6 text-right">
                                                                                 <button onClick={() => handleDeleteKeyword(kw.id)} className="text-gray-500 flex items-center justify-center p-2 rounded-lg bg-red-500/10 hover:text-white hover:bg-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all ml-auto">
                                                                                     <Trash2 className="w-4 h-4" />
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
                           <div className={`flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[3rem] ${isDark ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-slate-50'}`}>
                               <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 relative ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                                  <div className="absolute inset-0 bg-[#FB5102]/10 blur-xl animate-pulse rounded-full"></div>
                                  <BookOpen className={`w-8 h-8 relative z-10 ${isDark ? 'text-gray-700' : 'text-slate-300'}`} />
                               </div>
                               <h3 className={`text-2xl font-bold mb-2 font-nasalization ${isDark ? 'text-white' : 'text-slate-800'}`}>Laboratoriya bo'sh</h3>
                               <p className={`text-center max-w-xs text-sm font-light ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                 Siz qo'shgan so'zlar tahlil qilinishi va yodlash modullariga yuborilishi uchun tayyorlanmoqda.
                               </p>
                           </div>
                        ) : (
                           <div className="space-y-4">
                               {Object.entries(groupedWords).map(([testTitle, testWords]) => {
                                   const isTestExpanded = expandedWord === `test-${testTitle}`;
                                   return (
                                       <div key={testTitle} className={`rounded-2xl border transition-all overflow-hidden animate-fade-in-up ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                                           <button 
                                               onClick={() => setExpandedWord(isTestExpanded ? null : `test-${testTitle}`)}
                                               className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isTestExpanded ? (isDark ? 'bg-white/5' : 'bg-white border-b border-slate-100') : 'hover:bg-white/5'}`}
                                           >
                                               <div className="flex items-center gap-4">
                                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5 text-blue-500' : 'bg-white text-blue-500 shadow-sm'}`}>
                                                       <BookMarked className="w-5 h-5" />
                                                   </div>
                                                   <div>
                                                       <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{testTitle}</h3>
                                                       <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">{testWords.length} ta yangi so'z</p>
                                                   </div>
                                               </div>
                                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${isTestExpanded ? 'rotate-180 bg-blue-600 text-white' : isDark ? 'bg-white/5 text-gray-400' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                   <ChevronDown className="w-5 h-5" />
                                               </div>
                                           </button>

                                           <AnimatePresence>
                                               {isTestExpanded && (
                                                   <motion.div 
                                                       initial={{ height: 0, opacity: 0 }} 
                                                       animate={{ height: 'auto', opacity: 1 }} 
                                                       exit={{ height: 0, opacity: 0 }}
                                                       className="overflow-hidden"
                                                   >
                                                       <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                           {testWords.map((item, index) => {
                                                               const isItemExpanded = expandedWord === item.id;
                                                               return (
                                                                   <motion.div
                                                                       key={item.id}
                                                                       initial={{ opacity: 0, scale: 0.98 }}
                                                                       animate={{ opacity: 1, scale: 1 }}
                                                                       transition={{ delay: index * 0.02 }}
                                                                       className={`border p-3.5 rounded-xl transition-all flex flex-col group relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-100 hover:border-[#FB5102]/20 hover:shadow-sm'}`}
                                                                   >
                                                                       <div className="flex justify-between items-center">
                                                                           <div className="flex-1 min-w-0 pr-2">
                                                                               <div className="flex items-center gap-1.5 mb-0.5">
                                                                                   <h3 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.word}</h3>
                                                                                   {item.learningStatus === 'mastered' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                                               </div>
                                                                               <p className={`text-xs font-light truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{item.translation || "Tarjima yo'q..."}</p>
                                                                           </div>
                                                                           <div className="flex items-center gap-1 shrink-0">
                                                                               <button onClick={() => playPronunciation(item.id, item.word)} className={`p-1.5 rounded-lg transition-all ${playingAudioId === item.id ? 'bg-[#FB5102]/20 text-[#FB5102] animate-pulse' : isDark ? 'bg-black/20 text-gray-500 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'}`}>
                                                                                   <Volume2 className="w-3.5 h-3.5" />
                                                                               </button>
                                                                               <button 
                                                                                   onClick={() => {
                                                                                       const nextExpanded = isItemExpanded ? null : item.id;
                                                                                       setExpandedWord(nextExpanded);
                                                                                       if (nextExpanded && !item.hasAI) {
                                                                                           generateAIContext(item);
                                                                                       }
                                                                                   }} 
                                                                                   className={`p-1.5 rounded-lg transition-colors ${isItemExpanded ? 'bg-[#FB5102] text-white' : isDark ? 'bg-black/20 text-gray-500 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'}`}
                                                                               >
                                                                                   {isItemExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                               </button>
                                                                           </div>
                                                                       </div>
                                                                       <AnimatePresence>
                                                                           {isItemExpanded && (
                                                                               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`overflow-hidden mt-3 pt-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                                                                   {!item.hasAI ? (
                                                                                       <button onClick={() => generateAIContext(item)} disabled={generatingId === item.id} className="w-full flex items-center justify-center gap-2 py-2 bg-[#FB5102]/10 border border-[#FB5102]/20 text-[#FB5102] hover:bg-[#FB5102] hover:text-white transition-colors rounded-lg text-xs font-medium">
                                                                                           {generatingId === item.id ? <><Loader2 className="w-3 h-3 animate-spin" /> ...</> : <><Sparkles className="w-3 h-3" /> AI</>}
                                                                                       </button>
                                                                                   ) : (
                                                                                       <div className="space-y-3">
                                                                                           <div>
                                                                                               <span className="text-[9px] uppercase font-bold text-[#FB5102] tracking-wider">Tarjimasi</span>
                                                                                               <p className={`text-sm mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.translation}</p>
                                                                                           </div>
                                                                                           <div className={`p-3 rounded-lg border ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                                                               <span className="text-[9px] uppercase font-bold text-blue-500 tracking-wider">Izohi</span>
                                                                                               <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{item.definition}</p>
                                                                                           </div>
                                                                                           {(item.example && item.example.length > 5) && (
                                                                                             <div>
                                                                                                 <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Misol</span>
                                                                                                 <p className={`text-xs italic mt-0.5 border-l-2 pl-2 ${isDark ? 'text-gray-400 border-gray-700' : 'text-slate-500 border-slate-200'}`}>"{item.example}"</p>
                                                                                             </div>
                                                                                           )}
                                                                                           <button onClick={() => handleDelete(item.id)} className="w-full flex items-center justify-center gap-2 py-1.5 mt-2 text-red-500 hover:text-white hover:bg-red-500/20 rounded-lg transition-all text-xs border border-red-500/10">
                                                                                               <Trash2 className="w-3.5 h-3.5" /> O'chirish
                                                                                           </button>
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
                </div>
              </main>
        
              <style>
                {`
                  @import url('https://fonts.cdnfonts.com/css/aspekta');
                  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
                  .font-aspekta { font-family: 'Aspekta', sans-serif; }
                  .font-nasalization { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.05em; }
        
                  @keyframes pulse-slow {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 0.2; transform: scale(1.1); }
                  }
                `}
              </style>
            </div>
        );
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-[#0F1016]' : 'bg-[#F8FAFC]'}`}>
            {practiceMode === 'flashcards' && renderFlashcards()}
            {practiceMode === 'match' && renderMatchGame()}
            {practiceMode === 'dashboard' && renderDashboard()}
        </div>
    );
}
