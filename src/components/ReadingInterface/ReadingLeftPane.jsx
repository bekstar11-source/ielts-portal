import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import HighlightMenu from "./HighlightMenu";
import useTextSelection from "../../hooks/useTextSelection";
import { ensureParagraphs, stripReviewHighlights } from './LeftPane/LeftPaneUtils';
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
    onOpenNotes,
    questions = []
}) => {
    const containerRef = useRef(null);
    const [displayContent, setDisplayContent] = useState(() => {
        // Initial load from storage if available
        if (storageKey) {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                        return parsed.html;
                    }
                } catch (e) {}
            }
        }
        const base = isReviewMode ? content : stripReviewHighlights(content);
        return ensureParagraphs(base);
    });

    useEffect(() => {
        // Only update if it's a fresh content change or review mode toggle
        // and check storage again to be safe
        let base = isReviewMode ? content : stripReviewHighlights(content);
        
        if (storageKey) {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                        base = parsed.html;
                    }
                } catch (e) {}
            }
        }
        
        setDisplayContent(ensureParagraphs(base));
    }, [content, isReviewMode, storageKey]);

    const { menuPos, handleTextSelection, applyHighlight, applyNote, clearSelection, addToDictionary } = useTextSelection();

    const hasMatchingHeadings = !!(matchingHeadingsGroup && matchingHeadingsGroup.items?.length > 0);

    // This second effect is now redundant for initial load but kept for sync if needed
    useEffect(() => {
        if (!storageKey) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                    let html = parsed.html;

                    if (html.includes('data-reading-slot') || html.includes('keyword-highlight') || html.includes('<mark')) {
                        const temp = document.createElement('div');
                        temp.innerHTML = html;
                        
                        temp.querySelectorAll('[data-reading-slot="true"]').forEach(s => s.remove());
                        
                        temp.querySelectorAll('.keyword-highlight, mark').forEach(m => {
                            const text = document.createTextNode(m.textContent);
                            m.parentNode.replaceChild(text, m);
                        });
                        
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
        }
    }, [storageKey, isReviewMode]);

    const saveCurrentContent = useCallback(() => {
        if (!containerRef.current || !storageKey || isReviewMode) return;

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

    const handleClearAllHighlights = useCallback(() => {
        if (!containerRef.current) return;
        const contentDiv = containerRef.current.querySelector('#reading-content-display');
        if (!contentDiv) return;

        const highlights = contentDiv.querySelectorAll('.highlight-mark:not(.note-highlight)');
        highlights.forEach(span => {
            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);
        });
        
        saveCurrentContent();
        clearSelection();
    }, [saveCurrentContent, clearSelection]);

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
        <div
            ref={containerRef}
            className={`pt-10 px-6 !pb-24 overflow-y-auto leading-relaxed text-black selectable-text relative passage-content`}
            style={{
                fontSize: textSize === 'text-sm' ? '13px' : textSize === 'text-lg' ? '17px' : textSize === 'text-xl' ? '19px' : '15px',
                transition: 'font-size 0.3s ease-in-out'
            }}
            onMouseUp={(e) => {
                if (e.button === 0) handleTextSelection(containerRef.current);
            }}
        >
            <HighlightMenu
                position={menuPos}
                onHighlight={handleMenuAction}
                onClear={clearSelection}
                onClearAllHighlights={handleClearAllHighlights}
                onAddDictionary={() => addToDictionary({ sectionTitle: title, testTitle: passageLabel || "Reading Test" })}
                isReviewMode={isReviewMode}
                onAddToWordBank={onAddToWordBank}
                onAddNote={() => handleMenuAction('note')}
                source="passage"
            />

            {title && (
                <h1 className="text-2xl font-bold mb-6 text-black tracking-tight leading-tight">
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
    );
});

export default ReadingLeftPane;