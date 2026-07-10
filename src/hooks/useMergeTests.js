import { useState } from "react";
import { db } from "../firebase/firebase";
import toast from "react-hot-toast";

export function useMergeTests({ onSaved, onClose }) {
    const [isMerging, setIsMerging] = useState(false);

    const mergeTests = async (selectedTests, mergeTitle) => {
        if (!mergeTitle.trim()) {
            toast.error("Birlashtirilgan test nomini kiriting!");
            return;
        }
        setIsMerging(true);
        try {
            const { getDoc, doc, writeBatch, collection } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions, getPassageOrPartNum } = await import("../components/admin/CreateTest/CreateTestUtils");

            const snaps = await Promise.all(selectedTests.map(id => getDoc(doc(db, "tests", id))));
            const selectedObjects = snaps.map(s => s.data()).filter(Boolean);

            if (selectedObjects.length < selectedTests.length) {
                throw new Error("Ba'zi test ma'lumotlarini yuklab bo'lmadi.");
            }

            const { mergeTestsLogic } = await import("../utils/TestUtils");
            const mergedPayload = mergeTestsLogic(selectedObjects, mergeTitle.trim());
            mergedPayload.isFree = false;
            mergedPayload.isPublic = false;
            mergedPayload.isMerged = true;
            mergedPayload.mergedSourceIds = selectedTests;

            const batch = writeBatch(db);
            const testDocRef = doc(collection(db, "tests"));
            const newTestId = testDocRef.id;

            let duration = Number(mergedPayload.duration) || 30;
            if (mergedPayload.type === 'listening') duration = 30;
            else if (mergedPayload.type === 'reading') duration = 60;

            let combinedContent = "";
            if (mergedPayload.passages && Array.isArray(mergedPayload.passages)) {
                mergedPayload.passages.forEach(p => {
                    if (p.title) combinedContent += p.title + " ";
                    if (p.content) {
                        const cleanText = p.content.replace(/<[^>]*>/g, ' ');
                        combinedContent += cleanText + " ";
                    }
                });
            }

            const metadata = {
                id: newTestId,
                title: mergedPayload.title || "",
                type: mergedPayload.type || "reading",
                difficulty: mergedPayload.difficulty || "medium",
                duration,
                audioUrl: mergedPayload.audioUrl || mergedPayload.audio_url || "",
                isExclusive: mergedPayload.isExclusive || false,
                isFree: false,
                isPublic: false,
                createdAt: mergedPayload.createdAt,
                updatedAt: mergedPayload.updatedAt,
                questionTypes: getQuestionTypesFromQuestions(mergedPayload.questions || []),
                collectionId: mergedPayload.collectionId && mergedPayload.collectionId !== "None"
                    ? mergedPayload.collectionId
                    : null,
                isMerged: true,
                mergedSourceIds: selectedTests,
                combinedContent: combinedContent.trim()
            };

            if (mergedPayload.type === 'listening') {
                const parts = {};
                (mergedPayload.passages || []).forEach((passage, idx) => {
                    const partNum = getPassageOrPartNum(passage, idx, 'listening', mergedPayload.questions || []);
                    const partKey = `part${partNum}`;
                    const passageQuestions = (mergedPayload.questions || []).filter(
                        q => String(q.passageId) === String(passage.id)
                    );
                    const qTypes = Array.from(new Set(passageQuestions.map(q => q.type).filter(Boolean)));
                    const formattedQTypes = qTypes.map(t => {
                        const lower = t.toLowerCase();
                        if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection')) return 'Multiple Choice';
                        if (lower.includes('table')) return 'Table Completion';
                        if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary') || lower.includes('form')) return 'Completion';
                        if (lower.includes('flow_chart') || lower.includes('flowchart')) return 'Flow Chart';
                        if (lower.includes('map_labeling') || lower.includes('diagram')) return 'Map/Diagram';
                        if (lower.includes('short_answer')) return 'Short Answer';
                        return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    });
                    parts[partKey] = {
                        id: passage.id !== undefined ? String(passage.id) : `part-${partNum}`,
                        title: passage.title || `Part ${partNum}`,
                        difficulty: passage.difficulty || mergedPayload.difficulty || "medium",
                        qTypes: Array.from(new Set(formattedQTypes)),
                        startSec: passage.startTime != null ? Number(passage.startTime) : 0,
                        endSec: passage.endTime != null ? Number(passage.endTime) : 0,
                        audioUrl: passage.audio || mergedPayload.audio_url || ""
                    };
                });
                metadata.parts = parts;
            } else if (mergedPayload.type === 'reading') {
                const passages = {};
                (mergedPayload.passages || []).forEach((passage, idx) => {
                    const passNum = getPassageOrPartNum(passage, idx, 'reading', mergedPayload.questions || []);
                    const passKey = `passage${passNum}`;
                    const passageQuestions = (mergedPayload.questions || []).filter(
                        q => String(q.passageId) === String(passage.id)
                    );
                    const qTypes = Array.from(new Set(passageQuestions.map(q => q.type).filter(Boolean)));
                    const formattedQTypes = qTypes.map(t => {
                        const lower = t.toLowerCase();
                        if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection')) return 'Multiple Choice';
                        if (lower.includes('matching_headings')) return 'Matching Headings';
                        if (lower.includes('true_false') || lower.includes('yes_no')) return 'TFNG/YNNG';
                        if (lower.includes('matching')) return 'Matching';
                        if (lower.includes('table')) return 'Table Completion';
                        if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary')) return 'Completion';
                        return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    });
                    passages[passKey] = {
                        id: passage.id !== undefined ? String(passage.id) : `passage-${passNum}`,
                        title: passage.title || `Passage ${passNum}`,
                        difficulty: passage.difficulty || mergedPayload.difficulty || "medium",
                        qTypes: Array.from(new Set(formattedQTypes))
                    };
                });
                metadata.passages = passages;
            }

            const metadataDocRef = doc(db, "tests_metadata", newTestId);
            batch.set(testDocRef, mergedPayload);
            batch.set(metadataDocRef, metadata);

            selectedTests.forEach(id => {
                batch.update(doc(db, "tests", id), { isMergedSource: true });
                batch.update(doc(db, "tests_metadata", id), { isMergedSource: true });
            });

            await batch.commit();

            toast.success("Testlar muvaffaqiyatli birlashtirildi! 🎉");
            onSaved();
            onClose();
        } catch (err) {
            console.error("Merge error:", err);
            toast.error("Birlashtirishda xatolik yuz berdi: " + err.message);
        } finally {
            setIsMerging(false);
        }
    };

    return { isMerging, mergeTests };
}
