// src/pages/PodcastPlayer.jsx
// O'quvchi uchun asosiy podcast o'ynatuvchi (5 bosqich wrapper)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { usePodcastAttempt } from "../../hooks/usePodcastAttempt";

import StageProgressBar from "../../components/PodcastInterface/shared/StageProgressBar";
import DictationStage from "../../components/PodcastInterface/stage1_dictation/DictationStage";
import MCQStage from "../../components/PodcastInterface/stage2_mcq/MCQStage";
import GapFillStage from "../../components/PodcastInterface/stage3_gapfill/GapFillStage";
import VocabPracticeStage from "../../components/PodcastInterface/stage4_vocab/VocabPracticeStage";
import VocabExamStage from "../../components/PodcastInterface/stage4_vocab/VocabExamStage";
import SpeakingStage from "../../components/PodcastInterface/stage5_speaking/SpeakingStage";
import PodcastReportCard from "../../components/PodcastInterface/results/PodcastReportCard";
import InteractiveTranscript from "../../components/PodcastInterface/shared/InteractiveTranscript";
import PodcastVocabList from "../../components/PodcastInterface/shared/PodcastVocabList";
import "../../components/PodcastInterface/shared/PodcastStyles.css";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Share2 } from "lucide-react";
import ShareModal from "../../components/common/ShareModal";

const STAGE_TITLES = [
    "✍️ Dictation — Eshitib yazing",
    "✅ Multiple Choice — Savollar",
    "🔤 Fill in the Gap — Bo'shliqlarni to'ldiring",
    "📚 Vocabulary — Lug'at",
    "🎤 Speaking — Xulosa gapiring",
];

const DIFF_LABELS = {
    easy: { label: "Easy", cls: "pod-diff-easy" },
    medium: { label: "Medium", cls: "pod-diff-medium" },
    hard: { label: "Hard", cls: "pod-diff-hard" },
    super_hard: { label: "Super Hard", cls: "pod-diff-super_hard" },
};

