// Writing va Speaking — sahifadagi yetishmayotgan yarim.
//
// O'quvchi to'rtta ko'nikma bo'yicha imtihon topshiradi, tahlil esa shu paytgacha
// ikkitasini ko'rsatardi. Ma'lumot bazada allaqachon bor edi: `checkWriting`
// to'rtta mezon bo'yicha band beradi va aniq tuzatishlar ro'yxatini qaytaradi,
// `evaluateSpeaking` esa shunga o'xshash. Ular jamlanmaga yig'ilardi-yu,
// hech qayerda ko'rinmasdi.
//
// IKKALASI BITTA KARTOCHKADA — ataylab. Tuzilishi bir xil (mezonlar + takroriy
// muammolar), va sahifa allaqachon yetti bo'limdan iborat. Har bir yangi
// funksiyaga alohida karta ajratish sahifani hech kim oxirigacha o'qimaydigan
// ro'yxatga aylantiradi.
//
// NEGA "OXIRGI" EMAS, O'RTACHA BAND: bitta esse bandi juda tebranadi (mavzu
// tanish yoki notanish bo'lishi mumkin). O'rtacha esa ko'nikmaning haqiqiy
// darajasini ko'rsatadi. Shu sabab jamlanmada yig'indi saqlanadi.

import React from 'react';
import { PenTool, Mic, Sparkles } from 'lucide-react';

import { useTranslation } from '../../../context/LanguageContext';
import { Card, CardHeader, ProBadge, ProCurtain, EmptyState } from './ui';
import { accuracyTone } from './format';

/** Qulf ostidagi namunaviy ma'lumot (haqiqiy emas). */
const TEASER = {
  writing: {
    tasks: 6,
    criteria: [
      { name: 'grammar', band: 5.0 },
      { name: 'lexical', band: 5.5 },
      { name: 'taskAchievement', band: 6.0 },
      { name: 'coherence', band: 6.5 }
    ],
    overall: 5.5,
    errorTypes: [
      { type: 'article', count: 22 },
      { type: 'tense', count: 14 },
      { type: 'preposition', count: 9 },
      { type: 'collocation', count: 6 }
    ]
  },
  speaking: {
    tasks: 8,
    criteria: [
      { name: 'grammar', band: 5.0 },
      { name: 'lexical', band: 5.5 },
      { name: 'fluency', band: 6.0 },
      { name: 'pronunciation', band: 6.5 }
    ],
    overall: 5.5,
    fixes: [
      { correctText: 'I have been living', count: 3 },
      { correctText: 'much more difficult', count: 2 }
    ]
  }
};

/**
 * Band 9 ballik shkalada, aniqlik esa 100 ballik — `accuracyTone` ikkalasi uchun
 * bir xil ishlashi kerak, aks holda sahifada bitta rang ikki xil ma'no bildiradi.
 * Shuning uchun band foizga keltiriladi.
 */
const bandTone = (band) => accuracyTone(band === null ? null : Math.round((band / 9) * 100));

function CriteriaBar({ item, t }) {
  const tone = bandTone(item.band);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs font-semibold text-warm-body dark:text-warm-on-dark-soft">
        {t(`analytics.criteria.${item.name}`)}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-warm-surface dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone.bar}`}
          style={{ width: `${Math.max((item.band / 9) * 100, 3)}%` }}
        />
      </div>
      <span className={`w-8 shrink-0 text-right text-sm font-bold tabular-nums ${tone.text}`}>
        {item.band.toFixed(1)}
      </span>
    </div>
  );
}

/** Bitta ko'nikma paneli — Writing va Speaking bir xil tuzilishga ega. */
function SkillPanel({ icon: Icon, title, data, t, tagsTitle, tags }) {
  return (
    <div className="rounded-xl border border-warm-hairline bg-warm-canvas p-4 dark:border-white/10 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-warm-ink dark:text-warm-on-dark">
          {Icon && <Icon size={15} className="text-warm-primary" />}
          {title}
        </span>
        <span className="text-xs font-medium text-warm-muted dark:text-warm-on-dark-soft">
          {data.tasks} {t('analytics.tasksLabel')}
        </span>
      </div>

      {data.overall !== null && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-3xl font-bold tabular-nums ${bandTone(data.overall).text}`}>
            {data.overall.toFixed(1)}
          </span>
          <span className="text-xs font-medium text-warm-muted dark:text-warm-on-dark-soft">
            {t('analytics.avgBand')}
          </span>
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {data.criteria
          .filter((c) => c.name !== 'overall')
          .map((item) => (
            <CriteriaBar key={item.name} item={item} t={t} />
          ))}
      </div>

      {data.weakest && (
        <p className="mt-4 rounded-lg bg-warm-primary/[0.06] px-3 py-2 text-xs font-medium leading-relaxed text-warm-body dark:text-warm-on-dark">
          {t('analytics.weakestCriterion')}{' '}
          <strong className="text-warm-ink dark:text-warm-on-dark">
            {t(`analytics.criteria.${data.weakest.name}`)}
          </strong>{' '}
          ({data.weakest.band.toFixed(1)})
        </p>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-4 border-t border-warm-hairline pt-3.5 dark:border-white/10">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-warm-muted-soft">
            {tagsTitle}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-warm-hairline bg-white px-2 py-1 text-xs font-semibold text-warm-body dark:border-white/10 dark:bg-white/5 dark:text-warm-on-dark"
              >
                <span className="max-w-[11rem] truncate">{tag.label}</span>
                <span className="tabular-nums text-warm-warning">{tag.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductiveSkills({ analytics, hasPro }) {
  const { t } = useTranslation();

  const writing = hasPro ? analytics.writing : TEASER.writing;
  const speaking = hasPro ? analytics.speaking : TEASER.speaking;

  const body = (
    <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2 md:px-8 md:pb-8">
      {writing && (
        <SkillPanel
          icon={PenTool}
          title={t('analytics.writingLabel')}
          data={writing}
          t={t}
          tagsTitle={t('analytics.commonErrors')}
          tags={(writing.errorTypes || []).map((e) => ({
            label: t(`analytics.writingErrors.${e.type}`),
            count: e.count
          }))}
        />
      )}

      {speaking && (
        <SkillPanel
          icon={Mic}
          title={t('analytics.speakingLabel')}
          data={speaking}
          t={t}
          tagsTitle={t('analytics.repeatedFixes')}
          tags={(speaking.fixes || []).map((f) => ({
            label: f.correctText,
            count: f.count
          }))}
        />
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader
        icon={PenTool}
        title={t('analytics.productiveTitle')}
        hint={t('analytics.productiveHint')}
        badge={<ProBadge />}
      />

      {!hasPro ? (
        <ProCurtain title={t('analytics.lockedProductiveTitle')}>{body}</ProCurtain>
      ) : !writing && !speaking ? (
        <EmptyState
          icon={Sparkles}
          title={t('analytics.emptyProductiveTitle')}
          subtitle={t('analytics.emptyProductiveSubtitle')}
        />
      ) : (
        body
      )}
    </Card>
  );
}
