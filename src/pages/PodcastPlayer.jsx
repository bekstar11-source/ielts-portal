// src/pages/PodcastPlayer.jsx
// O'quvchi uchun asosiy podcast o'ynatuvchi (5 bosqich wrapper)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { usePodcastAttempt } from "../hooks/usePodcastAttempt";

import StageProgressBar from "../components/PodcastInterface/shared/StageProgressBar";
import DictationStage from "../components/PodcastInterface/stage1_dictation/DictationStage";
import MCQStage from "../components/PodcastInterface/stage2_mcq/MCQStage";
import GapFillStage from "../components/PodcastInterface/stage3_gapfill/GapFillStage";
import VocabPracticeStage from "../components/PodcastInterface/stage4_vocab/VocabPracticeStage";
import VocabExamStage from "../components/PodcastInterface/stage4_vocab/VocabExamStage";
import SpeakingStage from "../components/PodcastInterface/stage5_speaking/SpeakingStage";
import PodcastReportCard from "../components/PodcastInterface/results/PodcastReportCard";
import "../components/PodcastInterface/shared/PodcastStyles.css";

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
    const [loading, setLoading] = useState(true);
    const [vocabPhase, setVocabPhase] = useState("practice"); // 'practice' | 'exam'
    const [vocabWords, setVocabWords] = useState([]);

    const { attempt, currentStage, stageResults, saving, completeStage, loading: attemptLoading } = usePodcastAttempt(podcastId);

    useEffect(() => {
        getDoc(doc(db, "podcasts", podcastId))
            .then((snap) => {
                if (snap.exists()) setPodcast({ id: snap.id, ...snap.data() });
            })
            .catch(err => console.error("Error fetching podcast:", err))
            .finally(() => setLoading(false));
    }, [podcastId]);

    const handleStageComplete = async (results) => {
        try {
            console.log("Saving stage:", currentStage, "with results:", results);
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
                {saving && <span style={{ fontSize: 12, color: "var(--pod-muted)" }}>Saqlanmoqda...</span>}
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
                            <>
                                <button
                                    onClick={() => handleStageComplete({ accuracyPct: 0, segments: [], skippedAll: true })}
                                    style={{
                                        marginBottom: 16, padding: "8px 16px", background: "var(--pod-warning)",
                                        color: "white", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: "bold",
                                        boxShadow: "0 4px 12px rgba(245,158,11,0.3)"
                                    }}
                                >
                                    Tuzatish: Dictation'ni tez o'tkazib yuborish (Skip to Stage 2)
                                </button>
                                <DictationStage
                                    podcastId={podcastId}
                                    audioUrl={podcast.audioUrl}
                                    hintWords={podcast.hintWords}
                                    onComplete={(r) => handleStageComplete(r)}
                                />
                            </>
                        )}

                        {currentStage === 2 && (
                            <MCQStage
                                podcastId={podcastId}
                                audioUrl={podcast.audioUrl}
                                onComplete={(r) => handleStageComplete(r)}
                            />
                        )}

                        {currentStage === 3 && (
                            <GapFillStage
                                podcastId={podcastId}
                                audioUrl={podcast.audioUrl}
                                onComplete={(r) => handleStageComplete(r)}
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
                    </>
                )}

                {showResults && (
                    <PodcastReportCard
                        bands={attempt?.ieltsBands}
                        podcastTitle={podcast.title}
                        onClose={() => navigate("/dashboard")}
                    />
                )}
            </div>
        </div>
    );
}
