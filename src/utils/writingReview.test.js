import { describe, it, expect } from 'vitest';
import {
    roundToHalfBand, getWritingAnswers, calculateTaskBand, combineWritingBand,
    aiReviewToFeedback, mapWithConcurrency,
} from './writingReview';

const aiTask = (bands, feedback = '') => ({
    criteria: {
        taskAchievement: { band: bands[0] },
        coherence: { band: bands[1] },
        lexical: { band: bands[2] },
        grammar: { band: bands[3] },
        overall: { band: bands[4] ?? 0, feedback },
    },
});

describe('roundToHalfBand', () => {
    it('yarim bandga yaxlitlaydi', () => {
        expect(roundToHalfBand(6.2)).toBe(6);
        expect(roundToHalfBand(6.25)).toBe(6.5);
        expect(roundToHalfBand(6.74)).toBe(6.5);
        expect(roundToHalfBand(6.75)).toBe(7);
    });
});

describe('getWritingAnswers', () => {
    it('oxirgi urinishdan javoblarni oladi', () => {
        const res = {
            userAnswers: { task1: 'eski' },
            attempts: [{ userAnswers: { task1: 'a' } }, { writingAnswers: { task2: 'b' } }],
        };
        expect(getWritingAnswers(res)).toEqual({ task2: 'b' });
    });

    it('details.writingAnswers ustunlik qiladi va eski maydonlar to\'ldiriladi', () => {
        const res = { details: { writingAnswers: { task2: 'ikki' } }, writingAnswer: 'bir' };
        expect(getWritingAnswers(res)).toEqual({ task1: 'bir', task2: 'ikki' });
    });
});

describe('calculateTaskBand', () => {
    it('to\'rt mezon bo\'lmasa bo\'sh qaytaradi', () => {
        expect(calculateTaskBand({ ta: '6', cc: '6' })).toBe('');
        expect(calculateTaskBand(null)).toBe('');
    });

    it('tr (task 2) mezonini ham hisobga oladi', () => {
        expect(calculateTaskBand({ tr: '7', cc: '6', lr: '7', gra: '6' })).toBe('6.5');
    });

    it('ta = 0 bo\'lsa ham mezonni yo\'qotmaydi', () => {
        expect(calculateTaskBand({ ta: 0, cc: 0, lr: 0, gra: 0 })).toBe('0.0');
    });
});

describe('combineWritingBand', () => {
    it('T2 ga ikki barobar og\'irlik beradi', () => {
        expect(combineWritingBand('6.0', '7.0', true, true)).toBe(6.5);
    });

    it('faqat bitta task bo\'lsa o\'shani qaytaradi', () => {
        expect(combineWritingBand('', '7.5', false, true)).toBe(7.5);
        expect(combineWritingBand('6.5', '', true, false)).toBe(6.5);
    });

    it('band tanlanmagan bo\'lsa NaN', () => {
        expect(Number.isNaN(combineWritingBand('', '7.0', true, true))).toBe(true);
    });
});

describe('aiReviewToFeedback', () => {
    it('mezonlardan band va izohni yig\'adi', () => {
        const out = aiReviewToFeedback(
            { task1: aiTask([6, 6, 7, 6], 'T1 izoh'), task2: aiTask([7, 7, 7, 6], 'T2 izoh') },
            { hasT1: true, hasT2: true }
        );
        expect(out.task1Band).toBe('6.5');
        expect(out.task2Band).toBe('7.0');
        expect(out.task1Details).toEqual({ ta: '6', cc: '6', lr: '7', gra: '6' });
        expect(out.task2Details).toEqual({ tr: '7', cc: '7', lr: '7', gra: '6' });
        expect(out.feedback).toBe('T1 izoh\n\nT2 izoh');
    });

    it('topshirilmagan taskni bo\'sh qoldiradi', () => {
        const out = aiReviewToFeedback({ task2: aiTask([7, 7, 7, 7]) }, { hasT1: false, hasT2: true });
        expect(out.task1Band).toBe('');
        expect(out.task1Details).toBe(null);
        expect(out.task2Band).toBe('7.0');
    });

    it('mezonlar to\'liq bo\'lmasa overall banddan foydalanadi', () => {
        const review = { task1: { criteria: { taskAchievement: { band: 6 }, overall: { band: 6.4 } } } };
        expect(aiReviewToFeedback(review, { hasT1: true, hasT2: false }).task1Band).toBe('6.5');
    });

    it('band umuman yo\'q bo\'lsa null — qo\'lda baholanadi', () => {
        const review = { task1: { criteria: { overall: { band: 0 } } } };
        expect(aiReviewToFeedback(review, { hasT1: true, hasT2: false })).toBe(null);
        expect(aiReviewToFeedback(null, { hasT1: true, hasT2: false })).toBe(null);
    });

    it('mavjud ustoz izohini ustidan yozmaydi', () => {
        const out = aiReviewToFeedback(
            { task1: aiTask([6, 6, 6, 6], 'AI izoh') },
            { hasT1: true, hasT2: false, existingFeedback: 'Ustoz izohi' }
        );
        expect(out.feedback).toBe('Ustoz izohi');
    });
});

describe('mapWithConcurrency', () => {
    it('tartibni saqlaydi va chegaradan oshmaydi', async () => {
        let active = 0;
        let peak = 0;
        const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise(r => setTimeout(r, 1));
            active -= 1;
            return n * 2;
        });
        expect(out).toEqual([2, 4, 6, 8, 10]);
        expect(peak).toBeLessThanOrEqual(2);
    });
});
