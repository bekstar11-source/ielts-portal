// Xatolar jurnali — "qaysi savolda, nima deb yozgan, to'g'risi nima edi".
//
// Foizlar umumiy manzarani beradi, lekin o'quvchi aynan shu ro'yxatdan o'rganadi:
// o'z javobini to'g'ri javob yonida ko'rish — eng qisqa fikrlash yo'li.
//
// Ro'yxat sana bo'yicha yangi'dan eski'ga saralangan va savol turi / xato sababi
// bo'yicha filtrlanadi, chunki 200 ta xatoni tartibsiz ko'rsatish — hech nima
// ko'rsatmaslik bilan teng.
//
// YUKLASH: sahifadagi boshqa bo'limlardan farqli, bu ro'yxat jamlanmada emas —
// uni chizish uchun Firestore'dan qo'shimcha hujjatlar kerak. Shuning uchun
// so'rov bo'lim ekranga yaqinlashgandagina yuboriladi: pastgacha aylantirmagan
// foydalanuvchi uchun sahifa narxi bitta o'qish bo'lib qoladi.

import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, ArrowRight, Sparkles } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { useInView } from '../../../hooks/useInView';
import { Card, CardHeader, ProBadge, ProCurtain, EmptyState } from './ui';
import { formatShortDate } from './format';

/** Bir marta ko'rsatiladigan xatolar soni — qolgani "yana ko'rsatish" bilan ochiladi. */
const PAGE_SIZE = 12;

const TEASER_ROWS = [
  { key: 't1', family: 'completion', pattern: 'spelling', userText: 'goverment', correctText: 'government', testTitle: 'Cambridge 18 · Test 2' },
  { key: 't2', family: 'true_false_ng', pattern: 'ng_overclaim', userText: 'TRUE', correctText: 'NOT GIVEN', testTitle: 'Cambridge 18 · Test 2' },
  { key: 't3', family: 'completion', pattern: 'singular_plural', userText: 'child', correctText: 'children', testTitle: 'Cambridge 17 · Test 4' },
  { key: 't4', family: 'headings', pattern: 'wrong_option', userText: 'iv', correctText: 'vii', testTitle: 'Cambridge 17 · Test 4' },
  { key: 't5', family: 'completion', pattern: 'extra_words', userText: 'the local museum', correctText: 'museum', testTitle: 'Listening Test 9' }
];

