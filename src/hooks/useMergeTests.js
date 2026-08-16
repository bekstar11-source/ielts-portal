import { useState } from "react";
import { db } from "../firebase/firebase";
import toast from "react-hot-toast";
import { invalidateAdminTestsCache } from "../utils/adminTestsCache";

const formatListeningQType = (t) => {
    const lower = t.toLowerCase();
    if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection')) return 'Multiple Choice';
    if (lower.includes('table')) return 'Table Completion';
    if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary') || lower.includes('form')) return 'Completion';
    if (lower.includes('flow_chart') || lower.includes('flowchart')) return 'Flow Chart';
    if (lower.includes('map_labeling') || lower.includes('diagram')) return 'Map/Diagram';
    if (lower.includes('short_answer')) return 'Short Answer';
    return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatReadingQType = (t) => {
    const lower = t.toLowerCase();
    if (lower.includes('multiple_choice') || lower.includes('multi_choice') || lower.includes('selection')) return 'Multiple Choice';
    if (lower.includes('matching_headings')) return 'Matching Headings';
    if (lower.includes('true_false') || lower.includes('yes_no')) return 'TFNG/YNNG';
    if (lower.includes('matching')) return 'Matching';
    if (lower.includes('table')) return 'Table Completion';
    if (lower.includes('note') || lower.includes('gap_fill') || lower.includes('sentence') || lower.includes('summary')) return 'Completion';
    return t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export function useMergeTests({ onSaved, onClose }) {
    const [isMerging, setIsMerging] = useState(false);

    /**
     * @param {string[]} selectedTests  birlashtiriladigan test id'lari
     * @param {string}   mergeTitle     yangi test nomi
     * @param {object}   options        { order: string[], sourceTests: object[] }
     *                                  order — passage tartibi (MergeModal'dan),
     *                                  sourceTests — oldindan yuklangan hujjatlar
     */
    const mergeTests = async (selectedTests, mergeTitle, options = {}) => {
        if (!mergeTitle.trim()) {
            toast.error("Birlashtirilgan test nomini kiriting!");
            return;
        }
        if (!Array.isArray(selectedTests) || selectedTests.length < 2) {
            toast.error("Kamida 2 ta test tanlang!");
            return;
        }
        setIsMerging(true);
        try {
            const { getDoc, doc, writeBatch, collection } = await import("firebase/firestore");
            const { getQuestionTypesFromQuestions } = await import("../components/admin/CreateTest/CreateTestUtils");

            // MergeModal preview uchun hujjatlarni allaqachon yuklagan bo'lsa,
            // qayta o'qimaymiz — ko'rsatilgan tartib bilan aynan bir xil bo'lishi shart.
            let selectedObjects = Array.isArray(options.sourceTests) && options.sourceTests.length === selectedTests.length
                ? options.sourceTests
                : null;

            if (!selectedObjects) {
                const snaps = await Promise.all(selectedTests.map(id => getDoc(doc(db, "tests", id))));
                selectedObjects = snaps
                    .map(s => (s.exists() ? { id: s.id, ...s.data() } : null))
                    .filter(Boolean);
            }

            if (selectedObjects.length < selectedTests.length) {
                throw new Error("Ba'zi test ma'lumotlarini yuklab bo'lmadi.");
            }

            // Turli turdagi testlarni birlashtirib bo'lmaydi (savol tuzilishi mos kelmaydi)
            const types = Array.from(new Set(selectedObjects.map(t => t.type).filter(Boolean)));
            if (types.length > 1) {
                throw new Error(`Turli test turlarini birlashtirib bo'lmaydi: ${types.join(", ")}.`);
            }

            const { mergeTestsLogic } = await import("../utils/TestUtils");
            const mergedPayload = mergeTestsLogic(selectedObjects, mergeTitle.trim(), {
                order: options.order
            });

            if (mergedPayload.type === 'writing') {
                if (!mergedPayload.writingTasks?.length) {
                    throw new Error("Birlashtirish uchun task topilmadi.");
                }
            } else {
                if (!mergedPayload.passages?.length) {
                    throw new Error("Birlashtirish uchun passage topilmadi.");
                }
                if (!mergedPayload.questions?.length) {
                    throw new Error("Birlashtirilgan testda savollar yo'q.");
                }
            }

            mergedPayload.isFree = false;
            mergedPayload.isPublic = false;
            mergedPayload.isMerged = true;
            mergedPayload.mergedSourceIds = selectedTests;

            const batch = writeBatch(db);
            const testDocRef = doc(collection(db, "tests"));
            const newTestId = testDocRef.id;

            const unitCount = mergedPayload.type === 'writing'
                ? (mergedPayload.writingTasks || []).length
                : (mergedPayload.passages || []).length;

            // Standart uzunlik: Reading 60 daqiqa (3 passage), Listening 30 daqiqa
            // (4 part). Nostandart hajmda vaqt proporsional kattalashadi.
            let duration = Number(mergedPayload.duration) || 60;
            if (mergedPayload.type === 'listening') {
                duration = unitCount > 4 ? Math.ceil((30 / 4) * unitCount) : 30;
            } else if (mergedPayload.type === 'reading') {
                duration = unitCount > 3 ? 20 * unitCount : 60;
            }
            mergedPayload.duration = duration;

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
                    const partNum = passage.partNumber || (idx + 1);
                    const partKey = `part${partNum}`;
                    const passageQuestions = (mergedPayload.questions || []).filter(
                        q => String(q.passageId) === String(passage.id)
                    );
                    const qTypes = Array.from(new Set(passageQuestions.map(q => q.type).filter(Boolean)));
                    parts[partKey] = {
                        id: passage.id !== undefined ? String(passage.id) : `part-${partNum}`,
                        title: passage.title || `Part ${partNum}`,
                        difficulty: passage.difficulty || mergedPayload.difficulty || "medium",
                        qTypes: Array.from(new Set(qTypes.map(formatListeningQType))),
                        startSec: passage.startTime != null ? Number(passage.startTime) : 0,
                        endSec: passage.endTime != null ? Number(passage.endTime) : 0,
                        audioUrl: passage.audio || mergedPayload.audioUrl || mergedPayload.audio_url || ""
                    };
                });
                metadata.parts = parts;
            } else if (mergedPayload.type === 'reading') {
                const passages = {};
                (mergedPayload.passages || []).forEach((passage, idx) => {
                    const passNum = passage.partNumber || (idx + 1);
                    const passKey = `passage${passNum}`;
                    const passageQuestions = (mergedPayload.questions || []).filter(
                        q => String(q.passageId) === String(passage.id)
                    );
                    const qTypes = Array.from(new Set(passageQuestions.map(q => q.type).filter(Boolean)));
                    passages[passKey] = {
                        id: passage.id !== undefined ? String(passage.id) : `passage-${passNum}`,
                        title: passage.title || `Passage ${passNum}`,
                        difficulty: passage.difficulty || mergedPayload.difficulty || "medium",
                        qTypes: Array.from(new Set(qTypes.map(formatReadingQType)))
                    };
                });
                metadata.passages = passages;
            }

            const metadataDocRef = doc(db, "tests_metadata", newTestId);
            batch.set(testDocRef, mergedPayload);
            batch.set(metadataDocRef, metadata);

            // `update` metadata hujjati yo'q bo'lsa butun batch'ni yiqitardi —
            // shuning uchun merge bilan belgilaymiz.
            selectedTests.forEach(id => {
                batch.set(doc(db, "tests", id), { isMergedSource: true }, { merge: true });
                batch.set(doc(db, "tests_metadata", id), { isMergedSource: true }, { merge: true });
            });

            await batch.commit();

            // Drop the admin list cache so the merged test shows up immediately
            invalidateAdminTestsCache();
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
