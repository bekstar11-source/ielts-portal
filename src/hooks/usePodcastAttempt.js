// src/hooks/usePodcastAttempt.js
// Podcast attempt holati va Firestore CRUD operatsiyalari

import { useState, useEffect, useCallback } from "react";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import {
    calcListeningBand,
    calcSimpleScore,
    percentToIELTS,
    calcOverallBand,
} from "../utils/podcastGrading";

const INITIAL_STAGE_RESULTS = {
    dictation: null,
    mcq: null,
    gapFill: null,
    vocab: null,
    speaking: null,
};

export function usePodcastAttempt(podcastId) {
    const { user } = useAuth();
    const [attempt, setAttempt] = useState(null);
    const [currentStage, setCurrentStage] = useState(1);
    const [stageResults, setStageResults] = useState(INITIAL_STAGE_RESULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Mavjud attempt ni yuklash yoki yangi yaratish
    useEffect(() => {
        if (!user || !podcastId) return;

        const fetchOrCreateAttempt = async () => {
            setLoading(true);
            try {
                const attemptQuery = collection(db, "podcastAttempts");
                const attemptId = `${user.uid}_${podcastId}`;
                const attemptRef = doc(db, "podcastAttempts", attemptId);
                const snap = await getDoc(attemptRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setAttempt({ id: attemptId, ...data });
                    setCurrentStage(data.currentStage || 1);
                    setStageResults(data.stageResults || INITIAL_STAGE_RESULTS);
                } else {
                    // Yangi attempt yaratish
                    const newAttempt = {
                        userId: user.uid,
                        podcastId,
                        startedAt: serverTimestamp(),
                        completedAt: null,
                        currentStage: 1,
                        stageResults: INITIAL_STAGE_RESULTS,
                        ieltsBands: null,
                    };
                    await setDoc(attemptRef, newAttempt);
                    setAttempt({ id: attemptId, ...newAttempt });
                    setCurrentStage(1);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrCreateAttempt();
    }, [user, podcastId]);

    // Bosqich natijasini saqlash va keyingi bosqichga o'tish
    const completeStage = useCallback(
        async (stage, results) => {
            if (!attempt) {
                alert("Xato: Attempt hook is null or not loaded!");
                return;
            }
            setSaving(true);

            const stageKey = ["dictation", "mcq", "gapFill", "vocab", "speaking"][stage - 1];
            const updatedResults = { ...stageResults, [stageKey]: results };
            const nextStage = Math.min(stage + 1, 5);

            try {
                const attemptRef = doc(db, "podcastAttempts", attempt.id);
                const updateData = {
                    [`stageResults.${stageKey}`]: results,
                    currentStage: nextStage,
                };

                // Agar oxirgi bosqich bo'lsa — umumiy balni hisoblash
                if (stage === 5) {
                    const bands = calcAllBands(updatedResults);
                    updateData.ieltsBands = bands;
                    updateData.completedAt = serverTimestamp();
                }

                await updateDoc(attemptRef, updateData);
                setStageResults(updatedResults);
                setCurrentStage(nextStage);

                if (stage === 5) return "/podcast-completed";
            } catch (err) {
                console.error("completeStage error:", err);
                alert("Baza bilan xato: " + err.message);
                setError(err.message);
            } finally {
                setSaving(false);
            }
        },
        [attempt, stageResults]
    );

    return {
        attempt,
        currentStage,
        stageResults,
        loading,
        saving,
        error,
        completeStage,
    };
}

// Barcha bosqichlardan IELTS bandlarini hisoblash
function calcAllBands(results) {
    const dictPct = results.dictation?.accuracyPct || 0;
    const mcqPct = results.mcq ? calcSimpleScore(results.mcq.correct, results.mcq.total) : 0;
    const gapPct = results.gapFill ? calcSimpleScore(results.gapFill.correct, results.gapFill.total) : 0;
    const vocabPct = results.vocab ? calcSimpleScore(results.vocab.correct, results.vocab.total) : 0;

    const listening = calcListeningBand(mcqPct, gapPct);
    const accuracy = percentToIELTS(dictPct);
    const vocabulary = percentToIELTS(vocabPct);
    const speaking = results.speaking?.overall || 1.0;

    const overall = calcOverallBand({ listening, accuracy, vocabulary, speaking });

    return { listening, accuracy, vocabulary, speaking, overall };
}
