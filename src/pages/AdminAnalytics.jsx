// src/pages/AdminAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { collection, getDocs } from "firebase/firestore"; // Query va orderlarni js da qildik
import { 
  IoArrowBack, 
  IoStatsChart, 
  IoTrendingUp, 
  IoPeople, 
  IoWarning, 
  IoRibbon,
  IoSchool,
  IoHeadset,      // Listening uchun
  IoBook          // Reading uchun
} from "react-icons/io5";

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // DATA STATES
  const [stats, setStats] = useState({
    totalTestsTaken: 0,
    avgPlatformScore: 0,
    activeStudents: 0
  });
  const [groupPerformance, setGroupPerformance] = useState([]);
  const [hardestTests, setHardestTests] = useState([]);
  
  // --- YANGI STATES ---
  const [skillStats, setSkillStats] = useState({ reading: 0, listening: 0 });
  const [atRiskStudents, setAtRiskStudents] = useState([]);

  // --- DATA FETCHING & CALCULATION ---
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // 1. Fetch Raw Data
        const resultsSnap = await getDocs(collection(db, "results"));
        const groupsSnap = await getDocs(collection(db, "groups"));
        const usersSnap = await getDocs(collection(db, "users"));
        const testsSnap = await getDocs(collection(db, "tests"));

        const results = resultsSnap.docs.map(d => d.data());
        const groups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const tests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // --- A. KPI CALCULATIONS (ESKI) ---
        const totalScore = results.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
        const avgScore = results.length > 0 ? (totalScore / results.length).toFixed(1) : 0;
        
        // --- B. GROUP PERFORMANCE (ESKI) ---
        const groupStats = groups.map(group => {
            const studentIds = group.studentIds || [];
            const groupResults = results.filter(r => studentIds.includes(r.userId));
            const gTotal = groupResults.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
            const gAvg = groupResults.length > 0 ? (gTotal / groupResults.length).toFixed(1) : 0;

            return {
                name: group.name,
                avg: parseFloat(gAvg),
                count: groupResults.length
            };
        }).sort((a, b) => b.avg - a.avg);

        // --- C. HARDEST TESTS (ESKI) ---
        const testStats = tests.map(test => {
            const testResults = results.filter(r => r.testId === test.id);
            const tTotal = testResults.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
            const tAvg = testResults.length > 0 ? (tTotal / testResults.length).toFixed(1) : 0;

            return {
                title: test.title || "Nomsiz Test",
                type: test.type,
                avg: parseFloat(tAvg),
                attempts: testResults.length
            };
        })
        .filter(t => t.attempts > 0)
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 5);

        // --- D. SKILL BREAKDOWN (YANGI) ---
        const skills = { 
            reading: { sum: 0, count: 0 }, 
            listening: { sum: 0, count: 0 } 
        };

        // Test ID orqali tipini aniqlash uchun Map yaratamiz (Tezlik uchun)
        const testTypeMap = {};
        tests.forEach(t => testTypeMap[t.id] = t.type);

        results.forEach(r => {
            const type = testTypeMap[r.testId] || r.type; // Agar resultda type bo'lmasa, testdan olamiz
            const score = parseFloat(r.score) || 0;
            
            if (type === 'reading') {
                skills.reading.sum += score;
                skills.reading.count += 1;
            } else if (type === 'listening') {
                skills.listening.sum += score;
                skills.listening.count += 1;
            }
        });

        const readingAvg = skills.reading.count > 0 ? (skills.reading.sum / skills.reading.count).toFixed(1) : 0;
        const listeningAvg = skills.listening.count > 0 ? (skills.listening.sum / skills.listening.count).toFixed(1) : 0;

        // --- E. AT-RISK STUDENTS (YANGI) ---
        const struggling = users.map(user => {
            const userRes = results.filter(r => r.userId === user.id);
            if (userRes.length === 0) return null; // Test ishlamaganlar kerak emas

            const total = userRes.reduce((a, b) => a + (parseFloat(b.score) || 0), 0);
            const avg = (total / userRes.length).toFixed(1);

            return { 
                id: user.id, 
                fullName: user.fullName || "Nomsiz", 
                avg: parseFloat(avg), 
                testsCount: userRes.length 
            };
        })
        .filter(u => u !== null && u.avg < 5.5) // <--- CRITICAL: 5.5 dan past
        .sort((a, b) => a.avg - b.avg) // Eng past ballilar tepada
        .slice(0, 6); // Top 6 talik ro'yxat

        // SET STATE
        setStats({
            totalTestsTaken: results.length,
            avgPlatformScore: avgScore,
            activeStudents: users.length
        });
        setGroupPerformance(groupStats);
        setHardestTests(testStats);
        setSkillStats({ reading: readingAvg, listening: listeningAvg });
        setAtRiskStudents(struggling);
        
        setLoading(false);

      } catch (error) {
        console.error("Analytics Error:", error);
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center text-white/50">Hisoblanmoqda...</div>;

  return (
    <div className="h-screen bg-[#1E1E1E] font-sans text-white p-4 lg:p-8 overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/admin')} 
          className="p-3 rounded-full bg-[#2C2C2C] hover:bg-[#3B3B3B] transition text-white/60 hover:text-white border border-white/5"
        >
          <IoArrowBack className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analitika Markazi</h1>
          <p className="text-white/40 text-sm">360° Platforma nazorati</p>
        </div>
      </header>

      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard 
            title="Jami Topshirishlar" 
            value={stats.totalTestsTaken} 
            icon={<IoTrendingUp className="text-green-400 w-6 h-6"/>} 
            desc="Platformadagi umumiy faollik"
        />
        <KpiCard 
            title="Platforma O'rtachasi" 
            value={stats.avgPlatformScore} 
            icon={<IoStatsChart className="text-blue-400 w-6 h-6"/>} 
            desc="Barcha testlar bo'yicha"
        />
        <KpiCard 
            title="Ro'yxatdagi O'quvchilar" 
            value={stats.activeStudents} 
            icon={<IoPeople className="text-purple-400 w-6 h-6"/>} 
            desc="Jami foydalanuvchilar soni"
        />
      </div>

      {/* --- YANGI: SKILL BREAKDOWN --- 

[Image of Data visualization dashboard charts]
 */}
      <div className="bg-[#2C2C2C] p-6 rounded-[30px] border border-white/5 mb-8 shadow-xl">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <IoStatsChart className="text-white/50"/> Ko'nikmalar Balansi
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Reading Bar */}
            <div>
                <div className="flex justify-between mb-2 items-center">
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <IoBook className="text-blue-400"/> Reading
                    </span>
                    <span className="text-sm font-bold text-blue-400">{skillStats.reading} / 9.0</span>
                </div>
                <div className="w-full bg-[#1a1a1a] h-4 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        style={{width: `${(skillStats.reading / 9) * 100}%`}}
                    ></div>
                </div>
            </div>
            {/* Listening Bar */}
            <div>
                <div className="flex justify-between mb-2 items-center">
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <IoHeadset className="text-purple-400"/> Listening
                    </span>
                    <span className="text-sm font-bold text-purple-400">{skillStats.listening} / 9.0</span>
                </div>
                <div className="w-full bg-[#1a1a1a] h-4 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                        style={{width: `${(skillStats.listening / 9) * 100}%`}}
                    ></div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* 2. GURUHLAR REYTINGI (Leaderboard) */}
          <div className="bg-[#2C2C2C] p-6 rounded-[30px] border border-white/5 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500"><IoRibbon className="w-6 h-6"/></div>
                  <h2 className="text-lg font-bold">Guruhlar Natijasi</h2>
              </div>
              
              <div className="space-y-5">
                  {groupPerformance.length > 0 ? groupPerformance.map((group, idx) => (
                      <div key={idx}>
                          <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-bold text-gray-200">{group.name}</span>
                              <span className="text-white/60">{group.avg} ball <span className="text-[10px] opacity-50">({group.count} test)</span></span>
                          </div>
                          {/* Progress Bar Logic */}
                          <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                    group.avg >= 7 ? "bg-gradient-to-r from-green-600 to-green-400" :
                                    group.avg >= 5.5 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                                    "bg-gradient-to-r from-red-600 to-red-400"
                                }`}
                                style={{ width: `${(group.avg / 9) * 100}%` }}
                              ></div>
                          </div>
                      </div>
                  )) : (
                      <p className="text-white/30 text-center py-4">Guruh ma'lumotlari yetarli emas</p>
                  )}
              </div>
          </div>

          {/* 3. QIYNCHILIKLAR DETEKTORI (Weak Areas) */}
          <div className="bg-[#2C2C2C] p-6 rounded-[30px] border border-white/5 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-red-500/10 rounded-xl text-red-500"><IoWarning className="w-6 h-6"/></div>
                  <div>
                    <h2 className="text-lg font-bold">Qiyin Testlar (Top 5)</h2>
                    <p className="text-[10px] text-white/40">O'quvchilar eng past ball olayotgan testlar</p>
                  </div>
              </div>

              <div className="space-y-3">
                  {hardestTests.length > 0 ? hardestTests.map((test, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-[#222] rounded-2xl border border-white/5 hover:border-red-500/30 transition group">
                          <div className="flex items-center gap-3">
                              <span className="text-red-500 font-bold text-lg">#{idx + 1}</span>
                              <div>
                                  <h4 className="font-medium text-gray-200 text-sm group-hover:text-white transition">{test.title}</h4>
                                  <span className="text-[10px] uppercase tracking-wide text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{test.type}</span>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-xl font-bold text-red-400">{test.avg}</div>
                              <div className="text-[10px] text-white/30">O'rtacha ball</div>
                          </div>
                      </div>
                  )) : (
                      <p className="text-white/30 text-center py-4">Hozircha ma'lumot yo'q</p>
                  )}
              </div>
              
              {hardestTests.length > 0 && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 items-start">
                    <IoSchool className="text-blue-400 w-5 h-5 shrink-0 mt-0.5"/>
                    <p className="text-xs text-blue-200/80 leading-relaxed">
                        <span className="font-bold">Maslahat:</span> Ro'yxatdagi qiyin testlar mavzularini keyingi darsda qayta tushuntirish tavsiya etiladi.
                    </p>
                </div>
              )}
          </div>
      </div>

      {/* --- YANGI: XAVF GURUHI (AT-RISK) --- */}
      <div className="bg-[#2C2C2C] p-6 rounded-[30px] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500"><IoWarning className="w-6 h-6"/></div>
            <div>
                <h2 className="text-lg font-bold">Xavf Guruhi (At-Risk)</h2>
                <p className="text-[10px] text-white/40">O'rtacha bali 5.5 dan past o'quvchilar (Yordamga muhtoj)</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {atRiskStudents.length > 0 ? atRiskStudents.map(student => (
                <div key={student.id} className="bg-[#222] p-4 rounded-2xl border border-orange-500/20 flex items-center justify-between hover:bg-[#282828] transition">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-sm border border-orange-500/20">
                            {student.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-200">{student.fullName}</p>
                            <p className="text-[10px] text-white/40">{student.testsCount} ta test topshirgan</p>
                        </div>
                    </div>
                    <div className="text-lg font-bold text-orange-400">{student.avg}</div>
                </div>
            )) : (
                <div className="col-span-1 md:col-span-3 text-center py-6 bg-[#222] rounded-2xl border border-white/5 border-dashed">
                    <p className="text-green-400 font-medium">Ajoyib! Xavf guruhida o'quvchilar yo'q. 🎉</p>
                </div>
            )}
        </div>
      </div>

    </div>
  );
}

// --- SMALL COMPONENTS ---
function KpiCard({ title, value, icon, desc }) {
    return (
        <div className="bg-[#2C2C2C] p-6 rounded-[24px] border border-white/5 flex flex-col justify-between shadow-lg hover:bg-[#323232] transition">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider">{title}</h3>
                <div className="p-2 bg-white/5 rounded-xl">{icon}</div>
            </div>
            <div>
                <p className="text-4xl font-light text-white tracking-tight">{value}</p>
                <p className="text-white/30 text-[11px] mt-1">{desc}</p>
            </div>
        </div>
    )
}