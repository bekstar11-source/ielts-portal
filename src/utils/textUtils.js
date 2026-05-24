/**
 * Strips HTML tags and decodes common HTML entities from a string.
 * @param {string} html - The input string containing HTML.
 * @returns {string} The cleaned plain text string.
 */
export const stripHtml = (html) => {
    if (!html) return "";
    
    // Remove HTML tags
    let clean = html.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '\u00A0': ' '
    };
    
    Object.keys(entities).forEach(entity => {
        clean = clean.replace(new RegExp(entity, 'g'), entities[entity]);
    });
    
    return clean.trim();
};
