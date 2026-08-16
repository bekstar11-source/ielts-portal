import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db, functions } from "../../firebase/firebase";
import { doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { logAction } from "../../utils/logger";

export function useTestSubmission(user, userData) {
    const [saving, setSaving] = useState(false);
    const queryClient = useQueryClient();

    const submitTest = async (test, resultData) => {
        setSaving(true);
        try {
            const submitTestAnswersFn = httpsCallable(functions, 'submitTestAnswers');
            const res = await submitTestAnswersFn({
                testId: test.id,
                testMode: resultData.mode || 'practice',
                userAnswers: resultData.userAnswers || {},
                timeSpent: resultData.timeSpent || 0,
                violationType: resultData.violation || null,
                partNumber: resultData.partNumber || null
            });

            if (res.data && res.data.success) {
                logAction(user.uid, 'TEST_SUBMIT', { testId: test.id, score: res.data.score });

                // Xatolar tarixi keshi uzoq muddatli (u faqat shu yerda — test
                // topshirilganda o'zgaradi). Shuning uchun uni vaqt o'tishiga
                // qo'yib bermay, aynan shu nuqtada bekor qilamiz: analitika
                // sahifasi yangi xatolarni darhol ko'rsatadi va shu bilan birga
                // oddiy ko'rishlarda qayta o'qish bo'lmaydi.
                queryClient.invalidateQueries({ queryKey: ['mistakeSessions', user.uid] });

                return {
                    success: true,
                    score: res.data.score,
                    bandScore: res.data.bandScore,
                    totalQuestions: res.data.totalQuestions,
                    partBreakdown: res.data.partBreakdown,
                    mistakes: res.data.mistakes,
                    resultId: res.data.resultId
                };
            }
            throw new Error("Javoblarni yuborishda backend xatoligi yuz berdi.");
        } catch (error) {
            console.error("Submission Error:", error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    return { saving, submitTest };
}
