// src/utils/navigation.js

/**
 * Cleans and converts a URL/path to a relative path if it belongs to the app,
 * or formats it as an absolute URL if it is external.
 * 
 * @param {string} url - The URL or path to clean.
 * @returns {string} The cleaned relative path or absolute external URL.
 */
export const getCleanCtaPath = (url) => {
    if (!url) return '';
    const trimmed = url.trim();

    // If it starts with http:// or https://
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            // Check if it matches the current site or includes 'ielts-portal'
            if (parsed.origin === window.location.origin || parsed.host.includes('ielts-portal')) {
                return parsed.pathname + parsed.search + parsed.hash;
            }
            return trimmed; // External URL
        } catch (e) {
            console.error("Failed to parse URL:", e);
            return trimmed;
        }
    }

    // Check if it contains any internal path patterns
    const internalPathPatterns = [
        '/test/', 
        '/podcast/', 
        '/article/', 
        '/library', 
        '/practice',
        '/settings',
        '/mock', 
        '/my-results', 
        '/vocabulary'
    ];

    for (const pattern of internalPathPatterns) {
        const index = trimmed.indexOf(pattern);
        if (index !== -1) {
            return trimmed.substring(index);
        }
    }

    // If it starts with a slash or doesn't have a dot (not a domain name)
    if (trimmed.startsWith('/') || !trimmed.includes('.')) {
        return trimmed;
    }

    // External URL without protocol, e.g. google.com
    return `https://${trimmed}`;
};

/**
 * Resolves a test metadata object to its corresponding category landing page.
 * 
 * @param {object} test - The test metadata object.
 * @returns {string} The category path.
 */
export const getCategoryUrl = (test) => {
    if (!test) return '';
    const type = (test.type || '').toLowerCase();

    // Check if it's a full test vs part test
    const isFull = !test.passageNumber && !test.passage_number && 
                   (!test.title || test.title.includes('/') || test.title.toLowerCase().includes('full') || (test.passages && test.passages.length > 1));

    if (type === 'reading') {
        return isFull ? '/reading/full' : '/reading/parts';
    } else if (type === 'listening') {
        return isFull ? '/listening/full' : '/listening/parts';
    } else if (type === 'mock') {
        return '/mock';
    }
    return '/practice';
};

/**
 * Performs navigation using either the React Router navigate function

 * or standard window redirection/external tabs.
 * 
 * @param {string} url - The target URL/path.
 * @param {function} navigate - The navigate function from useNavigate().
 */
export const handleUniversalNavigate = (url, navigate, state = {}) => {
    const cleanPath = getCleanCtaPath(url);
    if (!cleanPath) return;

    if (/^https?:\/\//i.test(cleanPath)) {
        // External link - open in new tab
        window.open(cleanPath, '_blank', 'noopener,noreferrer');
    } else {
        // Internal link - navigate with React Router
        navigate(cleanPath, { state });
    }
};
