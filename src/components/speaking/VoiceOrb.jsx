/**
 * Xonaning "tirik" markazi — ovozga javob beradigan yorug'lik.
 *
 * Ilgari o'quvchi mikrofon ishlayotganini faqat kichkina halqadan bilardi.
 * Bu yerda butun sahna nafas oladi: chiziqlardan yasalgan orb gapirganda
 * kengayadi, jim turganda sekin tebranadi.
 *
 * Ikki qatlam: orqada tarqoq yorug'lik dog'lari (`field`), ustida
 * bir-birining ustiga tushgan 15 ta buzilgan ellips (`lineOrb`). Ikkalasi
 * ham `lighter` rejimida chiziladi — shuning uchun ular qo'shilib, qorong'i
 * fonda cho'g' kabi ko'rinadi.
 *
 * Canvas DPR ga moslanadi, lekin `SCALE` bilan pastroq aniqlikda chiziladi:
 * bularning hammasi blur ostida, piksel aniqligi ko'rinmaydi, GPU esa
 * ancha yengil nafas oladi.
 */

import React, { useRef, useEffect } from 'react';

/** Har kadr chizishning maksimal tezligi (~30 fps). */
const FRAME_MS = 32;
/** Canvas rezolyutsiyasi koeffitsienti — blur ostida bundan ortig'i behuda. */
const SCALE = 0.55;

const PALETTE = {
    user: ['#FFC97A', '#FF9130', '#E14E1C'],
    ai: ['#FFE2AE', '#FFB25C', '#F0722C'],
};

const FIELD_COLORS = {
    user: ['#FFCE86', '#FF8F35', '#E0451A', '#7A2410'],
    ai: ['#FFE0AC', '#FFAE59', '#EF6B26', '#8C2E12'],
};

/** '#RRGGBB' + alfa → 'rgba(...)'. */
function hexA(hex, a) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Orbning "kuchi" — 0..1.
 *
 * Gapirish paytida haqiqiy mikrofon darajasi ishlatiladi (shuning uchun
 * orb aynan o'quvchi ovoziga javob beradi), qolgan holatlarda sokin
 * sintetik tebranish.
 */
function targetLevel(mode, t, micLevel) {
    if (mode === 'user') {
        if (typeof micLevel === 'number') {
            return Math.max(0.16, Math.min(1, micLevel * 1.7));
        }
        return Math.max(
            0.12,
            0.55 + 0.22 * Math.sin(t * 3.1) + 0.14 * Math.sin(t * 6.4 + 2) + 0.09 * Math.sin(t * 11.7)
        );
    }
    if (mode === 'ai') {
        return 0.4 + 0.2 * Math.sin(t * 1.6) + 0.1 * Math.sin(t * 3.1 + 1);
    }
    return 0.1 + 0.025 * Math.sin(t * 0.7);
}

/** Orqadagi tarqoq yorug'lik — sahnaning "havosi". */
function paintField(ctx, w, h, t, lvl, mode) {
    const cols = FIELD_COLORS[mode] || FIELD_COLORS.user;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${Math.round(Math.min(w, h) * 0.11)}px)`;
    for (let i = 0; i < 5; i += 1) {
        const col = cols[i % cols.length];
        const ang = t * (0.16 + i * 0.075) + i * 1.6;
        const rad =
            Math.min(w, h) * (0.32 + 0.1 * i) * (0.86 + 0.2 * Math.sin(t * (0.7 + i * 0.3)) * (0.4 + lvl));
        const x = w * 0.5 + Math.cos(ang) * w * 0.14 * (0.5 + lvl);
        const y = h * 0.34 + Math.sin(ang * 1.2 + i) * h * 0.12 * (0.5 + lvl);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, hexA(col, 0.8));
        g.addColorStop(0.45, hexA(col, 0.34));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

/** Chiziqlardan yasalgan orb — sahnaning markazi. */
function paintLineOrb(ctx, w, h, t, lvl, mode) {
    const cx = w * 0.5;
    const cy = h * 0.42;
    const P = PALETTE[mode] || PALETTE.user;
    const R = Math.min(w * 0.32, h * 0.34) * (0.9 + lvl * 0.22);

    // Ichkaridagi cho'g'.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${Math.round(R * 0.5)}px)`;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    glow.addColorStop(0, hexA(P[2], 0.6));
    glow.addColorStop(0.55, hexA(P[1], 0.24));
    glow.addColorStop(1, hexA(P[1], 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ustidagi chiziqlar — har biri boshqa fazada, shuning uchun ular
    // birgalikda "haykal" bo'lib ko'rinadi.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const N = 15;
    for (let i = 0; i < N; i += 1) {
        const q = i / (N - 1);
        const col = q < 0.5 ? P[0] : P[1];
        ctx.beginPath();
        for (let s = 0; s <= 1.0001; s += 0.025) {
            const ang = s * Math.PI * 2;
            const warp = 0.34 + 0.3 * Math.sin(ang * 3 + t * 0.7 + i * 0.22) * (0.55 + lvl * 0.8);
            const r = R * (0.62 + warp * 0.7);
            const x = cx + Math.cos(ang) * r * 1.18;
            const y =
                cy +
                Math.sin(ang) * r * 0.78 +
                Math.sin(ang * 2 + t * 0.9 + i * 0.3) * R * (0.16 + lvl * 0.12);
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexA(col, 0.08 + 0.24 * (1 - Math.abs(q - 0.5) * 2) * (0.5 + lvl));
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * @param {object} props
 * @param {'idle'|'user'|'ai'} [props.mode] - kim gapiryapti
 * @param {number} [props.level] - mikrofon darajasi 0..1 (mode='user' uchun)
 * @param {number} [props.intensity] - umumiy kuch (0.4..1.8)
 * @param {boolean} [props.field] - orqadagi tarqoq yorug'lik chizilsinmi
 * @param {string} [props.className]
 */
export default function VoiceOrb({
    mode = 'idle',
    level,
    intensity = 1,
    field = false,
    className = '',
}) {
    const canvasRef = useRef(null);
    // Animatsiya sikli qayta ishga tushmasligi uchun o'zgaruvchan qiymatlar
    // ref orqali beriladi — aks holda har `level` yangilanishida effekt
    // qayta qurilardi (sekundiga o'nlab marta).
    const liveRef = useRef({ mode, level, intensity, field });
    liveRef.current = { mode, level, intensity, field };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const reduced =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        const t0 = performance.now();
        let smoothed = 0.1;
        let last = 0;
        let raf = 0;

        const paint = (now) => {
            raf = requestAnimationFrame(paint);
            if (now - last < FRAME_MS) return;
            last = now;

            const live = liveRef.current;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (!w || !h) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2) * SCALE;
            const pw = Math.round(w * dpr);
            const ph = Math.round(h * dpr);
            if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw;
                canvas.height = ph;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const t = (now - t0) / 1000;
            const gain = live.intensity * (reduced ? 0.35 : 1);
            const target = targetLevel(live.mode, t, live.level) * gain;
            smoothed += (target - smoothed) * 0.12;
            if (!Number.isFinite(smoothed)) smoothed = 0.1;

            ctx.clearRect(0, 0, w, h);
            try {
                if (live.field) paintField(ctx, w, h, t, smoothed, live.mode);
                paintLineOrb(ctx, w, h, t, smoothed, live.mode);
            } catch {
                // Bitta kadr chizilmasa ham sikl to'xtamasin.
            }
        };

        raf = requestAnimationFrame(paint);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        />
    );
}
