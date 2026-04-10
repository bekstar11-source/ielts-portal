import { useState, useCallback, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";

export default function useTextSelection() {
    const [menuPos, setMenuPos] = useState(null);
    const { user } = useAuth();

    // 1. Menyu pozitsiyasi
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setMenuPos(null);
            return;
        }

        const selectedText = selection.toString().trim();
        // 🛠️ Yengil select: Judayam qisqa belgilashlarda menyu chiqmasligi uchun
        if (selectedText.length < 2) {
            setMenuPos(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        
        // Agar bir nechta qator bo'lsa, oxirgi qatorni yoki markazni aniqlash
        if (rects.length === 0) {
            setMenuPos(null);
            return;
        }

        const rect = range.getBoundingClientRect();

        // Menyuni matnning tepasida, markazda chiqarish
        setMenuPos({
            top: rect.top - 55, // Biroz yuqoriroq
            left: rect.left + (rect.width / 2)
        });
    }, []);

    // 2. Highlight Logic (TreeWalker)
    const applyHighlight = useCallback((color = 'yellow', onComplete) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const contentContainer = range.commonAncestorContainer;

        // TreeWalker orqali matn bo'laklarini yig'amiz
        const textNodes = [];
        const treeWalker = document.createTreeWalker(
            contentContainer.nodeType === Node.TEXT_NODE ? contentContainer.parentNode : contentContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (range.intersectsNode(node)) return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        while (treeWalker.nextNode()) {
            textNodes.push(treeWalker.currentNode);
        }

        let hasChange = false;
        const timestamp = Date.now();

        textNodes.forEach((node, index) => {
            // Range chegaralarini aniqlash
            const rangeStart = (node === range.startContainer) ? range.startOffset : 0;
            const rangeEnd = (node === range.endContainer) ? range.endOffset : node.length;

            if (rangeStart >= rangeEnd) return;

            // Matnni o'rash
            try {
                const span = document.createElement("span");
                span.className = "highlight-mark rounded cursor-pointer mix-blend-multiply";
                span.style.backgroundColor = color === 'yellow' ? '#fef08a' : color;

                // 🔥 ID qo'shish (Note uchun kerak)
                span.id = `hl-${timestamp}-${index}`;

                const text = node.textContent;
                const beforeText = text.substring(0, rangeStart);
                const highlightText = text.substring(rangeStart, rangeEnd);
                const afterText = text.substring(rangeEnd);

                const parent = node.parentNode;

                // DOM o'zgartirish
                if (afterText) parent.insertBefore(document.createTextNode(afterText), node.nextSibling);

                span.textContent = highlightText;
                parent.insertBefore(span, node.nextSibling);

                if (beforeText) parent.insertBefore(document.createTextNode(beforeText), span);

                parent.removeChild(node);
                hasChange = true;
            } catch (e) {
                console.error("Node highlight error:", e);
            }
        });

        selection.removeAllRanges();
        setMenuPos(null);
        // 1. Selectionni tozalash
        if (selection.removeAllRanges) {
            selection.removeAllRanges();
        } else if (selection.empty) {
            selection.empty();
        }

        // 2. MUHIM: Menyuni yopishni navbatga qo'yamiz (setTimeout orqali)
        // Bu "Highlight" tugmasi bosilganda menyu qotib qolishini tuzatadi
        setTimeout(() => {
            setMenuPos(null);
        }, 0);

        // 3. Callback
        if (hasChange && onComplete) {
            onComplete();
        }

        return textNodes.map((_, i) => `hl-${timestamp}-${i}`); // Created IDs
    }, []);

    // 3. Note Logic
    const applyNote = useCallback((onComplete) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

        const selectedText = selection.toString().trim();
        const timestamp = Date.now();
        
        // Note uchun maxsus rang (ko'kroq/ochroq)
        const noteColor = 'rgba(147, 197, 253, 0.5)'; // blue-300 with opacity
        
        // Highlight logicni ishlatamiz lekin maxsus class bilan
        const ids = applyHighlight(noteColor);
        
        if (ids && ids.length > 0) {
            // Birinchi span'ga note identifier qo'shishimiz mumkin
            const firstSpan = document.getElementById(ids[0]);
            if (firstSpan) {
                firstSpan.classList.add('note-highlight');
                firstSpan.setAttribute('data-note-id', `note-${timestamp}`);
            }
        }

        if (onComplete) onComplete();
        
        return {
            id: `note-${timestamp}`,
            text: selectedText,
            timestamp: timestamp,
            hlIds: ids
        };
    }, [applyHighlight]);

    const clearSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        setMenuPos(null);
    }, []);

    const addToDictionary = useCallback(async (testContext = {}) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !user) return false;

        const word = selection.toString().trim();
        if (word.length === 0 || word.length > 50) return false; // Too long for a single vocab

        // Extract context sentence (up to 200 chars)
        let contextSentence = "";
        try {
            if (selection.anchorNode && selection.anchorNode.parentNode) {
                contextSentence = selection.anchorNode.parentNode.textContent.trim();
                if (contextSentence.length > 250) {
                    contextSentence = contextSentence.substring(0, 250) + "...";
                }
            }
        } catch (e) {
            console.log("Failed to extract context", e);
        }

        try {
            // FIREBASE SAVE LOGIC + AUTOMATIC AI TRANSLATION
            let aiData = {
                definition: null,
                example: null,
                translation: null,
                hasAI: false
            };

                try {
                    const functions = getFunctions();
                    const translateWordFn = httpsCallable(functions, "translateWord");
                    const result = await translateWordFn({ 
                        word: word, 
                        contextSentence: contextSentence 
                    });

                    if (result.data) {
                        aiData = {
                            definition: result.data.definition || null,
                            example: result.data.example || contextSentence || null,
                            translation: result.data.translation || null,
                            hasAI: true
                        };
                    }
                } catch (aiError) {
                    console.error("AI Auto-Translate error: ", aiError);
                }

            await addDoc(collection(db, "users", user.uid, "vocabulary"), {
                word: word,
                contextSentence: contextSentence,
                testTitle: testContext.testTitle || "Noma'lum Test",
                sectionTitle: testContext.sectionTitle || "Noma'lum Qism",
                addedAt: serverTimestamp(),

                // AI Fields
                definition: aiData.definition,
                example: aiData.example,
                translation: aiData.translation,
                hasAI: aiData.hasAI,

                // Spaced Repetition System (SRS) fields
                learningStatus: 'learning', // learning, review, mastered
                easeFactor: 2.5,
                interval: 0,
                nextReviewDate: serverTimestamp() // needs review immediately
            });
            return true;
        } catch (error) {
            console.error("Vocabulary add error:", error);
            return false;
        }
    }, [user]);

    useEffect(() => {
        const handleResize = () => { if (menuPos) setMenuPos(null); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [menuPos]);

    return {
        menuPos,
        handleTextSelection,
        applyHighlight,
        applyNote,
        clearSelection,
        addToDictionary // Export new function
    };
}