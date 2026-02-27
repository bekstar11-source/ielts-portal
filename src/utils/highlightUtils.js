// src/utils/highlightUtils.js

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * HTML matn ichidagi so'zlarni xavfsiz highlight qilish.
 * Bu funksiya to'g'ridan-to'g'ri stringni qirqmaydi, balki DOM Tree bo'ylab yuradi.
 */
export const applyHighlightsToText = (htmlContent, highlights = []) => {
    if (!highlights || highlights.length === 0) return htmlContent;

    // 1. Vaqtinchalik "konteyner" ochib, HTMLni ichiga solamiz
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;

    // 2. Highlightlarni tartiblaymiz (oxiridan boshiga qarab, chunki matn o'zgarsa indekslar siljimasligi kerak)
    // Lekin DOM manipulyatsiyasida biz Range ishlatamiz, shuning uchun oddiy tartiblaymiz.
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

    // 3. Har bir highlight uchun ishlaymiz
    sortedHighlights.forEach(({ id, start, end, color }) => {
        const range = document.createRange();

        // Start va End nuqtalarini DOM Node'lar ichidan topamiz
        const startNodeInfo = findTextNodeAtOffset(wrapper, start);
        const endNodeInfo = findTextNodeAtOffset(wrapper, end);

        if (startNodeInfo && endNodeInfo) {
            try {
                range.setStart(startNodeInfo.node, startNodeInfo.offset);
                range.setEnd(endNodeInfo.node, endNodeInfo.offset);

                // Yangi highlight elementi
                const mark = document.createElement('span');
                const bgClass = color === 'green' ? 'bg-green-200' : 'bg-yellow-200';
                // mix-blend-multiply va border-b olib tashlandi
                mark.className = `${bgClass} rounded py-0.5 cursor-pointer highlight-mark`;
                mark.setAttribute('data-highlight-id', id);

                // Range ichidagi elementlarni ajratib olib, mark ichiga solamiz
                // surroundContents ba'zan xato beradi (agar teglar kesishsa), shuning uchun extractContents xavfsizroq
                try {
                    range.surroundContents(mark);
                } catch (e) {
                    // Agar highlight qalin (bold) yoki italic teglarini kesib o'tsa, surroundContents xato beradi.
                    // Bunday holda biz oddiygina "execCommand" yoki murakkabroq wrap ishlatishimiz kerak edi.
                    // Lekin IELTS matnlari uchun oddiy yechim: xatoni yutib yuborish yoki qisman belgilash.
                    console.warn("Highlight teglarni kesib o'tdi, o'tkazib yuborildi.");
                }
            } catch (err) {
                console.error("Range setting error:", err);
            }
        }
    });

    return wrapper.innerHTML;
};

/**
 * Butun matn (container) bo'yicha global offset (masalan, 150-harf) 
 * qaysi TextNode ichida va uning ichidagi qaysi indeksda ekanini topadi.
 */
const findTextNodeAtOffset = (root, globalOffset) => {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let currentOffset = 0;
    let node;

    while ((node = walker.nextNode())) {
        const nodeLength = node.textContent.length;

        // Agar qidirilayotgan offset shu node ichida bo'lsa
        if (currentOffset + nodeLength >= globalOffset) {
            return {
                node: node,
                offset: globalOffset - currentOffset
            };
        }
        currentOffset += nodeLength;
    }
    return null;
};

/**
 * Selection obyektidan toza offsetlarni olish
 */
export const getSelectionOffsets = (selection, containerNode) => {
    if (selection.rangeCount === 0) return { start: 0, end: 0, text: '' };

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();

    // Konteyner boshidan kursorgacha bo'lgan qismini belgilaymiz
    preSelectionRange.selectNodeContents(containerNode);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    // Va uning uzunligini o'lchaymiz
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;

    return { start, end, text: range.toString() };
};

/**
 * HTML string ichiga keywordTable asosida <mark> teglarini joylaydi.
 * Faqat Review rejimida chaqiriladi.
 *
 * @param {string} htmlContent  - Original HTML string
 * @param {Array}  keywordTable - [{ id, locationId, passageWord, questionWord, questionId }]
 * @param {boolean} isQuestion  - true = questionWord, false = passageWord
 * @param {string|null} questionId - (isQuestion=true paytida) faqat shu savolga oid so'zlarni ol
 * @returns {string} - O'zgartirilgan HTML string
 */
export const injectKeywordsToHTML = (htmlContent, keywordTable, isQuestion = false, questionId = null) => {
    if (!htmlContent || !keywordTable?.length) return htmlContent;

    let result = htmlContent;

    // Question rejimida: questionId berilsa faqat shu savolga tegishli keywordlarni olish
    const activeKeywords = (isQuestion && questionId !== null)
        ? keywordTable.filter(k => String(k.questionId) === String(questionId))
        : keywordTable;

    activeKeywords.forEach(({ id, locationId, passageWord, questionWord }) => {
        const word = isQuestion ? questionWord : passageWord;
        if (!word) return;

        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRe = new RegExp(`(?<![\\w])(${escapedWord})(?![\\w])`, 'gi');
        const markFn = (matched) =>
            `<mark class="keyword-highlight" data-keyword-id="${id}"><span class="kw-badge">${id}</span>${matched}</mark>`;

        if (!isQuestion && locationId) {
            // PASSAGE rejimi: faqat loc_X span ichidan qidiradi
            const locRe = new RegExp(
                `(<span\\s[^>]*id=["']${locationId}["'][^>]*>)([\\s\\S]*?)(</span>)`,
                'i'
            );
            result = result.replace(locRe, (_, open, inner, close) =>
                open + inner.replace(wordRe, markFn) + close
            );
        } else if (isQuestion) {
            // QUESTION rejimi: locationId shart emas, butun text ichidan qidiradi
            result = result.replace(wordRe, markFn);
        }
    });

    return result;
};