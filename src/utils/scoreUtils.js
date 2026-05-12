/**
 * Safely extracts a band score from a result object, 
 * accounting for different field names used in the database.
 */
export const getSafeBandScore = (result) => {
    if (!result) return 0;
    
    const score = result.bandScore ?? 
                  result.bestBandScore ?? 
                  result.score ?? 
                  result.bestScore ?? 
                  0;
                  
    return parseFloat(score) || 0;
};

/**
 * Calculates level based on points.
 * Standardizes the level logic across the app.
 */
export const calculateLevel = (points) => {
    return Math.floor((points || 0) / 1000) + 1;
};

/**
 * Formats a raw score (correct answers) into a band score if needed,
 * or just returns the formatted string.
 */
export const formatDisplayScore = (score) => {
    if (score === undefined || score === null) return "-";
    const val = parseFloat(score);
    return isNaN(val) ? score : val.toFixed(1);
};
