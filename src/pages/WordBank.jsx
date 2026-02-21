import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { BookOpen, Search, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Wordbank() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredWords = words.filter(w =>
        w.word.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 pb-20 font-sans">
            <div className="max-w-4xl mx-auto">
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

                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="So'zlarni qidirish..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredWords.map((item, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={item.id}
                                className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-blue-500/30 hover:bg-white/10 transition-all group relative flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">{item.word}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {item.addedAt?.toDate ? new Date(item.addedAt.toDate()).toLocaleDateString('uz-UZ') : 'Yaqinda qo\'shilgan'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="O'chirish"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