export default function PodcastPlayer() {
    const { podcastId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [podcast, setPodcast] = useState(null);
    const [loading, setLoading] = useState(Boolean(podcastId));
    const [vocabPhase, setVocabPhase] = useState("practice"); // 'practice' | 'exam'
    const [vocabWords, setVocabWords] = useState([]);
    const [activeToolTab, setActiveToolTab] = useState("transcript"); // 'transcript' | 'vocabulary'
    const [globalTime, setGlobalTime] = useState(0);
    const [allSegments, setAllSegments] = useState([]);
    const [isShareOpen, setIsShareOpen] = useState(false);

    const { attempt, currentStage, saving, completeStage, loading: attemptLoading } = usePodcastAttempt(podcastId);

    useEffect(() => {
        if (!podcastId) return;
        const fetchAllSegs = async () => {
            try {
                const q = query(collection(db, "podcasts", podcastId, "segments"), orderBy("index"));
                const snap = await getDocs(q);
                setAllSegments(snap.docs.map(d => d.data()));
            } catch (err) {
                console.error("Error fetching segments:", err);
                setAllSegments([]);
            }
        };
        fetchAllSegs();
    }, [podcastId]);

    useEffect(() => {
        // podcastId bo'lmasa doc() xato tashlaydi (loading boshlanishida false qilib olingan)
        if (!podcastId) return;
        getDoc(doc(db, "podcasts", podcastId))
            .then((snap) => {
                setPodcast(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            })
            .catch(err => {
                console.error("Error fetching podcast:", err);
                setPodcast(null);
            })
            .finally(() => setLoading(false));
    }, [podcastId]);

    const handleStageComplete = async (results) => {
        try {
            await completeStage(currentStage, results);
            if (currentStage === 4) setVocabPhase("practice");
        } catch (err) {
            console.error(err);
            alert("Error saving: " + err.message);
        }
    };

    if (loading || attemptLoading) {
        return (
            <div className="podcast-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ color: "var(--pod-text-2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div className="pod-spinner" />
                    <span>{loading ? "Podcast ma'lumotlari yuklanmoqda..." : "Natijalar tekshirilmoqda..."}</span>
                </div>
            </div>
        );
    }

    if (!podcast) {
        return (
            <div className="podcast-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ color: "var(--pod-error)" }}>Xatolik: Bunday podcast topilmadi.</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="podcast-layout" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ color: "var(--pod-text-2)" }}>Mashqni boshlash uchun tizimga kiring.</div>
                <button className="pod-btn" onClick={() => navigate("/auth/login")}>Kirish</button>
            </div>
        );
    }

    if (!attempt) {
        return (
            <div className="podcast-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ color: "var(--pod-error)" }}>Xatolik: Sizning urinishingizni bazadan olish imkoni bo'lmadi.</div>
            </div>
        );
    }

    const diff = DIFF_LABELS[podcast.difficulty];
    const showResults = currentStage > 5 || attempt?.completedAt;

    return (
        <div className="podcast-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Top header */}
            <div style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
                background: "var(--pod-surface)", borderBottom: "1px solid var(--pod-border)"
            }}>
                <button className="pod-btn pod-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => navigate("/dashboard")}>← Dashboard</button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--pod-text)" }}>
                            {podcast.title}
                        </h2>
                        {diff && <span className={`pod-diff-badge ${diff.cls}`}>{diff.label}</span>}
                        {podcast.level && (
                            <span style={{ fontSize: 11, color: "var(--pod-accent)", fontWeight: 600 }}>{podcast.level}</span>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button 
                        onClick={() => setIsShareOpen(true)}
                        className="pod-btn pod-btn-ghost" 
                        style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                    >
                        <Share2 size={14} /> Share
                    </button>
                    {saving && <span style={{ fontSize: 12, color: "var(--pod-muted)" }}>Saqlanmoqda...</span>}
                </div>
            </div>

            {/* Stage progress */}
            {!showResults && <StageProgressBar currentStage={currentStage} />}

            {/* Main content */}
            <div style={{ flex: 1, padding: "32px 24px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
                {!showResults && (
                    <>
                        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--pod-text)" }}>
                            {STAGE_TITLES[currentStage - 1]}
                        </h3>

                        {currentStage === 1 && (
                            <DictationStage
                                podcastId={podcastId}
                                audioUrl={podcast.audioUrl}
                                hintWords={podcast.hintWords}
                                onComplete={(r) => handleStageComplete(r)}
                                onTimeUpdate={setGlobalTime}
                            />
                        )}

                        {currentStage === 2 && (
                            <MCQStage
                                podcastId={podcastId}
                                audioUrl={podcast.audioUrl}
                                onComplete={(r) => handleStageComplete(r)}
                                onTimeUpdate={setGlobalTime}
                            />
                        )}

                        {currentStage === 3 && (
                            <GapFillStage
                                podcastId={podcastId}
                                audioUrl={podcast.audioUrl}
                                onComplete={(r) => handleStageComplete(r)}
                                onTimeUpdate={setGlobalTime}
                            />
                        )}

                        {currentStage === 4 && vocabPhase === "practice" && (
                            <VocabPracticeStage
                                podcastId={podcastId}
                                onStartExam={(words) => { setVocabWords(words); setVocabPhase("exam"); }}
                            />
                        )}

                        {currentStage === 4 && vocabPhase === "exam" && (
                            <VocabExamStage
                                vocab={vocabWords}
                                onComplete={(r) => handleStageComplete(r)}
                            />
                        )}

                        {currentStage === 5 && (
                            <SpeakingStage
                                podcastId={podcastId}
                                attemptId={attempt?.id}
                                podcastTitle={podcast.title}
                                podcastTranscript={podcast.fullTranscript}
                                onComplete={(r) => handleStageComplete(r)}
                            />
                        )}

                        {/* Learning Tools Section */}
                        <div style={{ marginTop: 60, borderTop: "1px solid var(--pod-border)", paddingTop: 32 }}>
                            <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "1px solid var(--pod-border)" }}>
                                {["transcript", "vocabulary"].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveToolTab(tab)}
                                        style={{
                                            padding: "12px 4px",
                                            background: "none",
                                            border: "none",
                                            borderBottom: activeToolTab === tab ? "2px solid var(--pod-accent)" : "2px solid transparent",
                                            color: activeToolTab === tab ? "var(--pod-accent)" : "var(--pod-text-2)",
                                            fontWeight: 600,
                                            fontSize: 14,
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {tab === "transcript" ? "📜 Sinxron Matn" : "📚 Lug'at Boyligi"}
                                    </button>
                                ))}
                            </div>

                            {activeToolTab === "transcript" && (
                                <div className="pod-animate-in">
                                    <p style={{ fontSize: 13, color: "var(--pod-muted)", marginBottom: 16 }}>
                                        💡 So'zlar ustiga bosib tarjimasini ko'ring. Shadowing uchun matnni kuzatib boring.
                                    </p>
                                    <InteractiveTranscript
                                        podcastId={podcastId}
                                        segments={allSegments}
                                        currentTime={globalTime}
                                    />
                                </div>
                            )}

                            {activeToolTab === "vocabulary" && (
                                <div className="pod-animate-in">
                                    <PodcastVocabList podcastId={podcastId} />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {showResults && (
                    <PodcastReportCard
                        bands={attempt?.ieltsBands}
                        podcastId={podcastId}
                        podcastTitle={podcast.title}
                        onClose={() => navigate("/dashboard")}
                    />
                )}
            </div>

            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                testId={podcastId}
                testTitle={podcast.title}
                testType="podcast"
            />
        </div>
    );
}
