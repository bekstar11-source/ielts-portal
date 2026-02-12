export const checkAnswer = (userVal, correctVal) => {
    if (!userVal && !correctVal) return true;
    if (!userVal || !correctVal) return false;
    const u = String(userVal).trim().toLowerCase();
    const correctList = Array.isArray(correctVal) 
        ? correctVal.map(c => String(c).trim().toLowerCase()) 
        : [String(correctVal).trim().toLowerCase()];
    return correctList.includes(u);
};

export const getStatusStyles = (isReviewMode, isCorrect, isSelected = false, type = 'border') => {
    if (!isReviewMode) {
        if (type === 'badge') return "bg-white border-gray-400 text-gray-700";
        if (type === 'container') return isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-transparent";
        return "border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white text-gray-900";
    }
    if (isCorrect) {
        if (type === 'badge') return "bg-green-600 text-white border-green-600";
        if (type === 'container') return "bg-green-50 border-green-200";
        return "border-green-500 bg-green-50 text-green-700 font-bold ring-1 ring-green-500";
    } else {
        if (type === 'badge') return isSelected ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-500 border-gray-300";
        if (type === 'container') return isSelected ? "bg-red-50 border-red-200 opacity-80" : "opacity-50 grayscale";
        return "border-red-500 bg-red-50 text-red-700 font-bold ring-1 ring-red-500";
    }
};