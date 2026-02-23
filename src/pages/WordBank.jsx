import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Trash2, ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronUp, Layers, MousePointer2, CheckCircle2, Volume2, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateDoc } from 'firebase/firestore';
import WordBankFlashcards from '../components/WordBank/WordBankFlashcards';
import WordBankMatchGame from '../components/WordBank/WordBankMatchGame';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getUserWordBank, deleteWordFromBank } from '../utils/wordbankUtils';

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
    const [mainTab, setMainTab] = useState('vocabulary'); // 'vocabulary' | 'keywords'
    const [keywords, setKeywords] = useState([]);
    const [keywordSearch, setKeywordSearch] = useState('');

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

                // WordBank (keywords) ni yuklash
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
        const matchesSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            - "example": A good, clear English example sentence showing how to use the word.
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

            if (!response.ok) throw new Error("Failed to fetch from OpenAI");

            const data = await response.json();
            const aiResponseText = data.choices[0].message.content.trim();
            const cleanJsonStr = aiResponseText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsedData = JSON.parse(cleanJsonStr);

            const definition = parsedData.definition || "Izoh topilmadi.";
            const example = parsedData.example || wordItem.contextSentence || "Misol topilmadi.";
            const translation = parsedData.translation || "Tarjima topilmadi.";

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

    const handleUpdateWordStatus = async (wordId, updateData) => {
        try {
            const wordRef = doc(db, "users", user.uid, "vocabulary", wordId);
            await updateDoc(wordRef, updateData);
            setWords(words.map(w => w.id === wordId ? { ...w, ...updateData } : w));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    // Calculate how many words are due for review TODAY
    const dueForReviewCount = words.filter(w => {
        if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
        let reviewDate = w.nextReviewDate.toDate ? w.nextReviewDate.toDate() : new Date(w.nextReviewDate);
        return reviewDate <= new Date() && w.learningStatus !== 'mastered';
    }).length;

    // Activity Chart Data
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

    // --- Sub-renderers ---

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

    const renderDashboard = () => (
        <>
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

            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-6 max-w-md">
                <button
                    onClick={() => setMainTab('vocabulary')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'vocabulary' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                >
                    <BookOpen className="w-4 h-4" />
                    Lug'at ({words.length})
                </button>
                <button
                    onClick={() => setMainTab('keywords')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'keywords' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                >
                    <ArrowRightLeft className="w-4 h-4" />
                    Keywords ({keywords.length})
                </button>
            </div>

            {
                mainTab === 'keywords' ? (
                    <div>
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Keywords qidirish..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-emerald-500/50"
                                value={keywordSearch}
                                onChange={(e) => setKeywordSearch(e.target.value)}
                            />
                        </div>
                        {keywords.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                                <ArrowRightLeft className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-semibold text-gray-300">Hali keyword qo'shilmagan</h3>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(
                                    keywords.filter(k => {
                                        if (!keywordSearch) return true;
                                        const s = keywordSearch.toLowerCase();
                                        return k.passageWord?.toLowerCase().includes(s) || k.questionWord?.toLowerCase().includes(s);
                                    }).reduce((acc, kw) => {
                                        const key = kw.testName || "Noma'lum Test";
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(kw);
                                        return acc;
                                    }, {})
                                ).map(([testName, kwList]) => (
                                    <div key={testName}>
                                        <h2 className="text-lg font-bold text-emerald-400 border-b border-white/10 pb-2 mb-4">{testName}</h2>
                                        <div className="overflow-x-auto rounded-xl border border-white/10">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-white/5 text-gray-400 uppercase">
                                                        <th className="text-left py-3 px-4">Passage Word</th>
                                                        <th className="text-center py-3 px-4">Turi</th>
                                                        <th className="text-left py-3 px-4">Question Word</th>
                                                        <th className="text-right py-3 px-4"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {kwList.map(kw => (
                                                        <tr key={kw.id} className="border-t border-white/5 hover:bg-white/5 transition-colors group">
                                                            <td className="py-3 px-4 font-bold">{kw.passageWord}</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${kw.type === 'synonym' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                    {kw.type === 'synonym' ? 'SYN' : 'ANT'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 font-semibold text-emerald-300">{kw.questionWord}</td>
                                                            <td className="py-3 px-4 text-right">
                                                                <button onClick={() => handleDeleteKeyword(kw.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row gap-4 mb-6 relative">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="So'zlarni qidirish..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto hide-scrollbar">
                                {
                                    ['all', 'due', 'review', 'mastered'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setFilterTab(tab)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterTab === tab ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'}`}
                                        >
                                            {tab === 'all' ? 'Barchasi' : tab === 'due' ? 'Bugun' : tab === 'review' ? 'Yodlanmagan' : 'Yodlangan'}
                                        </button>
                                    ))
                                }
                            </div>
                        </div>

                        {
                            loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                    <p className="text-gray-400">So'zlar yuklanmoqda...</p>
                                </div>
                            ) : filteredWords.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                                    < BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                                    < h3 className="text-xl font-semibold text-gray-300">Hech qanday so'z topilmadi</h3>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    {
                                        Object.entries(groupedWords).map(([testTitle, testWords]) => (
                                            <div key={testTitle} className="animate-fade-in-up">
                                                < h2 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-blue-400">{testTitle}</h2>
                                                < div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {
                                                        testWords.map((item, index) => {
                                                            const isExpanded = expandedWord === item.id;
                                                            return (
                                                                <motion.div
                                                                    key={item.id}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: index * 0.05 }}
                                                                    className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-blue-500/30 transition-all flex flex-col group"
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        < div >
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                < h3 className="text-xl font-bold text-white">{item.word}</h3>
                                                                                {
                                                                                    item.learningStatus === 'mastered' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                                            </div>
                                                                            <p className="text-sm text-blue-300/80">{item.translation || "Tarjima yo'q..."}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            < button onClick={() => playPronunciation(item.id, item.word)
                                                                            } className={`p-2 rounded-lg transition-all ${playingAudioId === item.id ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'text-gray-400 hover:text-white'}`
                                                                            }>
                                                                                <Volume2 className="w-5 h-5" />
                                                                            </button >
                                                                            <button onClick={() => setExpandedWord(isExpanded ? null : item.id)} className="p-1.5 text-gray-400 hover:text-white">
                                                                                {
                                                                                    isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                                            </button>
                                                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                                < Trash2 className="w-5 h-5" />
                                                                            </button >
                                                                        </div>
                                                                    </div>
                                                                    <AnimatePresence>
                                                                        {isExpanded && (
                                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-t border-white/10">
                                                                                {!item.hasAI ? (
                                                                                    <button onClick={() => generateAIContext(item)} disabled={generatingId === item.id} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-medium">
                                                                                        {generatingId === item.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Yaratilmoqda...</> : <><Sparkles className="w-4 h-4" /> AI Izoh olish</>}
                                                                                    </button>
                                                                                ) : (
                                                                                    <div className="space-y-3">
                                                                                        < div > <span className="text-xs font-bold text-blue-400">Tarjimasi</span><p className="text-base text-white">{item.translation}</p></div>
                                                                                        < div className="bg-black/20 p-3 rounded-xl"><span className="text-xs font-bold text-indigo-400">Izohi</span><p className="text-sm text-gray-300">{item.definition}</p></div>
                                                                                        < div > <span className="text-xs font-bold text-gray-500">Misol</span><p className="text-sm text-gray-400 italic">"{item.example}"</p></div>
                                                                                    </div>
                                                                                )}
                                                                            </motion.div >
                                                                        )}
                                                                    </AnimatePresence >
                                                                </motion.div >
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                    </>
                )}
        </>
    );

    return (
        <div className="min-h-screen text-white p-6 pb-20 font-sans relative">
            <style>{`
                .wb-background-wrapper {
                    position: fixed;
                    inset: 0;
                    background: linear-gradient(to bottom, #020b1c, #06193b);
                    z-index: 0;
                    pointer-events: none;
                    overflow: hidden;
                }

                .wb-stars {
                    position: absolute;
                    inset: 0;
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
                    opacity: 0.5;
                }

                .wb-glow {
                    position: absolute;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(0, 100, 255, 0.15) 0%, transparent 70%);
                    border-radius: 50%;
                    filter: blur(60px);
                    pointer-events: none;
                    animation: wb-float 20s infinite ease-in-out;
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
                    animation: wb-pulseGlow 6s infinite ease-in-out;
                }

                @keyframes wb-float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(100px, 50px); }
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

            <div className="wb-background-wrapper">
                <div className="wb-stars"></div>
                <div className="wb-glow" style={{ top: '-10%', left: '-10%' }}></div>
                <div className="wb-glow" style={{ bottom: '20%', right: '-5%', animationDelay: '-5s' }}></div>
                <div className="wb-glow" style={{ top: '40%', left: '15%', width: '400px', height: '400px', animationDelay: '-10s' }}></div>
                <div className="wb-planet"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {practiceMode === 'flashcards' ? renderFlashcards() :
                    practiceMode === 'match' ? renderMatchGame() :
                        renderDashboard()}
            </div>
        </div>
    );
}
