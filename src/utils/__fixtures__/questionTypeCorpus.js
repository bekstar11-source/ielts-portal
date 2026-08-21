// src/utils/__fixtures__/questionTypeCorpus.js
//
// GOLDEN CORPUS — har bir savol turi va uning bazada uchraydigan HAR BIR
// yozilish ko'rinishi uchun eng kichik test namunasi.
//
// Nega kerak: savol turlari to'rtta mustaqil joyda talqin qilinadi (renderer,
// ball hisobi, review, savol sanagich). Ular bir-biridan siljiganda HECH QANDAY
// xatolik chiqmaydi — talaba shunchaki 40 o'rniga 37 ta savollik testni ko'radi,
// yoki review'da yashil ✓ ko'rib ball olmaydi. Buni faqat to'rtala manbani bir
// vaqtda tekshiradigan test ushlaydi.
//
// Namunalar shakli `matched_test_prod.json` dagi HAQIQIY testdan olingan —
// o'ylab topilgan emas. Yangi savol turi qo'shilganda shu yerga namuna
// qo'shiladi; `questionTypeCorpus.test.js` uni avtomatik tekshiradi.
//
// Har bir yozuv:
//   name           — xatolik xabarida ko'rinadigan nom
//   skill          — 'reading' | 'listening'
//   expectedTotal  — ball hisobidagi savollar soni (maxraj)
//   group          — `testData.questions` ichidagi bitta guruh
//   answers        — TO'LIQ to'g'ri javoblar (hammasi to'g'ri bo'lishi shart)
//   rendererOnly   — (ixtiyoriy) listening renderer nomi; tekshiriladi

/** Guruhni to'liq testga o'raydi. */
export const testWith = (skill, group) => ({
  type: skill,
  passages: [{ id: 'p1', title: 'Part 1' }],
  questions: [{ passageId: 'p1', ...group }]
});

