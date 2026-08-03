import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardModals from '../../components/dashboard/DashboardModals';
import SpeakingSession from '../../components/speaking/SpeakingSession';
import SpeakingHistory from '../../components/speaking/SpeakingHistory';
import SpeakingMistakes from '../../components/speaking/SpeakingMistakes';
import SpeakingRoomRail from '../../components/speaking/SpeakingRoomRail';
import SpeakingTopicBrowser from '../../components/speaking/SpeakingTopicBrowser';
import { RoomGlow } from '../../components/speaking/ui';
import { useSpeakingTopics } from '../../hooks/useSpeakingTopics';
import { useSpeakingProgress } from '../../hooks/useSpeakingProgress';
import { buildMockTopic } from '../../data/speakingQuestions';

const PARTS = [1, 2, 3];

const COPY = {
    uz: {
        badge: 'Speaking xonasi',
        title: 'Gaplashamiz',
        lead: "Mavzuni tanlang, kim bilan gaplashayotganingizni belgilang va ovoz chiqarib gapiring. Har javobdan keyin band ball va o'sha ohangdagi feedback.",
        mockBadge: "To'liq suhbat",
        mockTitle: 'Part 1 → 2 → 3, bir seansda',
        mockTitleShort: "Part 1 → 2 → 3, bir o'tirishda",
        mockHint:
            "Uchala qism ketma-ket, mavzular har safar boshqacha. Oxirida mezonlar kesimidagi umumiy hisobot.",
        micHint:
            'Mikrofon ruxsatini bering va tinch joyda gapiring — fon shovqini talaffuz bahosiga ta’sir qiladi.',
        backHome: 'Bosh sahifaga qaytish',
        begin: 'Boshlash',
        bandSoFar: 'Hozirgi band',
        railNote: "Bo'limlar o'sganda ro'yxat emas — chapdagi ustun o'zgarmaydi.",
        searchPlaceholder: 'Mavzu qidirish…',
        sortLabel: 'Tartib: tavsiya etilgan',
        filterAll: 'Hammasi',
        filterFresh: 'Boshlanmagan',
        filterStarted: 'Boshlangan',
        filterWeak: 'Ball < 6.0 ·',
        emptyResult: 'Bu shartga mos mavzu topilmadi.',
        notStarted: 'boshlanmagan',
        lastAttempt: (when) => `oxirgi urinish ${when}`,
        collapse: 'yopish',
        expand: 'ochish',
        questions: (n) => `${n} savol`,
        answers: (n) => `${n} javob`,
        topicCount: (n) => `${n} mavzu`,
        showMore: (n) => `Yana ${n} mavzu ko'rsatish`,
    },
    en: {
        badge: 'Speaking room',
        title: "Let's talk",
        lead: "Pick a topic, choose who you are talking to — a friend, a coach or an examiner — and speak out loud. After each answer you get a band score and feedback in that voice.",
        mockBadge: 'Full conversation',
        mockTitle: 'Part 1 → 2 → 3, in one sitting',
        mockTitleShort: 'Part 1 → 2 → 3, in one sitting',
        mockHint:
            'All three parts back to back, new topics every time. Full criterion breakdown at the end.',
        micHint:
            'Allow microphone access and speak somewhere quiet — background noise affects the pronunciation score.',
        backHome: 'Back to Dashboard',
        begin: 'Begin',
        bandSoFar: 'Band so far',
        railNote: 'However long the list gets, this column stays the same.',
        searchPlaceholder: 'Search topics…',
        sortLabel: 'Sorted by: recommended',
        filterAll: 'All',
        filterFresh: 'Not started',
        filterStarted: 'In progress',
        filterWeak: 'Band < 6.0 ·',
        emptyResult: 'No topic matches that.',
        notStarted: 'not started',
        lastAttempt: (when) => `last attempt ${when}`,
        collapse: 'collapse',
        expand: 'expand',
        questions: (n) => `${n} ${n === 1 ? 'question' : 'questions'}`,
        answers: (n) => `${n} ${n === 1 ? 'answer' : 'answers'}`,
        topicCount: (n) => `${n} ${n === 1 ? 'topic' : 'topics'}`,
        showMore: (n) => `Show ${n} more`,
    },
};

