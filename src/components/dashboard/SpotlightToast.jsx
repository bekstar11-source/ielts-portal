import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Megaphone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSpotlightNotice, toastKey } from '../../hooks/useSpotlightNotice';

/**
 * Yangi spotlight e'loni chiqqanda — o'quvchi qaysi sahifada bo'lsa ham
 * bir martalik toast ko'rsatadi va uni bosh sahifadagi e'longa olib boradi.
 *
 * Bir e'lon uchun faqat bir marta: oxirgi ko'rsatilgan `publishedAt`
 * localStorage'da saqlanadi.
 */

// Diqqatni talab qiladigan sahifalarda (test yechish, imtihon) chalg'itmaymiz.
const MUTED_PREFIXES = ['/test/', '/mock-exam', '/diagnostic-test', '/speaking-practice', '/admin', '/login', '/register'];

const isMuted = (pathname) =>
    pathname === '/' || pathname === '/dashboard' || MUTED_PREFIXES.some((p) => pathname.startsWith(p));

export default function SpotlightToast() {
    const { user, userData } = useAuth();
    const { latest, hasNew } = useSpotlightNotice(user);
    const location = useLocation();
    const navigate = useNavigate();
    const shownRef = useRef(false);

    useEffect(() => {
        if (!user || !hasNew || !latest || userData?.role === 'admin') return;
        if (shownRef.current) return;
        if (isMuted(location.pathname)) return;

        let alreadyToasted = 0;
        try { alreadyToasted = Number(localStorage.getItem(toastKey(user.uid))) || 0; } catch { /* ignore */ }
        if (alreadyToasted >= latest.publishedAt) return;

        shownRef.current = true;
        try { localStorage.setItem(toastKey(user.uid), String(latest.publishedAt)); } catch { /* ignore */ }

        const go = (id) => {
            toast.dismiss(id);
            navigate(`/dashboard?spotlight=${latest.id}`);
        };

        toast.custom((tst) => (
            <div
                onClick={() => go(tst.id)}
                className={`w-[340px] max-w-[92vw] cursor-pointer rounded-2xl border border-white/10 bg-[#1d1d1f] p-4 text-white shadow-2xl transition-all ${
                    tst.visible ? 'animate-content-in' : 'opacity-0'
                }`}
            >
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm-primary/20 text-warm-primary">
                        <Megaphone size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-warm-primary">{latest.tag}</p>
                        <p className="mt-0.5 truncate text-[14px] font-semibold">{latest.title}</p>
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-white/70">
                            Bosh sahifada ko'rish <ArrowRight size={13} strokeWidth={2.5} />
                        </span>
                    </div>
                </div>
            </div>
        ), { duration: 9000, position: 'bottom-center', id: `spotlight-${latest.id}` });
    }, [user, userData, hasNew, latest, location.pathname, navigate]);

    return null;
}
