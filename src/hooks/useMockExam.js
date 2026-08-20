import { useState, useEffect, useRef, useCallback } from "react";
import { db, functions } from "../firebase/firebase";
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { syncServerTime, getCurrentServerTime } from "../utils/timeSync";
import { revokeMockAudioBlobs } from "../utils/audioBlobRegistry";
import { parseAudioTime } from "../utils/audioTime";

const STORAGE_KEY = 'ielts_mock_session';
const DEVICE_KEY = 'ielts_device_id';

/**
 * Shu brauzer uchun barqaror identifikator.
 *
 * Bitta imtihon sessiyasi ikki qurilmada ochilsa, ikkalasi ham bir xil
 * Firestore hujjatiga yozadi va javoblar bir-birini bosib ketadi. Buni
 * to'xtata olmaymiz (talaba baribir ikkinchi qurilmani ocha oladi), lekin
 * aniqlab, ogohlantira olamiz.
 */
function getDeviceId() {
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
    } catch {
        // Private rejimda localStorage yopiq bo'lishi mumkin — sessiya davomida
        // barqaror bo'lsa yetarli.
        return 'no-storage';
    }
}

// Sessiya saqlanadigan bosqichlar ('loading' ataylab yo'q).
const PERSISTED_STAGES = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro', 'test_ended', 'saving', 'result'];

// Taymer ishlaydigan bosqichlar.
const TIMED_STAGES = ['listening', 'reading', 'writing'];

// Javoblar qaysi "chelak"ka yozilishi. Volume check paytida stage 'listening_volume_check'
// bo'ladi, javoblar esa baribir listening'ga tegishli.
const ANSWER_BUCKET_BY_STAGE = {
    listening: 'listening',
    listening_volume_check: 'listening',
    reading: 'reading',
    writing: 'writing'
};

// Javoblarni Firestore'ga sinxronlash: tinchlangandan 10s keyin, lekin oxirgi
// yozuvdan 30s dan ko'p o'tib ketmasligi kafolatlanadi (uzluksiz yozuvchi talaba uchun).
const FIRESTORE_DEBOUNCE_MS = 10000;
const FIRESTORE_MAX_WAIT_MS = 30000;

// "Module Ended" ekrani avtomatik intro'ga o'tguncha kutadigan vaqt.
// MockExam.jsx dagi hisoblagich ham shu qiymatdan boshlanadi.
export const TEST_ENDED_AUTO_ADVANCE_SEC = 20;

function saveSession(mockId, data) {
    try {
        localStorage.setItem(`${STORAGE_KEY}_${mockId}`, JSON.stringify(data));
    } catch (e) { console.warn('Failed to save mock session:', e); }
}

