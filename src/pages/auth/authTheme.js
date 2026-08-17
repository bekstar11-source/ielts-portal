/**
 * Auth sahifalarining (Login / Register) yagona uslub to'plami.
 *
 * NEGA ALOHIDA FAYL: trial funnel (`/trial` → `/trial/result` → `/register`)
 * bitta dizaynda ketadi — issiq qog'oz foni, Space Grotesk sarlavha, Public
 * Sans matn. Register/Login esa eski oq-kulrang temada qolgan edi va o'quvchi
 * "boshqa sayt" ga tushib qolgandek bo'lardi. Uslublar shu yerda bir joyda
 * turadi, aks holda ikki fayl yana ajralib ketadi.
 *
 * VIZUAL QOIDA (Claude uslubi): sahifada FAQAT BITTA to'ldirilgan tugma —
 * asosiy amal. Google/Telegram kabi provayderlar kontur tugma bo'ladi, brend
 * rangi faqat ikonkada qoladi. Ilgari Telegram to'q ko'k plashka edi va butun
 * kartani "yeb" qo'yardi, ko'z avval unga tushardi.
 *
 * Ranglar `TrialIntro`/`TrialResult` dagi qiymatlar bilan bir xil (ular ham
 * qattiq yozilgan — bu funnel Tailwind `warm-*` tokenlarini ishlatmaydi).
 */

export const AUTH_FONT = { fontFamily: "'Public Sans', sans-serif" };
export const AUTH_HEADING_FONT = { fontFamily: "'Space Grotesk', sans-serif" };

/* Palitra (izoh sifatida, klasslar ichida qattiq yozilgan):
   fon #F7F4EE · siyoh #1E1B16 · sust matn #6B6559 · juda sust #938D80
   chegara #E7E0D3 · aksent (coral) #D97757 · telegram #229ED9          */

/** Sahifa foni. */
export const authPage = 'min-h-screen bg-[#F7F4EE] text-[#1E1B16] selection:bg-[#D97757]/20';

/** Forma joylashadigan oq karta. */
export const authCard =
  'bg-white rounded-[20px] border border-[#EAE3D6] p-6 sm:p-8 ' +
  'shadow-[0_1px_2px_rgba(30,27,22,0.04),0_8px_24px_-12px_rgba(30,27,22,0.10)]';

/** Matn kirituvchilar. */
export const authInput =
  'w-full h-12 px-4 bg-white border border-[#E0D8C9] rounded-xl outline-none ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-[#cfc5b2] focus:border-[#1E1B16] focus:shadow-[0_0_0_3px_rgba(30,27,22,0.07)] ' +
  'text-[14.5px] font-medium text-[#1E1B16] placeholder-[#A9A395]';

/** Asosiy (qora) tugma — sahifada yagona to'ldirilgan tugma. */
export const authPrimaryBtn =
  'w-full h-12 rounded-xl bg-[#1E1B16] text-white font-semibold text-[14.5px] ' +
  'hover:bg-[#312c24] transition-colors flex items-center justify-center gap-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.995]';

/** Ikkilamchi (kontur) tugma — Google va shunga o'xshashlar. */
export const authSecondaryBtn =
  'w-full h-12 rounded-xl bg-white border border-[#E0D8C9] text-[#1E1B16] font-semibold text-[14.5px] ' +
  'hover:bg-[#FBF9F5] hover:border-[#cfc5b2] transition-colors flex items-center justify-center gap-2.5 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.995]';

/**
 * Telegram tugmasi — Google bilan bir xil kontur, brend rangi faqat ikonkada.
 * (Klass nomi saqlandi, chaqiruvchi fayllarni o'zgartirmaslik uchun.)
 */
export const authTelegramBtn = `${authSecondaryBtn} [&>svg]:text-[#229ED9]`;

/** Sust ko'rinishli matnli tugma ("Orqaga", "Parolni unutdingizmi?"). */
export const authGhostBtn =
  'w-full text-[13px] font-semibold text-[#8A8577] hover:text-[#1E1B16] transition-colors';

/** Xato bloki. */
export const authError =
  'flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#D97757]/[0.08] border border-[#D97757]/20 ' +
  'text-[13px] font-medium leading-relaxed text-[#A34A2A]';

/** Ikkinchi darajali izoh matni. */
export const authHint = 'text-[13.5px] leading-relaxed text-[#6B6559]';

/** "OR" ajratkichi. */
export const authDivider = 'flex items-center gap-3 py-1';
export const authDividerLine = 'flex-1 h-px bg-[#EAE3D6]';
export const authDividerLabel = 'text-[11px] font-semibold uppercase tracking-[.12em] text-[#A9A395]';

/** Matn ichidagi havola. */
export const authLink =
  'font-semibold text-[#1E1B16] underline underline-offset-[3px] decoration-[#D97757]/40 ' +
  'hover:decoration-[#D97757] transition-colors';

/** Ma'lumot/kutish plashkalari. */
export const authPanel = 'rounded-xl border border-[#EAE3D6] bg-[#FBF9F5] p-4';
