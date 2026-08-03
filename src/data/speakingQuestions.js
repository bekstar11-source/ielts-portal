/**
 * IELTS Speaking savollar bazasi.
 *
 * Statik ro'yxat — bu savollar kamdan-kam o'zgaradi va har ochilishda
 * Firestore o'qishiga arzimaydi. O'qituvchi qo'shgan savollar esa
 * `speakingQuestions` kolleksiyasidan keladi va shu ro'yxat ustiga
 * qo'shiladi (`useSpeakingTopics`), ya'ni ikkalasi bir xil shaklda.
 */

export const SPEAKING_TOPICS = [
    // ——— PART 1 ———
    {
        id: 'work-study',
        title: 'Work & Study',
        part: 1,
        description: 'Kundalik mavzular — qisqa va tabiiy javoblar',
        questions: [
            { id: 'ws1', part: 1, text: 'Do you work or are you a student?' },
            { id: 'ws2', part: 1, text: 'Why did you choose that job or subject?' },
            { id: 'ws3', part: 1, text: 'What do you find most difficult about it?' },
            { id: 'ws4', part: 1, text: 'What would you like to do in the future?' },
        ],
    },
    {
        id: 'hometown',
        title: 'Hometown & Home',
        part: 1,
        description: 'Kundalik mavzular — qisqa va tabiiy javoblar',
        questions: [
            { id: 'hm1', part: 1, text: 'Where is your hometown?' },
            { id: 'hm2', part: 1, text: 'What do you like most about living there?' },
            { id: 'hm3', part: 1, text: 'Has your hometown changed much in recent years?' },
            { id: 'hm4', part: 1, text: 'Would you like to live somewhere else in the future?' },
        ],
    },
    {
        id: 'free-time',
        title: 'Free time & Hobbies',
        part: 1,
        description: 'Kundalik mavzular — qisqa va tabiiy javoblar',
        questions: [
            { id: 'ft1', part: 1, text: 'What do you usually do in your free time?' },
            { id: 'ft2', part: 1, text: 'Have your hobbies changed since you were a child?' },
            { id: 'ft3', part: 1, text: 'Do you prefer spending free time alone or with other people?' },
            { id: 'ft4', part: 1, text: 'Is there a hobby you would like to try? Why?' },
        ],
    },
    {
        id: 'food',
        title: 'Food & Cooking',
        part: 1,
        description: 'Kundalik mavzular — qisqa va tabiiy javoblar',
        questions: [
            { id: 'fd1', part: 1, text: 'What kind of food do you usually eat?' },
            { id: 'fd2', part: 1, text: 'Do you enjoy cooking? Why or why not?' },
            { id: 'fd3', part: 1, text: 'Do people in your country eat out often?' },
            { id: 'fd4', part: 1, text: 'Has your diet changed in the last few years?' },
        ],
    },
    {
        id: 'weather-seasons',
        title: 'Weather & Seasons',
        part: 1,
        description: 'Kundalik mavzular — qisqa va tabiiy javoblar',
        questions: [
            { id: 'wt1', part: 1, text: 'What is the weather usually like where you live?' },
            { id: 'wt2', part: 1, text: 'Which season do you like most? Why?' },
            { id: 'wt3', part: 1, text: 'Does the weather affect how you feel or what you do?' },
            { id: 'wt4', part: 1, text: 'Do you prefer hot weather or cold weather?' },
        ],
    },
    {
        id: 'technology-daily',
        title: 'Phones & Internet',
        part: 1,
        description: 'Kundalik mavzular — qisqa va tabiiy javoblar',
        questions: [
            { id: 'td1', part: 1, text: 'How often do you use your phone during the day?' },
            { id: 'td2', part: 1, text: 'What do you mainly use the internet for?' },
            { id: 'td3', part: 1, text: 'Do you think you spend too much time online?' },
            { id: 'td4', part: 1, text: 'How did you learn to use new apps or devices?' },
        ],
    },

    // ——— PART 2 ———
    {
        id: 'describe-person',
        title: 'Describe a person',
        part: 2,
        description: 'Cue card — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish',
        questions: [
            {
                id: 'dp1',
                part: 2,
                text: 'Describe a person who has had an important influence on your life.',
                cueCard:
                    'who this person is\nhow you know them\nwhat they have done\nand explain why they influenced you',
            },
        ],
    },
    {
        id: 'describe-place',
        title: 'Describe a place',
        part: 2,
        description: 'Cue card — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish',
        questions: [
            {
                id: 'dpl1',
                part: 2,
                text: 'Describe a place you enjoy visiting.',
                cueCard:
                    'where it is\nhow often you go there\nwhat you do there\nand explain why you enjoy it',
            },
        ],
    },
    {
        id: 'describe-event',
        title: 'Describe an event',
        part: 2,
        description: 'Cue card — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish',
        questions: [
            {
                id: 'de1',
                part: 2,
                text: 'Describe an event in your life that you will always remember.',
                cueCard:
                    'when it happened\nwhere you were\nwho was with you\nand explain why you still remember it',
            },
        ],
    },
    {
        id: 'describe-object',
        title: 'Describe an object',
        part: 2,
        description: 'Cue card — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish',
        questions: [
            {
                id: 'do1',
                part: 2,
                text: 'Describe something you own that is important to you.',
                cueCard:
                    'what it is\nhow long you have had it\nhow you got it\nand explain why it matters to you',
            },
        ],
    },
    {
        id: 'describe-skill',
        title: 'Describe a skill',
        part: 2,
        description: 'Cue card — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish',
        questions: [
            {
                id: 'ds1',
                part: 2,
                text: 'Describe a skill you learned that was difficult at first.',
                cueCard:
                    'what the skill is\nwhen you started learning it\nhow you practised\nand explain how you feel about it now',
            },
        ],
    },
    {
        id: 'describe-decision',
        title: 'Describe a decision',
        part: 2,
        description: 'Cue card — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish',
        questions: [
            {
                id: 'dd1',
                part: 2,
                text: 'Describe an important decision you had to make.',
                cueCard:
                    'what the decision was\nwhen you made it\nwho helped you\nand explain whether it was the right decision',
            },
        ],
    },

    // ——— PART 3 ———
    {
        id: 'technology',
        title: 'Technology & Society',
        part: 3,
        description: 'Muhokama — chuqur fikr va misollar talab qilinadi',
        questions: [
            { id: 'tc1', part: 3, text: 'How has technology changed the way people communicate?' },
            { id: 'tc2', part: 3, text: 'Do you think older people find new technology difficult? Why?' },
            { id: 'tc3', part: 3, text: 'What are the disadvantages of relying too much on technology?' },
        ],
    },
    {
        id: 'education',
        title: 'Education',
        part: 3,
        description: 'Muhokama — chuqur fikr va misollar talab qilinadi',
        questions: [
            { id: 'ed1', part: 3, text: 'Should education be free for everyone? Why or why not?' },
            { id: 'ed2', part: 3, text: 'How is learning online different from learning in a classroom?' },
            { id: 'ed3', part: 3, text: 'What skills should schools teach that they currently do not?' },
        ],
    },
    {
        id: 'work-future',
        title: 'Work & the future',
        part: 3,
        description: 'Muhokama — chuqur fikr va misollar talab qilinadi',
        questions: [
            { id: 'wf1', part: 3, text: 'Why do people change jobs more often than they used to?' },
            { id: 'wf2', part: 3, text: 'Do you think working from home is better than working in an office?' },
            { id: 'wf3', part: 3, text: 'Which jobs do you think will disappear in the next twenty years?' },
        ],
    },
    {
        id: 'environment',
        title: 'Environment',
        part: 3,
        description: 'Muhokama — chuqur fikr va misollar talab qilinadi',
        questions: [
            {
                id: 'ev1',
                part: 3,
                text: 'Whose responsibility is it to protect the environment — governments or individuals?',
            },
            { id: 'ev2', part: 3, text: 'How can cities be made more environmentally friendly?' },
            { id: 'ev3', part: 3, text: 'Are people in your country becoming more aware of environmental problems?' },
        ],
    },
    {
        id: 'city-life',
        title: 'Cities & Living',
        part: 3,
        description: 'Muhokama — chuqur fikr va misollar talab qilinadi',
        questions: [
            { id: 'cl1', part: 3, text: 'Why do so many people move from villages to big cities?' },
            { id: 'cl2', part: 3, text: 'What problems does rapid city growth create?' },
            { id: 'cl3', part: 3, text: 'How will cities be different fifty years from now?' },
        ],
    },
    {
        id: 'media',
        title: 'Media & Information',
        part: 3,
        description: 'Muhokama — chuqur fikr va misollar talab qilinadi',
        questions: [
            { id: 'md1', part: 3, text: 'Where do most people get their news these days?' },
            { id: 'md2', part: 3, text: 'How can people tell whether information online is reliable?' },
            { id: 'md3', part: 3, text: 'Does social media bring people together or push them apart?' },
        ],
    },
];

