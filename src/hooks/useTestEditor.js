import { useState, useEffect, useCallback } from "react";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { 
    detectSectionFromQuestions, 
    processTime, 
    sanitizePayload, 
    toMMSS 
} from "../components/admin/CreateTest/CreateTestUtils";

export const useTestEditor = (id) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEditMode, setIsEditMode] = useState(!!id);
    const [isMockMode, setIsMockMode] = useState(false);
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
            const uploadTask = uploadBytesResumable(storageRef, file);

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
                const newQuestions = parsed.questions || prev.questions;
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
        if (!testData.title) return alert("Test nomini yozing!");
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
                updatedAt: new Date().toISOString()
            };

            const payload = sanitizePayload(JSON.parse(JSON.stringify(rawPayload)));

            if (isEditMode) {
                await updateDoc(doc(db, "tests", id), payload);
                alert("Test yangilandi!");
            } else {
                payload.createdAt = new Date().toISOString();
                await addDoc(collection(db, "tests"), payload);
                alert("Test yaratildi!");
            }
            navigate("/admin/tests");
        } catch (error) { 
            console.error("Firestore Save Error:", error); 
            alert("Xato: " + (error.message || "Bilinmagan xato yuz berdi")); 
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
