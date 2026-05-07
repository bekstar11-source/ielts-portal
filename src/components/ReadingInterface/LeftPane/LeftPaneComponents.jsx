import React, { memo, useMemo } from "react";
import { ReadingDroppableSlot } from "../ReadingQuestionTypes";

export const ContentDisplay = memo(({ content, onClick }) => {
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

export const PassageWithDropZones = memo(({ 
    content, 
    matchingHeadingsGroup, 
    userAnswers, 
    onAnswerChange, 
    isReviewMode,
    onClick 
}) => {
    const paragraphs = useMemo(() => {
        if (!content) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
        const container = doc.body.firstChild;

        container.querySelectorAll('[data-reading-slot="true"]').forEach(s => s.remove());

        const result = [];
        
        const extractBlocks = (parent) => {
            const childNodes = Array.from(parent.childNodes);
            let currentInlineBlock = "";

            childNodes.forEach(node => {
                if (node.nodeType === 1 && ['P', 'H2', 'H3', 'H4'].includes(node.tagName)) {
                    if (currentInlineBlock.trim()) {
                        result.push(currentInlineBlock.trim());
                        currentInlineBlock = "";
                    }
                    result.push(node.outerHTML);
                } else if (node.nodeType === 1 && node.tagName === 'DIV') {
                    if (currentInlineBlock.trim()) {
                        result.push(currentInlineBlock.trim());
                        currentInlineBlock = "";
                    }
                    extractBlocks(node);
                } else {
                    currentInlineBlock += node.outerHTML || node.textContent || "";
                }
            });

            if (currentInlineBlock.trim()) {
                result.push(currentInlineBlock.trim());
            }
        };

        extractBlocks(container);
        return result.filter(p => p.trim().length > 0);
    }, [content]);

    const questions = matchingHeadingsGroup?.items || [];
    const options = matchingHeadingsGroup?.options || [];

    const questionSlots = useMemo(() => {
        if (!questions.length || !paragraphs.length) return {};
        
        const mapping = {};
        const unmappedQuestions = [];
        
        questions.forEach(q => {
            if (q.locationId) {
                const locTarget = paragraphs.findIndex(p => p.includes(`id="${q.locationId}"`));
                if (locTarget >= 0) {
                    mapping[locTarget] = q;
                    return;
                }
            }
            unmappedQuestions.push(q);
        });
        
        if (unmappedQuestions.length > 0) {
            const contentParagraphIndices = paragraphs
                .map((p, i) => ({ html: p, index: i }))
                .filter(({ html, index }) => {
                    if (mapping[index]) return false;

                    const textOnly = html.replace(/<[^>]+>/g, '').trim();
                    const isHeadingTag = /^<h[1-4]/i.test(html.trim());
                    
                    if (isHeadingTag || textOnly.length < 20) return false;

                    if (index < 2) {
                        const hasParaLabel = /^\s*(Paragraph\s+)?[A-Za-z0-9ivx]+\s*[\.\s\)]/i.test(textOnly) || 
                                           /^(<b>|<strong>)\s*[A-Za-z0-9]\s*(<\/b>|<\/strong>)/i.test(html.trim());
                        
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
