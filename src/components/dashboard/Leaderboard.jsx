import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BADGES = [
    { min: 0, label: "Newbie", color: "text-gray-400", icon: User },
    { min: 100, label: "Scholar", color: "text-blue-400", icon: Star },
    { min: 500, label: "Master", color: "text-purple-400", icon: Medal },
    { min: 1000, label: "Legend", color: "text-orange-500", icon: Crown }
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
                // Query users sorted by points
                // Note: Index might be required: users -> gamification.points DESC
                const q = query(
                    collection(db, 'users'),
                    orderBy('gamification.points', 'desc'),
                    limit(10)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
            {/* Glossy Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Top O'quvchilar
            </h3>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
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
                                    ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(255,85,32,0.1)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg rounded-full ${index === 0 ? 'bg-yellow-500 text-black' :
                                    index === 1 ? 'bg-gray-300 text-black' :
                                        index === 2 ? 'bg-amber-600 text-white' :
                                            'text-gray-500 bg-white/5'
                                    }`}>
                                    {index + 1}
                                </div>

                                {/* Avatar & Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold truncate ${isMe ? 'text-orange-400' : 'text-white'}`}>
                                            {leader.fullName || "Foydalanuvchi"}
                                        </h4>
                                        {index === 0 && <Crown size={14} className="text-yellow-500" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`flex items-center gap-1 ${badge.color}`}>
                                            <badge.icon size={10} /> {badge.label}
                                        </span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-gray-400">{(leader.stats?.totalTests || 0)} ta test</span>
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="text-right">
                                    <div className="text-white font-bold text-lg">
                                        {leader.gamification?.points || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase">XP</div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {leaders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            Hozircha ma'lumot yo'q.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
