import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { FaBullhorn, FaInfoCircle, FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnnouncementsBoard() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // 🔥 FIX: 15 daqiqalik sessionStorage cache
                const CACHE_KEY = 'announcements_data';
                const CACHE_TIME_KEY = 'announcements_time';
                const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
                const isCacheValid = cachedTime && (Date.now() - parseInt(cachedTime) < 15 * 60 * 1000);

                if (isCacheValid) {
                    const cached = sessionStorage.getItem(CACHE_KEY);
                    if (cached) {
                        setAnnouncements(JSON.parse(cached));
                        setLoading(false);
                        return;
                    }
                }

                // Faqat oxirgi 5 ta e'lonni olamiz
                const q = query(
                    collection(db, 'announcements'),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Cache ga saqlash
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
                sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

                setAnnouncements(data);
            } catch (error) {
                console.error("News Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    if (loading || announcements.length === 0 || !visible) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <FaExclamationTriangle className="text-orange-500" />;
            case 'success': return <FaCheck className="text-green-500" />;
            case 'danger': return <FaExclamationTriangle className="text-red-500" />;
            default: return <FaInfoCircle className="text-blue-500" />;
        }
    };

    const getBg = (type) => {
        switch (type) {
            case 'warning': return 'bg-orange-500/10 border-orange-500/20';
            case 'success': return 'bg-green-500/10 border-green-500/20';
            case 'danger': return 'bg-red-500/10 border-red-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="mb-10 w-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaBullhorn className="text-yellow-500" />
                        E'lonlar Doskasi
                    </h2>
                </div>
                {/* <button onClick={() => setVisible(false)} className="text-white/20 hover:text-white"><FaTimes /></button> */}
            </div>

            <div className="grid gap-4">
                {announcements.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-2xl border flex items-start gap-4 backdrop-blur-sm ${getBg(item.type)}`}
                    >
                        <div className="mt-1 text-lg">{getIcon(item.type)}</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white text-sm md:text-base mb-1">{item.title}</h3>
                            <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">{item.message}</p>
                            <p className="text-white/20 text-[10px] mt-2">
                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : ''}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
