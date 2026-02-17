import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, orderBy, query, limit, updateDoc, doc } from "firebase/firestore"; // Data fetching
import { useTheme } from '../context/ThemeContext';
import { Trophy, Medal, Star, RefreshCw, Plus, Minus, Search } from 'lucide-react';

export default function AdminGamification() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [recentAwards, setRecentAwards] = useState([]);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            // In a real app, we'd order by 'points' or 'xp'
            // asking for users collection
            const q = query(collection(db, 'users'), limit(50));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                points: d.data().points || 0, // Default existing points
                xp: d.data().xp || 0
            }));

            // Sort client-side for now
            data.sort((a, b) => b.points - a.points);
            setUsers(data);

            // Fetch Recent Awards (Aggregate from users)
            let allAwards = [];
            data.forEach(u => {
                if (u.achievements && Array.isArray(u.achievements)) {
                    u.achievements.forEach(a => allAwards.push({ ...a, userName: u.fullName, userId: u.id }));
                }
            });
            allAwards.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecentAwards(allAwards.slice(0, 5));

        } catch (error) {
            console.error("Error fetching leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePoints = async (userId, amount) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            const newPoints = Math.max(0, user.points + amount);

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, points: newPoints } : u));

            await updateDoc(doc(db, 'users', userId), { points: newPoints });
        } catch (error) {
            console.error("Error updating points:", error);
            fetchLeaderboard(); // Revert on error
        }
    };

    const filteredUsers = users.filter(u => u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- DYNAMIC SEASON ---
    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    };
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();
    const seasonTitle = `Weekly Season #${currentWeek} (${currentYear})`;

    // Reset Season Logic (Mock for now, normally would archive points)
    const handleResetSeason = async () => {
        if (!window.confirm("Are you sure you want to reset the season? This will reset all user points to 0.")) return;
        // Logic to batch update all users points to 0 would go here.
        alert("Season reset functionality coming soon (requires Batch Write for all users).");
    };

    const formatTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-[#1E1E1E] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Gamification Control
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage leaderboard and user rewards</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLeaderboard}
                        className={`p-2 rounded-xl transition ${isDark ? 'bg-[#2C2C2C] hover:bg-[#3B3B3B]' : 'bg-white hover:bg-gray-100'}`}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* GLOBAL STATS */}
                <div className={`p-6 rounded-[24px] border col-span-1 lg:col-span-3 flex justify-between items-center ${isDark ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-white/5' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'}`}>
                    <div>
                        <h3 className="font-bold text-lg mb-1">{seasonTitle}</h3>
                        <p className="opacity-60 text-sm">Ends on Sunday</p>
                    </div>
                    <button
                        onClick={handleResetSeason}
                        className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/30 transition"
                    >
                        Reset Season
                    </button>
                </div>

                {/* LEADERBOARD TABLE */}
                <div className={`lg:col-span-2 rounded-[24px] border overflow-hidden flex flex-col h-[600px] ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <h3 className="font-bold flex items-center gap-2"><Medal size={18} /> Top Students</h3>
                        <div className={`flex items-center px-3 py-1.5 rounded-lg border ${isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                            <Search size={14} className="opacity-50 mr-2" />
                            <input
                                type="text"
                                placeholder="Search student..."
                                className="bg-transparent border-none outline-none text-sm w-32"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center opacity-50">Loading...</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#2C2C2C]' : 'bg-white'}`}>
                                    <tr>
                                        <th className="p-4 text-xs font-bold uppercase opacity-50">Rank</th>
                                        <th className="p-4 text-xs font-bold uppercase opacity-50">Student</th>
                                        <th className="p-4 text-xs font-bold uppercase opacity-50 text-right">Points</th>
                                        <th className="p-4 text-xs font-bold uppercase opacity-50 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map((user, idx) => (
                                        <tr key={user.id} className={`transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500 text-white' :
                                                    idx === 1 ? 'bg-gray-400 text-white' :
                                                        idx === 2 ? 'bg-orange-700 text-white' :
                                                            isDark ? 'bg-white/10' : 'bg-gray-100'
                                                    }`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {user.fullName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{user.fullName}</p>
                                                        <p className="text-xs opacity-50">Lvl {Math.floor(user.points / 1000) + 1}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-yellow-500">
                                                {user.points.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdatePoints(user.id, 50)}
                                                        className={`p-1.5 rounded-lg transition ${isDark ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                        title="+50 Points"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdatePoints(user.id, -50)}
                                                        className={`p-1.5 rounded-lg transition ${isDark ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                        title="-50 Points"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* RECENT AWARDS */}
                <div className={`rounded-[24px] border p-6 ${isDark ? 'bg-[#2C2C2C] border-white/5' : 'bg-white border-gray-200'}`}>
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Star className="text-yellow-500" size={18} /> Recent Awards</h3>
                    <div className="space-y-4">
                        {recentAwards.length > 0 ? (
                            recentAwards.map((award, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                        <Medal size={20} className="text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{award.title || 'Achievement Unlocked'}</p>
                                        <p className="text-xs opacity-50">Awarded to <span className="text-blue-500">{award.userName}</span></p>
                                        <p className="text-[10px] opacity-40 mt-1">{formatTimeAgo(award.date)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center opacity-50 text-sm py-4">No recent awards found</div>
                        )}
                    </div>
                    <button className="w-full mt-6 py-3 rounded-xl border border-dashed font-bold text-sm opacity-50 hover:opacity-100 transition border-current">
                        View All History
                    </button>
                </div>
            </div>
        </div>
    );
}
