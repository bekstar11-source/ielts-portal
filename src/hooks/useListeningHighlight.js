import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";

/**
 * useListeningHighlight
 *
 * Listening interfeysi uchun barqaror highlight hook.
 * - Highlightlar localStorage da har bir (testId + partIndex) kalit ostida saqlanadi.
 * - Part o'zgarganda (activePart) saqlangan highlightlar DOM ga qayta qo'llaniladi.
 * - Reading qismidagi useTextSelection.js ga mutloq ta'sir qilmaydi.
 */

const STORAGE_PREFIX = "listening_hl_";

// ─── SERIALIZATION ────────────────────────────────────────────────────────────

/** Text node uchun container ichidagi "yo'lini" qaytaradi */
function getTextNodePath(textNode, container) {
    const path = [];
    let node = textNode;
    while (node && node !== container) {
        const parent = node.parentNode;
        if (!parent) break;
        path.unshift(Array.from(parent.childNodes).indexOf(node));
        node = parent;
    }
    return path;
}

/** Range ni saqlash uchun kichik obyektga aylantiradi */
function serializeRange(range, container) {
    try {
        return {
            sPth: getTextNodePath(range.startContainer, container),
            sOff: range.startOffset,
            ePth: getTextNodePath(range.endContainer, container),
            eOff: range.endOffset,
            txt: range.toString(),
        };
    } catch {
        return null;
    }
}

/** Saqlangan ma'lumot bo'yicha DOM ga highlight span qo'shadi */
function restoreHighlight(serialized, container) {
    if (!container) return false;

    const findNodeByPath = (path, root) => {
        let current = root;
        for (const index of path) {
            if (current && current.childNodes && current.childNodes[index]) {
                current = current.childNodes[index];
            } else {
                return null;
            }
        }
        return current;
    };

    /** Fuzzy search: Matnni whitespace-insensitve qidirish */
    const findTextNodeByContent = (targetText, root) => {
        if (!targetText || targetText.trim().length === 0) return null;
        
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        const cleanTarget = targetText.replace(/\s+/g, ' ').trim();
        
        let node;
        while (node = walker.nextNode()) {
            const cleanNodeText = node.textContent.replace(/\s+/g, ' ');
            if (cleanNodeText.includes(cleanTarget)) {
                return node;
            }
        }
        // Agar to'liq matn topilmasa, boshidan 5 ta harfni qidirib ko'ramiz (fallback)
        if (cleanTarget.length > 5) {
            const startChunk = cleanTarget.substring(0, 5);
            walker.currentNode = root;
            while (node = walker.nextNode()) {
                if (node.textContent.includes(startChunk)) return node;
            }
        }
        return null;
    };

    try {
        let startNode = findNodeByPath(serialized.sPth, container);
        let endNode = findNodeByPath(serialized.ePth, container);

        // Agar yo'l noto'g'ri bo'lsa (DOM o'zgargan bo'lsa), matn bo'yicha qidiramiz
        const nodeIsInvalid = !startNode || startNode.nodeType !== 3 || 
                             !startNode.textContent.replace(/\s+/g, '').includes(serialized.txt.substring(0, 3).replace(/\s+/g, ''));

        if (nodeIsInvalid) {
            startNode = findTextNodeByContent(serialized.txt, container);
            endNode = startNode;
        }

        if (!startNode || !endNode) return false;

        const range = document.createRange();
        // Offsetlarni xavfsiz chegaralash
        const sOff = Math.max(0, Math.min(serialized.sOff, startNode.length || 0));
        let eOff = Math.max(0, Math.min(serialized.eOff, endNode.length || 0));

        // Agar fuzzy topilgan bo'lsa, offsetlarni moslashtirishga harakat qilamiz
        if (nodeIsInvalid) {
            const idx = startNode.textContent.indexOf(serialized.txt.substring(0, 3));
            if (idx !== -1) {
                range.setStart(startNode, idx);
                range.setEnd(startNode, Math.min(idx + serialized.txt.length, startNode.length));
            } else {
                range.setStart(startNode, 0);
                range.setEnd(startNode, startNode.length);
            }
        } else {
            range.setStart(startNode, sOff);
            range.setEnd(endNode, eOff);
        }

        const span = document.createElement("span");
        span.className = "bg-yellow-200 rounded-sm cursor-pointer pointer-events-auto listening-hl";
        span.dataset.id = serialized.id || (Date.now() + Math.random()).toString();
        
        range.surroundContents(span);
        return true;
    } catch (err) {
        // console.warn("Highlight restoration failed:", err);
        return false;
    }
}

