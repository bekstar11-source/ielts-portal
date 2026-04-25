// src/pages/Podcasts.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import SiteFooter from "../components/common/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { Headphones, Play, Clock, BarChart } from "lucide-react";

const DIFF_LABELS = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    super_hard: "Super Hard",
};

export default function Podcasts() {
    const { user, userData } = useAuth();
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPodcasts = async () => {
            try {
                const q = query(
                    collection(db, "podcasts"),
                    where("status", "==", "published"),
                    orderBy("createdAt", "desc")
                );
                const snap = await getDocs(q);
                setPodcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Error fetching podcasts:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcasts();
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <DashboardHeader user={user} userData={userData} activeTab="podcasts" />
            
            <main className="max-w-7xl mx-auto px-6 py-12 pb-24">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Headphones size={24} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Podcast Mastery</span>
                    </div>
                    <h1 className="text-[42px] font-bold text-[#1d1d1f] tracking-tight leading-tight">
                        IELTS Listening <br /> Podcastlar To'plami
                    </h1>
                    <p className="text-[#86868b] text-lg mt-4 max-w-2xl">
                        Ingliz tilini eshitib tushunish ko'nikmangizni interaktiv podcastlar orqali oshiring. Har bir podcast sinxron matn va mashqlar bilan boyitilgan.
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : podcasts.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-50 rounded-[32px]">
                        <p className="text-zinc-400 font-medium">Hozircha podcastlar mavjud emas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {podcasts.map((podcast) => (
                            <div 
                                key={podcast.id}
                                onClick={() => {
                                    if (podcast.mode === 'spotify') navigate(`/podcast/spotify/${podcast.id}`);
                                    else navigate(`/podcast/${podcast.id}`);
                                }}
                                className="group cursor-pointer bg-white border border-zinc-100 rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-1"
                            >
                                <div className="relative aspect-[16/10] bg-zinc-100 overflow-hidden">
                                    <img 
                                        src={podcast.thumbnail || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"} 
                                        alt={podcast.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                            <Play size={24} className="text-indigo-600 fill-indigo-600 ml-1" />
                                        </div>
                                    </div>
                                    <div className="absolute top-4 left-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 
                                            ${podcast.difficulty === 'easy' ? 'bg-emerald-500/80 text-white' : 
                                              podcast.difficulty === 'medium' ? 'bg-amber-500/80 text-white' : 
                                              'bg-rose-500/80 text-white'}`}
                                        >
                                            {DIFF_LABELS[podcast.difficulty] || podcast.difficulty}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-[#1d1d1f] mb-2 line-clamp-1">{podcast.title}</h3>
                                    <p className="text-[#86868b] text-sm line-clamp-2 mb-6">
                                        {podcast.description || "IELTS Listening ko'nikmalarini oshirish uchun interaktiv dictation va savollar to'plami."}
                                    </p>
                                    <div className="flex items-center gap-4 text-[12px] font-bold text-zinc-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            <span>{Math.round(podcast.duration / 60) || 5} min</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <BarChart size={14} />
                                            <span>{podcast.level || "B2"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <SiteFooter />
        </div>
    );
}
