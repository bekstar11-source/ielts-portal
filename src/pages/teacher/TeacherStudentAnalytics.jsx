// Ustoz uchun o'quvchi tahlili.
//
// Ustoz "guruhda kim orqada" degan savolga guruh statistikasidan javob oladi,
// lekin "NEGA orqada" degan savolga javob shu paytgacha faqat o'quvchining
// o'zida bor edi. Bu sahifa o'sha tahlilni ustozga ochadi.
//
// NARXI: bitta callable chaqiruvi (server ichida ikkita o'qish). Bo'limlarning
// hammasi jamlanmadan chiziladi, ya'ni o'quvchi soni ortsa ham narx chiziqli.
//
// NEGA CALLABLE: `analyticsSummaries` ustozga TO'G'RIDAN-TO'G'RI ochilmagan.
// "Bu o'quvchi shu ustozning guruhidami" degan shartni Firestore qoidalarida
// ifodalab bo'lmaydi (qoida so'rov yubora olmaydi), shuning uchun tekshiruv
// `getStudentAnalytics` ichida — server tomonda — bajariladi.
//
// XATOLAR JURNALI YO'Q — ATAYLAB: u `users/{uid}/mistakeSessions` dan o'qiladi
// va u yerga ustozning ruxsati yo'q (firestore.rules: faqat egasi va admin).
// Ruxsatni kengaytirish o'rniga bo'lim tashlab ketildi: ustozga xatolarning
// TASNIFI kerak ("imlo 40%"), har bir javobning o'zi emas.

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { ChevronLeft } from 'lucide-react';

import { useTranslation } from '../../context/LanguageContext';
import { useStudentAnalytics } from '../../hooks/useStudentAnalytics';
import { functions } from '../../firebase/firebase';

import AccuracyByType from '../../components/student/analytics/AccuracyByType';
import TrendStrip from '../../components/student/analytics/TrendStrip';
import PatternBreakdown from '../../components/student/analytics/PatternBreakdown';
import PartHeatmap from '../../components/student/analytics/PartHeatmap';
import ProductiveSkills from '../../components/student/analytics/ProductiveSkills';

/** Jamlanma + o'quvchi ismi. Guruh a'zoligi serverda tekshiriladi. */
function useTeacherStudentAnalytics(studentId) {
  return useQuery({
    queryKey: ['teacherStudentAnalytics', studentId],
    enabled: !!studentId,
    staleTime: 1000 * 60 * 15,
    // Ruxsat yo'q bo'lsa qayta urinish behuda — javob o'zgarmaydi.
    retry: 0,
    queryFn: async () => {
      const call = httpsCallable(functions, 'getStudentAnalytics');
      const response = await call({ studentId });
      return response?.data || null;
    }
  });
}

export default function TeacherStudentAnalytics() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, isLoading, error } = useTeacherStudentAnalytics(studentId);
  const profile = data?.student || null;

  // Bo'limlar `hasPro` bayrog'ini talab qiladi. Ustoz uchun u har doim ochiq:
  // qulf o'quvchining OBUNASIGA tegishli, ustozning ko'rish huquqiga emas.
  const analytics = useStudentAnalytics(
    { uid: studentId },
    { targetBand: profile?.targetBand || null, summary: data?.summary || null }
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-warm-hairline border-t-warm-primary dark:border-white/10 dark:border-t-warm-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="group mb-5 inline-flex items-center gap-1 text-sm font-medium text-warm-muted transition-colors hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark"
      >
        <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        {t('analytics.back')}
      </button>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-warm-ink dark:text-warm-on-dark md:text-3xl">
          {profile?.fullName || t('teacherAnalytics.unknownStudent')}
        </h1>
        <p className="mt-2 text-sm text-warm-muted dark:text-warm-on-dark-soft">
          {t('teacherAnalytics.subtitle')}
        </p>
      </header>

      {error ? (
        <p className="mt-8 rounded-xl border border-warm-error/20 bg-warm-error/[0.06] px-5 py-6 text-sm text-warm-body dark:text-warm-on-dark">
          {t('teacherAnalytics.noAccess')}
        </p>
      ) : analytics.testsAnalyzed === 0 ? (
        <p className="mt-8 rounded-xl border border-warm-hairline bg-white px-5 py-6 text-sm text-warm-muted dark:border-white/10 dark:bg-warm-dark-elevated dark:text-warm-on-dark-soft">
          {t('teacherAnalytics.noData')}
        </p>
      ) : (
        <div className="mt-7 space-y-5 md:space-y-6">
          <AccuracyByType analytics={analytics} hasPro />
          <TrendStrip analytics={analytics} hasPro readOnly />
          <PatternBreakdown analytics={analytics} hasPro readOnly />
          <PartHeatmap analytics={analytics} hasPro />
          <ProductiveSkills analytics={analytics} hasPro />
        </div>
      )}
    </div>
  );
}
