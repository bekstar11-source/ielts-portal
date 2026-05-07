import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import HighlightMenu from "./HighlightMenu";
import useTextSelection from "../../hooks/useTextSelection";
import { ensureParagraphs } from './LeftPane/LeftPaneUtils';
import { ContentDisplay, PassageWithDropZones } from './LeftPane/LeftPaneComponents';

const ReadingLeftPane = memo(({
    passageLabel,
    title,
    content,
    textSize = "text-base",
    highlightedId,
    highlightTrigger,
    storageKey,
    matchingHeadingsGroup,
    userAnswers,
    onAnswerChange,
    isReviewMode,
    onAddToWordBank,
    onAddNote,
    onOpenNotes
}) => {
    const containerRef = useRef(null);
    const [displayContent, setDisplayContent] = useState(() => ensureParagraphs(content));

    useEffect(() => {
        setDisplayContent(ensureParagraphs(content));
    }, [content]);

    const { menuPos, handleTextSelection, applyHighlight, applyNote, clearSelection, addToDictionary } = useTextSelection();

    const hasMatchingHeadings = !!(matchingHeadingsGroup && matchingHeadingsGroup.items?.length > 0);

    useEffect(() => {
        if (isReviewMode) {
            setDisplayContent(ensureParagraphs(content));
            return;
        }

        if (!storageKey) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                    let html = parsed.html;

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
            setDisplayContent(ensureParagraphs(content));
        }
    }, [storageKey, content, isReviewMode, hasMatchingHeadings]);

    const saveCurrentContent = useCallback(() => {
        if (!containerRef.current || !storageKey) return;

        const contentDiv = containerRef.current.querySelector('#reading-content-display');
        if (contentDiv) {
            if (hasMatchingHeadings) {
                const temp = document.createElement('div');
                temp.innerHTML = contentDiv.innerHTML;

                const slots = temp.querySelectorAll('[data-reading-slot="true"]');
                slots.forEach(s => s.remove());

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
                const html = contentDiv.innerHTML;
                setDisplayContent(html);
                localStorage.setItem(storageKey, JSON.stringify({
                    html: html,
                    timestamp: Date.now()
                }));
            }
        }
    }, [storageKey, hasMatchingHeadings]);

    useEffect(() => {
        if (highlightedId && containerRef.current) {
            const allLocs = containerRef.current.querySelectorAll("span[id^='loc_']");
            allLocs.forEach(node => {
                node.classList.remove('!border-green-500', '!border-solid', '!border-b-2');
            });

            const el = containerRef.current.querySelector(`span[id="${highlightedId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('!border-green-500', '!border-solid', '!border-b-2', 'transition-all', 'duration-500');
            }
        }
    }, [highlightedId, highlightTrigger]);

    const handleHighlightClick = useCallback((e) => {
        if (e.target.classList.contains('highlight-mark')) {
            const span = e.target;
            
            if (span.classList.contains('note-highlight')) {
                if (onOpenNotes) onOpenNotes();
                return;
            }

            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);
            saveCurrentContent();
        }
    }, [saveCurrentContent, onOpenNotes]);

    const handleMenuAction = (action) => {
        if (action === 'note') {
            const noteInfo = applyNote(saveCurrentContent);
            if (noteInfo && onAddNote) {
                onAddNote(noteInfo);
            }
        } else {
            applyHighlight(action, saveCurrentContent);
        }
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
                onAddNote={() => handleMenuAction('note')}
                source="passage"
            />

            <div
                ref={containerRef}
                className={`p-8 pb-20 h-full overflow-y-auto leading-relaxed text-black selectable-text relative`}
                style={{
                    fontSize: textSize === 'text-sm' ? '14px' : textSize === 'text-lg' ? '18px' : textSize === 'text-xl' ? '20px' : '16px',
                    transition: 'font-size 0.3s ease-in-out'
                }}
                onMouseUp={(e) => {
                    if (e.button === 0) handleTextSelection();
                }}
            >
                <div className="text-xs font-bold text-black uppercase tracking-widest mb-1 select-none">
                    {passageLabel || "READING PASSAGE 1"}
                </div>

                {title && (
                    <h1 className="text-[1.6em] font-bold text-black mb-6 mt-0 leading-tight">
                        {title}
                    </h1>
                )}

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