import { useState, useCallback, useRef, useEffect } from "react";

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

/** Yo'l bo'yicha text nodeni topadi */
function getNodeByPath(path, container) {
    let node = container;
    for (const idx of path) {
        if (!node || !node.childNodes[idx]) return null;
        node = node.childNodes[idx];
    }
    return node;
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
    try {
        const startNode = getNodeByPath(serialized.sPth, container);
        const endNode = getNodeByPath(serialized.ePth, container);
        if (!startNode || !endNode) return false;

        const range = document.createRange();
        range.setStart(startNode, serialized.sOff);
        range.setEnd(endNode, serialized.eOff);

        // Matn mos keladimi tekshiruv
        if (range.toString().trim() !== serialized.txt.trim()) return false;

        const span = document.createElement("span");
        span.className = "bg-yellow-200 rounded-sm cursor-pointer pointer-events-auto listening-hl";
        range.surroundContents(span);
        return true;
    } catch {
        return false;
    }
}

/** Containerdan barcha listening-hl spanlarni DOM dan olib tashlaydi (span contentni saqlab) */
function clearHighlightSpans(container) {
    const spans = Array.from(container.querySelectorAll(".listening-hl"));
    spans.forEach((span) => {
        const parent = span.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
    });
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useListeningHighlight(testId, activePart, userAnswers, externalIsActive) {
    const [_isActive, _setIsActive] = useState(false);
    // Agar tashqaridan state uzatilsa ishlatamiz, aks holda ichki state
    const isHighlighterActive = externalIsActive !== undefined ? externalIsActive : _isActive;
    const setIsHighlighterActive = _setIsActive;
    const containerRef = useRef(null);
    // Restore guard: bir restore tugamay turib ikkinchisi boshlanmasin
    const isRestoringRef = useRef(false);

    const storageKey = `${STORAGE_PREFIX}${testId ?? "test"}_p${activePart}`;

    // Saqlangan highlightlarni o'qish
    const load = useCallback(() => {
        try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
        catch { return []; }
    }, [storageKey]);

    // Saqlash
    const save = useCallback((list) => {
        try { localStorage.setItem(storageKey, JSON.stringify(list)); }
        catch { /* storage to'liq bo'lsa ignore */ }
    }, [storageKey]);

    // Joriy container dagi barcha listening-hl spanlarni re-serialize qilib saqlash
    const resave = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const spans = container.querySelectorAll(".listening-hl");
        const list = [];
        spans.forEach((span) => {
            try {
                const range = document.createRange();
                range.selectNodeContents(span);
                const s = serializeRange(range, container);
                if (s) list.push(s);
            } catch { /* ignore */ }
        });
        save(list);
    }, [save]);

    // Highlightlarni DOM ga qayta qo'llash (umumiy util)
    const applyStoredHighlights = useCallback(() => {
        const container = containerRef.current;
        if (!container || isRestoringRef.current) return;
        const saved = load();
        if (saved.length === 0) return;
        isRestoringRef.current = true;
        // Avval mavjud spanlarni tozalash (double-wrap oldini olish)
        clearHighlightSpans(container);
        saved.forEach((s) => restoreHighlight(s, container));
        isRestoringRef.current = false;
    }, [load]);

    // Part o'zgarganda saqlangan highlightlarni DOM ga qayta qo'llash
    useEffect(() => {
        const timer = setTimeout(() => {
            applyStoredHighlights();
        }, 180);          // 180ms — React render + layout uchun yetarli
        return () => clearTimeout(timer);
    }, [activePart, applyStoredHighlights]);

    // userAnswers o'zgarganda (input/select trigger) highlight lar qayta restore qilinadi
    useEffect(() => {
        // Faqat highlight bor bo'lsa restore qilish kerak
        const saved = load();
        if (saved.length === 0) return;
        // React DOM ni yangilagandan keyin restore
        const timer = setTimeout(() => {
            applyStoredHighlights();
        }, 50);
        return () => clearTimeout(timer);
    }, [userAnswers, applyStoredHighlights, load]);

    // Mouse up — highlight qo'shish yoki olib tashlash
    const handleTextSelection = useCallback((e) => {
        if (!isHighlighterActive) return;
        const container = containerRef.current;
        if (!container) return;

        // Highlight spanini bosish → o'chirish
        if (
            e.target.tagName === "SPAN" &&
            e.target.classList.contains("listening-hl")
        ) {
            const parent = e.target.parentNode;
            const text = document.createTextNode(e.target.textContent);
            parent.replaceChild(text, e.target);
            parent.normalize();
            resave();
            return;
        }

        const selection = window.getSelection();
        if (
            !selection ||
            selection.rangeCount === 0 ||
            selection.toString().trim() === ""
        ) return;
        if (!container.contains(selection.anchorNode)) return;

        try {
            const range = selection.getRangeAt(0);
            const serialized = serializeRange(range, container);

            const span = document.createElement("span");
            span.className =
                "bg-yellow-200 rounded-sm cursor-pointer pointer-events-auto listening-hl";
            range.surroundContents(span);
            selection.removeAllRanges();

            if (serialized) {
                const list = load();
                list.push(serialized);
                save(list);
            }
        } catch {
            // Tag chegaralari kesishsa xato — highlight qo'shilmaydi
            window.getSelection()?.removeAllRanges();
        }
    }, [isHighlighterActive, load, save, resave]);

    // Test tugaganda yoki komponent unmount bo'lganda storage tozalash (ixtiyoriy)
    const clearStoredHighlights = useCallback(() => {
        save([]);
        const container = containerRef.current;
        if (!container) return;
        container.querySelectorAll(".listening-hl").forEach((span) => {
            const parent = span.parentNode;
            parent.replaceChild(document.createTextNode(span.textContent), span);
            parent.normalize();
        });
    }, [save]);

    return {
        containerRef,
        isHighlighterActive,
        setIsHighlighterActive,
        handleTextSelection,
        clearStoredHighlights,
    };
}
