import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { 
    detectSectionFromQuestions, 
    getQuestionTypesFromQuestions,
    getPassageOrPartNum,
    processTime, 
    sanitizePayload, 
    toMMSS 
} from "../components/admin/CreateTest/CreateTestUtils";

const compileMetadata = (testId, payload) => {
    let duration = Number(payload.duration) || 30;
    if (payload.type === 'listening') {
        duration = 30;
    } else if (payload.type === 'reading') {
        duration = 60;
    }

    let combinedContent = "";
    if (payload.passages && Array.isArray(payload.passages)) {
        payload.passages.forEach(p => {
            if (p.title) combinedContent += p.title + " ";
            if (p.content) {
                const cleanText = p.content.replace(/<[^>]*>/g, ' ');
                combinedContent += cleanText + " ";
            }
        });
    }

    const metadata = {
        id: testId,
        title: payload.title || "",
        type: payload.type || "reading",
        difficulty: payload.difficulty || "medium",
        duration: duration,
        audioUrl: payload.audio_url || "",
        isExclusive: payload.isExclusive || false,
        isFree: payload.isFree || false,
        isPublic: payload.isPublic !== undefined ? payload.isPublic : false,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: payload.updatedAt || new Date().toISOString(),
        questionTypes: payload.questionTypes || [],
        collectionId: payload.collectionId && payload.collectionId !== "None" ? payload.collectionId : null,
        thumbnail: payload.thumbnail || "",
        combinedContent: combinedContent.trim(),
    };

    if (payload.type === 'listening') {
        const parts = {};
        (payload.passages || []).forEach((passage, idx) => {
            const partNum = getPassageOrPartNum(passage, idx, 'listening', payload.questions || []);
            const partKey = `part${partNum}`;
            
            const passageQuestions = (payload.questions || []).filter(
                q => String(q.passageId) === String(passage.id)
            );
            
            const qTypes = Array.from(new Set(
                passageQuestions.map(q => q.type).filter(Boolean)
            ));

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
                difficulty: passage.difficulty || payload.difficulty || "medium",
                qTypes: Array.from(new Set(formattedQTypes)),
                startSec: passage.startTime !== undefined && passage.startTime !== null ? Number(passage.startTime) : 0,
                endSec: passage.endTime !== undefined && passage.endTime !== null ? Number(passage.endTime) : 0,
                audioUrl: passage.audio || payload.audio_url || ""
            };
        });
        metadata.parts = parts;
    } else if (payload.type === 'reading') {
        const passages = {};
        (payload.passages || []).forEach((passage, idx) => {
            const passNum = getPassageOrPartNum(passage, idx, 'reading', payload.questions || []);
            const passKey = `passage${passNum}`;
            
            const passageQuestions = (payload.questions || []).filter(
                q => String(q.passageId) === String(passage.id)
            );
            
            const qTypes = Array.from(new Set(
                passageQuestions.map(q => q.type).filter(Boolean)
            ));

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
                difficulty: passage.difficulty || payload.difficulty || "medium",
                qTypes: Array.from(new Set(formattedQTypes))
            };
        });
        metadata.passages = passages;
    }

    return metadata;
};