export default function SpeakingAi() {
    const { user, userData, logout } = useAuth();
    const { lang } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [active, setActive] = useState(null); // { topic, sessionId }
    // Mavzular ro'yxatiga qaytilganda tarix qayta o'qiladi — endigina
    // tugatilgan mashg'ulot darhol ko'rinib tursin.
    const [historyKey, setHistoryKey] = useState(0);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    // Part 1 ochiq, qolganlari yopiq: sahifa ochilishida ro'yxat qisqa
    // ko'rinadi, o'quvchi kerakli qismni o'zi ochadi.
    const [openParts, setOpenParts] = useState({ 1: true, 2: false, 3: false });
    const [activePart, setActivePart] = useState(1);

    // Statik baza + o'qituvchi qo'shgan mavzular.
    const { topics } = useSpeakingTopics(userData);
    // Mavzular kesimidagi natijalar — qatordagi ball va oxirgi urinish.
    const { byTopic, overallBand, answerCount } = useSpeakingProgress(user?.uid, historyKey);
    const c = COPY[lang] || COPY.uz;

    const partCounts = useMemo(
        () => PARTS.map((part) => ({ part, count: topics.filter((t) => t.part === part).length })),
        [topics]
    );

    // Sessiya ID bir marta yaratiladi — javoblar Firestore da shu ID ostida
    // to'planadi, o'qituvchi keyin butun mashg'ulotni bir joyda ko'radi.
    const startTopic = useCallback((topic) => {
        setActive({
            topic,
            sessionId: `${user?.uid || 'anon'}_${topic.id}_${Date.now()}`,
        });
    }, [user]);

    // To'liq mock — Part 1 → 2 → 3 bitta sessiyada, har safar boshqa mavzular.
    const startMock = useCallback(() => {
        startTopic(buildMockTopic(topics));
    }, [startTopic, topics]);

    const togglePart = useCallback((part) => {
        setOpenParts((prev) => ({ ...prev, [part]: !prev[part] }));
        setActivePart(part);
    }, []);

    // Chap ustundan part tanlanganda bo'lim ochiladi va o'sha joyga suriladi.
    const selectPart = useCallback((part) => {
        setActivePart(part);
        setOpenParts((prev) => ({ ...prev, [part]: true }));
        document
            .getElementById(`speaking-part-${part}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const goBack = useCallback(() => {
        if (!active) {
            navigate('/dashboard');
            return;
        }
        setActive(null);
        setHistoryKey((prev) => prev + 1);
    }, [active, navigate]);

    // Mashg'ulot boshlanganda sahifa "fokus rejimi" ga o'tadi: header,
    // navigatsiya va sahifa chegaralari yo'qoladi, ekranda faqat sahna
    // qoladi. Chiqish tugmasi sahnaning o'z ichida.
    if (active) {
        return (
            <div className="stage-scrollbar fixed inset-0 z-[60] bg-[#0B0806] text-white font-sans overflow-y-auto lg:overflow-hidden">
                <div className="min-h-full lg:h-full">
                    <SpeakingSession
                        key={active.sessionId}
                        questions={active.topic.questions}
                        topic={active.topic}
                        sessionId={active.sessionId}
                        onExit={goBack}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-500 flex flex-col selection:bg-warm-primary/20 ${isDark ? 'bg-warm-dark text-warm-on-dark' : 'bg-warm-canvas text-warm-ink'
            } font-sans`}>
            <DashboardHeader
                user={user}
                userData={userData}
                activeTab="speaking"
                onLogoutClick={() => setShowLogoutConfirm(true)}
            />

            {/* Mobil sarlavha */}
            <header className={`w-full border-b px-6 py-3 sticky top-0 z-50 md:hidden ${isDark ? 'bg-warm-dark border-white/10' : 'bg-white border-warm-hairline'
                }`}>
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button
                        onClick={goBack}
                        className={`p-2 rounded-full transition-colors ${isDark
                            ? 'hover:bg-white/5 text-warm-on-dark-soft hover:text-warm-on-dark'
                            : 'hover:bg-warm-canvas text-warm-muted hover:text-warm-ink'
                            }`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="font-medium text-sm">{c.badge}</span>
                </div>
            </header>

            <div className="flex-1 w-full flex">
                <SpeakingRoomRail
                    lang={lang}
                    c={c}
                    parts={partCounts}
                    activePart={activePart}
                    onSelectPart={selectPart}
                    onBack={() => navigate('/dashboard')}
                    onStartMock={startMock}
                    overallBand={overallBand}
                    answerCount={answerCount}
                />

                <main className="flex-1 min-w-0 px-5 sm:px-8 py-7 sm:py-8">
                    <div className="max-w-4xl">
                        {/* Xona "eshigi": sokin sarlavha va bitta taklif. */}
                        <div className="relative isolate mb-6">
                            <RoomGlow />
                            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-warm-primary mb-2.5">
                                {c.badge}
                            </p>
                            <h1 className="font-serif-display font-medium text-[40px] sm:text-[52px] leading-none tracking-tight">
                                {c.title}
                            </h1>
                            <p className={`mt-3 max-w-xl text-[15px] leading-relaxed ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'
                                }`}>
                                {c.lead}
                            </p>
                        </div>

                        {/* To'liq mock — chap ustun ko'rinmaydigan ekranlarda
                            (mobil/planshet) shu karta o'sha vazifani bajaradi. */}
                        <button
                            type="button"
                            onClick={startMock}
                            className="lg:hidden group w-full text-left mb-7 p-5 rounded-[14px] border border-warm-primary/30 bg-warm-primary/[0.08] hover:border-warm-primary/60 transition-colors active:scale-[0.995]"
                        >
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-warm-primary">
                                <Sparkles size={11} />
                                {c.mockBadge}
                            </span>
                            <p className="mt-2.5 font-medium text-[17px] tracking-tight">{c.mockTitle}</p>
                            <p className={`mt-1.5 text-xs leading-relaxed ${isDark ? 'text-warm-on-dark-soft' : 'text-warm-body'
                                }`}>
                                {c.mockHint}
                            </p>
                        </button>

                        <SpeakingTopicBrowser
                            topics={topics}
                            statsByTopic={byTopic}
                            lang={lang}
                            c={c}
                            parts={PARTS}
                            openParts={openParts}
                            onTogglePart={togglePart}
                            onStart={startTopic}
                            query={query}
                            onQueryChange={setQuery}
                            filter={filter}
                            onFilterChange={setFilter}
                        />

                        <p className={`mt-8 text-xs leading-relaxed ${isDark ? 'text-warm-on-dark-soft/70' : 'text-warm-muted'
                            }`}>
                            {c.micHint}
                        </p>

                        {/* Oldingi mashg'ulotlar — feedback endi sessiya
                            tugashi bilan yo'qolmaydi. */}
                        <SpeakingMistakes uid={user?.uid} lang={lang} refreshKey={historyKey} />
                        <SpeakingHistory uid={user?.uid} lang={lang} refreshKey={historyKey} />
                    </div>
                </main>
            </div>

            <DashboardModals
                showLogoutConfirm={showLogoutConfirm}
                setShowLogoutConfirm={setShowLogoutConfirm}
                confirmLogout={logout}
            />
        </div>
    );
}
