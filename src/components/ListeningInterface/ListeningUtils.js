import { checkAnswer as centralCheckAnswer } from '../../utils/ieltsScoring';

export const checkAnswer = (userVal, correctVal, isChoiceType = false) => {
    if (!correctVal || (Array.isArray(correctVal) && correctVal.length === 0)) return false;
    if (!userVal) return false;

    if (Array.isArray(correctVal)) {
        return correctVal.some(val => centralCheckAnswer(val, userVal, isChoiceType));
    }

    const correctList = String(correctVal).split(/[\/|]/).map(c => c.trim()).filter(Boolean);
    if (correctList.length > 1) {
        return correctList.some(val => centralCheckAnswer(val, userVal, isChoiceType));
    }

    return centralCheckAnswer(correctVal, userVal, isChoiceType);
};

export const getStatusStyles = (isReviewMode, isCorrect, isSelected = false, type = 'border') => {
    if (!isReviewMode) {
        if (type === 'badge') return "bg-white border-gray-400 text-gray-700";
        if (type === 'container') return "bg-white border-transparent";
        return "border-black focus:border-black focus:ring-1 focus:ring-black bg-white text-black";
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

/**
 * Matn oxiridagi savol raqamini olib tashlaydi.
 */
export const stripLeadingId = (val, id) => {
    if (!val) return "";
    const text = (typeof val === 'object') ? (val.text || val.label || val.content || "") : val;
    if (id == null) return text;
    
    const idStr = String(id).trim();
    const escapedId = idStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startBoundary = /^\w/.test(idStr) ? '\\b' : '';
    const endBoundary = /\w$/.test(idStr) ? '\\b' : '';

    const cleaned = String(text)
        .replace(new RegExp(`^\\s*${startBoundary}${escapedId}${endBoundary}\\.?\\s*`), '') // Start of string
        .replace(new RegExp(`${startBoundary}${escapedId}${endBoundary}\\.?\\s*(?=\\[INPUT\\])`), '') // Before [INPUT] placeholder
        .replace(new RegExp(`${startBoundary}${escapedId}${endBoundary}\\.?\\s*$`), '') // End of string
        .trim();
    return cleaned;
};

/**
 * Variant matni boshidagi "A. ", "B) " kabi belgilarni olib tashlaydi.
 */
export const stripLeadingOptionLabel = (val) => {
    if (!val) return "";
    const text = (typeof val === 'object') ? (val.text || val.label || val.content || "") : val;
    const stripped = String(text)
        .replace(/^\s*[A-Z][\.\)\-]\s+/, '') 
        .trim();
    return stripped || String(text).trim();
};