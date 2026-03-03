// src/components/PodcastInterface/stage5_speaking/SpeakingStage.jsx
import React, { useState, useRef, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { storage } from "../../../firebase/firebase";
import AILoadingSteps from "./AILoadingSteps";
import SpeakingScoreCard from "./SpeakingScoreCard";
import RecordingTimer from "./RecordingTimer";
import "../shared/PodcastStyles.css";

const MAX_RECORDING_SEC = 180; // 3 daqiqa

const AI_STEPS = [
    "Audio yuklanmoqda...",
    "Matnga o'girilmoqda (Whisper)...",
    "IELTS mezonlari bo'yicha baholanmoqda...",
    "Natija tayyorlanmoqda...",
];

export default function SpeakingStage({ podcastId, attemptId, podcastTitle, podcastTranscript, onComplete }) {
    const [status, setStatus] = useState("idle"); // idle | permission | recording | uploading | analyzing | done | error
    const [scores, setScores] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [aiStep, setAiStep] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            setStatus("permission");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStatus("recording");
            chunksRef.current = [];
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.start(1000);
        } catch (e) {
            setStatus("error");
            setErrorMsg("Mikrofon ruxsati berilmadi. Brauzer sozlamalarini tekshiring.");
        }
    };

    const stopAndAnalyze = async () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        recorder.stop();
        recorder.stream.getTracks().forEach((t) => t.stop());

        recorder.onstop = async () => {
            try {
                setStatus("uploading");
                setAiStep(0);

                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const storageRef = ref(storage, `speaking/${attemptId}_${Date.now()}.webm`);
                await uploadBytes(storageRef, blob);

                setAiStep(1);
                const audioUrl = await getDownloadURL(storageRef);

                setStatus("analyzing");
                setAiStep(2);

                const functions = getFunctions();
                const analyzeFunc = httpsCallable(functions, "analyzeSpeaking");
                const result = await analyzeFunc({ audioUrl, podcastTitle, podcastTranscript, attemptId });

                setAiStep(3);
                await new Promise((r) => setTimeout(r, 800));

                setScores(result.data.scores);
                setStatus("done");
            } catch (e) {
                setStatus("error");
                setErrorMsg(e.message || "Tahlil vaqtida xato yuz berdi.");
            }
        };
    };

    const handleFinish = () => {
        if (scores) onComplete(scores);
    };

    return (
        <div className="pod-animate-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            {status === "idle" && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                    <p style={{ color: "var(--pod-text-2)", maxWidth: 480, textAlign: "center", lineHeight: 1.7 }}>
                        🎤 Podcast haqida 2-3 daqiqalik xulosa gapiring. Asosiy g'oyalar, qiziq faktlar yoki o'rganganlaringiz haqida so'zlang.
                    </p>
                    <button className="pod-mic-btn" onClick={startRecording} title="Yozib olishni boshlash">
                        🎙
                    </button>
                    <span style={{ fontSize: 13, color: "var(--pod-muted)" }}>Bosing — yozib olish boshlanadi</span>
                </div>
            )}

            {status === "permission" && (
                <p style={{ color: "var(--pod-text-2)" }}>Mikrofon ruxsati so'ralmoqda...</p>
            )}

            {status === "recording" && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                    <RecordingTimer maxSeconds={MAX_RECORDING_SEC} onExpire={stopAndAnalyze} />
                    <button className="pod-mic-btn recording" onClick={stopAndAnalyze} title="To'xtatish">
                        ⏹
                    </button>
                    <span style={{ fontSize: 13, color: "var(--pod-error)" }}>Yozib olinmoqda... To'xtatish uchun bosing</span>
                </div>
            )}

            {(status === "uploading" || status === "analyzing") && (
                <div style={{ width: "100%", maxWidth: 400 }}>
                    <AILoadingSteps steps={AI_STEPS} currentStep={aiStep} />
                </div>
            )}

            {status === "done" && scores && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
                    <SpeakingScoreCard scores={scores} />
                    <button className="pod-btn pod-btn-primary" style={{ alignSelf: "center" }} onClick={handleFinish}>
                        Yakunlash — Natijalar →
                    </button>
                </div>
            )}

            {status === "error" && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <p style={{ color: "var(--pod-error)" }}>{errorMsg}</p>
                    <button className="pod-btn pod-btn-ghost" onClick={() => setStatus("idle")}>
                        Qayta urinish
                    </button>
                </div>
            )}
        </div>
    );
}
