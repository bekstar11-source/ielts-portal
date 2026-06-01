import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getUserWordBank, deleteWordFromBank } from '../utils/wordbankUtils';

export const useWordBank = (user) => {
    const [words, setWords] = useState([]);
    const [keywords, setKeywords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [batchTotal, setBatchTotal] = useState(0);
    const [batchCurrent, setBatchCurrent] = useState(0);

    const fetchWords = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "users", user.uid, "vocabulary"),
                orderBy("addedAt", "desc")
            );
            const snapshot = await getDocs(q);
            const fetchedWords = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setWords(fetchedWords);

            const kw = await getUserWordBank(user.uid);
            setKeywords(kw);
        } catch (error) {
            console.error("Error fetching vocabulary:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchWords(); }, [fetchWords]);

    const handleDeleteWord = async (wordId) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "vocabulary", wordId));
            setWords(prev => prev.filter(w => w.id !== wordId));
        } catch (error) { console.error(error); }
    };

    const handleDeleteKeyword = async (kwId) => {
        if (!user) return;
        if (!window.confirm("Bu keyword o'chirilsinmi?")) return;
        try {
            await deleteWordFromBank(user.uid, kwId);
            setKeywords(prev => prev.filter(k => k.id !== kwId));
        } catch (error) { console.error(error); }
    };

    const updateWordStatus = async (wordId, updateData) => {
        if (!user) return;
        try {
            const wordRef = doc(db, "users", user.uid, "vocabulary", wordId);
            await updateDoc(wordRef, updateData);
            setWords(prev => prev.map(w => w.id === wordId ? { ...w, ...updateData } : w));
        } catch (error) { console.error(error); }
    };

    const generateAIContext = async (wordItem) => {
        if (!user) return;
        setGeneratingId(wordItem.id);
        try {
            const functions = getFunctions();
            const translateWordFn = httpsCallable(functions, "translateWord");
            const result = await translateWordFn({ 
                word: wordItem.word, 
                contextSentence: wordItem.contextSentence || "" 
            });

            const { definition, example, translation, phonetics, partOfSpeech, synonyms, antonyms, collocations } = result.data;
            const wordRef = doc(db, "users", user.uid, "vocabulary", wordItem.id);
            const updates = {
                definition: definition || null,
                example: example || null,
                translation: translation || null,
                phonetics: phonetics || null,
                partOfSpeech: partOfSpeech || null,
                synonyms: synonyms || [],
                antonyms: antonyms || [],
                collocations: collocations || [],
                hasAI: true
            };
            await updateDoc(wordRef, updates);

            setWords(prev => prev.map(w => w.id === wordItem.id ? {
                ...w, ...updates
            } : w));
        } catch (error) {
            console.error("AI error:", error);
            alert("AI tarjimada xatolik: " + error.message);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleAddWord = async (wordData) => {
        if (!user) return;
        try {
            const { word, translation, definition, example, phonetics, partOfSpeech, synonyms, antonyms, collocations, hasAI } = wordData;
            
            const vocabularyRef = collection(db, "users", user.uid, "vocabulary");
            const newWordData = {
                word,
                translation: translation || null,
                definition: definition || null,
                example: example || null,
                phonetics: phonetics || null,
                partOfSpeech: partOfSpeech || null,
                synonyms: synonyms || [],
                antonyms: antonyms || [],
                collocations: collocations || [],
                learningStatus: 'learning',
                addedAt: new Date(),
                sectionTitle: "Qo'lda qo'shilganlar",
                testTitle: "Shaxsiy lug'at",
                easeFactor: 2.5,
                interval: 0,
                nextReviewDate: new Date(),
                hasAI: !!hasAI
            };
            
            const docRef = await addDoc(vocabularyRef, newWordData);
            const savedWord = { id: docRef.id, ...newWordData };
            setWords(prev => [savedWord, ...prev]);
            
            if (!hasAI) {
                await generateAIContext(savedWord);
            }
            return docRef.id;
        } catch (error) {
            console.error("Error adding word manually:", error);
            alert("So'z qo'shishda xatolik yuz berdi.");
        }
    };

    const handleTranslateAll = async () => {
        const untranslated = words.filter(w => !w.hasAI);
        if (untranslated.length === 0) return;

        setBatchProcessing(true);
        setBatchTotal(untranslated.length);
        setBatchCurrent(0);

        const functions = getFunctions();
        const translateWordFn = httpsCallable(functions, "translateWord");

        for (let i = 0; i < untranslated.length; i++) {
            const wordItem = untranslated[i];
            setBatchCurrent(i + 1);
            try {
                const result = await translateWordFn({ 
                    word: wordItem.word, 
                    contextSentence: wordItem.contextSentence || "" 
                });
                const { definition, example, translation, phonetics, partOfSpeech, synonyms, antonyms, collocations } = result.data;
                const wordRef = doc(db, "users", user.uid, "vocabulary", wordItem.id);
                const updates = {
                    definition: definition || null,
                    example: example || null,
                    translation: translation || null,
                    phonetics: phonetics || null,
                    partOfSpeech: partOfSpeech || null,
                    synonyms: synonyms || [],
                    antonyms: antonyms || [],
                    collocations: collocations || [],
                    hasAI: true
                };
                await updateDoc(wordRef, updates);

                setWords(prev => prev.map(w => w.id === wordItem.id ? {
                    ...w, ...updates
                } : w));
            } catch (error) { console.error(error); }
        }
        setBatchProcessing(false);
    };

    return {
        words, keywords, loading,
        generatingId, batchProcessing, batchTotal, batchCurrent,
        handleDeleteWord, handleDeleteKeyword,
        updateWordStatus, generateAIContext, handleTranslateAll,
        handleAddWord,
        refresh: fetchWords
    };
};
