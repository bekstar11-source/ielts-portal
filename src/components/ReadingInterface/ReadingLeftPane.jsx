import React, { memo, useEffect, useRef, useState, useCallback, useMemo } from "react";
import HighlightMenu from "./HighlightMenu";
import useTextSelection from "../../hooks/useTextSelection";
import { ReadingDroppableSlot } from "./ReadingQuestionTypes";

// --- MEMOIZED CONTENT DISPLAY ---
const ContentDisplay = memo(({ content, onClick }) => {
    return (
        <div
            id="reading-content-display"
            className="
                [&_p]:mb-4 [&_p]:indent-4
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-center
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
                [&_span.highlight-mark]:bg-yellow-200 
                [&_span[id^='loc_']]:cursor-help [&_span[id^='loc_']]:border-b [&_span[id^='loc_']]:border-dotted [&_span[id^='loc_']]:border-gray-400
            "
            dangerouslySetInnerHTML={{ __html: content }}
            onClick={onClick}
        />
    );
}, (prevProps, nextProps) => {
    return prevProps.content === nextProps.content;
});

// --- PASSAGE WITH DROP ZONES ---
// Matching headings bo'lganda, paragraflarni ajratib, har birining oldiga drop zone qo'shadi
const PassageWithDropZones = memo(({ 
    content, 
    matchingHeadingsGroup, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode,
    onClick 
}) => {
    // Paragraflarni ajratamiz (RECURSIVE UNWRAP logic)
    const paragraphs = useMemo(() => {
        if (!content) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
        const container = doc.body.firstChild;

        // 1. Slotlarni o'chirib tashlaymiz
        container.querySelectorAll('[data-reading-slot="true"]').forEach(s => s.remove());

        // 2. Bloklarni ajratamiz (Recursive approach)
        const result = [];
        
        const extractBlocks = (parent) => {
            const childNodes = Array.from(parent.childNodes);
            let currentInlineBlock = "";

            childNodes.forEach(node => {
                if (node.nodeType === 1 && ['P', 'H2', 'H3', 'H4'].includes(node.tagName)) {
                    // Blok topildi: avval yig'ilgan inlinelarni push qilamiz
                    if (currentInlineBlock.trim()) {
                        result.push(currentInlineBlock.trim());
                        currentInlineBlock = "";
                    }
                    result.push(node.outerHTML);
                } else if (node.nodeType === 1 && node.tagName === 'DIV') {
                    // DIV ichida yana paragraflar bo'lishi mumkin (nesting)
                    if (currentInlineBlock.trim()) {
                        result.push(currentInlineBlock.trim());
                        currentInlineBlock = "";
                    }
                    extractBlocks(node); // Rekursiya
                } else {
                    // Text node yoki inline elementlar (span, b, i va h.k.)
                    currentInlineBlock += node.outerHTML || node.textContent || "";
                }
            });

            if (currentInlineBlock.trim()) {
                result.push(currentInlineBlock.trim());
            }
        };

        extractBlocks(container);
        
        // Bo'sh emasligini tekshiramiz
        return result.filter(p => p.trim().length > 0);
    }, [content]);

    const questions = matchingHeadingsGroup?.items || [];
    const options = matchingHeadingsGroup?.options || [];

    // Savollar soniga qarab paragraflarni mapping qilamiz
    // Odatda IELTS da har bir savol bir paragrafga mos keladi
    // loc_id orqali yoki tartib bo'yicha maplab ko'ramiz
    const questionSlots = useMemo(() => {
        if (!questions.length || !paragraphs.length) return {};
        
        // 1. Avval loc_id orqali mapping qilamiz
        const mapping = {};
        const unmappedQuestions = [];
        
        questions.forEach(q => {
            if (q.locationId) {
                // loc_id qaysi paragrafda ekanligini topamiz
                const locTarget = paragraphs.findIndex(p => p.includes(`id="${q.locationId}"`));
                if (locTarget >= 0) {
                    mapping[locTarget] = q;
                    return;
                }
            }
            unmappedQuestions.push(q);
        });
        
        // 2. Agar loc_id orqali map bo'lmagan savollar bo'lsa, 
        // haqiqiy paragraflarni topib (h1/title paragraflarni o'tkazib) tartib bo'yicha maplab ko'ramiz
        if (unmappedQuestions.length > 0) {
            const contentParagraphIndices = paragraphs
                .map((p, i) => ({ html: p, index: i }))
                .filter(({ html, index }) => {
                    if (mapping[index]) return false;

                    const textOnly = html.replace(/<[^>]+>/g, '').trim();
                    const isHeadingTag = /^<h[1-4]/i.test(html.trim());
                    
                    // 1. Sarlavhalar va o'ta qisqa (<20 ch) bloklarni o'tkazib yuboramiz
                    if (isHeadingTag || textOnly.length < 20) return false;

                    // 2. Intro/Preamble skip heuristic:
                    // Faqat birinchi 2 ta blok uchun tekshiramiz. 
                    // Agar unda label bo'lsa (A, B, Paragraph A...) yoki loc_id bo'lsa (tepada tekshirilgan), skip qilmaymiz.
                    if (index < 2) {
                        const hasParaLabel = /^\s*(Paragraph\s+)?[A-Za-z0-9ivx]+\s*[\.\s\)]/i.test(textOnly) || 
                                           /^(<b>|<strong>)\s*[A-Za-z0-9]\s*(<\/b>|<\/strong>)/i.test(html.trim());
                        
                        // Agar u juda uzun bo'lsa (>200 ch), ehtimol u Paragraph A labeli bo'lmagan birinchi paragrafdir.
                        if (!hasParaLabel && textOnly.length < 200) {
                            return false; 
                        }
                    }

                    return true;
                })
                .map(({ index }) => index);
            
            unmappedQuestions.forEach((q, idx) => {
                if (idx < contentParagraphIndices.length) {
                    mapping[contentParagraphIndices[idx]] = q;
                }
            });
        }
        
        return mapping;
    }, [questions, paragraphs]);

    const checkAnswer = (userVal, correctVal) => {
        if (!userVal || !correctVal) return false;
        return String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
    };

    return (
        <div
            id="reading-content-display"
            className="
                [&_p]:mb-4 [&_p]:indent-4
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-center
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
                [&_span.highlight-mark]:bg-yellow-200 
                [&_span[id^='loc_']]:cursor-help [&_span[id^='loc_']]:border-b [&_span[id^='loc_']]:border-dotted [&_span[id^='loc_']]:border-gray-400
            "
            onClick={onClick}
        >
            {paragraphs.map((htmlBlock, idx) => {
                const question = questionSlots[idx];
                
                return (
                    <React.Fragment key={idx}>
                        {/* Agar shu paragraf uchun drop zone bo'lsa */}
                        {question && (
                            <div className="my-2" data-reading-slot="true">
                                <ReadingDroppableSlot
                                    id={question.id}
                                    questionId={question.id}
                                    value={userAnswers?.[question.id] || ""}
                                    options={options}
                                    isReviewMode={isReviewMode}
                                    isCorrect={isReviewMode ? checkAnswer(userAnswers?.[question.id], question.answer) : false}
                                    correctAnswer={question.answer}
                                    onClear={() => onAnswerChange?.(question.id, "")}
                                />
                            </div>
                        )}
                        {/* Paragraf kontenti */}
                        <div dangerouslySetInnerHTML={{ __html: htmlBlock }} />
                    </React.Fragment>
                );
            })}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && 
           prevProps.userAnswers === nextProps.userAnswers &&
           prevProps.isReviewMode === nextProps.isReviewMode &&
           prevProps.matchingHeadingsGroup === nextProps.matchingHeadingsGroup;
});

