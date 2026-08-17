import React from 'react';
import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { getSignupDiscount } from '../../utils/subscription';

/**
 * Header ostidagi ingichka eslatma: "sizda N% chegirma bor".
 *
 * NEGA KERAK: chegirma trial natijasi sahifasida bir marta aytiladi, keyin
 * o'quvchi ro'yxatdan o'tib dashboard'ga tushadi va u yerda chegirma haqida
 * hech qanday belgi yo'q edi — taklif 7 kunda jimgina yonib ketardi. Banner
 * shu bo'shliqni yopadi va bitta bosishda `/pricing` ga olib boradi.
 *
 * Chegirma yo'q (yoki muddati o'tgan) bo'lsa `null` qaytaradi — `getSignupDiscount`
 * ning o'zi barcha shartni (status, muddat, qolgan oy, zanjir) tekshiradi,
 * ya'ni bu yerda takroriy mantiq yo'q.
 */
export default function DiscountBanner({ userData }) {
  const discount = getSignupDiscount(userData);
  if (!discount) return null;

  // Zanjir boshlangan bo'lsa gap "qolgan oylar" haqida, boshlanmagan bo'lsa —
  // "taklif kuyib ketadi" haqida. Ikkisi bir xil matn bilan aytilsa, to'lagan
  // o'quvchi "chegirmam hali ishlatilmagan" deb o'ylab qolardi.
  const detail = discount.started
    ? `Yana ${discount.cyclesRemaining} oy chegirmali — keyingi to'lovga ${discount.daysLeft} kun.`
    : `Dastlabki ${discount.cyclesTotal} oylik obunaga amal qiladi · ${discount.daysLeft} kun qoldi.`;

  return (
    <div className="w-full border-b border-warm-hairline dark:border-white/5 bg-warm-success/[0.07] dark:bg-warm-success/[0.12]">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-2 flex items-center gap-2 flex-wrap">
        <Gift size={13} className="text-warm-success shrink-0" />
        <span className="text-[12px] font-bold text-warm-ink dark:text-warm-on-dark">
          Sizda {discount.percent}% chegirma bor
        </span>
        <span className="text-[12px] font-medium text-warm-muted dark:text-warm-on-dark-soft">
          {detail}
        </span>
        <Link
          to="/pricing"
          className="ml-auto text-[12px] font-bold text-warm-success hover:underline whitespace-nowrap"
        >
          Ishlatish →
        </Link>
      </div>
    </div>
  );
}
