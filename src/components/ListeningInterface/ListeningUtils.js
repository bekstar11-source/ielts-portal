import { checkAnswer as centralCheckAnswer, getAnswerKey, getMultiSelectCount, getQuestionWeight } from '../../utils/ieltsScoring';

/**
 * Multi-select (checkbox) guruhining tuzilishini aniqlaydi.
 *
 * Bitta savol elementi bir nechta savolni bildirishi mumkin: id "23-24" → 2 ta savol.
 * Ilgari SelectionBox `maxSelection` ni savol elementlari soniga tenglashtirardi —
 * bunday testlarda talaba faqat 1 ta variant tanlay olib, ko'pi bilan 1/2 ball olardi.
 */
export const getSelectionLayout = (group) => {
    const questions = group.questions || group.items || [];
    const questionIds = questions.map(q => q.id);
    const totalSlots = questionIds.reduce((sum, id) => sum + getQuestionWeight(id), 0);
    const maxSelection = getMultiSelectCount(group.type) || totalSlots || questionIds.length;
    return {
        questionIds,
        maxSelection,
        // Bitta ID bir nechta javobni saqlaydigan holat (id "23-24" → "A, C")
        isPackedSingleSlot: questionIds.length === 1 && maxSelection > 1
    };
};

/** Guruhdagi barcha to'g'ri variant harflari (registr/prefiksdan qat'i nazar) */
export const getCorrectLabels = (group) => {
    const questions = group.questions || group.items || [];
    return questions.flatMap(q => {
        const ans = getAnswerKey(q);
        if (ans === undefined || ans === null) return [];
        const raw = Array.isArray(ans) ? ans : String(ans).split(/[,/|]/);
        return raw
            .map(v => String(v).trim().toLowerCase())
            .map(v => {
                const m = v.match(/^([a-z]|[ivx]+)\s*[.)]/i);
                return m ? m[1].toLowerCase() : v;
            })
            .filter(Boolean);
    });
};

/**
 * Checkbox bosilganda yangi tanlovni hisoblaydi (FIFO eviction bilan).
 * `order` — tanlash tartibi (eng eskisini chiqarib tashlash uchun), o'zgartirilgan nusxa qaytariladi.
 */
export const nextSelection = (current, order, label, maxSelection) => {
    let selection = [...current];
    let newOrder = [...order];

    if (selection.includes(label)) {
        selection = selection.filter(v => v !== label);
        newOrder = newOrder.filter(v => v !== label);
    } else {
        if (selection.length >= maxSelection) {
            let oldest = newOrder[0];
            if (oldest === undefined || !selection.includes(oldest)) oldest = selection[0];
            selection = selection.filter(v => v !== oldest);
            newOrder = newOrder.filter(v => v !== oldest);
        }
        selection.push(label);
        newOrder.push(label);
    }

    selection.sort();
    return { selection, order: newOrder };
};

// Review UI ball hisoblagich (`evaluateTest`) bilan AYNAN bir xil qaror qabul qilishi shart.
// Shu sababli hech qanday "o'ziga xos" tekshiruv qilinmaydi — hammasi markaziy
// `checkAnswer` ga uzatiladi:
//   • Ilgari kalit avval "/" bo'yicha bo'linardi va "knife and/or fork" kabi kalitlar
//     "knife and" + "or fork" ga aylanib, talabaning "knife and" javobi review'da
//     YASHIL, ball hisobida esa XATO bo'lardi (markaziy funksiya "and/or" ni maxsus
//     qayta ishlaydi).
//   • `choiceOptions` umuman uzatilmasdi: variantlar ro'yxati bor guruhlarda
//     ("choose from the list", map labeling) kalit "B" harfi, talaba javobi esa so'z
//     bo'lganda ball berilardi, lekin review qizil ko'rsatardi.
export const checkAnswer = (userVal, correctVal, isChoiceType = false, choiceOptions = null) => {
    if (correctVal === undefined || correctVal === null) return false;
    if (Array.isArray(correctVal) && correctVal.length === 0) return false;
    if (userVal === undefined || userVal === null || String(userVal).trim() === '') return false;

    return centralCheckAnswer(correctVal, userVal, isChoiceType, choiceOptions);
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