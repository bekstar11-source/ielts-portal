// Xatolar ustida mashq.
//
// Analitika sahifasi "yaqin marra xatolaringiz sizga 0.5 band turdi" deb aytadi.
// Bu sahifa o'sha va'dani bajaradigan yagona joy: aynan o'sha xatolarni mashq
// qiladi va yangi kontent talab qilmaydi — mashq o'quvchining o'z xatolaridan
// yig'iladi.
//
// KO'RSATISH TARTIBI ATAYLAB SHUNDAY
// ──────────────────────────────────
// Avval TO'G'RI shakl ko'rsatiladi, so'ng yashiriladi va yozib berish so'raladi.
// Teskarisi — "goverment" ni ko'rsatib "to'g'risi nima?" deb so'rash — noto'g'ri
// yozuvni ko'z xotirasida mustahkamlaydi. O'quvchining o'z xato varianti faqat
// javobdan KEYIN, taqqoslash uchun ko'rsatiladi.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, X, Eye, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { useMistakeDrill } from '../../hooks/useMistakeDrill';
import { getTier, isStaff } from '../../utils/subscription';

import DashboardHeader from '../../components/dashboard/DashboardHeader';
import SiteFooter from '../../components/common/SiteFooter';

/** To'g'ri shakl necha soniya ko'rsatiladi. */
const PEEK_MS = 2500;

