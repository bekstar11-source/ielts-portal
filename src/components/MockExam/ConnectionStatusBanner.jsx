import React from 'react';
import { WifiOff, Wifi, Loader2, AlertTriangle, Headphones, MonitorSmartphone } from 'lucide-react';

/**
 * Imtihon ustida suzib turadigan aloqa holati bannerlari.
 *
 * MUHIM: banner HECH QACHON ekranni bloklamaydi — konteynerda
 * `pointer-events-none`, faqat tugmaning o'zi bosiladi. Writing bosqichida
 * talaba yozishda davom eta olishi kerak.
 */
export default function ConnectionStatusBanner({
    isOnline,
    justReconnected,
    audioIssue,
    audioDeviceChanged,
    onDismissDeviceChange,
    deviceConflict,
    onRetryAudio,
    retrying,
    showAudioState = false,
}) {
    let variant = null;

    // Ustuvorlik: bir vaqtda faqat bitta banner. Eng jiddiy muammo yuqorida.
    if (deviceConflict) {
        variant = {
            tone: 'red',
            icon: <MonitorSmartphone size={18} className="text-white" />,
            title: 'Imtihon boshqa qurilmada ochilgan',
            body: 'Bu sessiya boshqa qurilma yoki brauzerda ham ochiq. Ikkalasida ishlash javoblaringizni buzadi — bittasini yoping.',
        };
    } else if (!isOnline) {
        variant = {
            tone: 'red',
            icon: <WifiOff size={18} className="text-white" />,
            title: 'Internet aloqasi uzildi',
            body: showAudioState
                ? 'Audio shu sababdan to\'xtadi. Wi-Fi yoki mobil internetni tekshiring — aloqa tiklanishi bilan ijro davom etadi. Javoblaringiz qurilmada saqlanib turibdi.'
                : 'Javoblaringiz qurilmada saqlanib turibdi va aloqa tiklanganda avtomatik yuboriladi. Sahifani YANGILAMANG.',
        };
    } else if (showAudioState && audioIssue === 'error') {
        variant = {
            tone: 'red',
            icon: <AlertTriangle size={18} className="text-white" />,
            title: 'Audio yuklanmadi',
            body: 'Audio fayl bilan bog\'lanib bo\'lmadi. Quyidagi tugma orqali qayta urinib ko\'ring yoki nazoratchini chaqiring.',
            action: 'Qayta urinish',
        };
    } else if (showAudioState && audioIssue === 'buffering') {
        variant = {
            tone: 'amber',
            icon: <Loader2 size={18} className="text-white animate-spin" />,
            title: 'Audio yuklanmoqda...',
            body: 'Internet sekinlashgani uchun ovoz to\'xtab qoldi. Bir necha soniya kuting — o\'zi davom etadi.',
            action: 'Qayta urinish',
        };
    } else if (showAudioState && audioDeviceChanged) {
        variant = {
            tone: 'amber',
            icon: <Headphones size={18} className="text-white" />,
            title: 'Ovoz chiqish qurilmasi o\'zgardi',
            body: 'Quloqchin ulandi yoki uzildi. Ovoz endi boshqa qurilmadan chiqayotgan bo\'lishi mumkin — eshitayotganingizni tekshiring.',
            action: 'Eshityapman',
            onAction: onDismissDeviceChange,
        };
    } else if (justReconnected) {
        variant = {
            tone: 'green',
            icon: <Wifi size={18} className="text-white" />,
            title: 'Aloqa tiklandi',
            body: 'Javoblaringiz yuborildi. Testni davom ettiravering.',
        };
    }

    if (!variant) return null;

    const toneStyles = {
        red: { border: 'border-red-200', chip: 'bg-[#e31b23]', text: 'text-red-600' },
        amber: { border: 'border-amber-200', chip: 'bg-amber-500', text: 'text-amber-600' },
        green: { border: 'border-emerald-200', chip: 'bg-emerald-600', text: 'text-emerald-600' },
    }[variant.tone];

    // z-index eng yuqori: fullscreen overlay (9999) ochiq bo'lsa ham talaba
    // internet uzilganini KO'RISHI kerak.
    return (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10000] w-[min(560px,94vw)] pointer-events-none">
            <div className={`pointer-events-auto flex items-start gap-3 bg-white border ${toneStyles.border} rounded-xl shadow-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <div className={`w-9 h-9 ${toneStyles.chip} rounded-lg flex items-center justify-center shrink-0`}>
                    {variant.icon}
                </div>
                <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 leading-tight">{variant.title}</p>
                    <p className={`text-xs ${toneStyles.text} mt-1 leading-snug`}>{variant.body}</p>
                </div>
                {variant.action && (
                    <button
                        onClick={variant.onAction || onRetryAudio}
                        disabled={retrying}
                        className="shrink-0 self-center px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {retrying ? '...' : variant.action}
                    </button>
                )}
            </div>
        </div>
    );
}
