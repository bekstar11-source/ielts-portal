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

    // Taqribiy qidiruv (fuzzy search) — agar yo'l orqali topilmasa
    const findTextNodeByContent = (targetText, root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes(targetText)) {
                return node;
            }
        }
        return null;
    };

    try {
        let startNode = findNodeByPath(serialized.sPth, container);
        let endNode = findNodeByPath(serialized.ePth, container);

        // Agar yo'l noto'g'ri bo'lsa (DOM o'zgargan bo'lsa), matn bo'yicha qidiramiz
        if (!startNode || startNode.nodeType !== 3 || !startNode.textContent.includes(serialized.txt.substring(0, 3))) {
            startNode = findTextNodeByContent(serialized.txt, container);
            endNode = startNode;
        }

        if (!startNode || !endNode) return false;

        const range = document.createRange();
        // Offsetlarni xavfsiz chegaralash
        const sOff = Math.max(0, Math.min(serialized.sOff, startNode.length || 0));
        const eOff = Math.max(0, Math.min(serialized.eOff, endNode.length || 0));

        range.setStart(startNode, sOff);
        range.setEnd(endNode, eOff);

        // Matn mosligini tekshirish (whitespace ni hisobga olmasdan)
        const rangeText = range.toString().trim();
        const originalText = (serialized.txt || "").trim();
        
        if (rangeText.length === 0 && originalText.length > 0) return false;

        const span = document.createElement("span");
        span.className = "bg-yellow-200 rounded-sm cursor-pointer pointer-events-auto listening-hl";
        span.dataset.id = serialized.id || Date.now().toString() + Math.random();
        
        range.surroundContents(span);
        return true;
    } catch (err) {
        console.warn("Highlight restoration failed:", err);
        return false;
    }
}

/** Containerdan barcha listening-hl spanlarni DOM dan olib tashlaydi (span contentni saqlab) */
function clearHighlightSpans(container) {
    const spans = Array.from(container.querySelectorAll(".listening-hl"));
    spans.forEach((span) => {
        const parent = span.parentNode;
        if (!parent) return;
        const text = document.createTextNode(span.textContent);
        parent.replaceChild(text, span);
    });
    // Barcha bo'lingan text nodelarni birlashtiramiz (indexlar buzilmasligi uchun)
    container.normalize();
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
        
        // Muhim: Agar DOM da spanlar yo'q bo'lsa, lekin loading paytida bo'lsa - ehtiyot bo'lamiz
        if (spans.length === 0) {
            const saved = load();
            if (saved.length > 0) {
                // Ehtimol React hali DOM ni yangilamagan yoki vaqtincha highlightlar yo'qolgan
                // Shuning uchun localStorage ni o'chirib yubormaymiz (agar bu trigger manual removal bo'lmasa)
                // Lekin handleTextSelection da manual removal bo'lsa resave chaqiriladi, u yerda removal aniq
                return;
            }
        }

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
    }, [save, load]);

    // Highlightlarni DOM ga qayta qo'llash (umumiy util)
    const applyStoredHighlights = useCallback(() => {
        const container = containerRef.current;
        if (!container || isRestoringRef.current) return;

        const saved = load();
        const existingSpans = container.querySelectorAll(".listening-hl");

        // Agar soni bir xil bo'lsa va 0 dan ko'p bo'lsa - hech narsa qilmaymiz (flicking oldini oladi)
        if (existingSpans.length === saved.length && saved.length > 0) {
            return;
        }

        // Agar saqlanganlar yo'q bo'lsa, lekin DOM da bo'lsa - tozalab tashlaymiz
        if (saved.length === 0) {
            if (existingSpans.length > 0) {
                clearHighlightSpans(container);
            }
            return;
        }

        isRestoringRef.current = true;
        // Avval mavjud spanlarni tozalash (double-wrap oldini olish)
        clearHighlightSpans(container);
        
        // Tiklash
        saved.forEach((s) => restoreHighlight(s, container));
        
        isRestoringRef.current = false;
    }, [load]);

    // Part o'zgarganda saqlangan highlightlarni DOM ga qayta qo'llash
    // Part o'zgarganda saqlangan highlightlarni DOM ga qayta qo'llash
    useLayoutEffect(() => {
        applyStoredHighlights();
    }, [activePart, applyStoredHighlights]);

    // userAnswers o'zgarganda (input/select trigger) highlight lar qayta restore qilinadi
    // Flicker oldini olish uchun useLayoutEffect ishlatamiz (paint bo'lishidan oldin tiklash uchun)
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const saved = load();
        if (saved.length === 0) return;

        // Smart Check: Agar DOM da spanlar hali ham turgan bo'lsa - hech narsa qilmaymiz
        const existingSpans = container.querySelectorAll(".listening-hl");
        if (existingSpans.length === saved.length) {
            return;
        }

        // React DOM ni yangilagandan keyin darhol tiklaymiz
        applyStoredHighlights();
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
