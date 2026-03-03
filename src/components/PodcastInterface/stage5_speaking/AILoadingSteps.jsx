// src/components/PodcastInterface/stage5_speaking/AILoadingSteps.jsx
import React from "react";
import "../shared/PodcastStyles.css";

export default function AILoadingSteps({ steps, currentStep }) {
    return (
        <div className="pod-ai-steps">
            {steps.map((step, i) => {
                const status = i < currentStep ? "done" : i === currentStep ? "active" : "";
                return (
                    <div key={i} className={`pod-ai-step ${status}`}>
                        <div className="pod-ai-step-dot" />
                        <span style={{ fontSize: 14, color: status === "done" ? "var(--pod-success)" : "var(--pod-text)" }}>
                            {status === "done" && "✓ "}
                            {step}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
