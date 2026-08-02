/**
 * Kalit tasdiqlangandan keyingi tanlov: hoziroq boshlash yoki sana belgilash.
 */

import React from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import MockModalShell from './MockModalShell';
import { MUTED_CLS } from './mockHelpers';

export default function MockActivatedModal({ open, onClose, t, onStartNow, onScheduleLater }) {
    return (
        <MockModalShell open={open} onClose={onClose} title={t('mock.keyVerified')} closeLabel={t('mock.close')}>
            <div className="px-6 pb-6 pt-3">
                <div className="flex items-start gap-3">
                    <CheckCircle size={22} weight="fill" className="text-warm-success shrink-0 mt-0.5" />
                    <p className={`text-[14px] leading-relaxed ${MUTED_CLS}`}>{t('mock.verifiedPrompt')}</p>
                </div>

                <div className="mt-6 space-y-2">
                    <button
                        type="button"
                        onClick={onStartNow}
                        className="w-full rounded-xl py-3.5 text-[14px] font-medium bg-warm-primary text-warm-on-primary transition-colors hover:bg-warm-primary-active"
                    >
                        {t('mock.startNow')}
                    </button>
                    <button
                        type="button"
                        onClick={onScheduleLater}
                        className="w-full rounded-xl py-3.5 text-[14px] font-medium border border-warm-hairline dark:border-white/10 transition-colors hover:bg-warm-surface dark:hover:bg-white/5"
                    >
                        {t('mock.scheduleLater')}
                    </button>
                </div>
            </div>
        </MockModalShell>
    );
}