function FilterChip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-warm-ink bg-warm-ink text-white dark:border-warm-on-dark dark:bg-warm-on-dark dark:text-warm-dark'
          : 'border-warm-hairline bg-white text-warm-body hover:border-warm-muted-soft dark:border-white/10 dark:bg-transparent dark:text-warm-on-dark-soft'
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`tabular-nums ${active ? 'opacity-70' : 'text-warm-muted-soft'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function MistakeRow({ row, t, lang }) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="max-w-full truncate rounded-md bg-warm-error/[0.08] px-2 py-1 text-sm font-semibold text-warm-error line-through decoration-warm-error/40">
          {row.userText || t('analytics.blankAnswer')}
        </span>
        <ArrowRight size={13} className="shrink-0 text-warm-muted-soft" />
        <span className="max-w-full truncate rounded-md bg-warm-success/[0.08] px-2 py-1 text-sm font-semibold text-warm-success">
          {row.correctText}
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-warm-muted dark:text-warm-on-dark-soft">
        <span className="font-semibold text-warm-body dark:text-warm-on-dark-soft">
          {t(`mistakePatterns.${row.pattern}.label`)}
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="max-w-[14rem] truncate">
          {t(`questionTypes.${row.family}`)}
        </span>
        {row.testTitle && (
          <>
            <span className="hidden sm:inline">·</span>
            <span className="max-w-[14rem] truncate">{row.testTitle}</span>
          </>
        )}
        {row.date && (
          <>
            <span className="hidden sm:inline">·</span>
            <span className="tabular-nums">{formatShortDate(row.date, lang)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function MistakeLog({ analytics, hasPro }) {
  const { t, lang } = useTranslation();
  const [familyFilter, setFamilyFilter] = useState('all');
  const [patternFilter, setPatternFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { mistakes, loadMistakes, mistakesLoading, hasMoreMistakes, loadMoreMistakes } = analytics;

  // Bo'lim ko'rinishga yaqinlashganda birinchi sahifa so'raladi.
  const [sectionRef, inView] = useInView();
  useEffect(() => {
    if (inView && hasPro) loadMistakes();
  }, [inView, hasPro, loadMistakes]);

  // Filtr tugmalarida son ko'rsatiladi — o'quvchi bosishdan oldin nima borligini biladi.
  const familyCounts = useMemo(() => {
    const map = new Map();
    mistakes.forEach((m) => map.set(m.family, (map.get(m.family) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  const patternCounts = useMemo(() => {
    const map = new Map();
    mistakes.forEach((m) => map.set(m.pattern, (map.get(m.pattern) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  const filtered = useMemo(
    () =>
      mistakes.filter(
        (m) =>
          (familyFilter === 'all' || m.family === familyFilter) &&
          (patternFilter === 'all' || m.pattern === patternFilter)
      ),
    [mistakes, familyFilter, patternFilter]
  );

  const resetTo = (setter) => (value) => {
    setter(value);
    setVisible(PAGE_SIZE);
  };

  const body = (rows) => (
    <div className="divide-y divide-warm-hairline px-6 pb-2 dark:divide-white/10 md:px-8">
      {rows.map((row) => (
        <MistakeRow key={row.key} row={row} t={t} lang={lang} />
      ))}
    </div>
  );

  // Ro'yxat so'ralgan, lekin hali kelmagan. Bo'lim balandligi saqlanadi —
  // aks holda yuklanish tugagach sahifa sakrab ketardi.
  const pending = mistakesLoading && mistakes.length === 0;

  return (
    <div ref={sectionRef}>
    <Card>
      <CardHeader
        icon={ClipboardList}
        title={t('analytics.logTitle')}
        hint={t('analytics.logHint')}
        badge={<ProBadge />}
      />

      {!hasPro ? (
        <ProCurtain title={t('analytics.lockedLogTitle')}>
          {body(TEASER_ROWS)}
          <div className="h-6" />
        </ProCurtain>
      ) : !analytics.hasMistakeData ? (
        <EmptyState
          icon={Sparkles}
          title={t('analytics.emptyMistakesTitle')}
          subtitle={t('analytics.emptyMistakesSubtitle')}
        />
      ) : pending ? (
        <div className="space-y-3 px-6 pb-8 md:px-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-warm-surface dark:bg-white/5"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 px-6 pb-5 md:px-8">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={familyFilter === 'all'}
                onClick={() => resetTo(setFamilyFilter)('all')}
                count={mistakes.length}
              >
                {t('analytics.allTypes')}
              </FilterChip>
              {familyCounts.map(([family, count]) => (
                <FilterChip
                  key={family}
                  active={familyFilter === family}
                  onClick={() => resetTo(setFamilyFilter)(family)}
                  count={count}
                >
                  {t(`questionTypes.${family}`)}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={patternFilter === 'all'}
                onClick={() => resetTo(setPatternFilter)('all')}
              >
                {t('analytics.allReasons')}
              </FilterChip>
              {patternCounts.map(([pattern, count]) => (
                <FilterChip
                  key={pattern}
                  active={patternFilter === pattern}
                  onClick={() => resetTo(setPatternFilter)(pattern)}
                  count={count}
                >
                  {t(`mistakePatterns.${pattern}.label`)}
                </FilterChip>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t('analytics.noMatchTitle')}
              subtitle={t('analytics.noMatchSubtitle')}
            />
          ) : (
            body(filtered.slice(0, visible))
          )}

          {(filtered.length > visible || hasMoreMistakes) && (
            <div className="px-6 pb-6 pt-4 md:px-8">
              <button
                type="button"
                disabled={mistakesLoading}
                onClick={() => {
                  // Avval allaqachon yuklangan xatolarni ko'rsatamiz; ular tugagach
                  // Firestore'dan keyingi sahifa olinadi. Shu tartib tufayli
                  // "Yana ko'rsatish" ko'pincha umuman o'qish talab qilmaydi.
                  if (filtered.length > visible) setVisible((v) => v + PAGE_SIZE);
                  else loadMoreMistakes();
                }}
                className="w-full rounded-xl border border-warm-hairline py-2.5 text-sm font-semibold text-warm-body transition-colors hover:bg-warm-surface disabled:opacity-50 dark:border-white/10 dark:text-warm-on-dark-soft dark:hover:bg-white/5"
              >
                {mistakesLoading
                  ? t('analytics.loadingMore')
                  : filtered.length > visible
                    ? `${t('analytics.showMore')} (${filtered.length - visible})`
                    : t('analytics.showMore')}
              </button>
            </div>
          )}

          {filtered.length > 0 && filtered.length <= visible && !hasMoreMistakes && (
            <div className="h-4" />
          )}
        </>
      )}
    </Card>
    </div>
  );
}
