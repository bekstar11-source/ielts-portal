import { useState, useEffect } from "react";
import { db, storage } from "../firebase/firebase";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export const useAdminArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching articles:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveArticle = async (formData, editingArticleId = null) => {
        setProcessing(true);
        try {
            const { content, vocabulary, ...rest } = formData;
            const data = {
                ...rest,
                updatedAt: serverTimestamp()
            };

            if (editingArticleId) {
                await updateDoc(doc(db, "articles", editingArticleId), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, "articles"), data);
            }
            await fetchArticles();
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteArticle = async (id) => {
        if (!window.confirm("Haqiqatan ham ushbu maqolani o'chirmoqchimisiz?")) return false;
        try {
            await deleteDoc(doc(db, "articles", id));
            setArticles(prev => prev.filter(a => a.id !== id));
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const uploadFile = async (file, folder = "articles") => {
        if (!file) return null;
        setProcessing(true);
        try {
            const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytesResumable(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            return downloadURL;
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    return {
        articles,
        loading,
        processing,
        handleSaveArticle,
        handleDeleteArticle,
        uploadFile,
        refresh: fetchArticles
    };
};
