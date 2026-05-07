/**
 * Utility functions for ReadingLeftPane
 */

export const ensureParagraphs = (content) => {
    if (!content) return "";
    
    let processed = content;
    if (!/<p>|<div|<h[1-6]/i.test(content)) {
        processed = content
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => `<p>${p}</p>`)
            .join("");
    }
    
    processed = processed.replace(/(<p[^>]*>)\s*((?:Paragraph\s+)?[A-Z0-9ivx]+[\.\s\)])/gi, (match, p1, p2) => {
        return `${p1}<strong>${p2}</strong>`;
    });

    return processed;
};