/** @param {string} topicId */
export function getTopic(topicId) {
    return SPEAKING_TOPICS.find((topic) => topic.id === topicId) || null;
}

/** Ro'yxatdan tasodifiy element. */
function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * To'liq imtihon: Part 1 → Part 2 → Part 3, bitta sessiyada.
 *
 * Real imtihon 11-14 daqiqa davom etadi va uchala qism ketma-ket keladi.
 * Mavzu bo'yicha alohida mashq bunga tayyorlamaydi: eng qiyini — uzun
 * javobdan keyin darrov muhokamaga o'tish.
 *
 * @param {Array} [topics] - statik va o'qituvchi savollari birlashgan ro'yxat
 */
export function buildMockTopic(topics = SPEAKING_TOPICS) {
    const part1 = pick(topics.filter((t) => t.part === 1));
    const part2 = pick(topics.filter((t) => t.part === 2));
    const part3 = pick(topics.filter((t) => t.part === 3));

    const questions = [
        ...(part1?.questions || []),
        ...(part2?.questions || []),
        ...(part3?.questions || []),
    ];

    return {
        id: `mock_${Date.now().toString(36)}`,
        isMock: true,
        title: 'Full Speaking mock',
        part: 0,
        description: [part1?.title, part2?.title, part3?.title].filter(Boolean).join(' · '),
        questions,
    };
}