const ReadingLeftPane = memo(({
    passageLabel,
    title,
    content,
    textSize = "text-base",
    highlightedId,
    storageKey,
    isReviewMode,
    onAddToWordBank,
    matchingHeadingsGroup,
    userAnswers,
    onAnswerChange
}) => {
    const containerRef = useRef(null);
    const [displayContent, setDisplayContent] = useState(content);

    // Hook
    const { menuPos, handleTextSelection, applyHighlight, clearSelection, addToDictionary } = useTextSelection();

    // Matching headings mavjudmi?
    const hasMatchingHeadings = !!(matchingHeadingsGroup && matchingHeadingsGroup.items?.length > 0);

    // --- STORAGE ---
    useEffect(() => {
        if (isReviewMode) {
            setDisplayContent(content);
            return;
        }

        if (!storageKey) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                    let html = parsed.html;

                    // 🛠️ MUHIM: LocalStorage'dan o'qiyotganda agar ichida slotlar bo'lsa (eski xato versiyadan qolgan), tozalab olamiz
                    // Bu foydalanuvchida deploydan oldin saqlanib qolgan "dirty" HTML ni tuzatadi
                    if (hasMatchingHeadings && html.includes('data-reading-slot')) {
                        const temp = document.createElement('div');
                        temp.innerHTML = html;
                        temp.querySelectorAll('[data-reading-slot="true"]').forEach(s => s.remove());
                        
                        let clean = "";
                        Array.from(temp.childNodes).forEach(node => {
                            if (node.nodeType === 1 && node.tagName === 'DIV') {
                                clean += node.innerHTML;
                            } else {
                                clean += node.outerHTML || node.textContent || "";
                            }
                        });
                        html = clean.trim() || temp.innerHTML;
                    }

                    setDisplayContent(html);
                }
            } catch (e) {
                console.error("Error parsing saved highlights:", e);
            }
        } else {
            setDisplayContent(content);
        }
    }, [storageKey, content, isReviewMode, hasMatchingHeadings]);

    const saveCurrentContent = useCallback(() => {
        if (!containerRef.current || !storageKey) return;

        const contentDiv = containerRef.current.querySelector('#reading-content-display');
        if (contentDiv) {
            // 🛠️ Matching Headings bo'lsa, HTMLni tozalab saqlashimiz kerak
            // Aks holda slotlar va wrapper divlar statega tushib qoladi
            if (hasMatchingHeadings) {
                const temp = document.createElement('div');
                temp.innerHTML = contentDiv.innerHTML;

                // 1. Slotlarni o'chiramiz
                const slots = temp.querySelectorAll('[data-reading-slot="true"]');
                slots.forEach(s => s.remove());

                // 2. Har bir blokni unwrap qilamiz (PassageWithDropZones dagi wrapper divlarni)
                let cleanHtml = "";
                Array.from(temp.childNodes).forEach(node => {
                    if (node.nodeType === 1 && node.tagName === 'DIV') {
                        cleanHtml += node.innerHTML;
                    } else {
                        cleanHtml += node.outerHTML || node.textContent || "";
                    }
                });

                const finalHtml = cleanHtml.trim() || temp.innerHTML;
                
                setDisplayContent(finalHtml);
                localStorage.setItem(storageKey, JSON.stringify({
                    html: finalHtml,
                    timestamp: Date.now()
                }));
            } else {
                // Oddiy rejimda shunchaki innerHTML ni olamiz
                const html = contentDiv.innerHTML;
                setDisplayContent(html);
                localStorage.setItem(storageKey, JSON.stringify({
                    html: html,
                    timestamp: Date.now()
                }));
            }
        }
    }, [storageKey, hasMatchingHeadings]);

    // --- SCROLL TO QUESTION LOCATION ---
    useEffect(() => {
        if (highlightedId && containerRef.current) {
            const el = containerRef.current.querySelector(`span[id="${highlightedId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('bg-yellow-500/30', 'transition-colors', 'duration-500');
                setTimeout(() => {
                    el.classList.remove('bg-yellow-500/30');
                }, 2000);
            }
        }
    }, [highlightedId]);

    // --- HIGHLIGHT CLICK (REMOVE) ---
    const handleHighlightClick = useCallback((e) => {
        if (e.target.classList.contains('highlight-mark')) {
            const span = e.target;
            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);
            saveCurrentContent();
        }
    }, [saveCurrentContent]);

    // --- MENU ACTION HANDLER ---
    const handleMenuAction = (action) => {
        applyHighlight(action, saveCurrentContent);
    };

    return (
        <>
            <HighlightMenu
                position={menuPos}
                onHighlight={handleMenuAction}
                onClear={clearSelection}
                onAddDictionary={() => addToDictionary({ sectionTitle: title, testTitle: passageLabel || "Reading Test" })}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                source="passage"
            />

            <div
                ref={containerRef}
                className={`p-8 pb-20 h-full overflow-y-auto leading-relaxed text-black selectable-text relative`}
                style={{
                    fontSize: textSize === 'text-sm' ? '14px' : textSize === 'text-lg' ? '18px' : textSize === 'text-xl' ? '20px' : '16px',
                    transition: 'font-size 0.3s ease-in-out'
                }}
                onMouseUp={handleTextSelection}
            >
                <div className="text-xs font-bold text-black uppercase tracking-widest mb-1 select-none">
                    {passageLabel || "READING PASSAGE 1"}
                </div>

                {title && (
                    <h1 className="text-[1.6em] font-bold text-black mb-6 mt-0 leading-tight">
                        {title}
                    </h1>
                )}

                {/* Matching headings bo'lganda — drop zone li passage */}
                {hasMatchingHeadings ? (
                    <PassageWithDropZones
                        content={displayContent}
                        matchingHeadingsGroup={matchingHeadingsGroup}
                        userAnswers={userAnswers}
                        onAnswerChange={onAnswerChange}
                        isReviewMode={isReviewMode}
                        onClick={handleHighlightClick}
                    />
                ) : (
                    /* Oddiy passage ko'rsatish */
                    <ContentDisplay
                        content={displayContent}
                        onClick={handleHighlightClick}
                    />
                )}
            </div>
        </>
    );
});

export default ReadingLeftPane;