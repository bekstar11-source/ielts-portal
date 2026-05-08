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
    
    // Bold paragraph labels like "A ", "B " etc. only when clearly a label:
    // - Single capital letter (A-Z) followed by space and another capital letter
    // - OR "Paragraph A" format
    processed = processed.replace(
        /(<p[^>]*>)\s*(Paragraph\s+[A-Z][\s\.\)]|[A-Z](?=\s+[A-Z]))/g,
        (match, p1, p2) => `${p1}<strong>${p2}</strong>`
    );

    return processed;
};

/**
 * Strips review-only elements like <mark> tags, keyword highlights, and badges.
 * Used to ensure live tests don't show explanation evidence.
 */
export const stripReviewHighlights = (content) => {
    if (!content) return "";
    
    let processed = content;
    
    // 1. Remove <mark> tags but PRESERVE the ID if it starts with "loc_"
    // This is critical for mapping questions to paragraphs!
    processed = processed.replace(/<mark([^>]*)>([\s\S]*?)<\/mark>/gi, (match, attrs, innerContent) => {
        if (attrs.includes('id="loc_')) {
            return `<span${attrs}>${innerContent}</span>`;
        }
        return innerContent;
    });
    
    // 2. Remove keyword-highlight spans and kw-badge
    processed = processed.replace(/<span[^>]*class=["'][^"']*kw-badge[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');
    
    // Remove the keyword-highlight class/span but keep content
    // Unless it has a loc_ ID
    processed = processed.replace(/<span([^>]*)class=["'][^"']*keyword-highlight[^"']*["']([^>]*)>([\s\S]*?)<\/span>/gi, (match, startAttrs, endAttrs, innerContent) => {
        const fullAttrs = startAttrs + endAttrs;
        if (fullAttrs.includes('id="loc_')) {
            return `<span${fullAttrs}>${innerContent}</span>`;
        }
        return innerContent;
    });

    return processed;
};
