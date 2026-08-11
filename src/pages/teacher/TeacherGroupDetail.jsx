/**
 * Guruh sahifasi — davomat va qarzdorlik ko'rinishi ("Go English" dizayni, 1a).
 *
 * Sahifa uchta bo'lakdan iborat:
 *   • `GroupHero`        — yig'iladigan qora karta (sticky)
 *   • holat ro'yxati     — tanlangan segmentga tegishli o'quvchilar
 *   • scroll konteyneri  — hero yig'ilishini boshqaradi
 *
 * Scroll oynaniki emas, shu yerdagi konteynerniki. Sabab: `TeacherLayout` da
 * yuqorida turg'un sarlavha bor, oyna scrolli bilan `sticky top-0` uning
 * ostiga kirib ketardi. Ichki konteyner ekranni o'z ichida boshqaradi va
 * dizayndagi mobil oqimni aynan takrorlaydi.
 *
 * MA'LUMOT: hozircha `data/mockGroupAttendance` dan. Firestore'da davomat,
 * qarz va jarima maydonlari hali yo'q — hook paydo bo'lganda faqat shu
 * ikkita chaqiruv almashadi, quyidagi hech narsa o'zgarmaydi.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useTranslation } from '../../context/LanguageContext';
import GroupHero from '../../components/teacher/group/GroupHero';
import { buildCountdown, COLLAPSE_RANGE, HERO_COLORS } from '../../components/teacher/group/heroTokens';
import StudentDebtRow from '../../components/teacher/group/StudentDebtRow';
import {
    buildAttendanceSummary,
    getMockGroup,
    getMockStudents,
} from '../../data/mockGroupAttendance';

/** Sanoq matni har 30 soniyada yangilanadi — daqiqali hisob uchun yetarli. */
const CLOCK_INTERVAL_MS = 30_000;

export default function TeacherGroupDetail() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { groupId } = useParams();

    const group = useMemo(() => getMockGroup(groupId), [groupId]);
    const students = useMemo(() => getMockStudents(groupId), [groupId]);
    const summary = useMemo(() => buildAttendanceSummary(students), [students]);

    const [selected, setSelected] = useState('yozib');
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), CLOCK_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    const countdown = useMemo(
        () => buildCountdown(group.lessonTime, now, t),
        [group.lessonTime, now, t]
    );

    const visible = useMemo(
        () => students.filter((s) => s.status === selected),
        [students, selected]
    );

    /* Scroll → hero. Kadr boshiga bitta yangilanish; `state` ishlatilmaydi,
       chunki har bir kadrda render qilish scrollni sakratadi. */
    const scrollRef = useRef(null);
    const heroRef = useRef(null);
    const rafRef = useRef(0);

    const onScroll = useCallback(() => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            if (scrollRef.current && heroRef.current) {
                heroRef.current.applyCollapse(scrollRef.current.scrollTop);
            }
        });
    }, []);

    useEffect(() => () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, []);

    // Segment almashganda ro'yxat boshidan ko'rinsin, hero esa yozilsin.
    const handleSelect = useCallback((key) => {
        setSelected(key);
        const sc = scrollRef.current;
        if (sc && sc.scrollTop > 0) {
            sc.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const soon = useCallback(() => toast(t('teacher.groupDetail.comingSoon')), [t]);

    return (
        <div
            className="mx-auto w-full max-w-[430px]"
            style={{ fontFamily: 'Archivo, Inter, system-ui, sans-serif' }}
        >
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="relative h-[calc(100dvh-8rem)] overflow-y-auto rounded-[26px] border border-black/[0.08] shadow-sm"
                style={{
                    background: HERO_COLORS.canvas,
                    // Scroll paytida brauzer o'z-o'zidan "anchor" qilib
                    // pozitsiyani tuzatmasin — yig'ilish sakrab ketardi.
                    overflowAnchor: 'none',
                    overscrollBehavior: 'contain',
                }}
            >
                {/* Yig'ilish uchun har doim yetarli scroll masofasi bo'lsin.
                    Ro'yxat qisqa bo'lsa (masalan 4 ta qarzdor) tarkib
                    konteynerga sig'ib qolardi va hero umuman yig'ilmasdi. */}
                <div style={{ minHeight: `calc(100% + ${COLLAPSE_RANGE}px)` }}>
                    <GroupHero
                        ref={heroRef}
                        group={group}
                        summary={summary}
                        selected={selected}
                        onSelect={handleSelect}
                        countdown={countdown}
                        onBack={() => navigate('/teacher/group-stats')}
                        onMenu={soon}
                        onEdit={soon}
                        onTakeAttendance={soon}
                        onOpenFull={() => navigate('/teacher/group-stats?view=students')}
                    />

                    <div className="px-4 pt-4 pb-6">
                        <div className="mb-2.5 flex items-center justify-between gap-3">
                            <span className="text-[13px] font-bold text-[#17171a]">
                                {t(`teacher.groupDetail.listTitle.${selected}`)}
                            </span>
                            <span className="text-xs font-medium text-[#8a8580] tabular-nums">
                                {visible.length} {t('teacher.groupStats.studentsCount')}
                            </span>
                        </div>

                        {visible.length === 0 ? (
                            <p className="rounded-2xl bg-white px-3.5 py-6 text-center text-[13px] text-[#8a8580]">
                                {t('teacher.groupDetail.emptyList')}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {visible.map((student) => (
                                    <StudentDebtRow key={student.id} student={student} onClick={soon} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <p className="mt-3 px-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
                {t('teacher.groupDetail.mockNotice')}
            </p>
        </div>
    );
}
