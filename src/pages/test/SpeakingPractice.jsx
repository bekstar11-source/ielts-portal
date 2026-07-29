import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, StopCircle, Play, RefreshCw, 
  ChevronLeft, Star, MessageCircle, AlertCircle,
  BarChart3, CheckCircle2, Volume2, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import { useAuth } from '../../context/AuthContext';

export default function SpeakingPractice() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('idle'); // idle, recording, analyzing, completed
  const [recordingTime, setRecordingTime] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Task data (usually passed via state or fetched)
  const task = {
    title: "Technology & Communication",
    part: "Part 3",
    question: "How has technology changed the way we interact with each other in recent years?",
    instructions: "Answer the question in detail. Try to speak for 1-2 minutes. Use complex sentence structures and a variety of vocabulary."
  };

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        handleAnalysis(audioBlob);
      };

      mediaRecorderRef.current.start();
      setStatus('recording');
      setRecordingTime(0);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('analyzing');
    }
  };

  const handleAnalysis = async (blob) => {
    try {
      const result = await aiService.evaluateSpeaking(blob, task.question);
      setEvaluation(result);
      setStatus('completed');
    } catch (err) {
      console.error("Analysis failed", err);
      setStatus('idle');
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] font-sans antialiased">
      <DashboardHeader user={user} userData={userData} activeTab="practice" />
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#0066CC] font-semibold mb-8 hover:underline group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Marshrutga qaytish
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Task & Recording */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-[#F5F5F7] text-[#86868B] text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                  Speaking {task.part}
                </span>
                <span className="text-[#86868B] text-sm font-medium">Topic: {task.title}</span>
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight mb-4">
                {task.question}
              </h1>
              
              <div className="bg-[#FBFBFD] rounded-2xl p-6 border border-black/[0.02]">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Info size={16} className="text-[#0066CC]" /> Instructions
                </h3>
                <p className="text-[#86868B] text-sm leading-relaxed">
                  {task.instructions}
                </p>
              </div>
            </div>

            {/* Recording Interface */}
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-black/[0.03] flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                {status === 'idle' && (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                  >
                    <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 text-[#0066CC]">
                      <Mic size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Tayyormisiz?</h3>
                    <p className="text-[#86868B] mb-8">Tayyor bo'lganingizda "Boshlash" tugmasini bosing.</p>
                    <button 
                      onClick={startRecording}
                      className="px-10 py-4 bg-[#0071E3] text-white rounded-full font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                    >
                      Boshlash
                    </button>
                  </motion.div>
                )}

                {status === 'recording' && (
                  <motion.div 
                    key="recording"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="text-center w-full"
                  >
                    <div className="flex items-center justify-center gap-1 mb-8 h-12">
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            height: [20, Math.random() * 60 + 20, 20],
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 0.5, 
                            delay: i * 0.05 
                          }}
                          className="w-1.5 bg-[#0071E3] rounded-full"
                        />
                      ))}
                    </div>
                    <div className="text-4xl font-mono font-bold mb-4">{formatTime(recordingTime)}</div>
                    <p className="text-red-500 font-bold flex items-center justify-center gap-2 mb-10">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Recording...
                    </p>
                    <button 
                      onClick={stopRecording}
                      className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-105 transition-all"
                    >
                      <StopCircle size={32} />
                    </button>
                  </motion.div>
                )}

                {status === 'analyzing' && (
                  <motion.div 
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <RefreshCw size={48} className="text-[#0071E3] animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-bold mb-2">AI Tahlil qilmoqda...</h3>
                    <p className="text-[#86868B]">Sizning nutqingiz o'rganilmoqda, bir necha soniya kuting.</p>
                  </motion.div>
                )}

                {status === 'completed' && (
                  <motion.div 
                    key="completed"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 text-[#34C759]">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Tahlil Tayyor!</h3>
                    <p className="text-[#86868B] mb-8">Natijalarni o'ng tomonda ko'rishingiz mumkin.</p>
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={() => setStatus('idle')}
                        className="px-6 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-xl font-bold hover:bg-[#E8E8ED] transition-all"
                      >
                        Qayta topshirish
                      </button>
                      <button 
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-[#0071E3] text-white rounded-xl font-bold shadow-md hover:bg-[#0077ED] transition-all"
                      >
                        Keyingi vazifa
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: AI Feedback */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence>
              {evaluation ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Band Score Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/[0.03] bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-2">Estimated Band Score</p>
                    <div className="text-6xl font-bold mb-4">{evaluation.overallBand}</div>
                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/20">
                      <div>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Fluency</p>
                        <p className="text-xl font-bold">{evaluation.metrics.fluency}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Grammar</p>
                        <p className="text-xl font-bold">{evaluation.metrics.grammar}</p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Points */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/[0.03]">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <BarChart3 size={20} className="text-[#0071E3]" /> AI Feedback
                    </h3>
                    <ul className="space-y-4">
                      {evaluation.feedback.map((item, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-relaxed">
                          <CheckCircle2 size={18} className="text-[#34C759] flex-shrink-0 mt-0.5" />
                          <span className="text-[#424245]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Vocabulary Improvements */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/[0.03]">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <Star size={20} className="text-[#FF9500]" /> Vocabulary Upgrade
                    </h3>
                    <div className="space-y-4">
                      {evaluation.suggestions.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#F5F5F7] rounded-xl">
                          <span className="text-sm line-through text-[#86868B]">{item.original}</span>
                          <span className="text-[#0066CC] mx-2">→</span>
                          <span className="text-sm font-bold text-[#0071E3] bg-blue-50 px-3 py-1 rounded-lg">{item.improved}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-black/[0.03] text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-6 text-[#86868B]">
                    <BarChart3 size={24} />
                  </div>
                  <h3 className="font-bold text-[#1D1D1F] mb-2">Tahlil hali tayyor emas</h3>
                  <p className="text-[#86868B] text-sm">Nutqingizni yozib bo'lganingizdan so'ng, AI sizga ball va maslahatlar beradi.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
