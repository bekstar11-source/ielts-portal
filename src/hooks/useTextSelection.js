import { useState, useCallback, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Agar juda kichik yoki ko'rinmas bo'lsa
        if (rect.width < 1 || rect.height < 1) {
            setMenuPos(null);
            return;
        }

        setMenuPos({
            top: rect.top - 50,
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

            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

            if (apiKey) {
                const prompt = `
                 Analyze the English word "${word}" within the following context sentence: "${contextSentence || 'No specific context provided, use general meaning.'}".
                 Return a JSON object with EXACTLY these three keys:
                 - "definition": A concise English explanation of what the word means in this specific context.
                 - "example": A good, clear English example sentence showing how to use the word (you can use the context sentence if it is good, or write a new clear one).
                 - "translation": The precise Uzbek translation of the word reflecting its meaning in this context.
                 Do not include any string formatting like \`\`\`json, just return the raw JSON object.
                 `;

                try {
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: "You are a helpful dictionary assistant." },
                                { role: "user", content: prompt }
                            ],
                            temperature: 0.3
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const aiResponseText = data.choices[0].message.content.trim();
                        const cleanJsonStr = aiResponseText.replace(/```json/gi, "").replace(/```/g, "").trim();
                        const parsedData = JSON.parse(cleanJsonStr);

                        aiData = {
                            definition: parsedData.definition || null,
                            example: parsedData.example || contextSentence || null,
                            translation: parsedData.translation || null,
                            hasAI: true
                        };
                    }
                } catch (aiError) {
                    console.error("AI Auto-Translate error: ", aiError);
                }
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
        clearSelection,
        addToDictionary // Export new function
    };
}