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
    // Paragraflarni ajratamiz
    const paragraphs = useMemo(() => {
        if (!content) return [];
        
        // HTML ni DOM parser bilan parse qilamiz
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
        const container = doc.body.firstChild;
        
        const result = [];
        let currentBlock = '';
        
        const childNodes = container.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            const nodeHtml = node.outerHTML || node.textContent;
            
            // <p> yoki <h2>/<h3> taglarni paragraf chegarasi deb qabul qilamiz
            if (node.nodeType === 1 && ['P', 'H2', 'H3', 'H4'].includes(node.tagName)) {
                if (currentBlock.trim()) {
                    result.push(currentBlock);
                    currentBlock = '';
                }
                result.push(nodeHtml);
            } else {
                currentBlock += nodeHtml;
            }
        }
        if (currentBlock.trim()) {
            result.push(currentBlock);
        }
        
        return result;
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
                    // Title, heading va juda qisqa paragraflarni o'tkazib yuboramiz
                    const isHeadingTag = /^<h[1-3]/i.test(html.trim());
                    const textOnly = html.replace(/<[^>]+>/g, '').trim();
                    return !isHeadingTag && textOnly.length > 50 && !mapping[index];
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
                            <div className="my-2">
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
                    setDisplayContent(parsed.html);
                }
            } catch (e) {
                console.error("Error parsing saved highlights:", e);
            }
        } else {
            setDisplayContent(content);
        }
    }, [storageKey, content, isReviewMode]);

    const saveCurrentContent = useCallback(() => {
        if (!containerRef.current || !storageKey) return;

        const contentDiv = containerRef.current.querySelector('#reading-content-display');
        if (contentDiv) {
            const html = contentDiv.innerHTML;
            setDisplayContent(html);
            localStorage.setItem(storageKey, JSON.stringify({
                html: html,
                timestamp: Date.now()
            }));
        }
    }, [storageKey]);

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