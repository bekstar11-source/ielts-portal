import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BADGES = [
    { min: 0, label: "Newbie", color: "text-gray-400", icon: User },
    { min: 100, label: "Scholar", color: "text-blue-500", icon: Star },
    { min: 500, label: "Master", color: "text-purple-500", icon: Medal },
    { min: 1000, label: "Legend", color: "text-[#F44A22]", icon: Crown }
];

const getBadge = (points) => {
    return BADGES.slice().reverse().find(b => points >= b.min) || BADGES[0];
};

export default function Leaderboard() {
    const { user } = useAuth();
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                // 🔥 FIX: SessionStorage cache — 5 daqiqalik
                const CACHE_KEY = 'leaderboard_data';
                const CACHE_TIME_KEY = 'leaderboard_time';
                const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 5 * 60 * 1000);

                if (isCacheValid) {
                    const cached = sessionStorage.getItem(CACHE_KEY);
                    if (cached) {
                        setLeaders(JSON.parse(cached));
                        setLoading(false);
                        return;
                    }
                }

                // Query users sorted by points
                const q = query(
                    collection(db, 'users'),
                    orderBy('gamification.points', 'desc'),
                    limit(10)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Cache ga saqlash
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
                sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

                setLeaders(data);
            } catch (error) {
                console.error("Leaderboard error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaders();
    }, []);

    return (
        <div className="max-w-2xl mx-auto mt-8 bg-white border border-vetra-grey/60 rounded-3xl p-6 relative overflow-hidden shadow-sm">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50 rounded-full blur-[80px] pointer-events-none"></div>

            <h3 className="text-xl font-bold text-vetra-midnight mb-6 flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Top O'quvchilar
            </h3>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-vetra-grey/30 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-3">
                    {leaders.map((leader, index) => {
                        const badge = getBadge(leader.gamification?.points || 0);
                        const isMe = leader.id === user?.uid;

                        return (
                            <motion.div
                                key={leader.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isMe
                                    ? 'bg-[#F44A22]/5 border-[#F44A22]/30 shadow-sm'
                                    : 'bg-vetra-silver/50 border-vetra-grey/40 hover:bg-vetra-silver'
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg rounded-full ${index === 0 ? 'bg-yellow-500 text-white' :
                                    index === 1 ? 'bg-gray-300 text-vetra-midnight' :
                                        index === 2 ? 'bg-amber-600 text-white' :
                                            'text-vetra-stone bg-vetra-grey/40'
                                    }`}>
                                    {index + 1}
                                </div>

                                {/* Avatar & Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold truncate ${isMe ? 'text-[#F44A22]' : 'text-vetra-midnight'}`}>
                                            {leader.fullName || "Foydalanuvchi"}
                                        </h4>
                                        {index === 0 && <Crown size={14} className="text-yellow-500" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`flex items-center gap-1 ${badge.color}`}>
                                            <badge.icon size={10} /> {badge.label}
                                        </span>
                                        <span className="text-vetra-grey">•</span>
                                        <span className="text-vetra-stone">{(leader.stats?.totalTests || 0)} ta test</span>
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="text-right">
                                    <div className="text-vetra-midnight font-bold text-lg">
                                        {leader.gamification?.points || 0}
                                    </div>
                                    <div className="text-xs text-vetra-stone uppercase">XP</div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {leaders.length === 0 && (
                        <div className="text-center py-8 text-vetra-stone">
                            Hozircha ma'lumot yo'q.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
