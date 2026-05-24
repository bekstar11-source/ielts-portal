import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';

// Hooks
import { useWordBank } from '../../hooks/useWordBank';

// Components
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import SiteFooter from '../../components/common/SiteFooter';
import WordBankFlashcards from '../../components/WordBank/WordBankFlashcards';
import WordBankMatchGame from '../../components/WordBank/WordBankMatchGame';

// Refactored Components
import WordBankHero from '../../components/WordBank/WordBankHero';
import VocabularyList from '../../components/WordBank/VocabularyList';
import KeywordList from '../../components/WordBank/KeywordList';

export default function Wordbank() {
    const { user, userData } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const [searchTerm, setSearchTerm] = useState('');
    const [keywordSearch, setKeywordSearch] = useState('');
    const [practiceMode, setPracticeMode] = useState('dashboard'); // 'dashboard', 'flashcards', 'match'
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'mastered', 'review', 'due'
    const [mainTab, setMainTab] = useState('vocabulary'); // 'vocabulary' | 'keywords'
    const [playingAudioId, setPlayingAudioId] = useState(null);

    const {
        words, keywords, loading,
        generatingId, batchProcessing,
        handleDeleteWord, handleDeleteKeyword,
        updateWordStatus, generateAIContext, handleTranslateAll
    } = useWordBank(user);

    const playPronunciation = (wordId, text) => {
        if (!('speechSynthesis' in window)) return alert(t('wordbank.speechNotSupported'));
        window.speechSynthesis.cancel();
        setPlayingAudioId(wordId);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => setPlayingAudioId(null);
        utterance.onerror = () => setPlayingAudioId(null);
        window.speechSynthesis.speak(utterance);
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

    if (practiceMode === 'flashcards') {
        const practiceWords = filterTab === 'due' 
            ? words.filter(w => {
                if (!w.nextReviewDate) return w.learningStatus !== 'mastered';
                let reviewDate = w.nextReviewDate.toDate ? w.nextReviewDate.toDate() : new Date(w.nextReviewDate);
                return reviewDate <= new Date() && w.learningStatus !== 'mastered';
            }) 
            : words;

        return (
            <WordBankFlashcards
                words={practiceWords}
                onBack={() => { setPracticeMode('dashboard'); if (filterTab === 'due') setFilterTab('all'); }}
                onUpdateStatus={updateWordStatus}
            />
        );
    }

    if (practiceMode === 'match') {
        return (
            <WordBankMatchGame
                words={[...words, ...keywords]}
                onBack={() => setPracticeMode('dashboard')}
            />
        );
    }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-500 pb-20 ${isDark ? 'bg-black text-[#f5f5f7]' : 'bg-white text-[#1d1d1f]'}`}>
            <DashboardHeader
                user={user} userData={userData}
                activeTab="vocabulary"
                onLogoutClick={() => navigate('/login')}
                loading={loading}
            />

            <main className="max-w-[1200px] mx-auto px-6 pt-12 w-full">
                <WordBankHero 
                    wordsCount={words.length}
                    todayAddedCount={todayAddedCount}
                    dueForReviewCount={dueForReviewCount}
                    setFilterTab={setFilterTab}
                    setPracticeMode={setPracticeMode}
                    isDark={isDark}
                />

                <div className={`border rounded-3xl p-6 md:p-8 transition-colors ${isDark ? 'bg-[#1c1c1e] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    {/* Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-white/5 p-1 rounded-xl w-fit">
                            {[
                                { id: 'vocabulary', label: t('wordbank.allWords') },
                                { id: 'keywords', label: t('wordbank.keywords') }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setMainTab(tab.id)}
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
                                    placeholder={t('wordbank.searchWords')} 
                                    className={`w-full border outline-none rounded-xl py-2.5 pl-11 pr-4 text-sm transition-all ${isDark ? 'bg-black/20 border-white/10 focus:border-[#FB5102]/40 text-white' : 'bg-[#f5f5f7] border-transparent focus:bg-white focus:border-[#FB5102]/30 text-gray-900'}`}
                                    value={mainTab === 'vocabulary' ? searchTerm : keywordSearch}
                                    onChange={(e) => mainTab === 'vocabulary' ? setSearchTerm(e.target.value) : setKeywordSearch(e.target.value)}
                                />
                            </div>
                            
                            <button 
                                onClick={handleTranslateAll} 
                                disabled={batchProcessing || words.every(w => w.hasAI)} 
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full sm:w-auto justify-center
                                ${ (batchProcessing || words.every(w => w.hasAI)) ? 'opacity-40 cursor-not-allowed' : 'bg-[#FB5102] text-white hover:bg-[#e64a02] active:scale-95'}`}
                            >
                                {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                <span>{batchProcessing ? t('wordbank.translating') : t('wordbank.autoTranslateAll')}</span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-[#FB5102] animate-spin mb-3" />
                            <p className="text-sm text-gray-500">{t('wordbank.loadingCollection')}</p>
                        </div>
                    ) : (
                        mainTab === 'keywords' ? (
                            <KeywordList 
                                keywords={keywords}
                                searchTerm={keywordSearch}
                                onDelete={handleDeleteKeyword}
                                isDark={isDark}
                            />
                        ) : (
                            <VocabularyList 
                                words={words}
                                searchTerm={searchTerm}
                                filterTab={filterTab}
                                onDelete={handleDeleteWord}
                                onUpdateStatus={updateWordStatus}
                                onGenerateAI={generateAIContext}
                                playingAudioId={playingAudioId}
                                playPronunciation={playPronunciation}
                                generatingId={generatingId}
                                isDark={isDark}
                            />
                        )
                    )}
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
