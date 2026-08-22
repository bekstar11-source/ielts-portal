// Vaqtincha o'chirib qo'yiladigan bo'limlar shu yerdan boshqariladi.
// Bo'limni qaytarish uchun mos flagni `true` qilish kifoya — route, menyu
// va Library havolalari shu bitta qiymatga qarab ishlaydi.
export const FEATURES = {
    // Speaking AI (/speaking-ai) vaqtincha to'xtatilgan.
    speakingAi: false,

    // Guruh davomati va qarzdorlik ekrani (/teacher/group/:groupId).
    // Firestore'da davomat, qarz va jarima maydonlari HALI YO'Q — sahifa
    // `data/mockGroupAttendance` dagi namuna ro'yxatdan oziqlanadi. Ustoz
    // haqiqiy guruhini ochib begona ismlarni ko'rmasligi uchun yopiq turadi.
    // Haqiqiy hook (`useGroupAttendance`) paydo bo'lganda `true` qilinadi.
    groupAttendance: false,

    // Multilevel Speaking (/multilevel-speaking). Baholash, imtihon oqimi va
    // admin paneli tayyor, lekin baholash rubrikasi RASMIY emas — umumiy
    // CEFR deskriptorlariga asoslangan. Testlar to'ldirilib, ballari real
    // natijalarga solishtirilgach ochiladi.
    multilevelSpeaking: true,
};

export const isFeatureEnabled = (key) => FEATURES[key] !== false;
