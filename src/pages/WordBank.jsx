import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Trash2, ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronUp, Layers, MousePointer2, CheckCircle2, Volume2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateDoc } from 'firebase/firestore';
import WordBankFlashcards from '../components/WordBank/WordBankFlashcards';
import WordBankMatchGame from '../components/WordBank/WordBankMatchGame';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Wordbank() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedWord, setExpandedWord] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [practiceMode, setPracticeMode] = useState('dashboard'); // 'dashboard', 'flashcards', 'match'
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'mastered', 'review'
    const [playingAudioId, setPlayingAudioId] = useState(null);

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
            } catch (error) {
                console.error("Error fetching vocabulary:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWords();
    }, [user]);

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

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        setPlayingAudioId(wordId);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Default to US English
        utterance.rate = 0.9; // Slightly slower for clarity

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
        const matchesSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (w.testTitle && w.testTitle.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (filterTab === 'mastered') return w.learningStatus === 'mastered';
        if (filterTab === 'review') return w.learningStatus !== 'mastered'; // includes undefined and 'needs_review'

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

        return true; // 'all'
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
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                alert("API kalit topilmadi. .env o'zgaruvchilarini tekshiring.");
                setGeneratingId(null);
                return;
            }

            const prompt = `
            Analyze the English word "${wordItem.word}" within the following context sentence: "${wordItem.contextSentence || 'No specific context provided, use general meaning.'}".
            Return a JSON object with EXACTLY these three keys:
            - "definition": A concise English explanation of what the word means in this specific context.
            - "example": A good, clear English example sentence showing how to use the word (you can use the context sentence if it is good, or write a new clear one).
            - "translation": The precise Uzbek translation of the word reflecting its meaning in this context.
            Do not include any string formatting like \`\`\`json, just return the raw JSON object.
            `;

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are a helpful dictionary assistant." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error("Failed to fetch from OpenAI");
            }

            const data = await response.json();
            const aiResponseText = data.choices[0].message.content.trim();

            // Extract and clean JSON
            const cleanJsonStr = aiResponseText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsedData = JSON.parse(cleanJsonStr);

            const definition = parsedData.definition || "Izoh topilmadi.";
            const example = parsedData.example || wordItem.contextSentence || "Misol topilmadi.";
            const translation = parsedData.translation || "Tarjima topilmadi.";

            // Firebasedagi hujjatni yangilash
            const wordRef = doc(db, "users", user.uid, "vocabulary", wordItem.id);
            await updateDoc(wordRef, {
                definition: definition,
                example: example,
                translation: translation,
                hasAI: true
            });

            // Local stateni yangilash
            setWords(words.map(w => w.id === wordItem.id ? {
                ...w,
                definition,
                example,
                translation,
                hasAI: true
            } : w));

        } catch (error) {
            console.error("AI Generation error:", error);
            alert("AI so'zni tarjima qilishda xatolik yuz berdi. " + error.message);
        } finally {
            setGeneratingId(null);
        }
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

    if (practiceMode === 'flashcards') {
        const practiceWords = filterTab === 'due' ? words.filter(w => {
            if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
            let reviewDate;
            if (w.nextReviewDate.toDate) {
                reviewDate = w.nextReviewDate.toDate();
            } else {
                reviewDate = new Date(w.nextReviewDate);
            }
            return reviewDate <= new Date() && w.learningStatus !== 'mastered';
        }) : filteredWords; // Default to current text-search/tab filter if not explicitly 'due'

        return (
            <div className="min-h-screen bg-[#050505] text-white">
                <WordBankFlashcards
                    words={practiceWords}
                    onBack={() => {
                        setPracticeMode('dashboard');
                        if (filterTab === 'due') setFilterTab('all'); // Reset if coming back from due
                    }}
                    onUpdateStatus={handleUpdateWordStatus}
                />
            </div>
        );
    }

    if (practiceMode === 'match') {
        return (
            <div className="min-h-screen bg-[#050505] text-white">
                <WordBankMatchGame
                    words={words}
                    onBack={() => setPracticeMode('dashboard')}
                />
            </div>
        );
    }

    const masteredCount = words.filter(w => w.learningStatus === 'mastered').length;

    // Calculate how many words are due for review TODAY based on nextReviewDate
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const dueForReviewCount = words.filter(w => {
        if (!w.nextReviewDate) return w.learningStatus !== 'mastered';

        let reviewDate;
        if (w.nextReviewDate.toDate) { // Firestore timestamp
            reviewDate = w.nextReviewDate.toDate();
        } else { // JS Date object (local state update)
            reviewDate = new Date(w.nextReviewDate);
        }

        return reviewDate <= new Date() && w.learningStatus !== 'mastered';
    }).length;

    // Activity Chart Data (Last 7 days)
    const getLast7DaysData = () => {
        const data = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayStart);
            d.setDate(d.getDate() - i);

            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const count = words.filter(w => {
                if (!w.addedAt) return false;
                const addedDate = w.addedAt.toDate ? w.addedAt.toDate() : new Date(w.addedAt);
                return addedDate >= d && addedDate < nextD;
            }).length;

            data.push({
                name: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
                count: count
            });
        }
        return data;
    };
    const chartData = getLast7DaysData();

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#020b1c] to-[#06193b] text-white p-6 pb-20 font-sans relative overflow-hidden">
            <style>{`
                .wb-stars {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-image:
                        radial-gradient(1px 1px at 50px 50px, #ffffff, transparent),
                        radial-gradient(1.5px 1.5px at 150px 100px, rgba(255,255,255,0.8), transparent),
                        radial-gradient(1px 1px at 250px 200px, #ffffff, transparent),
                        radial-gradient(2px 2px at 350px 50px, rgba(255,255,255,0.6), transparent),
                        radial-gradient(1px 1px at 100px 300px, #ffffff, transparent),
                        radial-gradient(1px 1px at 400px 250px, rgba(255,255,255,0.9), transparent),
                        radial-gradient(1.5px 1.5px at 500px 150px, #ffffff, transparent),
                        radial-gradient(1px 1px at 50px 400px, rgba(255,255,255,0.7), transparent);
                    background-size: 550px 450px;
                    opacity: 0.7;
                    z-index: 1;
                    pointer-events: none;
                }

                .wb-planet {
                    position: absolute;
                    top: 85vh;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 200vw;
                    height: 200vw;
                    border-radius: 50%;
                    background: radial-gradient(circle, #000000 75%, #03122b 88%, #0a3580 95%, rgba(0, 150, 255, 0.8) 100%);
                    box-shadow:
                        inset 0 0 80px rgba(0, 150, 255, 0.7),
                        0 -3px 10px rgba(255, 255, 255, 0.7),
                        0 -10px 30px rgba(0, 150, 255, 0.6),
                        0 -30px 80px rgba(0, 100, 255, 0.4),
                        0 -80px 150px rgba(0, 50, 150, 0.2);
                    z-index: 2;
                    animation: wb-pulseGlow 6s infinite ease-in-out;
                    pointer-events: none;
                }

                @keyframes wb-pulseGlow {
                    0% { box-shadow: inset 0 0 80px rgba(0, 150, 255, 0.7), 0 -3px 10px rgba(255,255,255,0.7), 0 -10px 30px rgba(0,150,255,0.6), 0 -30px 80px rgba(0,100,255,0.4), 0 -80px 150px rgba(0,50,150,0.2); }
                    50% { box-shadow: inset 0 0 120px rgba(0, 150, 255, 0.9), 0 -3px 12px rgba(255,255,255,0.9), 0 -15px 40px rgba(0,150,255,0.8), 0 -40px 100px rgba(0,100,255,0.5), 0 -100px 180px rgba(0,50,150,0.3); }
                    100% { box-shadow: inset 0 0 80px rgba(0, 150, 255, 0.7), 0 -3px 10px rgba(255,255,255,0.7), 0 -10px 30px rgba(0,150,255,0.6), 0 -30px 80px rgba(0,100,255,0.4), 0 -80px 150px rgba(0,50,150,0.2); }
                }

                @media (max-width: 768px) {
                    .wb-planet {
                        width: 300vw;
                        height: 300vw;
                        top: 80vh;
                    }
                }
            `}</style>

            <div className="wb-stars"></div>
            <div className="wb-planet"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BookOpen className="text-blue-500" />
                            Mening Lug'atim
                        </h1>
                        <p className="text-gray-400 mt-1">Siz izohlagan va testlardan ajratib olingan barcha so'zlar.</p>
                    </div>
                </div>

                {/* Dashboard Stats & Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Jami So'zlar</p>
                            <h3 className="text-3xl font-bold text-white">{words.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                            <BookOpen className="w-6 h-6" />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setFilterTab('due');
                            setPracticeMode('flashcards');
                        }}
                        className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between group hover:border-amber-400/50 transition-all text-left relative overflow-hidden"
                    >
                        {dueForReviewCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-bl-xl">
                                {dueForReviewCount} ta qoldi
                            </span>
                        )}
                        <div>
                            <p className="text-amber-200 text-sm font-medium mb-1 group-hover:text-white transition-colors">Bugungi Takrorlash</p>
                            <h3 className="text-xl font-bold text-white">Spaced Repetition</h3>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                            <RefreshCw className="w-6 h-6" />
                        </div>
                    </button>

                    <button
                        onClick={() => setPracticeMode('flashcards')}
                        className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-5 flex items-center justify-between group hover:border-indigo-400/50 transition-all text-left"
                    >
                        <div>
                            <p className="text-indigo-200 text-sm font-medium mb-1 group-hover:text-white transition-colors">Flashcards</p>
                            <h3 className="text-xl font-bold text-white">Kartochkalar</h3>
                        </div>
                        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                            <Layers className="w-6 h-6" />
                        </div>
                    </button>

                    <button
                        onClick={() => setPracticeMode('match')}
                        className="bg-gradient-to-br from-teal-900/50 to-emerald-900/50 border border-teal-500/30 rounded-2xl p-5 flex items-center justify-between group hover:border-teal-400/50 transition-all text-left"
                    >
                        <div>
                            <p className="text-emerald-200 text-sm font-medium mb-1 group-hover:text-white transition-colors">Match Game</p>
                            <h3 className="text-xl font-bold text-white">Moslashtirish</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                            <MousePointer2 className="w-6 h-6" />
                        </div>
                    </button>
                </div>

                {/* Progress Chart */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 w-full overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-4">Lug'at faolligi (Yangi so'zlar)</h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                    formatter={(value) => [value, "ta so'z"]}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3b82f6' : '#374151'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 relative">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="So'zlarni qidirish..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto hide-scrollbar">
                        {['all', 'due', 'review', 'mastered'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilterTab(tab)}
                                className={`flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filterTab === tab
                                    ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                    }`}
                            >
                                {tab === 'all' && 'Barchasi'}
                                {tab === 'due' && 'Bugun'}
                                {tab === 'review' && 'Yodlanmagan'}
                                {tab === 'mastered' && 'Yodlangan'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-400">So'zlar yuklanmoqda...</p>
                    </div>
                ) : filteredWords.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                        <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">Hech qanday so'z topilmadi</h3>
                        <p className="text-gray-500">
                            {searchTerm ? "Qidiruvingiz bo'yicha so'z topilmadi." : "Siz hali lug'atingizga so'z qo'shmagansiz. Test ishlash davomida so'zlarni belgilab lug'atga qo'shishingiz mumkin."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(groupedWords).map(([testTitle, testWords]) => (
                            <div key={testTitle} className="animate-fade-in-up">
                                <h2 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-blue-400 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    {testTitle}
                                    <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full ml-2">
                                        {testWords.length} ta
                                    </span>
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    {testWords.map((item, index) => {
                                        const isExpanded = expandedWord === item.id;
                                        const isGenerating = generatingId === item.id;

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                key={item.id}
                                                className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-blue-500/30 transition-all relative flex flex-col group overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-xl font-bold text-white tracking-tight leading-none">{item.word}</h3>
                                                            {item.learningStatus === 'mastered' && (
                                                                <CheckCircle2 className="w-4 h-4 text-green-500" title="Yodlangan" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-blue-300/80 font-medium tracking-wide">
                                                            {item.translation || "Tarjima yo'q..."}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                playPronunciation(item.id, item.word);
                                                            }}
                                                            className={`p-2 rounded-lg transition-all ${playingAudioId === item.id ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                            title="Talaffuz"
                                                        >
                                                            <Volume2 className="w-5 h-5" />
                                                        </button>
                                                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                                                        <button
                                                            onClick={() => setExpandedWord(isExpanded ? null : item.id)}
                                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="O'chirish"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in">
                                                        {!item.hasAI ? (
                                                            <div>
                                                                {item.contextSentence && (
                                                                    <div className="mb-4">
                                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Matn ichida:</span>
                                                                        <p className="text-sm text-gray-300 italic border-l-2 border-gray-600 pl-3">"{item.contextSentence}"</p>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() => generateAIContext(item)}
                                                                    disabled={isGenerating}
                                                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg transition-all disabled:opacity-50"
                                                                >
                                                                    {isGenerating ? (
                                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Yaratilmoqda...</>
                                                                    ) : (
                                                                        <><Sparkles className="w-4 h-4" /> AI orqali Izoh va Tarjima olish</>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-0.5">Tarjimasi</span>
                                                                    <p className="text-base text-white">{item.translation}</p>
                                                                </div>
                                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">Definition (Izohi)</span>
                                                                    <p className="text-sm text-gray-300">{item.definition}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Misol (Context)</span>
                                                                    <p className="text-sm text-gray-400 italic">"{item.example}"</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
