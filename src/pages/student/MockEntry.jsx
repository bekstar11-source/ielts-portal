/**
 * /mock — o'quvchining mock imtihonlari sahifasi.
 *
 * Sahifa faqat holatni boshqaradi va ko'rsatadi: ma'lumot yuklash va sana
 * yozish `useStudentMocks` ichida, vizual bloklar esa
 * `components/student/mock/` da.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowClockwise } from '@phosphor-icons/react';

import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { functions } from '../../firebase/firebase';
import useStudentMocks from '../../hooks/useStudentMocks';

import MockAccessPanel from '../../components/student/mock/MockAccessPanel';
import MockTestList from '../../components/student/mock/MockTestList';
import MockActivatedModal from '../../components/student/mock/MockActivatedModal';
import MockScheduleModal from '../../components/student/mock/MockScheduleModal';
import MockInterfacePresentation from '../../components/student/mock/MockInterfacePresentation';
import { MUTED_CLS } from '../../components/student/mock/mockHelpers';

import SiteFooter from '../../components/common/SiteFooter';
import BottomNav from '../../components/dashboard/BottomNav';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardModals from '../../components/dashboard/DashboardModals';
import PricingModal from '../../components/dashboard/PricingModal';

/**
 * Callable funksiya xatosini foydalanuvchi tiliga o'giradi.
 * Ilgari `err.message` to'g'ridan-to'g'ri chiqarilardi — prod'da bu ko'pincha
 * "internal" degan tushunarsiz matn bo'lardi.
 */
function keyErrorMessage(err, t) {
    const code = String(err?.code || '').replace('functions/', '');
    if (code === 'not-found') return t('mock.keyNotFound');
    if (code === 'failed-precondition') return t('mock.keyUsed');
    if (code === 'invalid-argument') return t('mock.keyEmpty');
    if (code === 'unauthenticated') return t('mock.keyAuthError');
    if (code === 'unavailable' || code === 'deadline-exceeded') return t('mock.networkError');
    // Server o'zi tushunarli matn qaytargan bo'lsa (masalan "tarkibi to'liq
    // sozlanmagan"), uni yashirmaymiz.
    return err?.message || t('mock.unexpectedError');
}

