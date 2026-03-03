// src/components/PodcastInterface/shared/StageProgressBar.jsx
import React from "react";
import "./PodcastStyles.css";

const STAGES = [
    { icon: "✍️", label: "Dictation" },
    { icon: "✅", label: "MCQ" },
    { icon: "🔤", label: "Gap Fill" },
    { icon: "📚", label: "Vocab" },
    { icon: "🎤", label: "Speaking" },
];

export default function StageProgressBar({ currentStage, completedStages = [] }) {
    return (
        <div className="pod-stage-progress">
            {STAGES.map((stage, i) => {
                const stageNum = i + 1;
                const isActive = currentStage === stageNum;
                const isCompleted = completedStages.includes(stageNum) || currentStage > stageNum;

                return (
                    <React.Fragment key={stageNum}>
                        <div className={`pod-stage-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div className="pod-stage-icon">
                                    {isCompleted ? "✓" : stage.icon}
                                </div>
                                <span className="pod-stage-label">{stage.label}</span>
                            </div>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={`pod-stage-connector ${isCompleted ? "completed" : ""}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
