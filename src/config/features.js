// Vaqtincha o'chirib qo'yiladigan bo'limlar shu yerdan boshqariladi.
// Bo'limni qaytarish uchun mos flagni `true` qilish kifoya — route, menyu
// va Library havolalari shu bitta qiymatga qarab ishlaydi.
export const FEATURES = {
    // Speaking AI (/speaking-ai) vaqtincha to'xtatilgan.
    speakingAi: false,
};

export const isFeatureEnabled = (key) => FEATURES[key] !== false;