const normalizeQuestions = (questions) => {
    if (!questions || !Array.isArray(questions)) return [];

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    const normalizeOptionsList = (optionsList) => {
        if (!optionsList || !Array.isArray(optionsList)) return optionsList;
        return optionsList.map((opt, idx) => {
            if (typeof opt === 'object' && opt !== null) {
                if (opt.label) return opt;
                return {
                    label: letters[idx] || 'A',
                    text: opt.text || ''
                };
            }
            const str = String(opt || '').trim();
            const match = str.match(/^([A-Z])[\.\)\s]\s*(.*)$/i);
            if (match) {
                return {
                    label: match[1].toUpperCase(),
                    text: match[2].trim()
                };
            }
            return {
                label: letters[idx] || 'A',
                text: str
            };
        });
    };

    const normalizeMcqAnswer = (ans, normalizedOpts) => {
        if (ans === undefined || ans === null) return "";
        const str = String(ans).trim();
        
        if (str.length === 1 && /^[A-Z]$/i.test(str)) {
            return str.toUpperCase();
        }

        const match = str.match(/^([A-Z])[\.\)\s]/i);
        if (match) {
            return match[1].toUpperCase();
        }

        if (normalizedOpts && Array.isArray(normalizedOpts)) {
            const cleanAns = str.toLowerCase();
            const foundOpt = normalizedOpts.find(opt => 
                opt.text && opt.text.toLowerCase() === cleanAns
            );
            if (foundOpt) {
                return foundOpt.label;
            }
        }

        return str;
    };

    return questions.map(group => {
        const groupTypeLower = String(group.type || "").toLowerCase();
        const isMCQ = groupTypeLower.includes('multiple') || groupTypeLower.includes('choice') || groupTypeLower.includes('mcq');

        let normalizedGroup = { ...group };

        if (group.options) {
            normalizedGroup.options = normalizeOptionsList(group.options);
        }

        const processItems = (items) => {
            if (!items || !Array.isArray(items)) return items;
            return items.map(q => {
                let cleanQ = { ...q };
                if (cleanQ.options) {
                    cleanQ.options = normalizeOptionsList(cleanQ.options);
                }

                if (isMCQ) {
                    const opts = cleanQ.options || normalizedGroup.options || [];
                    const ans = cleanQ.answer || cleanQ.correct_answer || cleanQ.correctAnswer || cleanQ.correct_answer_value;
                    if (ans !== undefined && ans !== null) {
                        const normalizedAns = normalizeMcqAnswer(ans, opts);
                        if (cleanQ.answer !== undefined) cleanQ.answer = normalizedAns;
                        if (cleanQ.correct_answer !== undefined) cleanQ.correct_answer = normalizedAns;
                        if (cleanQ.correctAnswer !== undefined) cleanQ.correctAnswer = normalizedAns;
                        if (cleanQ.correct_answer_value !== undefined) cleanQ.correct_answer_value = normalizedAns;
                    }
                }
                return cleanQ;
            });
        };

        if (group.items) {
            normalizedGroup.items = processItems(group.items);
        }
        if (group.questions) {
            normalizedGroup.questions = processItems(group.questions);
        }

        if (group.groups && Array.isArray(group.groups)) {
            normalizedGroup.groups = group.groups.map(subGroup => {
                let cleanSub = { ...subGroup };
                if (cleanSub.options) {
                    cleanSub.options = normalizeOptionsList(cleanSub.options);
                }
                if (cleanSub.items) {
                    cleanSub.items = processItems(cleanSub.items);
                }
                if (cleanSub.questions) {
                    cleanSub.questions = processItems(cleanSub.questions);
                }
                return cleanSub;
            });
        }

        return normalizedGroup;
    });
};

