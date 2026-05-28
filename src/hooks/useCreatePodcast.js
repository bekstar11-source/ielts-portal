import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebase";
import { toast } from 'react-hot-toast';

const DEFAULT_SEGMENTS = [
    { id: '1', time: 0, type: 'text', text: "Welcome to the podcast!" },
    { id: '2', time: 5, type: 'mcq', data: { question: "Is this interactive?", options: ["Yes", "No"], correctIndex: 0 } }
];

export function useCreatePodcast(editId, navigate) {
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [collections, setCollections] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [thumbProgress, setThumbProgress] = useState(0);
    const [isProMode, setIsProMode] = useState(false);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Form State
    const [form, setForm] = useState({
        title: "",
        description: "",
        level: "B2",
        audioUrl: "",
        thumbnail: "",
        collectionId: "None",
        mediaType: "audio", // "audio" or "youtube"
        youtubeId: "",
        showVideo: true
    });

    // Timeline State
    const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
    const [jsonInput, setJsonInput] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Load Collections
                const colSnap = await getDocs(query(collection(db, "podcast_collections"), orderBy("createdAt", "asc")));
                setCollections(colSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                if (editId) {
                    const snap = await getDoc(doc(db, "podcasts", editId));
                    if (snap.exists()) {
                        const data = snap.data();
                        setForm({
                            title: data.title || "",
                            description: data.description || "",
                            level: data.level || "B2",
                            audioUrl: data.audioUrl || "",
                            thumbnail: data.thumbnail || "",
                            collectionId: data.collectionId || "None",
                            mediaType: data.mediaType || "audio",
                            youtubeId: data.youtubeId || "",
                            showVideo: data.showVideo !== undefined ? data.showVideo : true
                        });
                        
                        const transcript = (data.transcript || []).map((t, idx) => ({
                            id: `t-${idx}-${Date.now()}`,
                            time: t.time,
                            type: 'text',
                            text: t.text
                        }));
                        
                        const questions = (data.questions || []).map((q, idx) => ({
                            id: `q-${idx}-${Date.now()}`,
                            ...q
                        }));

                        const combined = [...transcript, ...questions].sort((a, b) => a.time - b.time);
                        setSegments(combined.length > 0 ? combined : DEFAULT_SEGMENTS);
                    }
                }
            } catch (err) {
                toast.error("Ma'lumotlarni yuklashda xatolik!");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [editId]);

    useEffect(() => {
        const transcript = segments.filter(s => s.type === 'text').map(s => ({ time: s.time, text: s.text }));
        const questions = segments.filter(s => s.type !== 'text').map(s => {
            const { id, ...rest } = s;
            return rest;
        });
        setJsonInput(JSON.stringify({ transcript, questions }, null, 2));
    }, [segments]);

    const handleFileUpload = (file, type) => {
        const isAudio = type === 'audio';
        const storageRef = ref(storage, `podcasts/${editId || "new"}/${isAudio ? "audio" : "thumb"}_${Date.now()}`);
        const metadata = { cacheControl: 'public, max-age=31536000' };
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        uploadTask.on("state_changed", 
            snap => {
                const p = (snap.bytesTransferred / snap.totalBytes) * 100;
                isAudio ? setUploadProgress(p) : setThumbProgress(p);
            },
            err => toast.error(err.message),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                setForm(f => ({ ...f, [isAudio ? 'audioUrl' : 'thumbnail']: url }));
                isAudio ? setUploadProgress(0) : setThumbProgress(0);
                toast.success(`${isAudio ? 'Audio' : 'Rasm'} yuklandi!`);
            }
        );
    };

    const addSegment = (type) => {
        const newSeg = {
            id: Date.now().toString(),
            time: Math.floor(currentTime),
            type: type,
            text: type === 'text' ? "Yangi matn..." : undefined,
            data: type === 'mcq' ? { question: "Yangi savol?", options: ["Variant 1", "Variant 2"], correctIndex: 0 } : 
                  type === 'gapfill' ? { text: "Gapni {{gap}} to'ldiring.", answer: "answer" } : 
                  type === 'completion' ? { text: "Sentence {{completion}}.", answer: "answer", definition: "Def", collocation: "Coll" } : undefined
        };
        setSegments(prev => [...prev, newSeg].sort((a, b) => a.time - b.time));
    };

    const updateSegment = (id, updates) => {
        setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s).sort((a, b) => a.time - b.time));
    };

    const deleteSegment = (id) => {
        setSegments(prev => prev.filter(s => s.id !== id));
    };

    const handleSave = async () => {
        if (!form.title) return toast.error("Sarlavha majburiy!");
        if (form.mediaType === 'audio' && !form.audioUrl) return toast.error("Audio manbasi majburiy!");
        if (form.mediaType === 'youtube' && !form.youtubeId) return toast.error("YouTube Video ID majburiy!");
        
        setSaving(true);
        const savingToast = toast.loading("Saqlanmoqda...");

        try {
            let finalTranscript = [];
            let finalQuestions = [];

            if (isProMode) {
                const parsed = JSON.parse(jsonInput);
                finalTranscript = parsed.transcript || [];
                finalQuestions = parsed.questions || [];
            } else {
                finalTranscript = segments.filter(s => s.type === 'text').map(s => ({ time: s.time, text: s.text }));
                finalQuestions = segments.filter(s => s.type !== 'text').map(s => {
                    const { id, ...rest } = s;
                    return rest;
                });
            }

            const podId = editId || doc(collection(db, "podcasts")).id;
            const saveData = {
                ...form,
                showVideo: form.showVideo !== false && String(form.showVideo) !== 'false',
                transcript: finalTranscript,
                questions: finalQuestions,
                mode: "spotify",
                status: "published",
                updatedAt: serverTimestamp()
            };

            if (!editId) {
                saveData.createdAt = serverTimestamp();
                await setDoc(doc(db, "podcasts", podId), saveData, { merge: true });

                // Auto post the new podcast to the feed
                try {
                    await addDoc(collection(db, "feed_posts"), {
                        type: "podcast",
                        title: saveData.title || "Yangi Podcast",
                        content: saveData.description || "Tizimda yangi podcast yuklandi. Eshitishni va mashqlarni bajarishni boshlang!",
                        mediaUrl: saveData.thumbnail || "",
                        ctaUrl: `/podcast/spotify/${podId}`,
                        ctaText: "Eshitish",
                        likes: [],
                        commentsCount: 0,
                        createdAt: serverTimestamp()
                    });
                } catch (feedErr) {
                    console.error("Error auto-posting podcast to feed:", feedErr);
                }
            } else {
                await setDoc(doc(db, "podcasts", podId), saveData, { merge: true });
            }
            toast.success("Podcast saqlandi!", { id: savingToast });
            navigate("/admin/podcasts");
        } catch (err) {
            toast.error("Xatolik: " + err.message, { id: savingToast });
        } finally {
            setSaving(false);
        }
    };

    return {
        form, setForm,
        segments, setSegments,
        collections,
        loading, saving,
        uploadProgress, thumbProgress,
        isProMode, setIsProMode,
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        jsonInput, setJsonInput,
        handleFileUpload, addSegment, updateSegment, deleteSegment, handleSave
    };
}
