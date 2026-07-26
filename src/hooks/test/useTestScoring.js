import { evaluateTest } from "../../utils/ieltsScoring";

/**
 * Client tomonda ball hisoblash.
 *
 * Ilgari bu yerda `evaluateTest` ning mustaqil (va vaqt o'tishi bilan farq qilib ketgan)
 * nusxasi bor edi — natijada bitta urinish submit, review modal va mock exam'da
 * uch xil ball ko'rsatishi mumkin edi. Endi hammasi yagona dvigatelga tayanadi.
 */
export function useTestScoring() {
    const calculateScore = (test, userAnswers, partNumber = null) => {
        const { correctCount, totalQ, band, mistakes, missingKeys } = evaluateTest(test, userAnswers, partNumber);
        return { correctCount, totalQ, band, mistakes, missingKeys };
    };

    return { calculateScore };
}
