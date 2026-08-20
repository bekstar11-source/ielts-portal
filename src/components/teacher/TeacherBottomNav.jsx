/**
 * Ustoz uchun mobil navigatsiya.
 *
 * Ilgari bu yerda o'quvchi menyusi (`BottomNav`) turardi: "Home" tugmasi
 * `/dashboard` ga, ya'ni ustozni butun panelidan tashqariga olib chiqib
 * ketardi, "Library"/"WordBank" esa uning ishiga umuman aloqador emas edi.
 * Telefonda ustozning yagona navigatsiyasi shu qator bo'lgani uchun undagi
 * havolalar ham aynan ustozning ish oqimiga tegishli.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChartBar, House, NotePencil, ClipboardText } from '@phosphor-icons/react';
import { useTranslation } from '../../context/LanguageContext';

export default function TeacherBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const items = [
        { id: 'dashboard', label: t('teacher.nav.dashboard'), path: '/teacher', icon: House, exact: true },
        { id: 'groups', label: t('teacher.nav.sections.groups'), path: '/teacher/group-stats', icon: ChartBar },
        { id: 'tests', label: t('teacher.nav.tests'), path: '/teacher/tests', icon: BookOpen },
        { id: 'review', label: t('teacher.nav.sections.review'), path: '/teacher/writing-review', icon: NotePencil },
        { id: 'results', label: t('teacher.nav.results'), path: '/teacher/results', icon: ClipboardText },
    ];

    const isActive = (item) => (item.exact
        ? location.pathname === item.path || location.pathname === `${item.path}/`
        : location.pathname.startsWith(item.path));

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 py-2 pb-[safe-area-inset-bottom] bg-warm-canvas dark:bg-warm-dark border-t border-warm-hairline dark:border-white/5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <div className="flex justify-around items-center w-full max-w-md mx-auto">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.path)}
                            aria-current={active ? 'page' : undefined}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 ${
                                active
                                    ? 'text-warm-primary dark:text-white'
                                    : 'text-warm-muted-soft dark:text-warm-on-dark-soft'
                            }`}
                        >
                            <Icon size={20} weight={active ? 'fill' : 'regular'} />
                            <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