function Shell({ user, userData, children }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-warm-canvas font-sans dark:bg-warm-dark">
      <DashboardHeader user={user} userData={userData} />
      <main className="mx-auto max-w-2xl px-5 py-10 md:px-6 md:py-16">
        <button
          type="button"
          onClick={() => navigate('/analytics')}
          className="group mb-6 inline-flex items-center gap-1 text-sm font-medium text-warm-muted transition-colors hover:text-warm-ink dark:text-warm-on-dark-soft dark:hover:text-warm-on-dark"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          {t('drill.backToAnalytics')}
        </button>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Mashq boshlanishidan oldingi ekran. */
function StartScreen({ drill, t, onStart }) {
  return (
    <div className="rounded-2xl border border-warm-hairline bg-white p-7 dark:border-white/10 dark:bg-warm-dark-elevated md:p-9">
      <h1 className="text-2xl font-bold tracking-tight text-warm-ink dark:text-warm-on-dark md:text-3xl">
        {t('drill.title')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-warm-muted dark:text-warm-on-dark-soft">
        {t('drill.intro')}
      </p>

      <div className="mt-6 flex flex-wrap gap-6">
        <div>
          <p className="text-3xl font-bold tabular-nums text-warm-primary">{drill.dueCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-warm-muted dark:text-warm-on-dark-soft">
            {t('drill.dueNow')}
          </p>
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums text-warm-ink dark:text-warm-on-dark">
            {drill.totalCount}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-warm-muted dark:text-warm-on-dark-soft">
            {t('drill.totalItems')}
          </p>
        </div>
      </div>

      {drill.dueCount > 0 ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-warm-ink px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-warm-on-dark dark:text-warm-dark dark:hover:bg-white"
        >
          {t('drill.start')}
          <ArrowRight size={15} />
        </button>
      ) : (
        <p className="mt-7 rounded-xl border border-warm-success/20 bg-warm-success/[0.07] px-4 py-3 text-sm font-medium text-warm-body dark:text-warm-on-dark">
          {drill.totalCount > 0 ? t('drill.allDone') : t('drill.nothingYet')}
        </p>
      )}

      {/* Nima uchun hamma xato mashqqa kirmagani ochiq aytiladi — aks holda
          o'quvchi ro'yxatni to'liqsiz deb o'ylaydi. */}
      {drill.skippedCount > 0 && (
        <p className="mt-5 border-t border-warm-hairline pt-4 text-xs leading-relaxed text-warm-muted dark:border-white/10 dark:text-warm-on-dark-soft">
          {t('drill.skippedNote').replace('{count}', drill.skippedCount)}
        </p>
      )}
    </div>
  );
}

/** Bitta savol. */
function Question({ drill, t }) {
  const { current, revealed } = drill;
  // Komponent har element uchun QAYTA YARATILADI (`key={current.key}`), shuning
  // uchun holatni effektda tozalash shart emas — u o'zi boshlang'ich qiymatdan
  // boshlanadi. Effektda `setState` chaqirish ortiqcha qayta chizishga olib
  // kelardi va React buni tavsiya qilmaydi.
  const [peeking, setPeeking] = useState(true);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  // To'g'ri shakl ko'rsatiladi, so'ng yashiriladi.
  useEffect(() => {
    const timer = setTimeout(() => setPeeking(false), PEEK_MS);
    return () => clearTimeout(timer);
  }, []);

  // Yashirilgach kursor maydonga o'tadi — o'quvchi klaviaturaga qo'l uzatmasin.
  useEffect(() => {
    if (!peeking && !revealed) inputRef.current?.focus();
  }, [peeking, revealed]);

  const answer = drill.answers[drill.answers.length - 1];

  return (
    <div className="rounded-2xl border border-warm-hairline bg-white p-7 dark:border-white/10 dark:bg-warm-dark-elevated md:p-9">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-warm-muted-soft">
          {drill.index + 1} / {drill.size}
        </span>
        {current.count > 1 && (
          <span className="rounded-md bg-warm-warning/10 px-2 py-1 text-[10px] font-bold text-warm-warning">
            {t('drill.timesWrong').replace('{count}', current.count)}
          </span>
        )}
      </div>

      <div className="mt-6 min-h-[7rem]">
        {peeking ? (
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-warm-muted dark:text-warm-on-dark-soft">
              <Eye size={13} />
              {t('drill.memorise')}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-warm-ink dark:text-warm-on-dark">
              {current.target}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!revealed) drill.submitAnswer(input);
            }}
          >
            <label
              htmlFor="drill-input"
              className="text-xs font-semibold text-warm-muted dark:text-warm-on-dark-soft"
            >
              {t('drill.typeIt')}
            </label>
            <input
              id="drill-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={revealed}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="mt-2 w-full rounded-xl border border-warm-hairline bg-warm-canvas px-4 py-3 text-lg font-semibold text-warm-ink outline-none transition-colors focus:border-warm-primary disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-warm-on-dark"
            />

            {!revealed && (
              <button
                type="submit"
                className="mt-4 rounded-xl bg-warm-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-warm-on-dark dark:text-warm-dark"
              >
                {t('drill.check')}
              </button>
            )}
          </form>
        )}
      </div>

      {revealed && answer && (
        <div className="mt-5 border-t border-warm-hairline pt-5 dark:border-white/10">
          <p
            className={`inline-flex items-center gap-2 text-sm font-bold ${
              answer.correct ? 'text-warm-success' : 'text-warm-error'
            }`}
          >
            {answer.correct ? <Check size={16} /> : <X size={16} />}
            {answer.correct ? t('drill.correct') : t('drill.wrong')}
          </p>

          {!answer.correct && (
            <p className="mt-3 text-sm text-warm-body dark:text-warm-on-dark">
              <span className="rounded-md bg-warm-success/[0.08] px-2 py-1 font-semibold text-warm-success">
                {current.target}
              </span>
            </p>
          )}

          {/* O'quvchining eski xatosi — faqat shu yerda, javobdan keyin. */}
          {current.userText && (
            <p className="mt-3 text-xs text-warm-muted dark:text-warm-on-dark-soft">
              {t('drill.previously')}{' '}
              <span className="font-semibold text-warm-error line-through decoration-warm-error/40">
                {current.userText}
              </span>
              {current.testTitle && <span> · {current.testTitle}</span>}
            </p>
          )}

          <button
            type="button"
            onClick={drill.next}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-warm-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-warm-on-dark dark:text-warm-dark"
          >
            {drill.index + 1 >= drill.size ? t('drill.finish') : t('drill.next')}
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Yakuniy ekran. */
function ResultScreen({ drill, t, onRestart }) {
  const navigate = useNavigate();
  const wrong = drill.answers.filter((a) => !a.correct);

  return (
    <div className="rounded-2xl border border-warm-hairline bg-white p-7 dark:border-white/10 dark:bg-warm-dark-elevated md:p-9">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-warm-muted-soft">
        {t('drill.sessionDone')}
      </p>
      <p className="mt-3 text-4xl font-bold tabular-nums text-warm-ink dark:text-warm-on-dark">
        {drill.correctCount}/{drill.size}
      </p>

      {wrong.length > 0 && (
        <div className="mt-6 border-t border-warm-hairline pt-5 dark:border-white/10">
          <p className="text-xs font-semibold text-warm-muted dark:text-warm-on-dark-soft">
            {t('drill.repeatSoon')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wrong.map((a) => (
              <span
                key={a.key}
                className="rounded-lg border border-warm-hairline bg-warm-canvas px-2.5 py-1.5 text-xs font-semibold text-warm-body dark:border-white/10 dark:bg-white/5 dark:text-warm-on-dark"
              >
                {a.target}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        {drill.dueCount > 0 && (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-xl bg-warm-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-warm-on-dark dark:text-warm-dark"
          >
            <RotateCcw size={14} />
            {t('drill.again')}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/analytics')}
          className="rounded-xl border border-warm-hairline px-5 py-3 text-sm font-semibold text-warm-body transition-colors hover:bg-warm-surface dark:border-white/10 dark:text-warm-on-dark-soft dark:hover:bg-white/5"
        >
          {t('drill.backToAnalytics')}
        </button>
      </div>
    </div>
  );
}

export default function MistakeDrill() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const drill = useMistakeDrill(user);

  const hasPro = getTier(userData) === 'pro' || isStaff(userData);

  if (!hasPro) {
    return (
      <Shell user={user} userData={userData}>
        <div className="rounded-2xl border border-warm-hairline bg-white p-8 text-center dark:border-white/10 dark:bg-warm-dark-elevated">
          <Sparkles size={22} className="mx-auto text-warm-primary" />
          <h1 className="mt-3 text-xl font-bold text-warm-ink dark:text-warm-on-dark">
            {t('drill.lockedTitle')}
          </h1>
          <p className="mt-2 text-sm text-warm-muted dark:text-warm-on-dark-soft">
            {t('drill.lockedSubtitle')}
          </p>
        </div>
      </Shell>
    );
  }

  if (drill.loading) {
    return (
      <Shell user={user} userData={userData}>
        <div className="flex justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-warm-hairline border-t-warm-primary dark:border-white/10 dark:border-t-warm-primary" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell user={user} userData={userData}>
      {!drill.started ? (
        <StartScreen drill={drill} t={t} onStart={drill.start} />
      ) : drill.finished ? (
        <ResultScreen drill={drill} t={t} onRestart={drill.start} />
      ) : (
        <Question key={drill.current.key} drill={drill} t={t} />
      )}
    </Shell>
  );
}
