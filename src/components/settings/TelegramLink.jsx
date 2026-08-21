// Telegramni hisobga bog'lash.
//
// Haftalik tahlil xulosasi Telegram orqali boradi, lekin email bilan ro'yxatdan
// o'tgan foydalanuvchida bot bilan hech qanday aloqa yo'q edi — ya'ni xabar
// ularga umuman yetmasdi.
//
// OQIM: foydalanuvchi botga o'tadi → raqamini ulashadi → bot 6 xonali kod
// yuboradi → shu yerda raqam va kodni kiritadi. Kodni tekshirish va
// `telegramChatId` ni yozish serverda (`linkTelegram`) bajariladi: maydon
// `firestore.rules` da himoyalangan, aks holda o'quvchi boshqa odamning chat
// id sini yozib, uning xabarlarini o'ziga burib yuborardi.

import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Send, Check } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { functions } from '../../firebase/firebase';

const BOT_URL = 'https://t.me/ielts_portal_bot';

export default function TelegramLink({ inputClass = '', mutedClass = '' }) {
  const { t } = useTranslation();
  const { userData, updateUserLocalData } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const linked = !!userData?.telegramChatId;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const call = httpsCallable(functions, 'linkTelegram');
      await call({ phoneNumber: phone, code });
      // Serverdagi qiymat aniq emas (chat id) — lokal holatga faqat "bog'landi"
      // belgisini qo'yamiz, u UI uchun yetarli.
      updateUserLocalData({ telegramChatId: 'linked' });
    } catch (err) {
      // Server xabarlari o'zbekcha va aniq ("Kod noto'g'ri. Yana 3 ta urinish
      // qoldi") — ularni umumiy matn bilan almashtirish foydalanuvchiga zarar.
      setError(err?.message || t('settings.telegramError'));
    } finally {
      setBusy(false);
    }
  };

  if (linked) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-warm-success">
        <Check size={15} />
        {t('settings.telegramLinked')}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <ol className={`list-inside list-decimal space-y-1 text-xs leading-relaxed ${mutedClass}`}>
        <li>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-warm-primary hover:underline"
          >
            {t('settings.telegramStep1')}
          </a>
        </li>
        <li>{t('settings.telegramStep2')}</li>
        <li>{t('settings.telegramStep3')}</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('settings.telegramPhone')}
          inputMode="tel"
          autoComplete="tel"
          className={`min-w-[10rem] flex-1 ${inputClass}`}
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`w-28 tabular-nums ${inputClass}`}
        />
        <button
          type="submit"
          disabled={busy || code.length !== 6 || phone.trim().length < 9}
          className="inline-flex items-center gap-1.5 rounded-xl bg-warm-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-warm-on-dark dark:text-warm-dark"
        >
          <Send size={14} />
          {busy ? t('settings.telegramLinking') : t('settings.telegramLink')}
        </button>
      </div>

      {error && <p className="text-xs font-medium text-warm-error">{error}</p>}
    </form>
  );
}