export default function MockEntry() {
    const { user, userData, logout } = useAuth();
    const { t, lang } = useTranslation();
    const navigate = useNavigate();

    const { upcoming, past, loading, error, refresh, setSchedule } = useStudentMocks(user?.uid);

    const [mockKey, setMockKey] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [keyError, setKeyError] = useState('');
    const [activatedMock, setActivatedMock] = useState(null);

    const [schedulingMock, setSchedulingMock] = useState(null);
    const [savingSchedule, setSavingSchedule] = useState(false);

    const [activeTab, setActiveTab] = useState('upcoming');
    const [search, setSearch] = useState('');

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);

    useEffect(() => {
        const handleOpenPricing = () => setShowPricingModal(true);
        window.addEventListener('open-pricing', handleOpenPricing);
        return () => window.removeEventListener('open-pricing', handleOpenPricing);
    }, []);

    const visibleMocks = useMemo(() => {
        const source = activeTab === 'past' ? past : upcoming;
        const term = search.trim().toLowerCase();
        if (!term) return source;
        return source.filter((m) => (
            String(m.title || '').toLowerCase().includes(term) ||
            String(m.mockKey || '').toLowerCase().includes(term)
        ));
    }, [activeTab, past, upcoming, search]);

    const startExam = useCallback((mock) => {
        navigate('/mock-exam', { state: { mockData: mock } });
    }, [navigate]);

    const handleVerifyKey = async (e) => {
        if (e) e.preventDefault();
        const key = mockKey.trim().toUpperCase();
        if (!key || verifying) return;

        setVerifying(true);
        setKeyError('');

        try {
            const verifyAccessKey = httpsCallable(functions, 'verifyAccessKey');
            const res = await verifyAccessKey({ key });

            if (!res.data?.success) throw new Error(t('mock.unexpectedError'));

            setMockKey('');
            refresh();

            // Kalit alohida testni ochgan bo'lishi ham mumkin. Ilgari bunday
            // holatda ham "imtihonni boshlash" oynasi chiqib, mock bo'lmagan
            // tayinlov bilan /mock-exam ochilardi va u yerda buzilardi.
            if (!res.data.isMock) {
                toast.success(t('mock.notAMockKey'));
                return;
            }

            setActivatedMock(res.data.assignment);
            setActiveTab('upcoming');
        } catch (err) {
            setKeyError(keyErrorMessage(err, t));
        } finally {
            setVerifying(false);
        }
    };

    const saveSchedule = async (date) => {
        if (!schedulingMock) return;
        setSavingSchedule(true);
        try {
            await setSchedule(schedulingMock.id, date);
            toast.success(date ? t('mock.scheduleSaved') : t('mock.scheduleCleared'));
            setSchedulingMock(null);
            setActiveTab('upcoming');
        } catch (err) {
            // Ilgari bu xato faqat konsolga tushardi va foydalanuvchi sana
            // saqlanmaganini bilmasdi.
            console.error('Mock sanasini saqlashda xatolik:', err);
            toast.error(t('mock.scheduleFailed'));
        } finally {
            setSavingSchedule(false);
        }
    };

    const firstName = userData?.fullName?.split(' ')[0] || t('mock.candidate');

    return (
        <div className="min-h-screen bg-warm-canvas dark:bg-warm-dark font-sans text-warm-ink dark:text-warm-on-dark antialiased flex flex-col selection:bg-warm-primary/30 selection:text-warm-ink transition-colors duration-200 pb-16 md:pb-0">
            <DashboardHeader
                user={user}
                userData={userData}
                activeTab="mock"
                onLogoutClick={() => setShowLogoutConfirm(true)}
            />

            <header className="w-full border-b border-warm-hairline dark:border-white/10 px-5 py-3 sticky top-0 z-40 bg-warm-canvas dark:bg-warm-dark md:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        aria-label={t('roadmap.backToDashboard')}
                        className={`p-2 -ml-2 rounded-lg transition-colors hover:bg-warm-surface dark:hover:bg-white/5 ${MUTED_CLS}`}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="text-[15px] font-medium">{t('mock.pageTitle')}</span>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-12 space-y-10 pb-20">
                <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-warm-display-sm font-normal">{t('mock.pageTitle')}</h1>
                        <p className={`text-[14px] mt-2 max-w-xl ${MUTED_CLS}`}>{t('mock.pageSubtitle')}</p>
                        <p className={`text-[13px] mt-1 ${MUTED_CLS}`}>
                            {t('mock.welcome')}, {firstName} · {user?.email}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className={`shrink-0 inline-flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-lg transition-colors hover:bg-warm-surface dark:hover:bg-white/5 disabled:opacity-50 ${MUTED_CLS}`}
                    >
                        <ArrowClockwise size={15} className={loading ? 'animate-spin' : undefined} />
                        {t('mock.refresh')}
                    </button>
                </section>

                <MockAccessPanel
                    t={t}
                    mockKey={mockKey}
                    setMockKey={(value) => { setMockKey(value); if (keyError) setKeyError(''); }}
                    onSubmit={handleVerifyKey}
                    loading={verifying}
                    activated={Boolean(activatedMock)}
                    error={keyError}
                    onGoToStore={() => navigate('/mock-buy')}
                />

                <MockTestList
                    t={t}
                    lang={lang}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    upcomingCount={upcoming.length}
                    pastCount={past.length}
                    mocks={visibleMocks}
                    search={search}
                    setSearch={setSearch}
                    loading={loading}
                    error={error}
                    userData={userData}
                    onStart={startExam}
                    onSchedule={setSchedulingMock}
                    onReview={(test) => navigate(`/review/${test.resultId || test.id}`)}
                    onGoToStore={() => navigate('/mock-buy')}
                />

                <MockInterfacePresentation t={t} />
            </main>

            <SiteFooter />
            <BottomNav activeTab="mock" />

            <MockActivatedModal
                open={Boolean(activatedMock)}
                onClose={() => setActivatedMock(null)}
                t={t}
                onStartNow={() => {
                    const mock = activatedMock;
                    setActivatedMock(null);
                    startExam(mock);
                }}
                onScheduleLater={() => {
                    setSchedulingMock(activatedMock);
                    setActivatedMock(null);
                }}
            />

            <MockScheduleModal
                open={Boolean(schedulingMock)}
                onClose={() => setSchedulingMock(null)}
                t={t}
                lang={lang}
                mock={schedulingMock}
                onConfirm={saveSchedule}
                onClear={() => saveSchedule(null)}
                loading={savingSchedule}
            />

            <DashboardModals
                showLogoutConfirm={showLogoutConfirm}
                setShowLogoutConfirm={setShowLogoutConfirm}
                confirmLogout={logout}
            />
            <PricingModal
                isOpen={showPricingModal}
                onClose={() => setShowPricingModal(false)}
                userName={userData?.fullName?.split(' ')[0]}
            />
        </div>
    );
}
