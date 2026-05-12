import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, query, limit, updateDoc, doc, writeBatch } from "firebase/firestore";
import { toast } from 'react-hot-toast';

export function useAdminGamification() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [recentAwards, setRecentAwards] = useState([]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), limit(100)); // Increased limit
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                points: d.data().points || 0,
                xp: d.data().xp || 0
            }));

            data.sort((a, b) => b.points - a.points);
            setUsers(data);

            // Fetch Recent Awards efficiently
            let allAwards = [];
            data.forEach(u => {
                if (u.achievements && Array.isArray(u.achievements)) {
                    u.achievements.forEach(a => allAwards.push({ ...a, userName: u.fullName, userId: u.id }));
                }
            });
            allAwards.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecentAwards(allAwards.slice(0, 10));

        } catch (error) {
            toast.error("Ma'lumotlarni yuklashda xatolik!");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const handleUpdatePoints = async (userId, amount) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            const newPoints = Math.max(0, user.points + amount);
            
            // Optimistic Update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: newPoints } : u).sort((a, b) => b.points - a.points));

            await updateDoc(doc(db, 'users', userId), { points: newPoints });
            toast.success(`${amount > 0 ? '+' : ''}${amount} ball yangilandi`);
        } catch (error) {
            toast.error("Ballni yangilab bo'lmadi");
            fetchLeaderboard();
        }
    };

    const handleResetSeason = async () => {
        const resetToast = toast.loading("Mavsum yangilanmoqda...");
        try {
            const batch = writeBatch(db);
            users.forEach(u => {
                if (u.points > 0) {
                    batch.update(doc(db, 'users', u.id), { points: 0 });
                }
            });
            await batch.commit();
            toast.success("Mavsum muvaffaqiyatli yangilandi!", { id: resetToast });
            fetchLeaderboard();
        } catch (error) {
            toast.error("Xatolik yuz berdi", { id: resetToast });
        }
    };

    const filteredUsers = users.filter(u => 
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        loading,
        users: filteredUsers,
        searchTerm,
        setSearchTerm,
        recentAwards,
        handleUpdatePoints,
        handleResetSeason,
        refresh: fetchLeaderboard
    };
}