export const CORPUS = [
  // ───────────────────────── READING ─────────────────────────
  {
    name: 'reading / true_false — items, matnli kalit',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'true_false',
      items: [
        { id: '1', text: 'Some people believe...', answer: 'NOT GIVEN' },
        { id: '2', text: 'The author agrees...', answer: 'TRUE' }
      ]
    },
    answers: { '1': 'NOT GIVEN', '2': 'TRUE' }
  },
  {
    name: 'reading / short_answer — "/" bilan muqobil javob',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'short_answer',
      items: [
        { id: '11', text: 'Which invention...? [INPUT]', answer: 'the newspaper / newspaper' },
        { id: '12', text: 'What year? [INPUT]', answer: '1789' }
      ]
    },
    // Muqobil variantning IKKINCHISI yozilgan — `splitAlternatives` ishlashi shart.
    answers: { '11': 'newspaper', '12': '1789' }
  },
  {
    name: 'reading / mcq — variantlar har bir savolda',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'mcq',
      items: [
        { id: '14', answer: 'B', options: ['A fear and stress differ', 'B most humans develop strategies', 'C business causes fear'] },
        { id: '15', answer: 'C', options: ['A one', 'B two', 'C three'] }
      ]
    },
    answers: { '14': 'B', '15': 'C' }
  },
  {
    name: 'reading / matching — guruh darajasidagi variantlar, harfli kalit',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'matching',
      options: ['A the alone condition', 'B the no-eye-contact condition', 'C the aggressive condition'],
      items: [
        { id: '18', text: 'aggressive facial expressions [DROP]', answer: 'C' },
        { id: '19', text: 'freezing behaviour [DROP]', answer: 'A' }
      ]
    },
    answers: { '18': 'C', '19': 'A' }
  },
  {
    name: 'reading / matching — YORLIQSIZ variantlar, kalit harf, javob so\'z',
    skill: 'reading',
    expectedTotal: 1,
    group: {
      type: 'matching',
      // Variantlarda harf prefiksi YO'Q. Bunday ro'yxatda `getOptionValue`
      // (UI) variant MATNINI saqlaydi, kalit esa harf ko'rinishida turadi —
      // ikkalasi bitta variant indeksiga kelishi shart.
      options: ['adaptation', 'migration', 'hibernation'],
      items: [{ id: '20', text: 'x [DROP]', answer: 'B' }]
    },
    answers: { '20': 'migration' }
  },
  {
    name: 'reading / matching_headings — rim raqamli variantlar',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'matching_headings',
      options: ['i Ways of protecting the environment', 'ii A new discovery', 'iii The cost of change'],
      items: [
        { id: '21', text: 'Paragraph A', answer: 'ii' },
        { id: '22', text: 'Paragraph B', answer: 'i' }
      ]
    },
    answers: { '21': 'ii', '22': 'i' }
  },
  {
    name: 'reading / summary — [INPUT] li items (bazada "summary" deb yoziladi)',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'summary',
      items: [
        { id: '23', text: 'grouped the monkeys according to their [INPUT],', answer: 'age' },
        { id: '24', text: 'and measured their [INPUT] levels', answer: 'cortisol' }
      ]
    },
    answers: { '23': 'age', '24': 'cortisol' }
  },
  {
    name: 'reading / pick_two — bitta element, ID diapazoni (en tire)',
    skill: 'reading',
    expectedTotal: 2,
    group: {
      type: 'pick_two',
      options: ['A Fish die from plastic', 'B Too many fish are caught', 'C Water is warmer', 'D Coral is dying', 'E Nets are too fine'],
      // ID "35–36" — EN TIRE (–), oddiy defis emas. Bazada aynan shunday yoziladi.
      items: [{ id: '35–36', text: 'Which TWO causes...?', answer: 'D,E' }]
    },
    answers: { '35–36': 'D,E' }
  },
  {
    name: 'reading / note_completion — qavsli ixtiyoriy so\'z',
    skill: 'reading',
    expectedTotal: 1,
    group: {
      type: 'note_completion',
      items: [{ id: '30', text: 'held in (the) [INPUT]', answer: 'in (the) school' }]
    },
    // Qavs ichidagi so'zsiz javob ham to'g'ri sanalishi shart.
    answers: { '30': 'in school' }
  },
  {
    name: 'reading / table_completion — rows → cells',
    skill: 'reading',
    expectedTotal: 2,
    rendererOnly: 'Table',
    group: {
      type: 'table_completion',
      rows: [{ cells: [{ text: 'Year' }, { id: '31', answer: '1901' }] },
             { cells: [{ text: 'Place' }, { id: '32', answer: 'Vienna' }] }]
    },
    answers: { '31': '1901', '32': 'Vienna' }
  },
  {
    name: 'reading / diagram_labeling — guruh variantlari',
    skill: 'reading',
    expectedTotal: 2,
    rendererOnly: 'DiagramLabeling',
    group: {
      type: 'diagram_labeling',
      options: ['A. valve', 'B. piston', 'C. cylinder'],
      items: [{ id: '33', answer: 'B' }, { id: '34', answer: 'C' }]
    },
    answers: { '33': 'B', '34': 'C' }
  },
  {
    name: 'reading / flow_chart — tur nomidan',
    skill: 'reading',
    expectedTotal: 2,
    rendererOnly: 'FlowChart',
    group: {
      type: 'flow_chart',
      items: [{ id: '37', answer: 'sample' }, { id: '38', answer: 'analysis' }]
    },
    answers: { '37': 'sample', '38': 'analysis' }
  },
  {
    // Tur `gap_fill`, lekin flow-chart ekani faqat KO'RSATMADA yozilgan —
    // bazada uchraydigan holat. Renderer tanlovi ko'rsatmaga ham qarashi shart.
    name: 'reading / gap_fill + ko\'rsatmada "flow-chart"',
    skill: 'reading',
    expectedTotal: 1,
    rendererOnly: 'FlowChart',
    group: {
      type: 'gap_fill',
      instruction: 'Complete the flow-chart below.',
      items: [{ id: '39', answer: 'filter' }]
    },
    answers: { '39': 'filter' }
  },

  // ───────────────────────── LISTENING ─────────────────────────
  {
    name: 'listening / table_completion — qatorlar MASSIV ko\'rinishida',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'TableCompletion',
    group: {
      type: 'table_completion',
      rows: [
        [{ text: 'Item' }, { id: '101', answer: 'book' }],
        [{ text: 'Cost' }, { id: '102', answer: '150' }]
      ]
    },
    answers: { '101': 'book', '102': '150' }
  },
  {
    name: 'listening / table_completion — qatorlar OBYEKT ko\'rinishida',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'TableCompletion',
    group: {
      type: 'table_completion',
      rows: [
        { cells: [{ text: 'Item' }, { id: '101', answer: 'book' }] },
        { cells: [{ text: 'Cost' }, { id: '102', answer: '150' }] }
      ]
    },
    answers: { '101': 'book', '102': '150' }
  },
  {
    name: 'listening / table_completion — matn+input aralash katakcha (parts)',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'TableCompletion',
    group: {
      type: 'table_completion',
      rows: [
        {
          cells: [
            { text: 'Address' },
            // `isMixed` bayrog'i ATAYLAB qo'yilmagan: JSON larda u ko'pincha yo'q,
            // lekin renderer `parts` ni ko'rib input chizadi.
            { parts: [{ type: 'text', text: 'No. ' }, { type: 'input', id: '103', answer: '142' }] }
          ]
        },
        { cells: [{ text: 'Street' }, { parts: [{ type: 'input', id: '104', answer: 'Baker' }] }] }
      ]
    },
    answers: { '103': '142', '104': 'Baker' }
  },
  {
    name: 'listening / table_completion — bitta katakchada bir nechta savol',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'TableCompletion',
    group: {
      type: 'table_completion',
      rows: [
        {
          cells: [
            { text: 'Notes' },
            { isMultiQuestion: true, content: [{ id: '105', answer: 'red' }, { id: '106', answer: 'blue' }] }
          ]
        }
      ]
    },
    answers: { '105': 'red', '106': 'blue' }
  },
  {
    // ⚠️ Ko'p javobli TUR EMAS, lekin ID diapazon — jadval katakchasi ikki
    // savolni qamragan holat. Ilgari `evaluateTest` bu yerda `includes('-')`
    // bilan tekshirardi va EN TIRE ni ko'rmasdi: maxrajga 2 o'rniga 1 kirardi,
    // savol sanagichi esa 2 deb hisoblardi.
    name: 'listening / table_completion — EN TIRE li diapazon ID',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'TableCompletion',
    group: {
      type: 'table_completion',
      rows: [[{ text: 'Open days' }, { id: '131–132', answer: 'Monday, Friday' }]]
    },
    answers: { '131–132': 'Monday, Friday' }
  },
  {
    name: 'listening / note_completion — groups → items',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'NoteCompletion',
    group: {
      type: 'note_completion',
      groups: [{ title: 'Booking', items: [{ id: '107', answer: 'Tuesday' }, { id: '108', answer: '9,000' }] }]
    },
    // Minglik ajratkichsiz yozilgan javob ham to'g'ri sanalishi shart.
    answers: { '107': 'Tuesday', '108': '9000' }
  },
  {
    name: 'listening / summary — bazadagi yozuv, ilgari MCQ ga tushib ketardi',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'NoteCompletion',
    group: {
      type: 'summary',
      items: [{ id: '109', answer: 'harbour' }, { id: '110', answer: 'car-park' }]
    },
    // Defisli javobning bo'shliqli ko'rinishi ham qabul qilinishi shart.
    answers: { '109': 'harbour', '110': 'car park' }
  },
  {
    name: 'listening / form_completion',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'NoteCompletion',
    group: {
      type: 'form_completion',
      items: [{ id: '111', answer: 'Smith' }, { id: '112', answer: '07700 900123' }]
    },
    answers: { '111': 'Smith', '112': '07700 900123' }
  },
  {
    name: 'listening / sentence_completion',
    skill: 'listening',
    expectedTotal: 1,
    rendererOnly: 'NoteCompletion',
    group: {
      type: 'sentence_completion',
      items: [{ id: '113', text: 'The tour starts at [INPUT].', answer: 'the museum' }]
    },
    answers: { '113': 'the museum' }
  },
  {
    name: 'listening / gap_fill',
    skill: 'listening',
    expectedTotal: 1,
    rendererOnly: 'NoteCompletion',
    group: { type: 'gap_fill', items: [{ id: '114', answer: 'library' }] },
    answers: { '114': 'library' }
  },
  {
    name: 'listening / map_labeling — guruh variantlari, harfli kalit',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'MapLabeling',
    group: {
      type: 'map_labeling',
      image: 'https://example.test/map.png',
      options: ['A Reception', 'B Cafe', 'C Library'],
      items: [{ id: '115', answer: 'B' }, { id: '116', answer: 'C' }]
    },
    answers: { '115': 'B', '116': 'C' }
  },
  {
    name: 'listening / map-labeling — DEFISLI yozuv (ilgari tushib qolardi)',
    skill: 'listening',
    expectedTotal: 1,
    rendererOnly: 'MapLabeling',
    group: {
      type: 'map-labeling',
      image: 'https://example.test/map.png',
      options: ['A Reception', 'B Cafe'],
      items: [{ id: '117', answer: 'A' }]
    },
    answers: { '117': 'A' }
  },
  {
    name: 'listening / matching',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'Matching',
    group: {
      type: 'matching',
      options: ['A morning', 'B afternoon', 'C evening'],
      items: [{ id: '118', answer: 'A' }, { id: '119', answer: 'C' }]
    },
    answers: { '118': 'A', '119': 'C' }
  },
  {
    name: 'listening / flow_chart — groups → items',
    skill: 'listening',
    expectedTotal: 2,
    rendererOnly: 'FlowChart',
    group: {
      type: 'flow_chart',
      groups: [{ items: [{ id: '120', answer: 'sample' }, { id: '121', answer: 'analysis' }] }]
    },
    answers: { '120': 'sample', '121': 'analysis' }
  },
  {
    name: 'listening / mcq — FLAT tuzilish (guruh o\'zi bitta savol)',
    skill: 'listening',
    expectedTotal: 1,
    rendererOnly: 'MultipleChoice',
    group: {
      type: 'mcq',
      id: '122',
      text: 'What time does it start?',
      options: [{ label: 'A', text: '9am' }, { label: 'B', text: '10am' }],
      answer: 'B'
    },
    answers: { '122': 'B' }
  },
  {
    name: 'listening / multi_choice_box — SelectionBox (ko\'p javobli)',
    skill: 'listening',
    expectedTotal: 2,
    group: {
      type: 'multi_choice_box',
      options: ['A swimming', 'B tennis', 'C golf', 'D running'],
      items: [{ id: '123', answer: 'B' }, { id: '124', answer: 'D' }]
    },
    answers: { '123': 'B', '124': 'D' }
  }
];
