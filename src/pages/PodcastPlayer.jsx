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

    const { attempt, currentStage, stageResults, saving, completeStage } = usePodcastAttempt(podcastId);

    useEffect(() => {
        getDoc(doc(db, "podcasts", podcastId)).then((snap) => {
            if (snap.exists()) setPodcast({ id: snap.id, ...snap.data() });
            setLoading(false);
        });
    }, [podcastId]);

    const handleStageComplete = async (results) => {
        await completeStage(currentStage, results);
        if (currentStage === 4) setVocabPhase("practice");
    };

    if (loading || !podcast) {
        return (
            <div className="podcast-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ color: "var(--pod-text-2)" }}>Yuklanmoqda...</div>
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
                            <DictationStage
                                podcastId={podcastId}
                                audioUrl={podcast.audioUrl}
                                hintWords={podcast.hintWords}
                                onComplete={(r) => handleStageComplete(r)}
                            />
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
