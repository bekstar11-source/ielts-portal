import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ArrowRight, Target, Zap } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import PlanetBackground from '../components/dashboard/PlanetBackground';

export default function DiagnosticResult() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            if (!id) return navigate('/dashboard');
            try {
                const docRef = doc(db, 'results', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setResult(docSnap.data());
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error(err);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [id, navigate]);

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Yuklanmoqda...</div>;
    if (!result) return null;

    const currentBand = result.bandScore || 0;
    const targetBand = userData?.targetBand || 7.0;
    const gap = (targetBand - currentBand).toFixed(1);

    const chartData = [
        { name: "Current", value: currentBand, fill: "#FF5520" },
        { name: "Target", value: targetBand, fill: "rgba(255,255,255,0.1)" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#020b1c] to-[#06193b] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Style definition matching DiagnosticIntro */}
            <style>{`
                .diag-result-stars {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-image:
                        radial-gradient(1px 1px at 50px 50px, #ffffff, transparent),
                        radial-gradient(1.5px 1.5px at 150px 100px, rgba(255,255,255,0.8), transparent),
                        radial-gradient(1px 1px at 250px 200px, #ffffff, transparent),
                        radial-gradient(2px 2px at 350px 50px, rgba(255,255,255,0.6), transparent),
                        radial-gradient(1px 1px at 100px 300px, #ffffff, transparent),
                        radial-gradient(1px 1px at 400px 250px, rgba(255,255,255,0.9), transparent),
                        radial-gradient(1.5px 1.5px at 500px 150px, #ffffff, transparent),
                        radial-gradient(1px 1px at 50px 400px, rgba(255,255,255,0.7), transparent);
                    background-size: 550px 450px;
                    opacity: 0.7;
                    z-index: 1;
                }

                .diag-result-planet {
                    position: absolute;
                    top: 85vh;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 200vw;
                    height: 200vw;
                    border-radius: 50%;
                    background: radial-gradient(circle, #000000 75%, #03122b 88%, #0a3580 95%, rgba(0, 150, 255, 0.8) 100%);
                    box-shadow:
                        inset 0 0 80px rgba(0, 150, 255, 0.7),
                        0 -3px 10px rgba(255, 255, 255, 0.7),
                        0 -10px 30px rgba(0, 150, 255, 0.6),
                        0 -30px 80px rgba(0, 100, 255, 0.4),
                        0 -80px 150px rgba(0, 50, 150, 0.2);
                    z-index: 2;
                    animation: diag-pulseGlow 6s infinite ease-in-out;
                }

                @keyframes diag-pulseGlow {
                    0% { box-shadow: inset 0 0 80px rgba(0, 150, 255, 0.7), 0 -3px 10px rgba(255,255,255,0.7), 0 -10px 30px rgba(0,150,255,0.6), 0 -30px 80px rgba(0,100,255,0.4), 0 -80px 150px rgba(0,50,150,0.2); }
                    50% { box-shadow: inset 0 0 120px rgba(0, 150, 255, 0.9), 0 -3px 12px rgba(255,255,255,0.9), 0 -15px 40px rgba(0,150,255,0.8), 0 -40px 100px rgba(0,100,255,0.5), 0 -100px 180px rgba(0,50,150,0.3); }
                    100% { box-shadow: inset 0 0 80px rgba(0, 150, 255, 0.7), 0 -3px 10px rgba(255,255,255,0.7), 0 -10px 30px rgba(0,150,255,0.6), 0 -30px 80px rgba(0,100,255,0.4), 0 -80px 150px rgba(0,50,150,0.2); }
                }

                @media (max-width: 768px) {
                    .diag-result-planet {
                        width: 300vw;
                        height: 300vw;
                        top: 80vh;
                    }
                }
            `}</style>

            {/* Background Elements */}
            <div className="diag-result-stars"></div>
            <div className="diag-result-planet"></div>

            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[3]">
                {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"
                        style={{
                            width: Math.random() * 3 + 1,
                            height: Math.random() * 3 + 1,
                            left: `${Math.random() * 100}%`,
                            bottom: `-10%`,
                        }}
                        animate={{
                            y: [0, -1200],
                            opacity: [0, 0.8, 0],
                        }}
                        transition={{
                            duration: Math.random() * 15 + 10,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring", delay: 0.2 }}
                className="w-full max-w-2xl relative z-10 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-12 text-center shadow-[0_0_50px_rgba(0,100,255,0.1)]"
            >
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-[#8ca1c4] mb-3 tracking-tight filter drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                    Diagnostic Yakunlandi!
                </h1>
                <p className="text-[#a0b0cb] mb-10 text-lg">Sizning joriy darajangiz aniqlandi.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-center">
                    {/* Chart Container */}
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="70%"
                                outerRadius="100%"
                                data={[
                                    { name: "Current", value: currentBand, fill: "#3b82f6" }, // Blue
                                    { name: "Target", value: targetBand, fill: "rgba(255,255,255,0.1)" }
                                ]}
                                startAngle={180}
                                endAngle={0}
                            >
                                <PolarAngleAxis type="number" domain={[0, 9]} angleAxisId={0} tick={false} />
                                <RadialBar background clockWise={true} dataKey="value" cornerRadius={10} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                            <span className="text-5xl font-bold text-white">{currentBand}</span>
                            <span className="text-sm text-blue-400 uppercase tracking-widest mt-1">Band</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col gap-4 text-left">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                                <Target size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Maqsad</p>
                                <p className="text-xl font-bold text-white">{targetBand} Band</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                <Zap size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Farq</p>
                                <p className="text-xl font-bold text-white">
                                    {gap > 0 ? `+${gap} Band kerak` : "Maqsadga yetdingiz!"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6 mb-8 text-left">
                    <h3 className="text-blue-400 font-bold text-lg mb-2">Sizning shaxsiy rejangiz tayyor! 🚀</h3>
                    <p className="text-[#a0b0cb] text-sm md:text-base">
                        Biz sizning zaif tomonlaringizni tahlil qildik. Endi maqsadga erishish uchun kunlik vazifalarni bajarish orqali reytingni ko'tarishingiz mumkin.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full sm:w-auto bg-transparent border border-white/50 text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-[1.5px] hover:bg-white hover:text-[#06193b] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center mx-auto gap-3 backdrop-blur-sm group"
                >
                    Dashboardga O'tish
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
            </motion.div>
        </div>
    );
}
