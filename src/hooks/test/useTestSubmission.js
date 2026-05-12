import { useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, doc, writeBatch, serverTimestamp, setDoc, updateDoc, increment, getDoc, arrayUnion } from "firebase/firestore";
import { logAction } from "../../utils/logger";

export function useTestSubmission(user, userData) {
    const [saving, setSaving] = useState(false);

    const submitTest = async (test, resultData, mistakes = []) => {
        setSaving(true);
        try {
            const currentAttempt = {
                attemptId: new Date().getTime().toString(),
                date: resultData.date || new Date().toISOString(),
                score: resultData.score,
                bandScore: resultData.bandScore || 0,
                timeSpent: resultData.timeSpent || 0,
                mode: resultData.mode || 'practice',
                userAnswers: resultData.userAnswers || {} 
            };

            const resultDocId = `${user.uid}_${test.id}`;
            const resultRef = doc(db, "results", resultDocId);
            
            const resultSnap = await getDoc(resultRef);
            let bestScore = resultData.score;
            let bestBandScore = resultData.bandScore || 0;

            if (resultSnap.exists()) {
                const existingData = resultSnap.data();
                if (existingData.bestScore > bestScore) {
                    bestScore = existingData.bestScore;
                    bestBandScore = existingData.bestBandScore || bestBandScore;
                }
            }

            const resultDataToSave = {
                userName: userData?.fullName || user.email || 'Unknown',
                testTitle: test.title || 'Untitled Test',
                type: test.type,
                totalQuestions: resultData.totalQuestions,
                status: test.type === 'reading' || test.type === 'listening' ? 'graded' : 'submitted',
                
                bestScore: bestScore,
                bestBandScore: bestBandScore,
                latestScore: resultData.score,
                latestBandScore: resultData.bandScore || 0,
                lastAttemptDate: currentAttempt.date,
                date: currentAttempt.date,
                
                attempts: arrayUnion(currentAttempt),
                updatedAt: serverTimestamp()
            };
            
            if (resultSnap.exists()) {
                await updateDoc(resultRef, resultDataToSave);
            } else {
                await setDoc(resultRef, {
                    ...resultDataToSave,
                    userId: user.uid,
                    testId: test.id,
                    createdAt: serverTimestamp()
                });
            }

            // Log mistakes if any
            if (mistakes && mistakes.length > 0) {
                const mistakeSessionRef = doc(collection(db, "users", user.uid, "mistakeSessions"));
                await setDoc(mistakeSessionRef, {
                    mistakes,
                    date: resultData.date || new Date().toISOString(),
                    testId: test.id,
                    testTitle: test.title || 'Untitled Test'
                });
            }

            // Update user stats
            if (resultData.bandScore > 0 || resultData.score > 0) {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                const currentUserData = userSnap.data() || {};
                
                const updateData = {
                    "stats.totalTests": increment(1),
                    "stats.totalBandScore": increment(resultData.bandScore || 0),
                    "lastActiveAt": serverTimestamp()
                };
                
                if (test.type?.toLowerCase() === 'reading') {
                    const currentBest = currentUserData.bestReadingBand || 0;
                    if (resultData.bandScore > currentBest) {
                        updateData.bestReadingBand = resultData.bandScore;
                    }
                } else if (test.type?.toLowerCase() === 'listening') {
                    const currentBest = currentUserData.bestListeningBand || 0;
                    if (resultData.bandScore > currentBest) {
                        updateData.bestListeningBand = resultData.bandScore;
                    }
                }
                
                await updateDoc(userRef, updateData);
            }

            logAction(user.uid, 'TEST_SUBMIT', { testId: test.id, score: resultData.score });
            return true;
        } catch (error) {
            console.error("Submission Error:", error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    return { saving, submitTest };
}
