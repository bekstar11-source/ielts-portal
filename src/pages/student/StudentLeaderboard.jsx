import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, limit, where, getCountFromServer, orderBy } from "firebase/firestore";
import { Trophy, Medal, Star, Target, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import SiteFooter from '../../components/common/SiteFooter';
import { useTranslation } from '../../context/LanguageContext';

export default function StudentLeaderboard() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actualRank, setActualRank] = useState(null);

    useEffect(() => {
        if (user && userData !== undefined) {
            fetchLeaderboard();
        }
    }, [user, userData]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                points: d.data().points || 0
            }));

            const usersWithStats = data.map(u => {
                const bestR = u.bestReadingBand || 0;
                const bestL = u.bestListeningBand || 0;
                
                let avg = 0;
                if (bestR > 0 && bestL > 0) avg = (bestR + bestL) / 2;
                else if (bestR > 0) avg = bestR;
                else if (bestL > 0) avg = bestL;

                return { ...u, avgBand: avg > 0 ? avg.toFixed(1) : null };
            });

            setUsers(usersWithStats);

            if (user) {
                const rankIndex = usersWithStats.findIndex(u => u.id === user.uid);
                if (rankIndex >= 0) {
                    setActualRank(rankIndex + 1);
                } else {
                    const userPoints = userData?.points || 0;
                    const rankQuery = query(collection(db, 'users'), where('points', '>', userPoints));
                    const countSnap = await getCountFromServer(rankQuery);
                    setActualRank(countSnap.data().count + 1);
                    
                    const bestR = userData?.bestReadingBand || 0;
                    const bestL = userData?.bestListeningBand || 0;
                    let avg = 0;
                    if (bestR > 0 && bestL > 0) avg = (bestR + bestL) / 2;
                    else if (bestR > 0) avg = bestR;
                    else if (bestL > 0) avg = bestL;
                    setActualUserAvgBand(avg > 0 ? avg.toFixed(1) : null);
                }
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const [migrating, setMigrating] = useState(false);
    const handleMigrateStats = async () => {
        if (!window.confirm(t('leaderboard.confirmRecalculate'))) return;
        setMigrating(true);
        try {
            for (const u of users) {
                const rq = query(collection(db, 'results'), where('userId', '==', u.id));
                const rsnap = await getDocs(rq);
                const userResults = rsnap.docs.map(d => d.data());
                
                const rScores = userResults.filter(r => r.type?.toLowerCase() === 'reading').map(r => parseFloat(r.bandScore || r.score || 0)).filter(s => s > 0);
                const lScores = userResults.filter(r => r.type?.toLowerCase() === 'listening').map(r => parseFloat(r.bandScore || r.score || 0)).filter(s => s > 0);
                
                const bestR = rScores.length > 0 ? Math.max(...rScores) : 0;
                const bestL = lScores.length > 0 ? Math.max(...lScores) : 0;
                
                if (bestR > 0 || bestL > 0) {
                    const userRef = doc(db, "users", u.id);
                    const updateData = {};
                    if (bestR > 0) updateData.bestReadingBand = bestR;
                    if (bestL > 0) updateData.bestListeningBand = bestL;
                    await updateDoc(userRef, updateData);
                }
            }
            alert(t('leaderboard.successUpdate'));
            fetchLeaderboard();
        } catch (e) {
            console.error(e);
            alert(t('leaderboard.errorUpdate').replace('{error}', e.message));
        } finally {
            setMigrating(false);
        }
    };

    const [actualUserAvgBand, setActualUserAvgBand] = useState(null);

    const currentUserPoints = userData?.points || 0;

    return (
        <div className="min-h-screen bg-[#F5F5F7] font-sans selection:bg-black selection:text-white">
            <DashboardHeader user={user} userData={userData} />

            <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                {/* Header Section */}
                <div className="text-center mb-16 animate-fade-in-up">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trophy size={32} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-3">
                        {t('leaderboard.title')}
                    </h1>
                    <p className="text-base text-black/50 font-medium max-w-lg mx-auto">
                        {t('leaderboard.subtitle')}
                    </p>
                    <button 
                        onClick={() => navigate('/statistics')}
                        className="mt-6 inline-flex items-center gap-2 bg-white border border-black/5 text-black px-6 py-2.5 rounded-full text-xs font-bold hover:bg-black hover:text-white transition-all active:scale-95 shadow-sm hover:shadow-xl hover:shadow-black/10 group"
                    >
                        <Activity size={16} className="text-blue-500 group-hover:text-white transition-colors" />
                        {t('leaderboard.myStats')}
                    </button>
                </div>

                {/* Current User Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/[0.03] flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                            <Star size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-0.5">{t('leaderboard.yourPoints')}</p>
                            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">{currentUserPoints} <span className="text-sm text-black/40 font-medium tracking-normal ml-1">XP</span></h2>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/[0.03] flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center shrink-0">
                            <Medal size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-0.5">{t('leaderboard.yourRank')}</p>
                            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                                {actualRank !== null ? `#${actualRank}` : "—"} 
                                <span className="text-sm text-black/40 font-medium tracking-normal ml-1">{t('leaderboard.overallRank')}</span>
                            </h2>
                        </div>
                    </div>
                </div>

                {/* How to earn points */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/[0.03] mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <h3 className="text-lg font-bold text-[#1D1D1F] mb-5">{t('leaderboard.howToEarn')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <Target className="text-blue-500 mb-2" size={20} />
                            <h4 className="font-bold text-[#1D1D1F] text-sm mb-1">{t('leaderboard.solveTests')}</h4>
                            <p className="text-xs text-black/50 font-medium leading-relaxed">{t('leaderboard.solveTestsDesc')}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <Activity className="text-green-500 mb-2" size={20} />
                            <h4 className="font-bold text-[#1D1D1F] text-sm mb-1">{t('leaderboard.listenPodcasts')}</h4>
                            <p className="text-xs text-black/50 font-medium leading-relaxed">{t('leaderboard.listenPodcastsDesc')}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <Star className="text-purple-500 mb-2" size={20} />
                            <h4 className="font-bold text-[#1D1D1F] text-sm mb-1">{t('leaderboard.readArticles')}</h4>
                            <p className="text-xs text-black/50 font-medium leading-relaxed">{t('leaderboard.readArticlesDesc')}</p>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-black/[0.03] overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <div className="p-5 md:p-6 border-b border-black/[0.03] flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-[#1D1D1F]">{t('leaderboard.top10')}</h3>
                            <p className="text-xs text-black/40 font-medium mt-0.5">{t('leaderboard.activeStudentsDesc')}</p>
                        </div>
                        {(userData?.role === 'admin' || user?.email === 'bekstar11@gmail.com') && (
                            <button 
                                onClick={handleMigrateStats}
                                disabled={migrating}
                                className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-600 disabled:opacity-50"
                            >
                                {migrating ? t('leaderboard.updating') : t('leaderboard.updateData')}
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">{t('leaderboard.rank')}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">{t('leaderboard.student')}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-center">{t('leaderboard.band')}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">{t('leaderboard.xp')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.03]">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-black/40 font-medium">
                                            {t('leaderboard.loading')}
                                        </td>
                                    </tr>
                                ) : users.map((u, idx) => {
                                    const isCurrentUser = u.id === user?.uid;
                                    return (
                                        <tr key={u.id} className={`transition-colors hover:bg-gray-50/50 ${isCurrentUser ? 'bg-blue-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                                                    idx === 0 ? 'bg-yellow-100 text-yellow-600' :
                                                    idx === 1 ? 'bg-gray-200 text-gray-700' :
                                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-inner shrink-0">
                                                        {u.fullName?.charAt(0) || "U"}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#1D1D1F] text-[13px] leading-tight">
                                                            {u.fullName || t('leaderboard.unknownUser')}
                                                            {isCurrentUser && <span className="ml-1.5 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold">{t('leaderboard.you')}</span>}
                                                        </p>
                                                        <p className="text-[10px] text-black/40 font-medium">Level {Math.floor(u.points / 100) + 1}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {u.avgBand ? (
                                                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-[13px] ${
                                                        parseFloat(u.avgBand) >= 7.0 ? 'bg-emerald-50 text-emerald-600' :
                                                        parseFloat(u.avgBand) >= 6.0 ? 'bg-blue-50 text-blue-600' :
                                                        'bg-gray-50 text-gray-500'
                                                    }`}>
                                                        {u.avgBand}
                                                    </span>
                                                ) : (
                                                    <span className="text-black/10 font-bold">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="font-mono font-bold text-blue-600 text-base">
                                                    {u.points.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!loading && actualRank > 10 && (
                                    <>
                                        <tr>
                                            <td colSpan="4" className="px-6 py-2 text-center text-black/20 font-bold bg-gray-50/20 tracking-widest">
                                                ...
                                            </td>
                                        </tr>
                                        <tr className="bg-blue-50/40 border-t border-blue-100/50">
                                            <td className="px-6 py-4">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm bg-blue-100 text-blue-700 shadow-sm">
                                                    {actualRank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-inner shrink-0">
                                                        {userData?.fullName?.charAt(0) || "S"}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#1D1D1F] text-[13px] leading-tight">
                                                            {userData?.fullName || t('leaderboard.you')}
                                                            <span className="ml-1.5 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold">{t('leaderboard.you')}</span>
                                                        </p>
                                                        <p className="text-[10px] text-black/40 font-medium">Level {Math.floor((userData?.points || 0) / 100) + 1}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {actualUserAvgBand ? (
                                                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-[13px] ${
                                                        parseFloat(actualUserAvgBand) >= 7.0 ? 'bg-emerald-50 text-emerald-600' :
                                                        parseFloat(actualUserAvgBand) >= 6.0 ? 'bg-blue-50 text-blue-600' :
                                                        'bg-gray-50 text-gray-500'
                                                    }`}>
                                                        {actualUserAvgBand}
                                                    </span>
                                                ) : (
                                                    <span className="text-black/10 font-bold">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="font-mono font-bold text-blue-600 text-base">
                                                    {(userData?.points || 0).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    </>
                                )}
                                {!loading && users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-black/40 font-medium">
                                            {t('leaderboard.noXP')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <SiteFooter />
            
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
            `}</style>
        </div>
    );
}
