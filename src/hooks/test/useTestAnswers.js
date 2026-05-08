import { useState } from "react";

export function useTestAnswers() {
    const [userAnswers, setUserAnswers] = useState({});
    const [writingEssay, setWritingEssay] = useState("");
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());

    const handleSelectAnswer = (questionId, option, isReviewing = false) => {
        if (isReviewing) return;
        setUserAnswers(prev => {
            if (prev[questionId] === option) return prev;
            return { ...prev, [questionId]: option };
        });
    };

    const toggleFlag = (questionId) => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) newSet.delete(questionId);
            else newSet.add(questionId);
            return newSet;
        });
    };

    return {
        userAnswers,
        setUserAnswers,
        writingEssay,
        setWritingEssay,
        flaggedQuestions,
        setFlaggedQuestions,
        handleSelectAnswer,
        toggleFlag
    };
}
