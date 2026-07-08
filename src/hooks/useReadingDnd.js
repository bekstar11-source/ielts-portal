import { useState, useCallback } from 'react';
import { 
    PointerSensor, 
    TouchSensor, 
    useSensor, 
    useSensors 
} from '@dnd-kit/core';

export const useReadingDnd = (testData, activePassage, parentAnswers, handleDualAnswerChange, isReviewMode) => {
    const [activeDragData, setActiveDragData] = useState(null);

    const dndSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        })
    );

    const handleHeadingDragEnd = useCallback((event) => {
        if (isReviewMode) return;

        const { active, over } = event;
        if (!over || !active) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (!activeId.startsWith('reading-heading-') || !overId.startsWith('reading-drop-')) return;

        const headingLabel = active.data?.current?.label;
        const questionId = overId.replace('reading-drop-', '');

        if (!headingLabel) return;

        const currentPassageId = testData?.passages?.[activePassage]?.id;
        const matchingGroup = testData?.questions?.find(g => {
            if (String(g.passageId) !== String(currentPassageId)) return false;
            const gt = String(g.type || "").toLowerCase();
            const gi = String(g.instruction || "").toLowerCase();
            return gt.includes('matching') && (gi.includes('heading') || gt.includes('heading'));
        });

        if (matchingGroup) {
            const questions = matchingGroup.items || [];
            const prevOwner = questions.find(q => 
                parentAnswers && parentAnswers[q.id] === headingLabel && String(q.id) !== String(questionId)
            );
            if (prevOwner) {
                handleDualAnswerChange(prevOwner.id, "");
            }
        }

        handleDualAnswerChange(questionId, headingLabel);
    }, [testData, activePassage, parentAnswers, handleDualAnswerChange, isReviewMode]);

    const onDragStart = useCallback(({ active }) => {
        setActiveDragData(active?.data?.current || null);
    }, []);

    const onDragEnd = useCallback((event) => {
        setActiveDragData(null);
        handleHeadingDragEnd(event);
    }, [handleHeadingDragEnd]);

    const onDragCancel = useCallback(() => {
        setActiveDragData(null);
    }, []);

    return {
        activeDragData,
        dndSensors,
        onDragStart,
        onDragEnd,
        onDragCancel
    };
};
