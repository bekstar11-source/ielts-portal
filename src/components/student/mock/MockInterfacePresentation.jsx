/**
 * Imtihon interfeysi haqida qisqa ma'lumot.
 *
 * Ilgari bu yerda avtomatik aylanadigan, soxta kursor va to'lqinlar bilan
 * animatsiyalangan 570 qatorlik "brauzer" simulyatsiyasi bor edi: u sahifadagi
 * asosiy ishdan (imtihonni boshlash) diqqatni tortardi va bir nechta doimiy
 * `setInterval` ushlab turardi. Endi bu — sokin, statik va o'qish uchun
 * qulay ro'yxat; matn to'liq tarjima qatlamidan keladi.
 */

import React from 'react';
import { BookOpen, Headphones, PencilSimple, Timer } from '@phosphor-icons/react';
import { CARD_CLS, MUTED_CLS } from './mockHelpers';

const MODULES = [
    { id: 'reading', icon: BookOpen },
    { id: 'listening', icon: Headphones },
    { id: 'writing', icon: PencilSimple },
    { id: 'tools', icon: Timer },
];

export default function MockInterfacePresentation({ t }) {
    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-warm-title-sm font-medium">{t('mock.interfaceTitle')}</h2>
                <p className={`text-[13px] mt-1 max-w-2xl ${MUTED_CLS}`}>{t('mock.interfaceSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULES.map(({ id, icon: Icon }) => {
                    const module = t(`mock.interfaceModules.${id}`);
                    const features = Array.isArray(module?.features) ? module.features : [];

                    return (
                        <article key={id} className={`${CARD_CLS} p-5`}>
                            <div className="flex items-center gap-2.5">
                                <Icon size={18} className="text-warm-primary" />
                                <h3 className="text-[15px] font-medium">{module?.title || id}</h3>
                            </div>
                            <p className={`text-[13px] mt-2 leading-relaxed ${MUTED_CLS}`}>{module?.desc}</p>
                            <ul className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] ${MUTED_CLS}`}>
                                {features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-warm-primary/60" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
