import { useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, doc, writeBatch, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { logAction } from "../../utils/logger";

export function useTestSubmission(user, userData) {
    const [saving, setSaving] = useState(false);

    const submitTest = async (test, resultData, mistakes = []) => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const resultRef = doc(collection(db, "results"));
            
            const finalResult = {
                ...resultData,
                userId: user.uid,
                userName: userData?.fullName || user.email || 'Unknown User',
                createdAt: serverTimestamp(),
                status: resultData.type === 'reading' || resultData.type === 'listening' ? 'graded' : 'submitted'
            };

            batch.set(resultRef, finalResult);
            await batch.commit();

            // Log mistakes if any
            if (mistakes.length > 0) {
                const mistakeSessionRef = doc(collection(db, "users", user.uid, "mistakeSessions"));
                await setDoc(mistakeSessionRef, {
                    mistakes,
                    date: finalResult.date,
                    testId: test.id,
                    testTitle: test.title || 'Untitled Test'
                });
            }

            // Update user stats
            if (finalResult.bandScore > 0 || finalResult.score > 0) {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    "stats.totalTests": increment(1),
                    "stats.totalBandScore": increment(finalResult.bandScore || 0),
                    "lastActiveAt": serverTimestamp()
                });
            }

            logAction(user.uid, 'TEST_SUBMIT', { testId: test.id, score: finalResult.score });
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
