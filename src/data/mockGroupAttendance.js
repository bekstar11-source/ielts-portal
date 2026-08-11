/**
 * Guruh davomati uchun VAQTINCHALIK ma'lumot.
 *
 * Bu yerdagi hech narsa Firestore'dan kelmaydi — `qarz`, `jarima` va davomat
 * holati hozircha ma'lumotlar bazasida yo'q. Ekran tayyor bo'lishi uchun
 * ro'yxat shu modulda saqlanadi; keyinchalik `useGroupAttendance` kabi hook
 * paydo bo'lganda `TeacherGroupDetail` ga uzatiladigan proplar o'zgarmaydi,
 * faqat manba almashadi.
 *
 * Holatlar:
 *   toza     — qarzi ham, jarimasi ham yo'q
 *   qarzdor  — to'lov qarzi bor
 *   yozib    — uyga vazifani yozib kelmagan
 */

/** Ro'yxatdagi holat kalitlari — tanlov segmentlari ham shu tartibda. */
export const ATTENDANCE_STATUSES = ['toza', 'qarzdor', 'yozib'];

const GROUP = {
    id: 'go-english',
    name: 'Go English',
    /** Dars boshlanish vaqti, "HH:MM". */
    lessonTime: '10:00',
    /** Dars kunlari — qisqartma ko'rinishida. */
    days: ['Se', 'Pay', 'Sha'],
};

const STUDENTS = [
    { id: 's01', name: "Marjona Normiddinova", qarz: 2, jarima: 2, status: 'yozib' },
    { id: 's02', name: "Davron Ergashev", qarz: 1, jarima: 2, status: 'yozib' },
    { id: 's03', name: "Ahmadshoh Qosimov", qarz: 2, jarima: 1, status: 'yozib' },
    { id: 's04', name: "Shohruh Berdiyev", qarz: 1, jarima: 1, status: 'yozib' },
    { id: 's05', name: "Kamola Tosheva", qarz: 3, jarima: 1, status: 'yozib' },
    { id: 's06', name: "Aziza Yo'ldosheva", qarz: 1, jarima: 1, status: 'yozib' },
    { id: 's07', name: "Otabek Rahimov", qarz: 2, jarima: 2, status: 'yozib' },
    { id: 's08', name: "Malika Tursunova", qarz: 1, jarima: 3, status: 'yozib' },
    { id: 's09', name: "Sardor Nazarov", qarz: 2, jarima: 1, status: 'yozib' },
    { id: 's10', name: "Gulnoza Xolmatova", qarz: 1, jarima: 2, status: 'yozib' },
    { id: 's11', name: "Javohir Umarov", qarz: 3, jarima: 2, status: 'yozib' },

    { id: 's12', name: "Zarnisor Anvarova", qarz: 1, jarima: 2, status: 'qarzdor' },
    { id: 's13', name: "Ibrohim Karomiddinov", qarz: 4, jarima: 1, status: 'qarzdor' },
    { id: 's14', name: "Diyor Sobirov", qarz: 2, jarima: 1, status: 'qarzdor' },
    { id: 's15', name: "Madina Qodirova", qarz: 2, jarima: 1, status: 'qarzdor' },
    { id: 's16', name: "Bekzod Alimov", qarz: 1, jarima: 1, status: 'qarzdor' },
    { id: 's17', name: "Nodira Sharipova", qarz: 3, jarima: 0, status: 'qarzdor' },
    { id: 's18', name: "Ulug'bek Ismoilov", qarz: 2, jarima: 0, status: 'qarzdor' },
    { id: 's19', name: "Dilnoza Rasulova", qarz: 1, jarima: 1, status: 'qarzdor' },
    { id: 's20', name: "Sanjar Yusupov", qarz: 5, jarima: 2, status: 'qarzdor' },
    { id: 's21', name: "Feruza Mirzayeva", qarz: 2, jarima: 1, status: 'qarzdor' },

    { id: 's22', name: "Sevinch Rustamova", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's23', name: "Jasurbek Oripov", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's24', name: "Nilufar Abdullayeva", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's25', name: "Ruxshona Ismatova", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's26', name: "Islombek Sattorov", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's27', name: "Oysha Nabiyeva", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's28', name: "Temurbek Ochilov", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's29', name: "Shahzoda Karimova", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's30', name: "Doniyor Egamberdiyev", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's31', name: "Robiya Hakimova", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's32', name: "Elyor Nurmatov", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's33', name: "Sitora Bahodirova", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's34', name: "Asadbek Qurbonov", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's35', name: "Mohira Xudoyberdiyeva", qarz: 0, jarima: 0, status: 'toza' },
    { id: 's36', name: "Behruz Tojiboyev", qarz: 0, jarima: 0, status: 'toza' },
];

/* `groupId` hozircha e'tiborga olinmaydi — bitta namuna guruh bor. Parametr
   ataylab qoldirilgan: haqiqiy manba ulanganda chaqiruv joyi o'zgarmaydi. */
export function getMockGroup(groupId) { // eslint-disable-line no-unused-vars
    return GROUP;
}

export function getMockStudents(groupId) { // eslint-disable-line no-unused-vars
    return STUDENTS;
}

/**
 * Har bir holatning ulushini foizga aylantiradi.
 *
 * Har birini alohida yaxlitlash yig'indini 100 dan chetga chiqaradi (36 ta
 * o'quvchida 42+28+31=101). Shuning uchun yaxlitlashdan keyingi farq eng
 * katta guruhga yoziladi — u yerda bir foiz eng kam seziladi. Yig'indi doim 100.
 */
export function toPercentages(counts, keys = ATTENDANCE_STATUSES) {
    const total = keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
    if (!total) return keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

    const out = {};
    keys.forEach((key) => { out[key] = Math.round(((counts[key] || 0) * 100) / total); });

    const delta = 100 - keys.reduce((sum, key) => sum + out[key], 0);
    if (delta !== 0) {
        const biggest = keys.reduce((a, b) => ((counts[b] || 0) > (counts[a] || 0) ? b : a));
        out[biggest] = Math.max(0, out[biggest] + delta);
    }
    return out;
}

/** Ro'yxatdan holatlar bo'yicha son va foizlarni hisoblaydi. */
export function buildAttendanceSummary(students) {
    const counts = ATTENDANCE_STATUSES.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    students.forEach((s) => {
        if (counts[s.status] !== undefined) counts[s.status] += 1;
    });
    return { total: students.length, counts, percentages: toPercentages(counts) };
}
