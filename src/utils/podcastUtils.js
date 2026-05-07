/**
 * Formats seconds into M:SS format
 * @param {number} time 
 * @returns {string}
 */
export const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Calculates the total duration of a podcast based on its transcript or questions
 * @param {object} p Podcast object
 * @returns {number}
 */
export const getPodcastDuration = (p) => {
    if (!p) return 0;
    if (p.duration && p.duration > 0) return p.duration;
    
    let maxTime = 0;
    if (p.transcript && Array.isArray(p.transcript)) {
        p.transcript.forEach(s => { if (s.time > maxTime) maxTime = s.time; });
    }
    if (p.questions && Array.isArray(p.questions)) {
        p.questions.forEach(q => { if (q.time > maxTime) maxTime = q.time; });
    }
    return maxTime > 0 ? maxTime + 10 : 0;
};

/**
 * Formats the creation date of a podcast
 * @param {object} p Podcast object
 * @returns {string}
 */
export const getPodcastDate = (p) => {
    if (!p) return "";
    try {
        const date = p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : new Date());
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return "Recent";
    }
};

/**
 * Extracts the dominant color from an image URL
 * @param {string} imageUrl 
 * @param {string} cacheKey 
 * @returns {Promise<string>}
 */
export const extractDominantColor = (imageUrl, cacheKey) => {
    return new Promise((resolve) => {
        if (!imageUrl) {
            resolve("#222222");
            return;
        }

        const cachedColor = localStorage.getItem(`color-cache-${cacheKey}`);
        if (cachedColor) {
            resolve(cachedColor);
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = 1;
                canvas.height = 1;
                ctx.drawImage(img, 0, 0, 1, 1);
                const data = ctx.getImageData(0, 0, 1, 1).data;
                const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
                localStorage.setItem(`color-cache-${cacheKey}`, color);
                resolve(color);
            } catch (e) {
                console.warn("Failed to extract color:", e);
                resolve("#222222");
            }
        };
        img.onerror = () => resolve("#222222");
    });
};
