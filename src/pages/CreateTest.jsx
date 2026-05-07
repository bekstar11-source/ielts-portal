// src/pages/CreateTest.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";
import TagSelector from "../components/ui/TagSelector";
import TestPreview from "../components/admin/TestPreview";

// --- ICONS (Ranglar moslashtirildi) ---
const Icons = {
    Back: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
    Cloud: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>,
    Copy: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" /></svg>,
    Check: (p) => <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
};

export default function CreateTest() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isMockMode, setIsMockMode] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState("");
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [isBypassingDuplicate, setIsBypassingDuplicate] = useState(false);

    // --- AI CONVERTER STATE ---
    const [aiConverting, setAiConverting] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiOutput, setAiOutput] = useState("");
    const [aiError, setAiError] = useState("");
    const [aiProgress, setAiProgress] = useState("");
    const aiAbortRef = useRef(null);

    // --- PANEL RESIZE STATE ---
    const [panelWidth, setPanelWidth] = useState(50); // left panel % width
    const isResizingPanel = useRef(false);
    const rootPanelRef = useRef(null);

    const handlePanelMouseMove = useCallback((e) => {
        if (!isResizingPanel.current || !rootPanelRef.current) return;
        const rect = rootPanelRef.current.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setPanelWidth(Math.max(20, Math.min(80, pct)));
    }, []);

    const handlePanelMouseUp = useCallback(() => {
        isResizingPanel.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handlePanelMouseMove);
        document.removeEventListener('mouseup', handlePanelMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handlePanelMouseMove]);

    const handlePanelResizerMouseDown = useCallback((e) => {
        isResizingPanel.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handlePanelMouseMove);
        document.addEventListener('mouseup', handlePanelMouseUp);
        e.preventDefault();
    }, [handlePanelMouseMove, handlePanelMouseUp]);

    const [partAudios, setPartAudios] = useState({ 0: "", 1: "", 2: "", 3: "" });
    const [audioMode, setAudioMode] = useState("multiple"); // 'multiple' | 'single'
    const [singleAudioUrl, setSingleAudioUrl] = useState("");
    const [uploadedMaps, setUploadedMaps] = useState([]);
    const [activeWritingTask, setActiveWritingTask] = useState(0);
    const [listeningPartCount, setListeningPartCount] = useState(4);
    const [uploadingPart, setUploadingPart] = useState(null); // idx or 'single' or 'writing' or 'map'
    const [collections, setCollections] = useState([]);
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

    const getFileNameFromUrl = (url) => {
        try {
            if (!url) return '';
            const decoded = decodeURIComponent(url);
            const fullName = decoded.split('?')[0].split('/').pop();
            return fullName.substring(fullName.indexOf('_') + 1) || fullName;
        } catch (e) {
            return 'Fayl';
        }
    };

    const toMMSS = (seconds) => {
        if (seconds === undefined || seconds === null || seconds === "") return "";
        const s = Number(seconds);
        if (isNaN(s)) return seconds;
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const uploadToFirebase = (file, folderName) => {
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
                (error) => {
                    reject(error);
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                }
            );
        });
    };

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
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

                        // Check single audio mode
                        if (data.audio_url || (newPassages && newPassages.length > 0 && newPassages.every(p => p.audio && p.audio === newPassages[0].audio))) {
                            setAudioMode("single");
                            setSingleAudioUrl(data.audio_url || newPassages[0].audio);
                        } else {
                            setAudioMode("multiple");
                        }

                        if (data.type === 'listening') {
                            setListeningPartCount(newPassages.length || 4);
                        }

                        const existingMaps = [];
                        if (data.questions) {
                            data.questions.forEach(q => {
                                if ((q.type === 'map_labeling' || q.type === 'map' || q.type === 'matching') && q.image) {
                                    // Make sure not to add duplicates
                                    if (!existingMaps.some(m => m.url === q.image)) {
                                        existingMaps.push({ name: getFileNameFromUrl(q.image), url: q.image });
                                    }
                                }
                            });
                        }
                        setUploadedMaps(existingMaps);
                    }
                } catch (error) { console.error(error); }
                finally { setLoading(false); }
            };
            fetchTest();
        }
    }, [id]);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const qCols = query(collection(db, "test_collections"));
                const snapCols = await getDocs(qCols);
                const cols = snapCols.docs.map(d => ({ id: d.id, ...d.data() }));
                cols.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
                setCollections(cols);
            } catch (error) {
                console.error("Error fetching collections:", error);
            }
        };
        fetchCollections();
    }, []);

    const handleTagsChange = (tags) => {
        setTestData(prev => ({ ...prev, tags }));
    };

    const detectSectionFromQuestions = (testType, questions) => {
        if (!questions || !Array.isArray(questions) || questions.length === 0) return null;
        
        let minId = Infinity;
        let maxId = -Infinity;

        const extractIds = (q) => {
            const idStr = String(q.id || "");
            const matches = idStr.match(/\d+/g);
            if (matches) {
                matches.forEach(m => {
                    const num = parseInt(m);
                    if (num < minId) minId = num;
                    if (num > maxId) maxId = num;
                });
            }
            if (q.items) q.items.forEach(extractIds);
            if (q.questions) q.questions.forEach(extractIds);
            if (q.groups) q.groups.forEach(extractIds);
        };

        questions.forEach(extractIds);

        if (minId === Infinity) return null;

        if (testType === 'reading') {
            if (minId <= 1 && maxId >= 35) return 'medium'; 
            if (minId <= 13) return 'easy'; // Passage 1
            if (minId <= 26) return 'medium'; // Passage 2
            return 'hard'; // Passage 3
        } else if (testType === 'listening') {
            if (minId <= 1 && maxId >= 35) return 'full';
            if (minId <= 10) return 'part 1';
            if (minId <= 20) return 'part 2';
            if (minId <= 30) return 'part 3';
            return 'part 4';
        }
        return null;
    };

    const updateTestDataFromJSON = (jsonStr) => {
        try {
            if (!jsonStr.trim()) return;
            const parsed = JSON.parse(jsonStr);

            setTestData(prev => {
                const passagesFromJSON = parsed.passages || [];
                const newQuestions = parsed.questions || prev.questions;
                const testType = parsed.type || prev.type;

                // Auto-detect section/difficulty
                const autoDifficulty = detectSectionFromQuestions(testType, newQuestions);
                
                // Merge JSON passages with existing state to preserve times and audio if not in JSON
                const updatedPassages = passagesFromJSON.map((p, idx) => {
                    const existing = (prev.passages && prev.passages[idx]) ? prev.passages[idx] : {};
                    const audioUrl = audioMode === 'single' 
                        ? (singleAudioUrl || p.audio || existing.audio || "")
                        : (partAudios[idx] || p.audio || existing.audio || "");

                    return {
                        ...existing,
                        ...p,
                        audio: audioUrl
                    };
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
    };

    const handleJsonChange = (e) => {
        setJsonInput(e.target.value);
        updateTestDataFromJSON(e.target.value);
    };

    const handlePartAudioUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart(index);
        try {
            const url = await uploadToFirebase(file, "part_audios");

            setPartAudios(prev => ({ ...prev, [index]: url }));
            setTestData(prev => {
                const newPassages = [...(prev.passages || [])];
                if (!newPassages[index]) newPassages[index] = { id: 100 + index, title: `Part ${index + 1}`, content: "", audio: url };
                else newPassages[index] = { ...newPassages[index], audio: url };
                return { ...prev, passages: newPassages };
            });
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleAudioUrlChange = (url, index) => {
        setPartAudios(prev => ({ ...prev, [index]: url }));
        setTestData(prev => {
            const newPassages = [...(prev.passages || [])];
            if (!newPassages[index]) newPassages[index] = { id: 100 + index, title: `Part ${index + 1}`, content: "", audio: url };
            else newPassages[index] = { ...newPassages[index], audio: url };
            return { ...prev, passages: newPassages };
        });

        // Update JSON input to reflect audio change
        setJsonInput(prev => {
            try {
                const parsed = JSON.parse(prev || '{"passages":[]}');
                if (!parsed.passages) parsed.passages = [];
                if (!parsed.passages[index]) parsed.passages[index] = { audio: url, startTime: 0, endTime: 0, extraSilentTime: 0 };
                else parsed.passages[index].audio = url;
                return JSON.stringify(parsed, null, 2);
            } catch (err) { return prev; }
        });
    };

    const handleSingleAudioUrlChange = (url) => {
        setSingleAudioUrl(url);
        setTestData(prev => {
            const newPassages = [...(prev.passages || [])];
            for (let i = 0; i < listeningPartCount; i++) {
                if (!newPassages[i]) {
                    newPassages[i] = { id: 100 + i, title: `Part ${i + 1}`, content: "", audio: url, startTime: 0, endTime: 0, extraSilentTime: 0 };
                } else {
                    newPassages[i] = { ...newPassages[i], audio: url };
                }
            }
            return { ...prev, passages: newPassages, audio_url: url };
        });

        setJsonInput(prev => {
            try {
                const parsed = JSON.parse(prev || '{"passages":[]}');
                if (!parsed.passages) parsed.passages = [];
                for (let i = 0; i < listeningPartCount; i++) {
                    if (!parsed.passages[i]) parsed.passages[i] = { audio: url, startTime: 0, endTime: 0, extraSilentTime: 0 };
                    else parsed.passages[i].audio = url;
                }
                return JSON.stringify(parsed, null, 2);
            } catch (err) { return prev; }
        });
    };

    const handleSingleAudioUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('single');
        try {
            const url = await uploadToFirebase(file, "part_audios");
            setSingleAudioUrl(url);

            setTestData(prev => {
                const newPassages = [...(prev.passages || [])];
                for (let i = 0; i < listeningPartCount; i++) {
                    if (!newPassages[i]) {
                        newPassages[i] = { id: 100 + i, title: `Part ${i + 1}`, content: "", audio: url, startTime: 0, endTime: 0, extraSilentTime: 0 };
                    } else {
                        newPassages[i] = { ...newPassages[i], audio: url };
                    }
                }
                return { ...prev, passages: newPassages, audio_url: url };
            });

            setJsonInput(prev => {
                try {
                    const parsed = JSON.parse(prev || '{"passages":[]}');
                    if (!parsed.passages) parsed.passages = [];
                    for (let i = 0; i < listeningPartCount; i++) {
                        if (!parsed.passages[i]) parsed.passages[i] = { audio: url, startTime: 0, endTime: 0, extraSilentTime: 0 };
                        else parsed.passages[i].audio = url;
                    }
                    return JSON.stringify(parsed, null, 2);
                } catch (err) { return prev; }
            });
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const updatePartTime = (idx, field, value) => {
        const finalVal = value;
        setTestData(prev => {
            const newPassages = [...(prev.passages || [])];
            if (!newPassages[idx]) {
                newPassages[idx] = { id: 100 + idx, title: `Part ${idx + 1}`, content: "", audio: singleAudioUrl };
            }
            newPassages[idx][field] = finalVal;
            return { ...prev, passages: newPassages };
        });
        setJsonInput(prev => {
            try {
                const parsed = JSON.parse(prev || '{"passages":[]}');
                if (!parsed.passages) parsed.passages = [];
                if (!parsed.passages[idx]) parsed.passages[idx] = {};
                parsed.passages[idx][field] = finalVal;
                return JSON.stringify(parsed, null, 2);
            } catch (err) { return prev; }
        });
    };

    const handleMapUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('map');

        try {
            const url = await uploadToFirebase(file, "map_images");
            setUploadedMaps(prev => [...prev, { name: file.name, url }]);

            if (jsonInput.trim()) {
                try {
                    const parsedJson = JSON.parse(jsonInput);
                    let found = false;

                    if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
                        parsedJson.questions = parsedJson.questions.map(q => {
                            if (q.type === 'map_labeling') {
                                found = true;
                                return { ...q, image: url };
                            }
                            return q;
                        });
                    }

                    if (found) {
                        const newJsonStr = JSON.stringify(parsedJson, null, 2);
                        setJsonInput(newJsonStr);
                        updateTestDataFromJSON(newJsonStr);
                    } else {
                        copyToClipboard(url);
                    }
                } catch (jsonErr) {
                    copyToClipboard(url);
                    console.error(jsonErr);
                }
            } else {
                copyToClipboard(url);
            }
        } catch (err) { alert("Xatolik: " + err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleDeleteMap = (index) => {
        const mapToDelete = uploadedMaps[index];
        setUploadedMaps(prev => prev.filter((_, i) => i !== index));

        if (jsonInput.trim()) {
            try {
                const parsedJson = JSON.parse(jsonInput);
                if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
                    parsedJson.questions = parsedJson.questions.map(q => {
                        if ((q.type === 'map_labeling' || q.type === 'map' || q.type === 'matching') && q.image === mapToDelete.url) {
                            const newQ = { ...q };
                            delete newQ.image;
                            return newQ;
                        }
                        return q;
                    });
                }
                const newJsonStr = JSON.stringify(parsedJson, null, 2);
                setJsonInput(newJsonStr);
                updateTestDataFromJSON(newJsonStr);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleWritingImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingPart('writing');
        try {
            const url = await uploadToFirebase(file, "writing_images");
            setTestData(prev => {
                const newTasks = [...prev.writingTasks];
                newTasks[activeWritingTask] = { ...newTasks[activeWritingTask], image: url };
                return { ...prev, writingTasks: newTasks };
            });
        } catch (err) { alert(err.message); } finally { setUploading(false); setUploadingPart(null); }
    };

    const handleWritingUpdate = (field, value) => {
        setTestData(prev => {
            const newTasks = [...prev.writingTasks];
            newTasks[activeWritingTask] = { ...newTasks[activeWritingTask], [field]: value };
            return { ...prev, writingTasks: newTasks };
        });
    };

    const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert("Link nusxalandi!"); };

    // ═══════════════════════════════════════════════════
    // AI JSON CONVERTER — Local Ollama (OpenAI-compat API)
    // ═══════════════════════════════════════════════════
    const AI_SYSTEM_PROMPT = `ACT: You are a Senior React State Architect & QA Engineer. I need you to generate a strict JSON dataset for an IELTS Reading Simulator. The frontend is built with React/Vite and uses a specific "Rendering Engine" that parses JSON into interactive components. YOUR GOAL: Convert the provided IELTS Reading text/questions into a JSON format that perfectly matches the ReadingRightPane.jsx and ReadingFooter.jsx component logic.

🚨 CRITICAL RENDERING RULES (DO NOT VIOLATE)

TEXT SANITIZATION: Replace all smart quotes (\u201c \u201d \u2018 \u2019) with straight quotes (" '). No non-breaking spaces. Use standard spaces.
PASSAGE & HIGHLIGHTING (Review Mode Logic): In passages.content, wrap the specific sentence proving the answer in <span id="loc_QUESTIONID">...</span>. The question object MUST have a matching "locationId": "loc_QUESTIONID".
If the passage contains an introductory sentence or subtitle (usually located between the main title and the first paragraph), you MUST include it at the very beginning of the passages.content string, wrapped in <i>...</i> tags.

QUESTION GROUPING: All questions belonging to one task (e.g., Questions 1-5) must be in a single object in the questions array. passageId in the question group must match the passage's ID.

EXPLANATION RULE (CRITICAL & IN-DEPTH): Every question item MUST include an explanation object. This object contains two keys: "en" (English explanation) and "uz" (O'zbekcha tushuntirish).
🚨 Deep Analysis Requirement: The explanation MUST NOT be superficial. It MUST explicitly point out the exact synonyms, paraphrasing, and logical deductions used to connect the passage text to the question text. You must quote the relevant phrase from the text and show how it matches the vocabulary in the question.

CRITICAL VERIFICATION STEP: Before finalizing any answer in the JSON, you MUST perform a mental double-check for EVERY single question:
FOR ALL TYPES: Is the answer 100% supported by the explicit text?
FOR GAP-FILL: Does the exact word/phrase appear in the passage? Does it fit the word limit and grammar?
FOR T/F/NG or Y/N/NG: TRUE/YES (direct match), FALSE/NO (direct contradiction), NOT GIVEN (missing/impossible to confirm).

🏗 COMPONENT-SPECIFIC SCHEMAS

TYPE 1: GAP FILLS & SHORT ANSWERS
SUB-TYPE A: SUMMARY (Flowing Paragraph) - Trigger: "type": "summary". Input: [INPUT].
SUB-TYPE B: NOTE/SENTENCE COMPLETION - Trigger: "type": "gap_fill" or "type": "note_completion".
FORMATTING: Use <br/> for new lines. Use •  for bullets. Wrap headings in <b>...</b>.
Schema: Each input MUST be a separate object in the items array.
Example: "items": [ { "id": "1", "text": "• Text [INPUT]", "answer": "word", "locationId": "loc_1", "explanation": { "en": "...", "uz": "..." } } ]

TYPE 2: MATCHING & HEADINGS (Dropdowns)
Trigger: "type": "matching". Input: [DROP] at the END of the text string.
Schema: { "id": "14", "text": "Statement [DROP]", "answer": "A", "locationId": "loc_14", "explanation": { "en": "...", "uz": "..." } }

TYPE 3: MULTIPLE CHOICE & PICK N
Trigger: "type": "mcq" or "type": "pick_two".
Schema: { "id": "21", "text": "Question?", "answer": "A", "locationId": "loc_21", "explanation": { "en": "...", "uz": "..." } }

TYPE 4: COMPLEX TABLE COMPLETION
Trigger: "type": "table_completion".
Input Cell: Use "isMixed": true.
Schema: { "isMixed": true, "parts": [ { "type": "text", "content": "Text " }, { "type": "input", "id": "5", "answer": "1990", "locationId": "loc_5", "explanation": { "en": "...", "uz": "..." } } ] }

TYPE 5: TRUE/FALSE & YES/NO
Trigger: "type": "true_false" or "type": "yes_no".
Answer Format: "TRUE", "FALSE", "NOT GIVEN" etc.
Schema: { "id": "8", "text": "Statement", "answer": "FALSE", "locationId": "loc_8", "explanation": { "en": "...", "uz": "..." } }

TYPE 6: SUMMARY COMPLETION (WITH BOX OPTIONS)
Trigger: "type": "summary_box".
Answer: Must be the letter (e.g., "A").
Schema: { "id": "1", "text": "Summary [INPUT]", "answer": "C", "locationId": "loc_1", "explanation": { "en": "...", "uz": "..." } }

TASK: Using the old JSON provided below, convert it to the new schema above EXACTLY. Ensure:
1. All IDs are unique and preserved from the original
2. Every single question MUST have a highly detailed, bilingual explanation object (en/uz)
3. The explanation must explicitly prove the synonyms and paraphrasing used
4. All <span id="loc_X"> tags in passages.content must match locationIds
5. Output ONLY valid JSON. No markdown, no code fences, no comments. JUST the JSON object.`;

    const handleAiConvert = async () => {
        if (!jsonInput.trim()) {
            setAiError("JSON maydoni bo'sh! Avval eski formatdagi JSON ni kiriting.");
            return;
        }

        // Validate it's valid JSON first
        try {
            JSON.parse(jsonInput);
        } catch (e) {
            setAiError("Noto'g'ri JSON format! Avval JSON ni to'g'rilang.");
            return;
        }

        setShowAiModal(true);
        setAiConverting(true);
        setAiOutput("");
        setAiError("");
        setAiProgress("AI ga ulanilmoqda...");

        const controller = new AbortController();
        aiAbortRef.current = controller;

        try {
            const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: 'qwen3:32b',
                    messages: [
                        { role: 'system', content: AI_SYSTEM_PROMPT },
                        { role: 'user', content: `Here is the old format JSON to convert:\n\n${jsonInput}` }
                    ],
                    stream: true,
                    temperature: 0.1,
                    max_tokens: 32000
                })
            });

            if (!response.ok) {
                throw new Error(`AI server xatolik qaytardi: ${response.status} ${response.statusText}`);
            }

            setAiProgress("AI javob yozmoqda...");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            const content = data.choices?.[0]?.delta?.content;
                            if (content) {
                                fullText += content;
                                setAiOutput(fullText);
                            }
                        } catch (e) {
                            // Skip malformed SSE chunks
                        }
                    }
                }
            }

            setAiProgress("Tekshirilmoqda...");

            // Extract JSON from the response (handle possible markdown fences)
            let cleanJson = fullText.trim();
            // Remove <think>...</think> blocks (from reasoning models)
            cleanJson = cleanJson.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            // Remove markdown code fences if present
            const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) cleanJson = jsonMatch[1].trim();
            // Try to find the JSON object boundaries
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            try {
                const parsed = JSON.parse(cleanJson);
                const prettyJson = JSON.stringify(parsed, null, 2);
                setAiOutput(prettyJson);
                setAiProgress("✅ Tayyor! JSON muvaffaqiyatli konvertatsiya qilindi.");
            } catch (e) {
                setAiError("AI javobidan JSON ajratib olib bo'lmadi. Javobni qo'lda tekshiring.");
                setAiProgress("");
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setAiProgress("Bekor qilindi.");
            } else {
                setAiError(`AI serveriga ulanib bo'lmadi: ${err.message}. Ollama ishlayotganini tekshiring (http://127.0.0.1:11434).`);
                setAiProgress("");
            }
        } finally {
            setAiConverting(false);
            aiAbortRef.current = null;
        }
    };

    const handleApplyAiOutput = () => {
        try {
            const parsed = JSON.parse(aiOutput);
            const prettyJson = JSON.stringify(parsed, null, 2);
            setJsonInput(prettyJson);
            updateTestDataFromJSON(prettyJson);
            setShowAiModal(false);
            setAiOutput("");
            setAiError("");
            setAiProgress("");
        } catch (e) {
            setAiError("JSON noto'g'ri! Qo'llash mumkin emas.");
        }
    };

    const handleCancelAi = () => {
        if (aiAbortRef.current) {
            aiAbortRef.current.abort();
        }
        setShowAiModal(false);
        setAiConverting(false);
        setAiOutput("");
        setAiError("");
        setAiProgress("");
    };

    const handleSave = async (bypass = false) => {
        if (!testData.title) return alert("Test nomini yozing!");
        setLoading(true);
        try {
            // DUPLICATE CHECK — Only for NEW tests
            if (!isEditMode && !bypass) {
                const q = query(collection(db, "tests"), where("type", "==", testData.type));
                const snapshot = await getDocs(q);
                let isDuplicate = false;
                let duplicateTitle = "";

                const normalize = (val) => String(val || "").trim().toLowerCase();

                for (let docSnap of snapshot.docs) {
                    const existing = docSnap.data();
                    const existingId = docSnap.id;

                    // ════════════════════════════════════════
                    // CHECK 1: Exact Title Match
                    // ════════════════════════════════════════
                    const t1 = normalize(testData.title);
                    const t2 = normalize(existing.title);
                    // Skip very short or generic titles
                    if (t1.length >= 5 && t1 === t2) {
                        console.log("[DupCheck] Title match:", t1, "→ doc:", existingId);
                        isDuplicate = true;
                        duplicateTitle = existing.title;
                        break;
                    }

                    // ════════════════════════════════════════
                    // CHECK 2: Passage Content Match (Reading/Listening)
                    // ════════════════════════════════════════
                    if ((testData.type === 'reading' || testData.type === 'listening') &&
                        testData.passages?.length > 0 && existing.passages?.length > 0) {

                        let passageDuplicate = false;
                        for (let i = 0; i < Math.min(testData.passages.length, existing.passages.length); i++) {
                            const p1 = testData.passages[i];
                            const p2 = existing.passages[i];

                            const tit1 = normalize(p1?.title || "");
                            const tit2 = normalize(p2?.title || "");
                            const con1 = normalize(p1?.content || "").substring(0, 200);
                            const con2 = normalize(p2?.content || "").substring(0, 200);

                            // Skip generic titles like "Part 1", "Passage 1", "Section A"
                            const isGenericTitle = (s) =>
                                !s || s.length < 5 ||
                                /^(part|passage|section)\s*\d*$/i.test(s.trim());

                            // Title match — only for meaningful, non-generic titles
                            if (!isGenericTitle(tit1) && tit1 === tit2) {
                                console.log("[DupCheck] Passage title match:", tit1, "→ doc:", existingId);
                                passageDuplicate = true;
                                break;
                            }

                            // Content match — only if content is substantial (>80 chars)
                            if (con1.length > 80 && con1 === con2) {
                                console.log("[DupCheck] Passage content match at index", i, "→ doc:", existingId);
                                passageDuplicate = true;
                                break;
                            }

                            // Audio match — ONLY if the audio URL is a real non-empty URL
                            const au1 = (p1?.audio || "").trim();
                            const au2 = (p2?.audio || "").trim();
                            if (au1.length > 10 && au1 === au2) {
                                console.log("[DupCheck] Passage audio match at index", i, "→ doc:", existingId);
                                passageDuplicate = true;
                                break;
                            }
                        }

                        if (passageDuplicate) {
                            isDuplicate = true;
                            duplicateTitle = existing.title || "o'xshash kontent";
                            break;
                        }
                    }

                    // ════════════════════════════════════════
                    // CHECK 3: Question Content Match
                    // ════════════════════════════════════════
                    if (testData.questions?.length > 0 && existing.questions?.length > 0) {
                        const q1 = testData.questions;
                        const q2 = existing.questions;

                        // Must have same number of question groups AND some overlap in IDs
                        if (q1.length === q2.length) {
                            const ids1 = q1.slice(0, 5).map(q => normalize(q.id)).join(',');
                            const ids2 = q2.slice(0, 5).map(q => normalize(q.id)).join(',');

                            if (ids1 === ids2 && ids1.length > 0) {
                                // Check question text content across first 5 questions
                                let matchCount = 0;
                                let validTexts = 0;
                                for (let i = 0; i < Math.min(q1.length, q2.length, 5); i++) {
                                    const txt1 = normalize(
                                        q1[i]?.instruction || q1[i]?.question || q1[i]?.text || q1[i]?.sentence || ""
                                    );
                                    const txt2 = normalize(
                                        q2[i]?.instruction || q2[i]?.question || q2[i]?.text || q2[i]?.sentence || ""
                                    );
                                    if (txt1.length > 15) { // must be a meaningful text
                                        validTexts++;
                                        if (txt1.substring(0, 60) === txt2.substring(0, 60)) matchCount++;
                                    }
                                }

                                // All IDs are plain numbers → require STRONG content match
                                const isNumericIds = ids1.split(',').every(s => s && !isNaN(Number(s)));

                                if (isNumericIds) {
                                    // Need at least 2 valid texts and all of them matching strongly
                                    if (validTexts >= 2 && matchCount >= validTexts) {
                                        console.log("[DupCheck] Numeric IDs + content match:", matchCount, "/", validTexts, "→ doc:", existingId);
                                        isDuplicate = true;
                                        duplicateTitle = existing.title || "o'xshash savollar";
                                        break;
                                    }
                                } else {
                                    // Custom string IDs + same structure = strong duplicate signal
                                    // but still require at least some text match
                                    if (validTexts === 0 || (validTexts > 0 && matchCount >= Math.ceil(validTexts * 0.8))) {
                                        // No texts available → only flag if IDs are truly unique (not generic)
                                        if (validTexts > 0) {
                                            console.log("[DupCheck] Custom IDs + content match:", matchCount, "/", validTexts, "→ doc:", existingId);
                                            isDuplicate = true;
                                            duplicateTitle = existing.title || "o'xshash IDlar";
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ════════════════════════════════════════
                    // CHECK 4: Listening - Global Audio URL
                    // ════════════════════════════════════════
                    if (testData.type === 'listening') {
                        const au1 = (testData.audio_url || "").trim();
                        const au2 = (existing.audio_url || "").trim();
                        if (au1.length > 10 && au1 === au2) {
                            console.log("[DupCheck] Global audio_url match → doc:", existingId);
                            isDuplicate = true;
                            duplicateTitle = existing.title || "bir xil audio fayl";
                            break;
                        }
                    }

                    // ════════════════════════════════════════
                    // CHECK 5: Writing - Prompt Match
                    // ════════════════════════════════════════
                    if (testData.type === 'writing' && testData.writingTasks?.length > 0 && existing.writingTasks?.length > 0) {
                        const p1 = normalize(testData.writingTasks[0]?.prompt || "").substring(0, 100);
                        const p2 = normalize(existing.writingTasks[0]?.prompt || "").substring(0, 100);
                        if (p1.length > 40 && p1 === p2) {
                            console.log("[DupCheck] Writing prompt match → doc:", existingId);
                            isDuplicate = true;
                            duplicateTitle = existing.title || "o'xshash writing test";
                            break;
                        }
                    }

                    // ════════════════════════════════════════
                    // CHECK 6: Speaking - First Question Match
                    // ════════════════════════════════════════
                    if (testData.type === 'speaking' && testData.parts?.length > 0 && existing.parts?.length > 0) {
                        const sq1 = normalize(testData.parts[0]?.questions?.[0] || "").substring(0, 60);
                        const sq2 = normalize(existing.parts[0]?.questions?.[0] || "").substring(0, 60);
                        if (sq1.length > 20 && sq1 === sq2) {
                            console.log("[DupCheck] Speaking question match → doc:", existingId);
                            isDuplicate = true;
                            duplicateTitle = existing.title || "o'xshash speaking test";
                            break;
                        }
                    }
                }

                if (isDuplicate) {
                    setLoading(false);
                    setDuplicateInfo(duplicateTitle);
                    setShowDuplicateModal(true);
                    return;
                }
            }


            const processTime = (val) => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'string' && val.includes(':')) {
                    const parts = val.split(':');
                    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
                }
                return Number(val) || 0;
            };

            let processedPassages = (testData.passages || []).map(p => ({
                ...p,
                startTime: p.startTime !== undefined ? processTime(p.startTime) : undefined,
                endTime: p.endTime !== undefined ? processTime(p.endTime) : undefined,
                extraSilentTime: p.extraSilentTime ? Number(p.extraSilentTime) : 0
            }));

            // Robust sanitization for Firestore (Recursively handle Nested Arrays, undefined, NaN)
            const sanitizePayload = (obj) => {
                if (obj === null || obj === undefined) return null;
                if (typeof obj === 'number' && isNaN(obj)) return 0;
                if (typeof obj !== 'object' || obj instanceof Date) return obj;

                if (Array.isArray(obj)) {
                    return obj.map(item => {
                        if (Array.isArray(item)) {
                            // Firestore doesn't support nested arrays. Wrap in an object to break nesting.
                            return { cells: sanitizePayload(item) };
                        }
                        return sanitizePayload(item);
                    }).filter(v => v !== undefined);
                }

                const cleaned = {};
                Object.keys(obj).forEach(key => {
                    const value = sanitizePayload(obj[key]);
                    if (value !== undefined) cleaned[key] = value;
                });
                return cleaned;
            };

            const processedQuestions = (testData.questions || []).map(q => {
                let cleanQ = { ...q };
                // 1. Table completion specific fix (already present but now part of recursive sanitization)
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

            // KeywordTable normalization (ensure it's an array of objects, not array of arrays)
            let finalKeywordTable = testData.keywordTable || [];
            if (Array.isArray(finalKeywordTable) && finalKeywordTable.length > 0 && Array.isArray(finalKeywordTable[0])) {
                // Convert [["pword", "qword"], ...] format to object-based format
                finalKeywordTable = finalKeywordTable.map((p, i) => ({
                    id: String(i + 1),
                    passageWord: p[0] || "",
                    questionWord: p[1] || "",
                    passageId: "1" 
                }));
            }

            const rawPayload = {
                ...testData,
                passages: processedPassages,
                questions: finalQuestions,
                keywordTable: finalKeywordTable,
                introDuration: Number(testData.introDuration) || 0,
                isExclusive: isMockMode || false,
                updatedAt: new Date().toISOString()
            };

            // Deep clean the entire object tree to ensure no nested arrays remain
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

    return (
        <div ref={rootPanelRef} className={`min-h-screen flex flex-col md:flex-row h-screen overflow-hidden font-sans transition-colors duration-200 selection:bg-[#3772FF]/30 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#f5f5f7] text-zinc-900'}`}>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
                }
            `}</style>
            {/* MOBILE HEADER */}
            <div className={`md:hidden p-3 flex items-center justify-between border-b ${isDark ? 'bg-[#1e1e1e] border-white/10' : 'bg-white border-zinc-200'}`}>
                <button onClick={() => navigate('/admin/tests')} className="text-zinc-500"><Icons.Back className="w-4 h-4" /></button>
                <span className="font-bold text-xs">Test Manager</span>
            </div>

            {/* --- LEFT PANEL --- */}
            <div
                className={`w-full p-4 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar transition-colors ${isDark ? 'bg-[#181818]' : 'bg-[#fbfbfb]'}`}
                style={{ width: `${panelWidth}%`, minWidth: '280px' }}
            >
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => navigate('/admin/tests')} className={`flex items-center gap-1.5 transition group ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                        <div className={`p-1 rounded-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 group-hover:bg-white/10' : 'bg-white border-zinc-200 group-hover:bg-zinc-50'}`}><Icons.Back className="w-3.5 h-3.5" /></div>
                        <span className="text-[10px] font-bold">Orqaga</span>
                    </button>
                    <div className={`flex p-0.5 rounded-md border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                        <button onClick={() => setIsMockMode(false)} className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold transition ${!isMockMode ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-400 hover:text-zinc-600'}`}>Standard</button>
                        <button onClick={() => setIsMockMode(true)} className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold transition ${isMockMode ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-400 hover:text-zinc-600'}`}>Mock Exam</button>
                    </div>
                </div>

                <h1 className="text-sm font-bold mb-4 tracking-tight">{isEditMode ? "Testni Tahrirlash" : "Yangi Test Yaratish"}</h1>

                <div className="space-y-3 mb-4">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Test Nomi</label>
                        <input type="text" className={`w-full border px-2.5 py-1.5 rounded-lg outline-none transition-all text-xs font-bold ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white placeholder-zinc-500' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900 placeholder-zinc-400'}`} placeholder="Masalan: Cambridge 18 - Test 1" value={testData.title} onChange={e => setTestData({ ...testData, title: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Turi</label>
                            <div className="relative">
                                <select className={`w-full border px-2.5 py-1.5 rounded-lg outline-none transition-all text-xs font-bold appearance-none cursor-pointer ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900'}`} value={testData.type} onChange={e => {
                                    const newType = e.target.value;
                                    setTestData(prev => ({ 
                                        ...prev, 
                                        type: newType, 
                                        difficulty: newType === 'listening' ? 'full' : 'medium' 
                                    }));
                                }}>
                                    <option value="reading">Reading</option><option value="listening">Listening</option><option value="writing">Writing</option><option value="speaking">Speaking</option>
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-[8px]">▼</div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                                {testData.type === 'listening' ? "Bo'lim / Part" : "Qiyinlik / Matn"}
                            </label>
                            <div className="relative">
                                <select 
                                    className={`w-full border px-2.5 py-1.5 rounded-lg outline-none transition-all text-xs font-bold appearance-none cursor-pointer ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900'}`} 
                                    value={testData.difficulty} 
                                    onChange={e => setTestData({ ...testData, difficulty: e.target.value })}
                                >
                                    {testData.type === 'listening' ? (
                                        <>
                                            <option value="full">Full Test</option>
                                            <option value="part 1">Part 1</option>
                                            <option value="part 2">Part 2</option>
                                            <option value="part 3">Part 3</option>
                                            <option value="part 4">Part 4</option>
                                            <option value="part 1/2">Part 1/2</option>
                                            <option value="part 3/4">Part 3/4</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="easy">Passage 1</option>
                                            <option value="medium">Passage 2</option>
                                            <option value="hard">Passage 3</option>
                                        </>
                                    )}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-[8px]">▼</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Kolleksiya (Collection)</label>
                        <div className="relative">
                            <select 
                                className={`w-full border px-2.5 py-1.5 rounded-lg outline-none transition-all text-xs font-bold appearance-none cursor-pointer ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900'}`} 
                                value={testData.collectionId || "None"} 
                                onChange={e => setTestData({ ...testData, collectionId: e.target.value })}
                            >
                                <option value="None">Yo'q (None)</option>
                                {collections.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-[8px]">▼</div>
                        </div>
                    </div>

                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Test Taglari</label>
                        <TagSelector 
                            selectedTags={testData.tags || []} 
                            onChange={(tags) => setTestData(prev => ({ ...prev, tags }))} 
                            isDark={isDark} 
                            allowEdit={true}
                        />
                    </div>

                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Cover Image</label>
                            <span className="text-[8px] text-zinc-500">Tavsiya: 16:9 (800x450 px)</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="URL (https://...)"
                                    value={testData.thumbnail || ""}
                                    onChange={(e) => setTestData({ ...testData, thumbnail: e.target.value })}
                                    className={`w-full border px-2.5 py-1.5 rounded-lg outline-none transition-all text-[10px] ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white placeholder-zinc-500' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900 placeholder-zinc-400'}`}
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <label className={`cursor-pointer p-1 rounded-md border transition ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>
                                        <Icons.Cloud className="w-3.5 h-3.5 text-blue-500" />
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                setUploading(true);
                                                try {
                                                    const url = await uploadToFirebase(file, "test_covers");
                                                    setTestData({ ...testData, thumbnail: url });
                                                } catch (err) { alert(err.message); } 
                                                finally { setUploading(false); }
                                            }}
                                            accept="image/*"
                                        />
                                    </label>
                                </div>
                            </div>
                            {testData.thumbnail && (
                                <div className={`relative w-24 h-14 rounded-md overflow-hidden border ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                                    <img src={testData.thumbnail} alt="Cover Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setTestData({ ...testData, thumbnail: "" })}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-0.5 rounded-sm backdrop-blur-sm transition-all"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {testData.type === 'listening' && (
                        <div className="space-y-2">
                            <div className={`p-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                                <span className="text-[10px] font-bold text-zinc-500">Intro Delay (s)</span>
                                <input type="number" className={`w-12 border rounded-md p-1 text-center text-[10px] font-bold outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} value={testData.introDuration} onChange={(e) => setTestData({ ...testData, introDuration: e.target.value })} />
                            </div>
                            <div className={`p-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                                <span className="text-[10px] font-bold text-zinc-500">Listening Parts</span>
                                <div className={`flex p-0.5 rounded-md border ${isDark ? 'bg-[#181818] border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                                    <button onClick={() => setListeningPartCount(1)} className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold transition ${listeningPartCount === 1 ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-500'}`}>1 Part</button>
                                    <button onClick={() => setListeningPartCount(2)} className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold transition ${listeningPartCount === 2 ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-500'}`}>2 Parts</button>
                                    <button onClick={() => setListeningPartCount(4)} className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold transition ${listeningPartCount === 4 ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-500'}`}>4 Parts</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {testData.type === 'listening' && (
                    <div className={`p-3 rounded-lg border mb-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[10px] font-bold flex items-center gap-1.5"><Icons.Cloud className="w-3.5 h-3.5 text-purple-500" /> Audio</h3>
                            <div className={`flex p-0.5 rounded-md border ${isDark ? 'bg-[#181818] border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                                <button onClick={() => setAudioMode("multiple")} className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold transition ${audioMode === 'multiple' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-500'}`}>Partma-part</button>
                                <button onClick={() => setAudioMode("single")} className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold transition ${audioMode === 'single' ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-500'}`}>Bitta Fayl</button>
                            </div>
                        </div>

                        {audioMode === 'multiple' ? (
                            <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: listeningPartCount }).map((_, idx) => (
                                    <div key={idx} className={`flex flex-col gap-1.5 p-2 border rounded-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-zinc-200'}`}>
                                        <div className={`relative px-2 py-2 flex flex-col items-center justify-center rounded-md border border-dashed transition ${partAudios[idx] ? 'border-emerald-500 bg-emerald-500/5' : isDark ? 'border-white/20' : 'border-zinc-300'}`}>
                                            <div className="w-full flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <span className="text-[8px] font-bold uppercase text-zinc-500">Part {idx + 1} Audio</span>
                                                    {partAudios[idx] && <Icons.Check className="w-3 h-3 text-emerald-500" />}
                                                </div>

                                                <div className="flex gap-1 items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="URL..."
                                                        className={`flex-1 border rounded-[4px] py-0.5 px-1.5 text-[9px] focus:outline-none focus:border-blue-500 transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                                                        value={partAudios[idx] || ""}
                                                        onChange={(e) => handleAudioUrlChange(e.target.value, idx)}
                                                    />
                                                    <label className={`cursor-pointer p-0.5 rounded-[4px] transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'}`}>
                                                        <Icons.Cloud className="w-3 h-3" />
                                                        <input type="file" accept="audio/*" onChange={(e) => handlePartAudioUpload(e, idx)} disabled={uploading} className="hidden" />
                                                    </label>
                                                </div>

                                                {uploading && uploadingPart === idx && (
                                                    <div className="w-full h-0.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-300"
                                                            style={{ width: `${uploadProgress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-0.5">
                                            <span className="text-[8px] text-zinc-500 font-bold uppercase">Qo'shimcha (sek):</span>
                                            <input
                                                type="number"
                                                className={`w-10 border rounded-[4px] p-0.5 text-center text-[9px] font-bold outline-none focus:border-blue-500 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                                                placeholder="0"
                                                value={testData.passages[idx]?.extraSilentTime ?? ''}
                                                onChange={(e) => updatePartTime(idx, 'extraSilentTime', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className={`relative px-2 py-3 flex flex-col items-center justify-center rounded-lg border border-dashed transition ${singleAudioUrl ? 'border-emerald-500 bg-emerald-500/5' : isDark ? 'border-white/20 bg-white/5' : 'border-zinc-300 bg-zinc-50'}`}>
                                    <div className="w-full flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between px-0.5">
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Butun Audio Fayl</span>
                                            {singleAudioUrl && <Icons.Check className="w-3.5 h-3.5 text-emerald-500" />}
                                        </div>

                                        <div className="flex gap-1.5 items-center">
                                            <input
                                                type="text"
                                                placeholder="Audio URL..."
                                                className={`flex-1 border rounded-md p-1.5 text-[10px] focus:outline-none focus:border-blue-500 transition ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
                                                value={singleAudioUrl || ""}
                                                onChange={(e) => handleSingleAudioUrlChange(e.target.value)}
                                            />
                                            <label className={`cursor-pointer p-1.5 rounded-md transition flex items-center gap-1 ${isDark ? 'bg-white/10 hover:bg-white/20 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}>
                                                <Icons.Cloud className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-bold hidden sm:inline">Yuklash</span>
                                                <input type="file" accept="audio/*" onChange={handleSingleAudioUpload} disabled={uploading} className="hidden" />
                                            </label>
                                        </div>

                                        {uploading && uploadingPart === 'single' && (
                                            <div className="w-full h-0.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {singleAudioUrl && (
                                    <div className={`p-2 rounded-lg border ${isDark ? 'bg-[#181818] border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                                        <h4 className="text-[9px] font-black text-zinc-500 mb-1.5 uppercase tracking-widest">Partlar vaqtini belgilash</h4>
                                        <div className="space-y-1.5">
                                            {Array.from({ length: listeningPartCount }).map((_, idx) => (
                                                <div key={idx} className={`flex flex-col gap-1 p-1.5 border rounded-md ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-100'}`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-bold text-zinc-400 uppercase w-8">Part {idx + 1}</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Start"
                                                            value={testData.passages[idx]?.startTime ?? ''}
                                                            onChange={(e) => updatePartTime(idx, 'startTime', e.target.value)}
                                                            className={`flex-1 border rounded-[4px] p-1 text-[9px] focus:outline-none focus:border-blue-500 transition ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                                                        />
                                                        <span className="text-[10px] text-zinc-400">-</span>
                                                        <input
                                                            type="text"
                                                            placeholder="End"
                                                            value={testData.passages[idx]?.endTime ?? ''}
                                                            onChange={(e) => updatePartTime(idx, 'endTime', e.target.value)}
                                                            className={`flex-1 border rounded-[4px] p-1 text-[9px] focus:outline-none focus:border-blue-500 transition ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between border-t mt-0.5 pt-0.5 border-zinc-100 dark:border-white/5">
                                                        <span className="text-[8px] text-zinc-500 font-bold uppercase">End Silence (s):</span>
                                                        <input
                                                            type="number"
                                                            className={`w-12 border rounded-[4px] p-0.5 text-center text-[9px] font-bold outline-none focus:border-blue-500 transition ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                                                            placeholder="0"
                                                            value={testData.passages[idx]?.extraSilentTime ?? ''}
                                                            onChange={(e) => updatePartTime(idx, 'extraSilentTime', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(testData.type === 'listening' || testData.type === 'reading') && (
                    <div className={`p-3 rounded-lg border mb-3 shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[10px] font-bold flex items-center gap-1.5"><Icons.Cloud className="w-3.5 h-3.5 text-blue-500" /> Map & Images</h3>
                            <label className={`px-2 py-1 rounded-md text-[9px] font-bold cursor-pointer transition flex items-center gap-1.5 ${uploading && uploadingPart === 'map' ? (isDark ? 'bg-white/10 text-blue-400' : 'bg-zinc-200 text-blue-600') : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                                {uploading && uploadingPart === 'map' ? (
                                    <><div className="animate-spin h-2.5 w-2.5 border-2 border-current border-t-transparent rounded-full" /> {uploadProgress}%</>
                                ) : "+ Rasm"}
                                <input type="file" accept="image/*" onChange={handleMapUpload} disabled={uploading} className="hidden" />
                            </label>
                        </div>
                        <div className="space-y-1">
                            {uploadedMaps.map((map, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-1.5 rounded-md border group ${isDark ? 'bg-[#181818] border-white/5' : 'bg-white border-zinc-200'}`}>
                                    <span className="text-[9px] text-zinc-500 truncate w-32" title={map.name}>{map.name}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => copyToClipboard(map.url)} className="text-blue-500 hover:text-blue-600 transition p-0.5 opacity-60 hover:opacity-100" title="Linkni nusxalash"><Icons.Copy className="w-3 h-3" /></button>
                                        <button onClick={() => handleDeleteMap(idx)} className="text-rose-400 hover:text-rose-600 transition p-0.5 opacity-0 group-hover:opacity-100" title="O'chirish">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {uploadedMaps.length === 0 && <p className="text-[9px] text-zinc-400 text-center py-1">Rasm yuklanmagan</p>}
                        </div>
                    </div>
                )}

                {testData.type === 'writing' && (
                    <div className={`p-3 rounded-lg border mb-3 flex-1 flex flex-col shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className={`flex p-0.5 rounded-md mb-2 w-fit border ${isDark ? 'bg-[#181818] border-white/10' : 'bg-zinc-100 border-zinc-200'}`}>
                            {[0, 1].map(i => (<button key={i} onClick={() => setActiveWritingTask(i)} className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold transition ${activeWritingTask === i ? (isDark ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-zinc-900') : 'text-zinc-500'}`}>Task {i + 1}</button>))}
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <label className={`px-2 py-1 rounded-md text-[9px] font-bold cursor-pointer transition flex-1 text-center flex items-center justify-center gap-1 border ${uploading && uploadingPart === 'writing' ? (isDark ? 'bg-white/10 text-blue-400 border-white/10' : 'bg-zinc-200 text-blue-600 border-zinc-300') : (isDark ? 'bg-[#121212] hover:bg-white/5 border-white/10 text-zinc-300' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700')}`}>
                                {uploading && uploadingPart === 'writing' ? (
                                    <><div className="animate-spin h-2.5 w-2.5 border-2 border-current border-t-transparent rounded-full" /> {uploadProgress}%</>
                                ) : "Rasm Yuklash"}
                                <input type="file" accept="image/*" onChange={handleWritingImageUpload} className="hidden" />
                            </label>
                            {testData.writingTasks[activeWritingTask].image && <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20"><Icons.Check className="w-2.5 h-2.5 text-emerald-500" /><span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Rasm</span></div>}
                        </div>
                        <textarea className={`w-full flex-1 border rounded-lg p-2.5 text-[10px] focus:border-blue-500 outline-none resize-none leading-relaxed transition-colors ${isDark ? 'bg-[#121212] border-white/10 text-white placeholder-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'}`} placeholder="Task description..." value={testData.writingTasks[activeWritingTask].prompt} onChange={e => handleWritingUpdate("prompt", e.target.value)}></textarea>
                    </div>
                )}

                {(testData.type === 'reading' || testData.type === 'listening') && (
                    <div className="flex-1 flex flex-col min-h-[250px]">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">JSON Data</label>
                                {/* AI Convert Button */}
                                <button
                                    onClick={handleAiConvert}
                                    disabled={aiConverting || !jsonInput.trim()}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold transition-all duration-300 border ${
                                        aiConverting 
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 cursor-wait'
                                            : !jsonInput.trim()
                                                ? (isDark ? 'bg-white/5 text-zinc-600 border-white/5 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed')
                                                : (isDark ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10' : 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 border-purple-200 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100')
                                    }`}
                                    title="AI yordamida eski JSON ni yangi formatga o'tkazish"
                                >
                                    {aiConverting ? (
                                        <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
                                        </svg>
                                    )}
                                    <span>{aiConverting ? 'Konvertatsiya...' : 'AI Convert'}</span>
                                </button>
                            </div>
                            {jsonError && <span className="text-[9px] text-rose-500 font-bold">{jsonError}</span>}
                        </div>
                        <textarea className={`w-full flex-1 border rounded-lg p-3 font-mono text-[9px] sm:text-[10px] outline-none resize-none leading-relaxed custom-scrollbar shadow-sm transition-colors focus:border-blue-500 ${isDark ? 'bg-[#121212] border-white/10 text-zinc-300 focus:text-white' : 'bg-white border-zinc-200 text-zinc-600 focus:text-zinc-900'}`} value={jsonInput} onChange={handleJsonChange} placeholder='{ "passages": [], "questions": [] }' spellCheck="false" />
                    </div>
                )}
            </div>

            {/* --- RESIZER DIVIDER --- */}
            <div
                className={`hidden md:flex w-[6px] shrink-0 h-full items-center justify-center relative group cursor-col-resize z-20 bg-transparent transition-colors duration-200 ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-200/50'}`}
                onMouseDown={handlePanelResizerMouseDown}
            >
                {/* Visual track */}
                <div className={`w-[1px] h-full transition-colors duration-200 ${isDark ? 'bg-white/10 group-hover:bg-blue-500/50' : 'bg-zinc-200 group-hover:bg-blue-500/50'}`} />
                {/* Grab handle pill */}
                <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-full border shadow-sm transition-all duration-200 ${isDark ? 'bg-[#181818] border-white/10 group-hover:border-blue-500/50' : 'bg-white border-zinc-200 group-hover:border-blue-300'}`}>
                    <div className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-zinc-500 group-hover:bg-blue-400' : 'bg-zinc-300 group-hover:bg-blue-500'}`} />
                    <div className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-zinc-500 group-hover:bg-blue-400' : 'bg-zinc-300 group-hover:bg-blue-500'}`} />
                    <div className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-zinc-500 group-hover:bg-blue-400' : 'bg-zinc-300 group-hover:bg-blue-500'}`} />
                </div>
            </div>

            {/* --- RIGHT PANEL: LIVE PREVIEW --- */}
            <div
                className={`hidden md:flex flex-col border-l relative overflow-hidden ${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-zinc-200'}`}
                style={{ width: `${100 - panelWidth}%`, minWidth: '240px' }}
            >
                {/* HEADER BAR */}
                <div className={`flex justify-between items-center px-4 py-2 border-b shrink-0 z-10 ${isDark ? 'bg-[#181818] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div className="flex items-center gap-2">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Preview</h2>
                        <span className="text-[10px] text-zinc-400 font-bold">{Math.round(100 - panelWidth)}%</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{testData.type}</span>
                </div>
                {/* PREVIEW BODY */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <TestPreview testData={testData} testType={testData.type} />
                </div>
            </div>

            {/* --- DUPLICATE WARNING MODAL --- */}
            {showDuplicateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in transition-all">
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-2xl max-w-md w-full p-8 overflow-hidden relative group border border-gray-100 dark:border-gray-800">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500" />

                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4 border border-orange-100 dark:border-orange-900/30">
                                <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Test Mavjud!</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Bu test (yoki unga juda o'xshash kontent) bazada allaqachon <span className="font-bold text-gray-900 dark:text-gray-100">"{duplicateInfo}"</span> nomi bilan mavjud ekan.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => { setShowDuplicateModal(false); handleSave(true); }}
                                className="w-full bg-gray-900 dark:bg-black hover:bg-black dark:hover:bg-[#050505] text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-gray-200 dark:shadow-none active:scale-[0.98]"
                            >
                                Baribir Yaratish/Saqlash
                            </button>
                            <button
                                onClick={() => setShowDuplicateModal(false)}
                                className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold py-4 rounded-2xl transition active:scale-[0.98]"
                            >
                                Bekor Qilish
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Administrator nazorati</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- AI CONVERSION MODAL --- */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className={`relative rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border ${
                        isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-zinc-200'
                    }`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${
                            isDark ? 'border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10' : 'border-zinc-200 bg-gradient-to-r from-purple-50 to-blue-50'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                                    <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>AI JSON Konverter</h3>
                                    <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Eski formatni yangi formatga o'tkazish</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCancelAi}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Progress Bar */}
                        {aiConverting && (
                            <div className="w-full h-1 bg-zinc-200 dark:bg-white/5 shrink-0">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse" style={{ width: '100%' }} />
                            </div>
                        )}

                        {/* Status */}
                        {aiProgress && (
                            <div className={`px-5 py-2 text-[11px] font-bold flex items-center gap-2 shrink-0 border-b ${
                                isDark ? 'text-purple-300 border-white/5 bg-purple-500/5' : 'text-purple-600 border-zinc-100 bg-purple-50/50'
                            }`}>
                                {aiConverting && <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-500 rounded-full animate-spin shrink-0" />}
                                {aiProgress}
                            </div>
                        )}

                        {/* Error */}
                        {aiError && (
                            <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold border-b border-rose-100 dark:border-rose-500/20 shrink-0 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {aiError}
                            </div>
                        )}

                        {/* Output Area */}
                        <div className="flex-1 overflow-hidden p-4">
                            <textarea
                                readOnly
                                value={aiOutput}
                                className={`w-full h-full border rounded-xl p-4 font-mono text-[10px] outline-none resize-none leading-relaxed custom-scrollbar transition-colors ${
                                    isDark ? 'bg-[#0d0d0d] border-white/10 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                                }`}
                                placeholder="AI javobini kutilmoqda..."
                            />
                        </div>

                        {/* Footer Actions */}
                        <div className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
                            isDark ? 'border-white/10 bg-[#181818]' : 'border-zinc-200 bg-zinc-50'
                        }`}>
                            <div className="flex items-center gap-2">
                                {aiOutput && (
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(aiOutput); }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                            isDark ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                        }`}
                                    >
                                        📋 Nusxalash
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {aiConverting && (
                                    <button
                                        onClick={() => { if (aiAbortRef.current) aiAbortRef.current.abort(); }}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                                    >
                                        To'xtatish
                                    </button>
                                )}
                                <button
                                    onClick={handleCancelAi}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                        isDark ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                                    }`}
                                >
                                    Yopish
                                </button>
                                {aiOutput && !aiConverting && !aiError && (
                                    <button
                                        onClick={handleApplyAiOutput}
                                        className="px-4 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
                                    >
                                        ✓ Qo'llash
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SAVE BUTTON FLOATING --- */}
            <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${loading ? 'scale-95 opacity-80' : 'hover:scale-105'}`}>
                <div className="relative group">
                    {/* Hover bo'lganda chiqadigan ogohlantirish */}
                    {!isEditMode && duplicateInfo && !showDuplicateModal && (
                        <div className={`absolute bottom-full right-0 mb-3 w-52 p-2.5 rounded-lg shadow-xl border animate-bounce transition-all opacity-0 group-hover:opacity-100 pointer-events-none ${isDark ? 'bg-[#1E1E1E] border-orange-500/30' : 'bg-white border-orange-200'}`}>
                            <div className="flex items-start gap-1.5">
                                <div className={`p-1 rounded-md ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}><svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-orange-500 uppercase mb-0.5">Diqqat: Dublikat</p>
                                    <p className={`text-[9px] font-medium leading-snug ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Bu test bazada bor bo'lishi mumkin.</p>
                                </div>
                            </div>
                            <div className={`absolute bottom-[-4px] right-6 w-2 h-2 border-r border-b rotate-45 ${isDark ? 'bg-[#1E1E1E] border-orange-500/30' : 'bg-white border-orange-200'}`} />
                        </div>
                    )}

                    <button
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className={`h-9 rounded-lg flex items-center justify-center gap-1.5 px-4 text-[10px] font-bold text-white shadow-lg transition-all duration-300 ${loading ? 'bg-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 hover:shadow-blue-600/40'}`}
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Kutilmoqda...</span>
                            </>
                        ) : (
                            <>
                                <Icons.Check className="w-3 h-3" />
                                <span>{isEditMode ? "Yangilash" : "Yaratish"}</span>
                            </>
                        )}
                    </button>
                    {/* Progress indicator for uploading images/audios if any */}
                    {uploading && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full border-2 border-white dark:border-[#121212] flex items-center justify-center animate-pulse">
                            <div className="w-2 h-2 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}