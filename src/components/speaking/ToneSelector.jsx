/**
 * Feedback ohangini tanlash: do'st / coach / examiner.
 *
 * Ikki ko'rinishda ishlatiladi:
 *   - `cards`  — javob berishdan OLDIN, `StageRecorder` railida. Har bir
 *                ohang nima berishini tushuntirib turadi, chunki bu tanlov
 *                o'quvchi mikrofonni bosishidan avval qilinadi.
 *   - `inline` — `StageVerdict` da, ohangni almashtirib ko'rish uchun.
 *
 * Baholash faqat tanlangan ohangda yoziladi. Ya'ni `cards` dagi tanlov
 * bepul (javob hali berilmagan), `inline` dagi almashtirish esa birinchi
 * marta qisqa kutish talab qiladi — matn o'sha ohangda yoziladi. Kutish
 * holatini `StageVerdict` ko'rsatadi.
 *
 * `onStage` — sahnada (`StageRecorder` / `StageVerdict`) ishlatilganda.
 * Sahna mavzu sozlamasidan qat'i nazar doim qorong'i, shuning uchun u
 * yerda `dark:` variantlariga tayanib bo'lmaydi: ranglar qat'iy beriladi.
 */

import React from 'react';
import { Smiley, Barbell, ClipboardText } from '@phosphor-icons/react';

import { FEEDBACK_MODES } from '../../services/speechTts';
import { Eyebrow, softSurface, inkText, mutedText } from './ui';

const MODE_ICONS = {
    friend: Smiley,
    coach: Barbell,
    examiner: ClipboardText,
};

const TITLE = {
    uz: 'Kim bo‘lib gaplashsin?',
    en: 'Who are you talking to?',
};

/**
 * @param {object} props
 * @param {string} props.mode
 * @param {'uz'|'en'} [props.lang]
 * @param {(mode: string) => void} props.onChange
 * @param {'cards'|'inline'} [props.variant]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.onStage] - qorong'i sahna ichida
 */
export default function ToneSelector({
    mode,
    lang = 'uz',
    onChange,
    variant = 'cards',
    disabled = false,
    onStage = false,
}) {
    const entries = Object.entries(FEEDBACK_MODES);
    const pick = (config, field) => config[field]?.[lang] || config[field]?.uz || '';

    if (variant === 'inline') {
        const shell = onStage
            ? 'bg-white/[0.05] border-white/[0.08]'
            : 'bg-warm-canvas dark:bg-white/[0.05] border-warm-hairline dark:border-white/[0.05]';
        return (
            <div
                role="radiogroup"
                aria-label={TITLE[lang] || TITLE.uz}
                className={`inline-flex items-center gap-0.5 p-0.5 rounded-full border ${shell}`}
            >
                {entries.map(([key, config]) => {
                    const active = key === mode;
                    const Icon = MODE_ICONS[key];
                    const tone = onStage
                        ? active
                            ? 'bg-white/[0.12] text-white font-medium'
                            : 'text-white/55 hover:text-white'
                        : active
                          ? 'bg-white dark:bg-white/[0.1] text-warm-ink dark:text-warm-on-dark font-medium shadow-sm'
                          : 'text-warm-muted dark:text-warm-on-dark-soft hover:text-warm-ink dark:hover:text-warm-on-dark';
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => onChange(key)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tone}`}
                        >
                            {Icon && <Icon size={14} weight={active ? 'fill' : 'regular'} />}
                            {pick(config, 'label')}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div>
            {!onStage && <Eyebrow>{TITLE[lang] || TITLE.uz}</Eyebrow>}

            <div
                role="radiogroup"
                aria-label={TITLE[lang] || TITLE.uz}
                className={`grid gap-2 ${onStage ? '' : 'mt-3 sm:grid-cols-3'}`}
            >
                {entries.map(([key, config]) => {
                    const active = key === mode;
                    const Icon = MODE_ICONS[key];
                    const shell = onStage
                        ? active
                            ? 'border-[#F0894A]/50 bg-[#F0894A]/[0.12]'
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                        : active
                          ? 'border-warm-primary/50 bg-warm-primary/[0.07]'
                          : `${softSurface} hover:border-warm-primary/30`;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => onChange(key)}
                            className={`text-left rounded-2xl border transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${onStage ? 'p-3' : 'p-3.5'
                                } ${shell}`}
                        >
                            <span className="flex items-center gap-1.5">
                                {Icon && (
                                    <Icon
                                        size={16}
                                        weight={active ? 'fill' : 'regular'}
                                        className={
                                            onStage
                                                ? active
                                                    ? 'text-[#F0A165]'
                                                    : 'text-white/45'
                                                : active
                                                  ? 'text-warm-primary'
                                                  : 'text-warm-muted'
                                        }
                                    />
                                )}
                                <span
                                    className={`text-sm font-medium ${onStage
                                        ? active
                                            ? 'text-[#F0A165]'
                                            : 'text-white/85'
                                        : active
                                          ? 'text-warm-primary'
                                          : inkText
                                        }`}
                                >
                                    {pick(config, 'label')}
                                </span>
                            </span>
                            <span
                                className={`mt-1 block text-[11px] leading-relaxed ${onStage ? 'text-white/40' : mutedText
                                    }`}
                            >
                                {pick(config, 'description')}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
