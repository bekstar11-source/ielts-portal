/**
 * Hero ostidagi ro'yxat qatori: ism + qarz va jarima yorliqlari.
 *
 * Qatorlar hero yig'ilishining "yoqilg'isi" — shuning uchun ular oddiy va
 * yengil: hech qanday holat, hech qanday hisob-kitob yo'q.
 */

import React from 'react';

import { useTranslation } from '../../../context/LanguageContext';

export default function StudentDebtRow({ student, onClick }) {
    const { t } = useTranslation();
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-[11px] text-left ${
                onClick ? 'cursor-pointer transition-colors hover:bg-[#faf8f5] outline-none focus-visible:ring-2 focus-visible:ring-[#f2683c]' : ''
            }`}
        >
            <span className="flex-1 min-w-0 truncate text-sm font-medium text-[#17171a]">
                {student.name}
            </span>
            <span className="flex-none rounded-full bg-[#f1eee9] px-[9px] py-1 text-[11px] font-semibold text-[#57534e] tabular-nums">
                {student.qarz} {t('teacher.groupDetail.debtShort')}
            </span>
            <span className="flex-none rounded-full bg-[#f2683c] px-[9px] py-1 text-[11px] font-semibold text-white tabular-nums">
                {student.jarima} {t('teacher.groupDetail.fineShort')}
            </span>
        </Tag>
    );
}
