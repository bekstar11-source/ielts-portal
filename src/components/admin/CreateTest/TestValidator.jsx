import React, { useState } from 'react';

export function runValidation(testData) {
    const errors = [];
    const warnings = [];

    if (!testData) return { errors, warnings };

    // 1. Basic Info
    if (!testData.title || !testData.title.trim()) {
        errors.push({ id: 'title-empty', message: "Test nomi (title) kiritilmagan", category: 'Umumiy ma\'lumotlar' });
    }
    if (!testData.type) {
        errors.push({ id: 'type-empty', message: "Test turi (type) tanlanmagan", category: 'Umumiy ma\'lumotlar' });
    }
    if (!testData.difficulty) {
        warnings.push({ id: 'difficulty-empty', message: "Qiyinchilik darajasi (difficulty) tanlanmagan. Default: 'medium'", category: 'Umumiy ma\'lumotlar' });
    }

    const type = testData.type || '';

    // 2. Passages / Parts
    const passages = testData.passages || [];
    if (type === 'reading') {
        if (passages.length !== 3) {
            warnings.push({ 
                id: 'reading-passage-count', 
                message: `Standard Reading testida 3 ta passage bo'lishi kerak. Hozirda: ${passages.length} ta`, 
                category: 'Passage-lar' 
            });
        }
        passages.forEach((p, idx) => {
            const num = idx + 1;
            if (!p.title || !p.title.trim()) {
                errors.push({ id: `reading-p${num}-title`, message: `Passage ${num}: Nomi kiritilmagan`, category: 'Passage-lar' });
            }
            if (!p.content || !p.content.trim()) {
                errors.push({ id: `reading-p${num}-content`, message: `Passage ${num}: Matni (content) kiritilmagan`, category: 'Passage-lar' });
            } else if (p.content.trim().length < 200) {
                warnings.push({ id: `reading-p${num}-content-short`, message: `Passage ${num}: Matni juda qisqa (${p.content.trim().length} ta belgi)`, category: 'Passage-lar' });
            }
        });
    } else if (type === 'listening') {
        if (passages.length !== 4) {
            warnings.push({ 
                id: 'listening-passage-count', 
                message: `Standard Listening testida 4 ta part bo'lishi kerak. Hozirda: ${passages.length} ta`, 
                category: 'Part-lar' 
            });
        }

        // Check overall audio
        if (!testData.audio_url && passages.some(p => !p.audio)) {
            errors.push({ id: 'listening-no-audio', message: "Listening testi uchun audio kiritilmagan (yagona audio_url yoki har bir part uchun alohida audio yuklang)", category: 'Media & Audio' });
        }

        passages.forEach((p, idx) => {
            const num = idx + 1;
            if (!p.title || !p.title.trim()) {
                errors.push({ id: `listening-p${num}-title`, message: `Part ${num}: Nomi kiritilmagan`, category: 'Part-lar' });
            }
            // Script check
            if (!p.content || !p.content.trim()) {
                warnings.push({ id: `listening-p${num}-content`, message: `Part ${num}: Script (tapescript) kiritilmagan. Audio matni talab qilinadi.`, category: 'Part-lar' });
            }

            // Audio checks
            if (!testData.audio_url && !p.audio) {
                errors.push({ id: `listening-p${num}-audio`, message: `Part ${num}: Audio fayli kiritilmagan`, category: 'Media & Audio' });
            }
        });
    }

    // 3. Questions and Answers
    const questions = testData.questions || [];
    
    // Flatten helper to extract all actual questions
    const allQuestions = [];
    const checkGroupQuestions = (group, gIdx) => {
        const passageId = group.passageId;
        // Every group should specify which passage/part it belongs to
        if (passageId === undefined || passageId === null || passageId === '') {
            errors.push({ 
                id: `group-${gIdx}-missing-passageid`, 
                message: `Savollar Guruhi #${gIdx + 1} (${group.type || 'noma\'lum'}): passageId kiritilmagan (savollar interfeysda ko'rinmaydi!)`, 
                category: 'Savollar Tuzilishi' 
            });
        } else {
            // Verify if passageId matches an actual passage
            const hasMatchingPassage = passages.some(p => String(p.id) === String(passageId));
            if (!hasMatchingPassage) {
                errors.push({ 
                    id: `group-${gIdx}-invalid-passageid`, 
                    message: `Savollar Guruhi #${gIdx + 1}: passageId "${passageId}" mos keluvchi passage/part topilmadi (id-lar mosligini tekshiring)`, 
                    category: 'Savollar Tuzilishi' 
                });
            }
        }

        // Layout checks for groups
        const typeLower = (group.type || '').toLowerCase();
        if (typeLower === 'map_labeling' || typeLower === 'map') {
            if (!group.image) {
                errors.push({ 
                    id: `group-${gIdx}-missing-image`, 
                    message: `Map/Diagram guruhi uchun xarita rasmi (image) kiritilmagan`, 
                    category: 'Dizayn & Kontent' 
                });
            }
        }

        const items = group.items || group.questions || [];
        if (items.length === 0 && !group.groups) {
            warnings.push({ 
                id: `group-${gIdx}-empty-items`, 
                message: `Savollar Guruhi #${gIdx + 1} (${group.type || 'noma\'lum'}): ichida birorta ham savol elementi yo'q`, 
                category: 'Savollar Tuzilishi' 
            });
        }

        items.forEach(q => {
            allQuestions.push({ q, group });
        });

        if (group.groups && Array.isArray(group.groups)) {
            group.groups.forEach(sub => {
                const subItems = sub.items || sub.questions || [];
                subItems.forEach(q => {
                    allQuestions.push({ q, group, subGroup: sub });
                });
            });
        }
    };

    questions.forEach((group, gIdx) => checkGroupQuestions(group, gIdx));

    // Check total count of questions
    if (type === 'reading' || type === 'listening') {
        if (allQuestions.length !== 40) {
            warnings.push({ 
                id: 'question-total-count', 
                message: `Standard testda 40 ta savol bo'lishi kerak. Hozirgi jami savollar: ${allQuestions.length} ta`, 
                category: 'Savollar Tuzilishi' 
            });
        }
    }

    // Check duplicate/missing question IDs
    const questionIds = allQuestions.map(item => item.q.id).filter(id => id !== undefined && id !== null && id !== '');
    const duplicateIds = questionIds.filter((id, index) => questionIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        const uniqueDups = Array.from(new Set(duplicateIds));
        errors.push({ 
            id: 'duplicate-question-ids', 
            message: `Quyidagi savol raqamlari takrorlangan: ${uniqueDups.join(', ')}`, 
            category: 'Savollar Tuzilishi' 
        });
    }

    // Verify individual questions
    allQuestions.forEach(({ q, group }) => {
        const qId = q.id || 'Noma\'lum';
        const answer = q.answer || q.correct_answer || q.correctAnswer || q.correct_answer_value;

        // Check if answer is missing
        if (answer === undefined || answer === null || String(answer).trim() === '') {
            errors.push({ 
                id: `q-${qId}-missing-answer`, 
                message: `Savol ${qId}: Javob kaliti (answer) kiritilmagan`, 
                category: 'Javoblar (Answers)' 
            });
        }

        // Check for typos in TFNG / YNNG questions
        const groupTypeLower = (group.type || '').toLowerCase();
        if (groupTypeLower.includes('true') || groupTypeLower.includes('yes_no') || groupTypeLower.includes('tfng') || groupTypeLower.includes('ynng')) {
            const validTFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
            const validYNNG = ['YES', 'NO', 'NOT GIVEN'];
            const upperAns = String(answer || '').toUpperCase().trim();
            
            if (groupTypeLower.includes('true') || groupTypeLower.includes('tfng')) {
                if (!validTFNG.includes(upperAns)) {
                    errors.push({
                        id: `q-${qId}-invalid-tfng`,
                        message: `Savol ${qId}: True/False/Not Given javobi noto'g'ri: "${answer}". Faqat TRUE, FALSE yoki NOT GIVEN bo'lishi kerak.`,
                        category: 'Javoblar (Answers)'
                    });
                }
            } else {
                if (!validYNNG.includes(upperAns)) {
                    errors.push({
                        id: `q-${qId}-invalid-ynng`,
                        message: `Savol ${qId}: Yes/No/Not Given javobi noto'g'ri: "${answer}". Faqat YES, NO yoki NOT GIVEN bo'lishi kerak.`,
                        category: 'Javoblar (Answers)'
                    });
                }
            }
        }

        // Multiple choice options check
        if (groupTypeLower.includes('multiple') || groupTypeLower.includes('choice') || groupTypeLower.includes('mcq')) {
            const options = q.options || group.options || [];
            if (options.length < 2) {
                errors.push({
                    id: `q-${qId}-mcq-options-count`,
                    message: `Savol ${qId}: Multiple choice savolida variantlar (options) kamida 2 ta bo'lishi kerak`,
                    category: 'Savollar Tuzilishi'
                });
            } else {
                // Check if answer is in option labels
                const getOptLabel = (opt, idx) => {
                    if (typeof opt === 'object' && opt !== null) {
                        return String(opt.label || '').toUpperCase().trim();
                    }
                    const str = String(opt || '').trim();
                    const match = str.match(/^([A-Z])[\.\)\s]/i);
                    if (match) {
                        return match[1].toUpperCase();
                    }
                    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                    return letters[idx] || 'A';
                };

                const getOptText = (opt) => {
                    if (typeof opt === 'object' && opt !== null) {
                        return String(opt.text || '').toUpperCase().trim();
                    }
                    const str = String(opt || '').trim();
                    const match = str.match(/^[A-Z][\.\)\s]\s*(.*)$/i);
                    return (match ? match[1] : str).toUpperCase().trim();
                };

                const cleanAnswerKey = (ans) => {
                    const str = String(ans || '').trim();
                    const match = str.match(/^([A-Z])[\.\)\s]/i);
                    if (match) return match[1].toUpperCase();
                    if (str.length === 1 && /^[A-Z]$/i.test(str)) return str.toUpperCase();
                    return '';
                };

                const optionLabels = options.map((opt, idx) => getOptLabel(opt, idx));
                const optionTexts = options.map(opt => getOptText(opt));
                
                const cleanedAnsKey = cleanAnswerKey(answer);
                const upperAns = String(answer || '').toUpperCase().trim();

                let isFound = false;
                if (cleanedAnsKey && optionLabels.includes(cleanedAnsKey)) {
                    isFound = true;
                } else if (optionLabels.includes(upperAns)) {
                    isFound = true;
                } else {
                    const cleanedAnsText = String(answer || '').replace(/^[A-Z][\.\)\s]\s*/i, '').toUpperCase().trim();
                    isFound = optionTexts.some(txt => txt && (txt === upperAns || txt === cleanedAnsText));
                }

                if (!isFound) {
                    errors.push({
                        id: `q-${qId}-mcq-answer-mismatch`,
                        message: `Savol ${qId}: Javob kaliti "${answer}" kiritilgan variantlar (${optionLabels.join(', ')}) orasida topilmadi`,
                        category: 'Javoblar (Answers)'
                    });
                }
            }
        }

        // Question text
        if (groupTypeLower.includes('multiple') || groupTypeLower.includes('choice') || groupTypeLower.includes('mcq')) {
            if (!q.text || !q.text.trim()) {
                warnings.push({
                    id: `q-${qId}-missing-text`,
                    message: `Savol ${qId}: Savol matni (text) kiritilmagan`,
                    category: 'Savollar Tuzilishi'
                });
            }
        }
    });

    return { errors, warnings };
}

