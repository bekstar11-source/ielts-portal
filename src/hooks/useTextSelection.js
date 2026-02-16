// src/hooks/useTextSelection.js
import { useState, useCallback, useEffect } from "react";

export default function useTextSelection() {
    const [menuPos, setMenuPos] = useState(null);

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

    useEffect(() => {
        const handleResize = () => { if (menuPos) setMenuPos(null); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [menuPos]);

    return {
        menuPos,
        handleTextSelection,
        applyHighlight,
        clearSelection
    };
}