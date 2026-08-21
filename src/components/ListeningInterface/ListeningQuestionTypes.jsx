// src/components/ListeningInterface/ListeningQuestionTypes.jsx
//
// Listening savol turlari komponentlarining yagona re-eksport nuqtasi.
//
// ⚠️ Ilgari shu faylda `ListeningQuestionRenderer` degan IKKINCHI dispatcher
// ham bor edi. Uni hech kim import qilmasdi (tirik dispatcher —
// `ListeningRightPane.renderGroupContent`), lekin u boshqa kalitlarni
// (`map-labeling`, `table-completion`) taniydi va boshqacha fallback qiladi.
// Ikkita dispatcher — kafolatlangan siljish: tuzatish bittasiga tushib,
// ikkinchisi eskirib qolardi. Tur → renderer moslamasi endi FAQAT
// `src/utils/questionTypeRegistry.js` da.

export { MapLabeling } from './types/MapLabeling';
export { Matching } from './types/Matching';
export { SelectionBox } from './types/SelectionBox';
export { TableCompletion, NoteCompletion } from './types/Completion';
export { FlowChart } from './types/FlowChart';
export { MultipleChoice } from './types/MultipleChoice';