export default function TestValidator({ testData, isDark }) {
    const [isOpen, setIsOpen] = useState(true);
    const { errors, warnings } = runValidation(testData);

    const totalIssues = errors.length + warnings.length;

    return (
        <div className={`border rounded-2xl p-4 transition-all duration-300 ${
            isDark 
                ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md shadow-xl' 
                : 'bg-white border-gray-200 shadow-md'
        }`}>
            {/* Header */}
            <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        errors.length > 0 
                            ? 'bg-red-500/10 text-red-500' 
                            : warnings.length > 0 
                                ? 'bg-amber-500/10 text-amber-500' 
                                : 'bg-green-500/10 text-green-500'
                    }`}>
                        {errors.length > 0 ? (
                            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        ) : warnings.length > 0 ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-tight uppercase">Test Sifat Kontroli</h3>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-0.5">
                            {errors.length > 0 
                                ? `${errors.length} ta xato aniqlandi` 
                                : warnings.length > 0 
                                    ? `${warnings.length} ta kamchilik` 
                                    : 'Muammolar topilmadi'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Gauge badge */}
                    {totalIssues > 0 ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            errors.length > 0 
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                            {totalIssues} ta ogohlantirish
                        </span>
                    ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                            100% Tayyor
                        </span>
                    )}

                    <svg 
                        className={`w-4 h-4 opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Expandable Area */}
            {isOpen && (
                <div className="mt-4 pt-3 border-t border-dashed border-gray-500/10 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {totalIssues === 0 ? (
                        <div className="py-4 text-center">
                            <div className="inline-flex w-12 h-12 rounded-full bg-green-500/10 text-green-500 items-center justify-center mb-2">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-xs font-semibold opacity-70">Hech qanday xato yoki kamchilik topilmadi.</p>
                            <p className="text-[10px] opacity-40 mt-1">Ushbu test IELTS standartlariga mos keladi.</p>
                        </div>
                    ) : (
                        <>
                            {/* Errors */}
                            {errors.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        Kritik Xatolar ({errors.length})
                                    </h4>
                                    <div className="space-y-1.5 pl-3 border-l border-red-500/20">
                                        {errors.map((err) => (
                                            <div 
                                                key={err.id} 
                                                className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
                                                    isDark ? 'bg-red-500/5 text-red-200' : 'bg-red-500/5 text-red-800'
                                                }`}
                                            >
                                                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <span className="font-bold uppercase tracking-wider text-[9px] opacity-60 mr-1.5">
                                                        [{err.category}]
                                                    </span>
                                                    <span>{err.message}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warnings */}
                            {warnings.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        Ogohlantirish va Kamchiliklar ({warnings.length})
                                    </h4>
                                    <div className="space-y-1.5 pl-3 border-l border-amber-500/20">
                                        {warnings.map((warn) => (
                                            <div 
                                                key={warn.id} 
                                                className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
                                                    isDark ? 'bg-amber-500/5 text-amber-200' : 'bg-amber-500/5 text-amber-800'
                                                }`}
                                            >
                                                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div>
                                                    <span className="font-bold uppercase tracking-wider text-[9px] opacity-60 mr-1.5">
                                                        [{warn.category}]
                                                    </span>
                                                    <span>{warn.message}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
