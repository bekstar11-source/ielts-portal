// src/components/ReadingInterface/ResumeModal.jsx
import React from "react";

export default function ResumeModal({ onContinue, onRestart }) {
    return (
        <div className="resume-overlay">
            <div className="resume-card">
                <h2 style={{fontSize: 24, fontWeight: 800, marginBottom: 8}}>Testni davom ettirasizmi?</h2>
                <p style={{color: '#6b7280', marginBottom: 20}}>
                    Sizda saqlanmagan jarayon mavjud. Davom ettirishingiz yoki boshidan boshlashingiz mumkin.
                </p>
                <button className="resume-btn btn-primary" onClick={onContinue}>
                    Davom ettirish (Continue)
                </button>
                <button className="resume-btn btn-outline" onClick={onRestart}>
                    Boshqatdan (Restart)
                </button>
            </div>
        </div>
    );
}