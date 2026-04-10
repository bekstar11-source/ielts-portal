export const checkAnswer = (userVal, correctVal) => {
    if (!correctVal || (Array.isArray(correctVal) && correctVal.length === 0)) return false;
    if (!userVal) return false;
    
    const u = String(userVal).trim().toLowerCase();
    
    // To'g'ri javoblar ro'yxatini shakllantirish (/, |, yoki , bilan ajratilgan bo'lishi mumkin)
    const correctList = (Array.isArray(correctVal) ? correctVal : String(correctVal).split(/[\/|,]/))
        .map(c => String(c).trim().toLowerCase())
        .filter(Boolean);
        
    // Agar foydalanuvchi javobi to'g'ri javoblar ro'yxatida bo'lsa (multi-answer holati uchun)
    if (correctList.includes(u)) return true;
    
    // Agar foydalanuvchi o'zi bir nechta javob yozgan bo'lsa (masalan "A, B")
    if (u.includes(',') || u.includes('/') || u.includes('|')) {
        const userList = u.split(/[\/|,]/).map(s => s.trim()).filter(Boolean);
        return userList.every(val => correctList.includes(val));
    }

    return false;
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