export const useTestEditor = (id) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEditMode, setIsEditMode] = useState(!!id);
    const [isMockMode, setIsMockMode] = useState(false);
    const [isFree, setIsFree] = useState(false);
    const [publishToFeed, setPublishToFeed] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState("");
    
    const [partAudios, setPartAudios] = useState({ 0: "", 1: "", 2: "", 3: "" });
    const [audioMode, setAudioMode] = useState("multiple");
    const [singleAudioUrl, setSingleAudioUrl] = useState("");
    const [uploadedMaps, setUploadedMaps] = useState([]);
    const [listeningPartCount, setListeningPartCount] = useState(4);
    const [uploadingPart, setUploadingPart] = useState(null);

    const [testData, setTestData] = useState({
        title: "", type: "reading", difficulty: "medium", passages: [],
        audio_url: "", introDuration: 10, questions: [], passage: "",
        collectionId: "None",
        writingTasks: [
            { id: 1, title: "Task 1", prompt: "", image: "", minWords: 150 },
            { id: 2, title: "Task 2", prompt: "", image: "", minWords: 250 }
        ],
        tags: [],
        thumbnail: "",
    });

    // Load existing test if editing
    useEffect(() => {
        if (id) {
            const fetchTest = async () => {
                setLoading(true);
                try {
                    const docSnap = await getDoc(doc(db, "tests", id));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const newPassages = data.passages ? data.passages.map(p => ({
                            ...p,
                            startTime: p.startTime !== undefined && p.startTime !== null ? toMMSS(p.startTime) : "",
                            endTime: p.endTime !== undefined && p.endTime !== null ? toMMSS(p.endTime) : ""
                        })) : [];

                        setTestData({ ...data, passages: newPassages });
                        setIsMockMode(data.isExclusive || false);
                        setIsFree(data.isFree || false);
                        setJsonInput(JSON.stringify({
                            title: data.title,
                            introDuration: data.introDuration,
                            passages: newPassages.map(p => ({ ...p, audio: "" })) || [],
                            questions: data.questions || [],
                            keywordTable: data.keywordTable || []
                        }, null, 2));

                        const audioMap = {};
                        newPassages.forEach((p, i) => { if (p.audio) audioMap[i] = p.audio; });
                        setPartAudios(audioMap);

                        if (data.audio_url || (newPassages && newPassages.length > 0 && newPassages.every(p => p.audio && p.audio === newPassages[0].audio))) {
                            setAudioMode("single");
                            setSingleAudioUrl(data.audio_url || newPassages[0].audio);
                        } else {
                            setAudioMode("multiple");
                        }

                        if (data.type === 'listening') {
                            setListeningPartCount(newPassages.length || 4);
                        }
                    }
                } catch (error) { console.error(error); }
                finally { setLoading(false); }
            };
            fetchTest();
        }
    }, [id]);

    const uploadToFirebase = useCallback((file, folderName) => {
        return new Promise((resolve, reject) => {
            setUploadProgress(0);
            const storageRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
            const metadata = folderName === 'thumbnails' || file.type.startsWith('image/')
                ? { cacheControl: 'public,max-age=31536000' }
                : undefined;
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress));
                },
                (error) => reject(error),
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                }
            );
        });
    }, []);

    const updateTestDataFromJSON = useCallback((jsonStr) => {
        try {
            if (!jsonStr.trim()) return;
            const parsed = JSON.parse(jsonStr);

            setTestData(prev => {
                const passagesFromJSON = parsed.passages || [];
                const newQuestions = normalizeQuestions(parsed.questions || prev.questions);
                const testType = parsed.type || prev.type;
                const autoDifficulty = detectSectionFromQuestions(testType, newQuestions);
                
                const updatedPassages = passagesFromJSON.map((p, idx) => {
                    const existing = (prev.passages && prev.passages[idx]) ? prev.passages[idx] : {};
                    const audioUrl = audioMode === 'single' 
                        ? (singleAudioUrl || p.audio || existing.audio || "")
                        : (partAudios[idx] || p.audio || existing.audio || "");

                    return { ...existing, ...p, audio: audioUrl };
                });

                return {
                    ...prev,
                    title: parsed.title || prev.title,
                    type: testType,
                    difficulty: autoDifficulty || parsed.difficulty || prev.difficulty,
                    audio_url: parsed.audio || prev.audio_url,
                    introDuration: parsed.introDuration || prev.introDuration,
                    passages: parsed.passages ? updatedPassages : prev.passages,
                    questions: newQuestions,
                    keywordTable: parsed.keywordTable || prev.keywordTable || [],
                    thumbnail: parsed.thumbnail || prev.thumbnail || ""
                };
            });
            setJsonError("");
        } catch (err) { setJsonError("JSON Xato: " + err.message); }
    }, [audioMode, singleAudioUrl, partAudios]);

    const handleSave = async (bypass = false) => {
        if (!testData.title) { toast.error("Test nomini yozing!"); return; }
        setLoading(true);
        try {
            // Duplicate check logic should ideally be here too or passed as a helper
            // For now let's keep it simple or implement a minimal version
            
            let processedPassages = (testData.passages || []).map(p => ({
                ...p,
                startTime: p.startTime !== undefined ? processTime(p.startTime) : undefined,
                endTime: p.endTime !== undefined ? processTime(p.endTime) : undefined,
                extraSilentTime: p.extraSilentTime ? Number(p.extraSilentTime) : 0
            }));

            const processedQuestions = (testData.questions || []).map(q => {
                let cleanQ = { ...q };
                if (cleanQ.type === 'table_completion' && Array.isArray(cleanQ.rows)) {
                    cleanQ.rows = cleanQ.rows.map(row => Array.isArray(row) ? { cells: row } : row);
                }
                return cleanQ;
            });

            let finalQuestions = processedQuestions;
            if (testData.type === 'listening') {
                processedPassages = processedPassages.slice(0, listeningPartCount);
                const validPassageIds = processedPassages.map(p => String(p.id));
                finalQuestions = finalQuestions.filter(q => !q.passageId || validPassageIds.includes(String(q.passageId)));
            }

            const rawPayload = {
                ...testData,
                passages: processedPassages,
                questions: finalQuestions,
                introDuration: Number(testData.introDuration) || 0,
                isExclusive: isMockMode || false,
                isFree: isFree || false,
                questionTypes: getQuestionTypesFromQuestions(finalQuestions),
                updatedAt: new Date().toISOString()
            };

            const payload = sanitizePayload(JSON.parse(JSON.stringify(rawPayload)));

            if (isEditMode) {
                await updateDoc(doc(db, "tests", id), payload);
                const metadata = compileMetadata(id, payload);
                await setDoc(doc(db, "tests_metadata", id), metadata);
                toast.success("Test muvaffaqiyatli yangilandi!");
            } else {
                payload.createdAt = new Date().toISOString();
                const docRef = await addDoc(collection(db, "tests"), payload);
                const metadata = compileMetadata(docRef.id, payload);
                await setDoc(doc(db, "tests_metadata", docRef.id), metadata);

                // Auto post the new test to the feed if chosen
                if (publishToFeed) {
                    try {
                        await addDoc(collection(db, "feed_posts"), {
                            type: "test",
                            title: payload.title || "Yangi Test",
                            content: `${payload.type?.toUpperCase()} bo'limi bo'yicha yangi imtihon yuklandi. Bajarishni boshlang!`,
                            ctaUrl: `/test/${docRef.id}`,
                            ctaText: "Testni Boshlash",
                            likes: [],
                            commentsCount: 0,
                            createdAt: serverTimestamp()
                        });
                    } catch (feedErr) {
                        console.error("Error auto-posting test to feed:", feedErr);
                    }
                }

                toast.success("Test muvaffaqiyatli yaratildi!");
            }
            navigate("/admin/tests");
        } catch (error) {
            console.error("Firestore Save Error:", error);
            toast.error("Xato: " + (error.message || "Bilinmagan xato yuz berdi"));
        }
        setLoading(false);
    };

    return {
        testData, setTestData,
        loading, setLoading,
        uploading, setUploading,
        uploadProgress,
        isEditMode,
        isMockMode, setIsMockMode,
        isFree, setIsFree,
        publishToFeed, setPublishToFeed,
        jsonInput, setJsonInput,
        jsonError,
        partAudios, setPartAudios,
        audioMode, setAudioMode,
        singleAudioUrl, setSingleAudioUrl,
        uploadedMaps, setUploadedMaps,
        listeningPartCount, setListeningPartCount,
        uploadingPart, setUploadingPart,
        uploadToFirebase,
        updateTestDataFromJSON,
        handleSave
    };
};
