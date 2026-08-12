// Bosh sahifadagi "Spotlight" (reklama banneri) uchun kontent.
// Har bir slayd — bitta aksiya/yangilik + o'ng tomonda savol parchasi (teaser).
// Yangi aksiya qo'shish uchun shu massivga yangi obyekt qo'shish kifoya.
//
// mode: 'both'     — e'lon + savol parchasi
//       'promo'    — faqat e'lon (aksiya, yangilik)
//       'question' — faqat savol parchasi
//
// preview.kind:
//   'tfng'    — matn parchasi + statement + True / False / Not Given
//   'mcq'     — listening savoli + variantlar (audio qatori bilan)
//   'gapfill' — bo'sh joyli gap (javob ochiladi)

export const PROMO_SPOTLIGHTS = [
    {
        id: 'new-mock',
        mode: 'both',
        tag: 'Yangi',
        accent: '#cc785c',
        title: 'Avgust Mock Exam ochildi',
        description:
            "To'liq 2 soat 45 daqiqalik imtihon: Listening, Reading va Writing. Natija va band score darhol.",
        cta: { label: 'Mockni boshlash', to: '/mock' },
        secondary: { label: "Qanday o'tadi?", to: '/practice' },
        preview: {
            kind: 'tfng',
            label: 'Reading · True / False / Not Given',
            passage:
                "The first commercial electric streetlights were installed in Wabash, Indiana, in 1880. Within a decade, most large American cities had replaced their gas lamps, although rural districts continued to rely on gas well into the 1920s.",
            statement: 'Rural districts switched to electric lighting before 1900.',
            options: ['True', 'False', 'Not Given'],
            answer: 'False',
            explanation: "Matnda qishloqlar 1920-yillarga qadar gazdan foydalangani aytilgan.",
        },
    },
    {
        id: 'new-listening-set',
        mode: 'question',
        tag: 'Yangi set',
        accent: '#5db8a6',
        title: "Listening Set 12 — 4 ta yangi part",
        description:
            "Map labeling, multiple choice va note completion. Har bir part 8 daqiqa, transkript bilan.",
        cta: { label: "Setni ochish", to: '/listening/parts' },
        secondary: { label: "Barcha listening", to: '/listening/full' },
        preview: {
            kind: 'mcq',
            label: 'Listening · Multiple Choice',
            audioLine: 'Part 2 · 01:14',
            transcriptHint:
                "“…so the tour starts at the north gate, not the visitor centre as printed in the brochure.”",
            question: 'Where does the tour begin?',
            options: ['At the visitor centre', 'At the north gate', 'At the car park'],
            answer: 'At the north gate',
            explanation: "Spiker broshyuradagi ma'lumotni tuzatadi — start: north gate.",
        },
    },
    {
        id: 'reading-collections',
        mode: 'promo',
        tag: 'Aksiya',
        accent: '#e8a55a',
        title: "Premium 30% chegirma — bu hafta",
        description:
            "Barcha reading to'plamlari, batafsil tahlil va cheksiz urinishlar. Promokod: IELTS30.",
        cta: { label: "Tariflarni ko'rish", to: '/pricing' },
        secondary: { label: 'Bepul sinab ko\'rish', to: '/reading/parts' },
        preview: {
            kind: 'gapfill',
            label: 'Reading · Sentence Completion',
            passage:
                "Honeybees communicate the location of food through a series of movements known as the waggle dance, in which the angle of the run indicates direction relative to the sun.",
            before: 'The angle of the waggle run shows direction in relation to the',
            after: '.',
            answer: 'sun',
            explanation: "“…relative to the sun” — bitta so'z yetarli.",
        },
    },
];