/** Containerdan barcha listening-hl spanlarni DOM dan olib tashlaydi (span contentni saqlab) */
function clearHighlightSpans(container) {
    if (!container) return;
    const spans = Array.from(container.querySelectorAll(".listening-hl"));
    spans.forEach((span) => {
        const parent = span.parentNode;
        if (!parent) return;
        const textNode = document.createTextNode(span.textContent);
        parent.replaceChild(textNode, span);
    });
    // Barcha bo'lingan text nodelarni birlashtiramiz (indexlar buzilmasligi uchun)
    container.normalize();
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useListeningHighlight(testId, activePart, userAnswers, externalIsActive) {
    const [_isActive, _setIsActive] = useState(false);
    const isHighlighterActive = externalIsActive !== undefined ? externalIsActive : _isActive;
    const setIsHighlighterActive = _setIsActive;
    const containerRef = useRef(null);
    const isRestoringRef = useRef(false);

    const storageKey = `${STORAGE_PREFIX}${testId ?? "test"}_p${activePart}`;

    const load = useCallback(() => {
        try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
        catch { return []; }
    }, [storageKey]);

    const save = useCallback((list) => {
        try { localStorage.setItem(storageKey, JSON.stringify(list)); }
        catch { /* ignore */ }
    }, [storageKey]);

    // Joriy container dagi barcha listening-hl spanlarni re-serialize qilib saqlash
    const resave = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const spans = container.querySelectorAll(".listening-hl");
        
        // Manual o'chirish paytida spans.length 0 bo'lishi mumkin, bu normal
        const list = [];
        spans.forEach((span) => {
            try {
                const range = document.createRange();
                range.selectNodeContents(span);
                const s = serializeRange(range, container);
                if (s) {
                    s.id = span.dataset.id;
                    list.push(s);
                }
            } catch { /* ignore */ }
        });
        save(list);
    }, [save]);

    const applyStoredHighlights = useCallback(() => {
        const container = containerRef.current;
        if (!container || isRestoringRef.current) return;

        const saved = load();
        if (!saved || saved.length === 0) {
            const existingSpans = container.querySelectorAll(".listening-hl");
            if (existingSpans.length > 0) clearHighlightSpans(container);
            return;
        }

        // Smart Check: Agar soni bir xil bo'lsa, ortiqcha ish qilmaymiz (flicking oldini oladi)
        const existingSpans = container.querySelectorAll(".listening-hl");
        if (existingSpans.length === saved.length) return;

        try {
            isRestoringRef.current = true;
            clearHighlightSpans(container);
            
            // Tiklash: REVERSE ORDER ishlatamiz! 
            // Bu DOM indexlari o'zgarishini oldini oladi (orqadan oldinga qarab restore qilish xavfsiz)
            const toRestore = [...saved].reverse();
            toRestore.forEach((s) => restoreHighlight(s, container));
        } catch (err) {
            console.error("Highlight restore error:", err);
        } finally {
            isRestoringRef.current = false;
        }
    }, [load]);

    // Part o'zgarganda tiklash
    useLayoutEffect(() => {
        applyStoredHighlights();
    }, [activePart, applyStoredHighlights]);

    // userAnswers o'zgarganda (typing) highlightlar o'chib ketsa qayta tiklash
    useLayoutEffect(() => {
        if (!containerRef.current) return;
        // Typing paytida React DOM ni yangilagandan keyin darhol tiklaymiz
        // applyStoredHighlights ichida Smart Check bor, shuning uchun juda tez ishlaydi
        applyStoredHighlights();
    }, [userAnswers, applyStoredHighlights]);

    // Mouse up — highlight qo'shish yoki olib tashlash
    const handleTextSelection = useCallback((e) => {
        if (!isHighlighterActive) return;
        const container = containerRef.current;
        if (!container) return;

        // Highlight spanini bosish → o'chirish
        if (e.target.tagName === "SPAN" && e.target.classList.contains("listening-hl")) {
            const parent = e.target.parentNode;
            const textNode = document.createTextNode(e.target.textContent);
            parent.replaceChild(textNode, e.target);
            parent.normalize();
            resave();
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") return;
        if (!container.contains(selection.anchorNode)) return;

        try {
            const range = selection.getRangeAt(0);
            const serialized = serializeRange(range, container);
            if (!serialized) return;

            const span = document.createElement("span");
            span.className = "bg-yellow-200 rounded-sm cursor-pointer pointer-events-auto listening-hl";
            span.dataset.id = (Date.now() + Math.random()).toString();
            
            range.surroundContents(span);
            selection.removeAllRanges();

            const list = load();
            serialized.id = span.dataset.id;
            list.push(serialized);
            save(list);
        } catch {
            window.getSelection()?.removeAllRanges();
        }
    }, [isHighlighterActive, load, save, resave]);

    const clearStoredHighlights = useCallback(() => {
        save([]);
        clearHighlightSpans(containerRef.current);
    }, [save]);

    return {
        containerRef,
        isHighlighterActive,
        setIsHighlighterActive,
        handleTextSelection,
        clearStoredHighlights,
    };
}