function loadSession(mockId) {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${mockId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

export function getListeningDuration(listeningTest) {
    if (!listeningTest?.passages) return 30 * 60;
    let total = 0;
    for (let i = 0; i < listeningTest.passages.length; i++) {
        const passage = listeningTest.passages[i];
        const partKey = `part${i + 1}`;
        const partMeta = listeningTest.parts?.[partKey];
        const defaultStart = passage.audio ? 0 : (i * 450);
        const defaultEnd = passage.audio ? 0 : ((i + 1) * 450);
        // TestHeader bilan bir xil ustunlik tartibi: admin tahrirlaydigan
        // `passage.startTime` birinchi, hosila `parts.partN.*` — zaxira.
        const startTime = parseAudioTime(
            (passage.startTime !== undefined && passage.startTime !== null && passage.startTime !== "")
                ? passage.startTime
                : (partMeta?.startSec ?? defaultStart)
        );
        const endTime = parseAudioTime(
            (passage.endTime !== undefined && passage.endTime !== null && passage.endTime !== "")
                ? passage.endTime
                : (partMeta?.endSec ?? defaultEnd)
        );


        if (endTime && endTime > startTime) {
            total += (endTime - startTime) + (Number(passage.extraSilentTime) || 0);
        } else {
            return 30 * 60;
        }
    }
    return total > 0 ? total : 30 * 60;
}

export function useMockExam(mockData, user, userData, navigate) {
    const [stage, setStage] = useState('loading');
    const [tests, setTests] = useState({ listening: null, reading: null, writing: null });
    const [answers, setAnswers] = useState({ listening: {}, reading: {}, writing: {} });
    const [timeLeft, setTimeLeft] = useState(0);
    const [cheatWarning, setCheatWarning] = useState({ isOpen: false, count: 0, msg: '' });
    const [finalResults, setFinalResults] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [completedModules, setCompletedModules] = useState([]);
    const [autoStartDeadline, setAutoStartDeadline] = useState(null);
    const [listeningStartTime, setListeningStartTime] = useState(null);
    const [listeningDuration, setListeningDuration] = useState(0);
    
    const listeningStartTimeRef = useRef(null);
    useEffect(() => {
        listeningStartTimeRef.current = listeningStartTime;
    }, [listeningStartTime]);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    // Bu sessiya boshqa qurilmada ham ochiqmi (banner shu bo'yicha ko'rsatiladi).
    const [deviceConflict, setDeviceConflict] = useState(false);

    // ─── Diagnostika: talaba "audio to'xtab qoldi" desa, adminda dalil bo'lsin ───
    // Taymer internet uzilganda ham ishlaydi, ya'ni uzilish = yo'qotilgan vaqt.
    // Har bir hodisa vaqt tamg'asi bilan yoziladi.
    const deviceIdRef = useRef(getDeviceId());
    const offlineMsRef = useRef(0);
    const connectionEventsRef = useRef([]);
    const tabSwitchEventsRef = useRef([]);
    
    // Auto-set deadline for test_ended stage only (intro is managed by MockExamIntro)
    // MUHIM: test_ended dan chiqqanda deadline NULL ga qaytarilishi shart. Ilgari
    // qaytarilmasdi va talaba "Continue" ni qo'lda bossa, eski (o'tib ketgan) deadline
    // qolib ketardi — keyingi modul tugaganda "Module Ended" ekrani ko'rsatilmasdan,
    // bir soniyada intro'ga sakrab ketardi.
    useEffect(() => {
        if (stage === 'test_ended') {
            if (!autoStartDeadline) {
                // Server vaqti: mahalliy soatni o'zgartirish bilan deadline'ni
                // surib bo'lmasin (qolgan hisob-kitoblar allaqachon shunday).
                setAutoStartDeadline(getCurrentServerTime() + TEST_ENDED_AUTO_ADVANCE_SEC * 1000);
            }
        } else if (autoStartDeadline) {
            setAutoStartDeadline(null);
        }
    }, [stage, autoStartDeadline]);

    // Qurilma ogohlantirishi bir marta ko'rsatilib, o'zi yo'qoladi. Aks holda u
    // butun imtihon davomida osilib qolar va ustuvorligi tufayli undan MUHIMROQ
    // bannerni (internet uzilishi) ko'rsatmay qo'yardi.
    useEffect(() => {
        if (!deviceConflict) return;
        const id = setTimeout(() => setDeviceConflict(false), 30000);
        return () => clearTimeout(id);
    }, [deviceConflict]);

    const stageRef = useRef(stage);
    const answersRef = useRef(answers);
    const timeLeftRef = useRef(timeLeft);
    const completedRef = useRef(completedModules);
    const tabSwitchCountRef = useRef(tabSwitchCount);
    const audioTimeRef = useRef(0);
    const activePartRef = useRef(0);
    const mockId = mockData?.mockKey || mockData?.id || 'default';

    // Restored values for audio resume
    const [resumeAudioTime, setResumeAudioTime] = useState(0);
    const [resumeActivePart, setResumeActivePart] = useState(0);

    useEffect(() => { stageRef.current = stage; }, [stage]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { completedRef.current = completedModules; }, [completedModules]);
    useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);

    // ─── Persist 1/2: localStorage (har o'zgarishda darhol) ───
    useEffect(() => {
        if (!PERSISTED_STAGES.includes(stage) || !user?.uid) return;

        const deadlineVal = ['listening', 'reading', 'writing'].includes(stage) && timeLeft > 0
            ? getCurrentServerTime() + timeLeft * 1000
            : null;

        saveSession(mockId, {
            stage,
            answers,
            timeLeft,
            completedModules,
            tabSwitchCount: tabSwitchCountRef.current,
            audioTime: audioTimeRef.current,
            activePart: activePartRef.current,
            autoStartDeadline,
            deadline: deadlineVal,
            listeningStartTime,
            listeningDuration,
            deviceId: deviceIdRef.current,
            offlineMs: offlineMsRef.current,
            connectionEvents: connectionEventsRef.current,
            tabSwitchEvents: tabSwitchEventsRef.current,
            savedAt: getCurrentServerTime()
        });
    }, [stage, answers, timeLeft, completedModules, user?.uid, mockId, autoStartDeadline, listeningStartTime, listeningDuration]);

    // ─── Persist 2/2: Firestore ───
    // DIQQAT: bu effekt `timeLeft` ga BOG'LANMAYDI. Ilgari bog'langan edi va taymer uni
    // har sekundda o'zgartirgani uchun cleanup 10 soniyalik debounce'ni har safar bekor
    // qilardi — natijada javoblar imtihon davomida Firestore'ga UMUMAN yozilmasdi
    // (faqat bosqich almashganda). Qurilma o'chsa, talabaning essesi yo'qolardi.
    // Joriy qiymatlar ref'lardan o'qiladi, shuning uchun yozuv paytida ular eng yangisi bo'ladi.
    const prevStageRef = useRef(stage);
    const lastFirestoreWriteRef = useRef(0);
    useEffect(() => {
        if (!PERSISTED_STAGES.includes(stage) || !user?.uid) return;

        const isStageChange = prevStageRef.current !== stage;
        prevStageRef.current = stage;

        const writeToFirestore = async () => {
            lastFirestoreWriteRef.current = getCurrentServerTime();
            try {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);

                if (isStageChange) {
                    // Stage transitions: write immediately with full metadata
                    const sessionSnap = await getDoc(sessionRef);
                    const existingData = sessionSnap.exists() ? sessionSnap.data() : {};

                    const updateData = {
                        stage,
                        answers: answersRef.current,
                        timeLeft: timeLeftRef.current,
                        completedModules: completedRef.current,
                        tabSwitchCount: tabSwitchCountRef.current,
                        audioTime: audioTimeRef.current,
                        activePart: activePartRef.current,
                        deviceId: deviceIdRef.current,
                        offlineMs: offlineMsRef.current,
                        connectionEvents: connectionEventsRef.current.slice(-50),
                        tabSwitchEvents: tabSwitchEventsRef.current.slice(-50),
                        updatedAt: serverTimestamp()
                    };

                    if (autoStartDeadline) {
                        updateData.autoStartDeadline = new Date(autoStartDeadline);
                    }

                    if (stage === 'listening' && !existingData.listeningStartTime) {
                        const now = getCurrentServerTime();
                        updateData.listeningStartTime = serverTimestamp();
                        setListeningStartTime(now);
                    } else if (stage === 'reading' && !existingData.readingStartTime) {
                        updateData.readingStartTime = serverTimestamp();
                    } else if (stage === 'writing' && !existingData.writingStartTime) {
                        updateData.writingStartTime = serverTimestamp();
                    }

                    await setDoc(sessionRef, updateData, { merge: true });
                } else {
                    // Answer updates: just sync the essentials
                    await setDoc(sessionRef, {
                        answers: answersRef.current,
                        timeLeft: timeLeftRef.current,
                        completedModules: completedRef.current,
                        audioTime: audioTimeRef.current,
                        activePart: activePartRef.current,
                        deviceId: deviceIdRef.current,
                        offlineMs: offlineMsRef.current,
                        connectionEvents: connectionEventsRef.current.slice(-50),
                        tabSwitchEvents: tabSwitchEventsRef.current.slice(-50),
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } catch (err) {
                console.warn("Failed to sync to Firestore:", err);
            }
        };

        if (isStageChange) {
            // Bosqich almashuvi — darhol yoziladi va ayni paytda kutayotgan javoblarni ham flush qiladi.
            writeToFirestore();
            return;
        }

        // Javob o'zgarishlari: 10s debounce, LEKIN oxirgi yozuvdan 30s o'tgan bo'lsa darhol.
        // Max-wait bo'lmasa, uzluksiz yozayotgan talaba (Writing) debounce'ni cheksiz
        // surib, hech qachon sinxronlanmasligi mumkin edi.
        const sinceLastWrite = getCurrentServerTime() - lastFirestoreWriteRef.current;
        const delay = Math.max(0, Math.min(FIRESTORE_DEBOUNCE_MS, FIRESTORE_MAX_WAIT_MS - sinceLastWrite));

        const timeoutId = setTimeout(writeToFirestore, delay);
        return () => clearTimeout(timeoutId);
    }, [stage, answers, completedModules, user?.uid, mockId, autoStartDeadline]);

    // ─── Warn before page unload & Auto-submit logic ───
    useEffect(() => {
        const activeStages = ['listening', 'reading', 'writing', 'listening_volume_check', 'intro'];
        
        const handleBeforeUnload = (e) => {
            if (activeStages.includes(stageRef.current)) {
                const msg = "Ogohlantirish! Agar sahifani yopsangiz yoki yangilasangiz (refresh), imtihon yakunlanadi va urinishingiz kuyadi.";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ─── Tab Switch Detection (visibilitychange) ───
    useEffect(() => {
        const activeTestStages = ['listening', 'reading', 'writing', 'listening_volume_check'];
        
        // Telegram bildirishnomasi yoki boshqa dastur oynasi bir lahzaga ustga
        // chiqqanda ham brauzer sahifani "hidden" deb belgilaydi. Buni
        // qoidabuzarlik deb sanash noto'g'ri (talaba 3 ta soxta ogohlantirish
        // bilan testdan chiqib ketardi) — shuning uchun sahifa kamida
        // HIDDEN_GRACE_MS davomida yopiq turgandagina hisoblaymiz.
        const HIDDEN_GRACE_MS = 2000;
        let hiddenTimer = null;

        const handleVisibilityChange = () => {
            clearTimeout(hiddenTimer);
            if (document.hidden && activeTestStages.includes(stageRef.current)) {
                hiddenTimer = setTimeout(() => {
                    if (document.hidden && activeTestStages.includes(stageRef.current)) {
                        // Har bir strike'ni vaqt tamg'asi va bosqichi bilan yozamiz.
                        // Talaba "men hech qayoqqa o'tmadim" desa, admin nima
                        // bo'lganini ko'ra olsin — hozir faqat quruq raqam bor edi.
                        tabSwitchEventsRef.current = [
                            ...tabSwitchEventsRef.current,
                            { at: getCurrentServerTime(), stage: stageRef.current }
                        ].slice(-50);
                        setTabSwitchCount(prev => prev + 1);
                    }
                }, HIDDEN_GRACE_MS);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearTimeout(hiddenTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Fetch Tests & Restore/Auto-submit Session
    useEffect(() => {
        if (!mockData) return;
        const fetchTests = async () => {
            try {
                let loadedTests = null;
                const isStaff = userData?.role === 'admin' || userData?.role === 'teacher';

                if (isStaff) {
                    const [lSnap, rSnap, wSnap] = await Promise.all([
                        getDoc(doc(db, "tests", mockData.subTests.listening)),
                        getDoc(doc(db, "tests", mockData.subTests.reading)),
                        getDoc(doc(db, "tests", mockData.subTests.writing))
                    ]);
                    loadedTests = {
                        listening: { id: lSnap.id, ...lSnap.data() },
                        reading: { id: rSnap.id, ...rSnap.data() },
                        writing: { id: wSnap.id, ...wSnap.data() }
                    };
                } else {
                    const getSanitizedTestFn = httpsCallable(functions, 'getSanitizedTest');
                    const [lRes, rRes, wRes] = await Promise.all([
                        getSanitizedTestFn({ testId: mockData.subTests.listening }),
                        getSanitizedTestFn({ testId: mockData.subTests.reading }),
                        getSanitizedTestFn({ testId: mockData.subTests.writing })
                    ]);
                    loadedTests = {
                        listening: lRes.data,
                        reading: rRes.data,
                        writing: wRes.data
                    };
                }
                setTests(loadedTests);

                // ─── Sync Server Time ───
                await syncServerTime();
                const currentServerTime = getCurrentServerTime();

                // ─── Restore session from Firestore ───
                let saved = null;
                if (user?.uid) {
                    try {
                        const sessionSnap = await getDoc(doc(db, "users", user.uid, "mockSessions", mockId));
                        if (sessionSnap.exists()) {
                            saved = sessionSnap.data();
                            
                            // Convert firestore timestamps back to ms
                            if (saved.listeningStartTime && typeof saved.listeningStartTime.toDate === 'function') {
                                saved.listeningStartTime = saved.listeningStartTime.toDate().getTime();
                            }
                            if (saved.listeningDuration) {
                                saved.listeningDuration = Number(saved.listeningDuration);
                            }
                            if (saved.readingStartTime && typeof saved.readingStartTime.toDate === 'function') {
                                saved.readingStartTime = saved.readingStartTime.toDate().getTime();
                            }
                            if (saved.writingStartTime && typeof saved.writingStartTime.toDate === 'function') {
                                saved.writingStartTime = saved.writingStartTime.toDate().getTime();
                            }
                            if (saved.autoStartDeadline && typeof saved.autoStartDeadline.toDate === 'function') {
                                saved.autoStartDeadline = saved.autoStartDeadline.toDate().getTime();
                            }
                            if (saved.updatedAt && typeof saved.updatedAt.toDate === 'function') {
                                saved.updatedAt = saved.updatedAt.toDate().getTime();
                            }
                        }
                    } catch (fsErr) {
                        console.warn("Failed to load mock session from Firestore, checking localStorage:", fsErr);
                    }
                }

                // Fallback to local storage if no server session
                if (!saved) {
                    saved = loadSession(mockId);
                }

                if (saved && saved.stage && saved.stage !== 'loading') {
                    // Restore answers, modules, and cheat counts
                    setAnswers(saved.answers || { listening: {}, reading: {}, writing: {} });
                    setCompletedModules(saved.completedModules || []);
                    setTabSwitchCount(saved.tabSwitchCount || 0);
                    setAutoStartDeadline(saved.autoStartDeadline || null);

                    // Diagnostikani davom ettiramiz, noldan boshlamaymiz.
                    offlineMsRef.current = Number(saved.offlineMs) || 0;
                    connectionEventsRef.current = Array.isArray(saved.connectionEvents) ? saved.connectionEvents : [];
                    tabSwitchEventsRef.current = Array.isArray(saved.tabSwitchEvents) ? saved.tabSwitchEvents : [];

                    // Sessiya boshqa qurilmada ochilganmi? Oxirgi yozuv boshqa
                    // qurilmadan kelgan va yaqinda (2 daqiqa ichida) bo'lsa,
                    // katta ehtimol bilan u hali ham ochiq turibdi.
                    if (saved.deviceId && saved.deviceId !== deviceIdRef.current) {
                        const lastWrite = Number(saved.updatedAt) || 0;
                        if (!lastWrite || currentServerTime - lastWrite < 2 * 60 * 1000) {
                            setDeviceConflict(true);
                        }
                    }


                    // Audio resume state
                    if (saved.audioTime) setResumeAudioTime(saved.audioTime);
                    if (saved.activePart) setResumeActivePart(saved.activePart);
                    if (saved.listeningStartTime) setListeningStartTime(saved.listeningStartTime);
                    if (saved.listeningDuration) setListeningDuration(saved.listeningDuration);

                    let currentStage = saved.stage;
                    let calculatedTimeLeft = 0;

                    // Calculate remaining time based on start times saved on the server
                    if (currentStage === 'listening') {
                        const startTime = saved.listeningStartTime || currentServerTime;
                        const elapsed = Math.floor((currentServerTime - startTime) / 1000);
                        const duration = saved.listeningDuration || getListeningDuration(loadedTests.listening);
                        calculatedTimeLeft = Math.max(0, duration - elapsed);
                    } else if (currentStage === 'reading') {
                        const startTime = saved.readingStartTime || currentServerTime;
                        const elapsed = Math.floor((currentServerTime - startTime) / 1000);
                        calculatedTimeLeft = Math.max(0, 60 * 60 - elapsed);
                    } else if (currentStage === 'writing') {
                        const startTime = saved.writingStartTime || currentServerTime;
                        const elapsed = Math.floor((currentServerTime - startTime) / 1000);
                        calculatedTimeLeft = Math.max(0, 60 * 60 - elapsed);
                    } else if (saved.deadline) {
                        calculatedTimeLeft = Math.max(0, Math.floor((saved.deadline - currentServerTime) / 1000));
                    } else if (saved.timeLeft) {
                        calculatedTimeLeft = saved.timeLeft;
                    }

                    setTimeLeft(calculatedTimeLeft);

                    // Auto-advance if remaining time <= 0
                    if (['listening', 'reading', 'writing'].includes(currentStage) && calculatedTimeLeft <= 0) {
                        const nextCompleted = [...new Set([...(saved.completedModules || []), currentStage])];
                        setCompletedModules(nextCompleted);
                        currentStage = 'test_ended';
                    }

                    // 'result' va 'saving' bosqichlarini TIKLAMAYMIZ: natijalar (finalResults)
                    // faqat xotirada bo'ladi va sahifa yangilangach yo'qoladi. Ilgari tiklanardi
                    // va talaba "Exam Completed! 0.0 / 0.0" degan soxta ekranni ko'rib qolardi.
                    // test_ended ga qaytaramiz — u yerda "Submit Test" tugmasi bor.
                    if (currentStage === 'result' || currentStage === 'saving') {
                        currentStage = 'test_ended';
                    }

                    // Finally set the stage to resume the test
                    if (stageRef.current === 'loading') {
                        setStage(currentStage);
                    }
                } else {
                    if (stageRef.current === 'loading') {
                        setStage('intro');
                    }
                }
            } catch (err) {
                console.error(err);
                navigate('/mock');
            }
        };
        fetchTests();
    }, [mockData]);

    // Global Timer — faqat sanaydi, YON TA'SIRSIZ.
    // Ilgari `handleNextStage()` to'g'ridan-to'g'ri `setTimeLeft` updater'i ICHIDA
    // chaqirilardi. React updater'ni toza (pure) deb hisoblaydi va StrictMode uni ikki
    // marta chaqiradi — bosqich ikki marta almashib ketishi mumkin edi.
    const timerArmedRef = useRef(false);
    useEffect(() => {
        if (timeLeft <= 0 || !TIMED_STAGES.includes(stage)) return;

        timerArmedRef.current = true;
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, stage]);

    // Vaqt tugaganda bosqichni almashtiramiz.
    // `timerArmedRef` shart: usiz, modul boshlanishida `stage` allaqachon o'rnatilib,
    // `timeLeft` hali 0 bo'lgan bir renderda modul darhol yakunlanib qolishi mumkin edi.
    useEffect(() => {
        if (!TIMED_STAGES.includes(stage)) {
            timerArmedRef.current = false;
            return;
        }
        if (timeLeft > 0 || !timerArmedRef.current) return;
        timerArmedRef.current = false;
        handleNextStage();
    }, [timeLeft, stage]);

    const handleNextStage = () => {
        const currentStage = stageRef.current;
        if (currentStage === 'listening_volume_check') {
            setStage('listening');
            const duration = getListeningDuration(tests.listening);
            setTimeLeft(duration);
            setListeningDuration(duration);
            const now = getCurrentServerTime();
            setListeningStartTime(now);
            if (user?.uid && mockId) {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);
                setDoc(sessionRef, {
                    listeningStartTime: serverTimestamp(),
                    listeningDuration: duration,
                    updatedAt: serverTimestamp()
                }, { merge: true }).catch(err => console.warn(err));
            }
        }
        else if (currentStage === 'listening') {
            // Listening tugadi — audio blob'lari endi kerak emas. Ularni bo'shatmasak
            // o'nlab MB xotirada qolib, Reading/Writing davomida mobil brauzer
            // (ayniqsa iOS Safari) tab'ni o'ldirishi mumkin.
            revokeMockAudioBlobs();
            setCompletedModules(prev => [...new Set([...prev, 'listening'])]);
            setStage('test_ended');
        }
        else if (currentStage === 'reading_intro') { 
            setStage('reading'); 
            setTimeLeft(3600); 
        }
        else if (currentStage === 'reading') {
            setCompletedModules(prev => [...new Set([...prev, 'reading'])]);
            setStage('test_ended');
        }
        else if (currentStage === 'writing_intro') { 
            setStage('writing'); 
            setTimeLeft(3600); 
        }
        else if (currentStage === 'writing') {
            setCompletedModules(prev => [...new Set([...prev, 'writing'])]);
            setStage('test_ended');
        }
    };

    const handleAnswer = (qId, val) => {
        // Ilgari chelak kaliti to'g'ridan-to'g'ri `stageRef.current` edi — volume check
        // paytida javoblar `answers['listening_volume_check']` ga tushib, hech qachon
        // baholanmasdi. Endi bosqich mantiqiy modulga xaritalanadi.
        const bucket = ANSWER_BUCKET_BY_STAGE[stageRef.current];
        if (!bucket) return;

        setAnswers(prev => ({
            ...prev,
            [bucket]: { ...prev[bucket], [qId]: val }
        }));
    };

    const finishExam = async (forcedAnswers) => {
        if (stageRef.current === 'saving' || stageRef.current === 'result') return;

        setStage('saving');
        stageRef.current = 'saving';
        setSubmitError(null);

        try {
            const currentAnswers = forcedAnswers || answersRef.current;

            // DIQQAT: imtihon tarkibini (subTests) yubormaymiz — server uni o'zi
            // `users/{uid}.mockTests` dan oladi. Klientdan kelgan tarkibga ishonish
            // talabaga javoblari ma'lum testni baholatib olish imkonini berardi.
            const submitMockExamFn = httpsCallable(functions, 'submitMockExam');
            const res = await submitMockExamFn({
                mockKey: mockData.mockKey,
                answers: currentAnswers
            });

            if (!res.data || !res.data.success) {
                throw new Error("Imtihon topshirishda backend xatoligi yuz berdi.");
            }

            const scores = res.data.scores || {};
            setFinalResults({
                listening: {
                    correct: scores.listening,
                    // Serverdan kelgan haqiqiy savollar soni; 40 — faqat zaxira qiymat.
                    total: scores.listeningTotal || 40,
                    band: scores.listeningBand
                },
                reading: {
                    correct: scores.reading,
                    total: scores.readingTotal || 40,
                    band: scores.readingBand
                },
                overallBand: res.data.overallBand
            });

            setStage('result');

            // Muvaffaqiyatli topshirilgach sessiyani o'chiramiz. Aks holda u Firestore'da
            // qolib ketardi va talaba qaytib kirganda tugagan imtihonga "tiklanib",
            // qayta boshlay olmasdi.
            clearExamSession();
        } catch (err) {
            console.error('CRITICAL: finishExam failed:', err);
            // MUHIM: xatoda 'result' ga O'TMAYMIZ. Ilgari `finally` baribir 'result' qilardi
            // va talaba muvaffaqiyatsiz topshirishdan keyin "Exam Completed! 0.0" ni ko'rib,
            // qayta yuborish imkonini yo'qotardi. test_ended da "Submit Test" tugmasi qoladi.
            setSubmitError(err?.message || "Natijalarni saqlashda xatolik yuz berdi.");
            setStage('test_ended');
            stageRef.current = 'test_ended';
        }
    };

    const clearExamSession = useCallback(async () => {
        revokeMockAudioBlobs();
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('ielts_mock_session_') || 
                    key.startsWith('ielts_writing_session_') || 
                    key.startsWith('ielts_reading_session_') || 
                    key === 'ielts_mock_active_data') {
                    localStorage.removeItem(key);
                }
            });

            if (user?.uid && mockId) {
                await deleteDoc(doc(db, "users", user.uid, "mockSessions", mockId));
            }
        } catch(e) {
            console.warn("Failed to delete Firestore mock session:", e);
        }
    }, [user?.uid, mockId]);

    /**
     * Internet uzilishi tugaganda chaqiriladi. Umumiy yo'qotilgan vaqtni
     * yig'ib boradi — taymer uzilish davomida ham ishlagani uchun bu talaba
     * haqiqatan boy bergan vaqt. Natijani ko'rib chiqishda hisobga olish
     * uchun sessiyaga yoziladi (avtomatik vaqt QO'SHILMAYDI — bu qaror
     * o'qituvchiga qoldiriladi).
     */
    const recordOfflineDuration = useCallback((ms) => {
        if (!ms || ms < 1000) return;
        offlineMsRef.current += ms;
        connectionEventsRef.current = [
            ...connectionEventsRef.current,
            { at: getCurrentServerTime(), durationMs: Math.round(ms), stage: stageRef.current }
        ].slice(-50);
    }, []);

    // Callback for parent to report audioTime and activePart
    const updateAudioProgress = useCallback((time, part) => {
        audioTimeRef.current = time;
        if (part !== undefined) activePartRef.current = part;
    }, []);

    const updateListeningDuration = useCallback(async (duration) => {
        if (stageRef.current !== 'listening') return;

        setListeningDuration(duration);

        // Adjust timeLeft based on elapsed time since listeningStartTime
        const startTime = listeningStartTimeRef.current || getCurrentServerTime();
        const elapsed = Math.floor((getCurrentServerTime() - startTime) / 1000);
        const newTimeLeft = Math.max(0, duration - elapsed);
        setTimeLeft(newTimeLeft);

        if (user?.uid && mockId) {
            try {
                const sessionRef = doc(db, "users", user.uid, "mockSessions", mockId);
                await setDoc(sessionRef, {
                    listeningDuration: duration,
                    timeLeft: newTimeLeft,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                console.warn("Failed to sync listeningDuration to Firestore:", e);
            }
        }
    }, [mockId, user?.uid]);

    return {
        stage, setStage, tests, answers, handleAnswer, 
        timeLeft, setTimeLeft, handleNextStage, finishExam,
        cheatWarning, setCheatWarning, finalResults, submitError,
        completedModules, autoStartDeadline, setAutoStartDeadline,
        resumeAudioTime, resumeActivePart, updateAudioProgress,
        tabSwitchCount,
        mockId,
        clearExamSession,
        updateListeningDuration,
        deviceConflict,
        recordOfflineDuration
    };
}
