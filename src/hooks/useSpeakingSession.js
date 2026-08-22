import { useState, useRef, useCallback, useEffect } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, storage, functions } from '../firebase/firebase';
import { toWav } from '../utils/audioWav';
import { play, revokeSpeech, FEEDBACK_MODES, DEFAULT_MODE, DEFAULT_LANG } from '../services/speechTts';
import { ML_TASKS, mlAnswerSeconds, mlPrepSeconds } from '../utils/multilevelSpeaking';

/** IELTS qismlariga mos maksimal javob uzunligi (sekund). */
const MAX_SECONDS = { 1: 75, 2: 135, 3: 105 };

/**
 * Signal — "Begin speaking when you hear this sound".
 *
 * Fayl emas, oscillator: bitta qisqa "bip" uchun asset yuklash, uni keshlash
 * va birinchi bosishda kechikish bilan chalinishini kutish ortiqcha. Ovoz
 * chiqmasa yozuv baribir boshlanadi — signal eslatma, shart emas.
 */
function playBeep() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.36);
        osc.onended = () => ctx.close().catch(() => {});
    } catch {
        // Signalsiz ham davom etaveramiz.
    }
}

/** Ohang tanlovi seanslar orasida ham eslab qolinadi. */
const MODE_STORAGE_KEY = 'speaking:feedbackMode';

/**
 * Shundan past cho'qqi = mikrofon amalda hech narsa yozmagan.
 * 0.02 xona shovqinidan yuqori, lekin shivirlashdan past.
 */
const SILENCE_PEAK = 0.02;

function readStoredMode() {
    try {
        const saved = localStorage.getItem(MODE_STORAGE_KEY);
        return saved && FEEDBACK_MODES[saved] ? saved : DEFAULT_MODE;
    } catch {
        return DEFAULT_MODE;
    }
}

/**
 * useSpeakingSession Hook
 * Bitta Speaking javobining to'liq sikli: yozib olish -> WAV -> Storage ->
 * Gemini baholash -> feedbackni ovozda eshittirish.
 *
 * Feedback FAQAT tanlangan ohangda yoziladi. Ilgari uchalasi birdan qaytardi
 * va o'quvchi hech qachon ochmaydigan ikkita matnni ham kutib o'tirardi.
 * Ohang almashtirilsa, kerakli matn `speakingFeedbackTone` orqali alohida
 * so'raladi: u audiosiz ishlaydi, sezilarli tez va kunlik limitdan yemaydi.
 * Bir marta olingan ohang `evaluation.feedback` da qoladi — takror
 * bosilganda qayta so'ralmaydi.
 *
 * Feedback matni ham, ovoz ham `lang` tilida bo'ladi — o'quvchi interfeysni
 * o'zbekchada ishlatib turib inglizcha feedback eshitmasligi kerak.
 *
 * @param {{ sessionId?: string, lang?: 'uz'|'en', topic?: object,
 *           examType?: 'ielts'|'multilevel' }} options
 */
export const useSpeakingSession = ({
    sessionId,
    lang = DEFAULT_LANG,
    topic,
    examType = 'ielts',
} = {}) => {
    // idle | preparing | recording | processing | done | error
    const [status, setStatus] = useState('idle');
    // Tayyorgarlik hisobi: qolgan soniya va uning turi.
    // 'prep'  — Multilevel 2/3-qismidagi 1 daqiqa o'ylash vaqti
    // 'ready' — 1-qismdagi qisqa "hozir boshlanadi" hisobi
    const [prepRemaining, setPrepRemaining] = useState(0);
    const [prepKind, setPrepKind] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [evaluation, setEvaluation] = useState(null);
    const [error, setError] = useState('');
    const [mode, setMode] = useState(readStoredMode);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [maxSeconds, setMaxSeconds] = useState(MAX_SECONDS[1]);
    // Ovoz chiqmasa sabab shu yerda — feedback matni baribir ekranda qoladi.
    const [ttsError, setTtsError] = useState('');
    // Mikrofon darajasi (0..1) — yozuv davomida jonli ko'rsatkich uchun.
    const [level, setLevel] = useState(0);
    // O'quvchining o'z yozuvi (lokal object URL) — feedback bilan yonma-yon.
    const [answerAudioUrl, setAnswerAudioUrl] = useState('');
    // Kunlik limit: { used, limit } — serverdan qaytadi.
    const [quota, setQuota] = useState(null);
    // Xato baholashdan keyin o'sha yozuvni qayta yuborish mumkinmi.
    const [canRetry, setCanRetry] = useState(false);
    const [isQuestionPlaying, setIsQuestionPlaying] = useState(false);
    // Tanlangan ohang matni hali yozilmagan bo'lsa — shu yerda kutamiz.
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const questionRef = useRef(null);
    const timerRef = useRef(null);
    const stopSpeechRef = useRef(null);
    const stopQuestionRef = useRef(null);
    const mountedRef = useRef(true);
    const meterRef = useRef(null);
    const prepTimerRef = useRef(null);
    // Tayyorgarlik davomida mikrofon oqimi shu yerda kutib turadi: ruxsatni
    // hisob BOSHLANISHIDAN oldin so'raymiz, aks holda signal chalinganda
    // brauzer dialogi chiqib, o'quvchi birinchi jumlasini yo'qotardi.
    const streamRef = useRef(null);
    // Yuborilmagan (yoki yuborilishi uzilgan) yozuv — qayta urinish uchun.
    const pendingRef = useRef(null);
    const answerUrlRef = useRef('');
    // Ohang so'rovi uchun: qaysi javob baholangani. Ohang almashtirilganda
    // savol allaqachon `reset` bilan tozalangan bo'lishi mumkin.
    const answeredRef = useRef(null);
    // Ketma-ket bosishda faqat oxirgi so'rov natijasi qabul qilinadi.
    const toneRequestRef = useRef(0);

    /** Mikrofon o'lchagichini to'xtatadi. */
    const stopMeter = useCallback(() => {
        const meter = meterRef.current;
        if (!meter) return;
        meterRef.current = null;
        clearInterval(meter.interval);
        try {
            meter.source.disconnect();
            meter.context.close();
        } catch {
            // Kontekst allaqachon yopilgan bo'lishi mumkin.
        }
        setLevel(0);
    }, []);

    const revokeAnswerUrl = useCallback(() => {
        if (answerUrlRef.current) {
            URL.revokeObjectURL(answerUrlRef.current);
            answerUrlRef.current = '';
        }
        setAnswerAudioUrl('');
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearInterval(timerRef.current);
            clearInterval(prepTimerRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            stopSpeechRef.current?.();
            stopQuestionRef.current?.();
            revokeSpeech();
            if (answerUrlRef.current) URL.revokeObjectURL(answerUrlRef.current);
            const meter = meterRef.current;
            if (meter) {
                clearInterval(meter.interval);
                try {
                    meter.source.disconnect();
                    meter.context.close();
                } catch {
                    // E'tiborsiz: kontekst allaqachon yopilgan.
                }
            }
            const recorder = recorderRef.current;
            if (recorder?.state === 'recording') {
                recorder.stop();
                recorder.stream.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    /** Feedbackni tanlangan rejimda ovozda eshittiradi. */
    const playFeedback = useCallback(async (text, voiceMode) => {
        if (!text) return;

        stopSpeechRef.current?.();
        setTtsError('');
        setIsSpeaking(true);

        try {
            const { stop, engine } = await play(text, voiceMode, {
                lang,
                onEnd: () => mountedRef.current && setIsSpeaking(false),
            });
            if (!mountedRef.current) {
                stop();
                return;
            }
            stopSpeechRef.current = stop;

            // Neural ovoz ulanmay, brauzer dvigateliga tushib qolgan bo'lsak,
            // buni ko'rsatamiz: ilgari bu jimgina sodir bo'lardi va sifat
            // tushib ketgani sezilmasdi.
            if (engine === 'native') {
                setTtsError("Sifatli ovozga ulanib bo'lmadi — brauzer ovozi ishlatildi.");
            }
        } catch (error) {
            if (!mountedRef.current) return;
            setIsSpeaking(false);
            // Avtomatik ijro bloklangani xato emas — "Eshitish" tugmasi ishlaydi.
            setTtsError(
                error.name === 'AutoplayBlocked'
                    ? "Brauzer avtomatik ovozni bloklaydi — “Eshitish” tugmasini bosing."
                    : "Ovozni chiqarib bo'lmadi. Matn quyida."
            );
            console.error('TTS error:', error);
        }
    }, [lang]);

    /**
     * Savolni examiner ovozida INGLIZCHA o'qib beradi.
     *
     * Real imtihonda savol qog'ozda emas, quloqqa keladi — savolni o'qib emas,
     * eshitib tushunish mashqning bir qismi.
     */
    const speakQuestion = useCallback(async (question) => {
        const cue = question?.cueCard
            ? ` You should say: ${question.cueCard.replace(/\n/g, ', ')}.`
            : '';
        const text = `${question?.text || ''}${cue}`.trim();
        if (!text) return;

        stopQuestionRef.current?.();
        setIsQuestionPlaying(true);
        try {
            const { stop } = await play(text, 'examiner', {
                lang: 'en',
                onEnd: () => mountedRef.current && setIsQuestionPlaying(false),
            });
            if (!mountedRef.current) {
                stop();
                return;
            }
            stopQuestionRef.current = stop;
        } catch (error) {
            if (!mountedRef.current) return;
            setIsQuestionPlaying(false);
            console.error('Question TTS error:', error);
        }
    }, []);

    const stopQuestion = useCallback(() => {
        stopQuestionRef.current?.();
        setIsQuestionPlaying(false);
    }, []);

    /**
     * Tayyor WAV ni Storage ga qo'yib, baholashga yuboradi.
     *
     * Alohida funksiya, chunki `stop()` ham, `retry()` ham aynan shuni
     * bajaradi: tarmoq uzilganda 2 daqiqalik yozuv yo'qolib ketmasligi kerak.
     */
    const submit = useCallback(async (pending) => {
        setStatus('processing');
        setError('');
        setCanRetry(false);
        setFeedbackError('');

        try {
            const { blob, mimeType, durationSec, question } = pending;

            const uid = auth.currentUser?.uid || 'anon';
            // Firestore ga tokenli download URL emas, YO'L saqlanadi: tokenli
            // havola Storage qoidalarini butunlay chetlab o'tadi va uni qo'lga
            // kiritgan har kim o'quvchining ovozini eshita olardi.
            const path = `speaking/${uid}/${sessionId || 'practice'}/${question.id}_${Date.now()}.wav`;
            await uploadBytes(ref(storage, path), blob, { contentType: mimeType });

            const evaluateFn = httpsCallable(functions, 'evaluateSpeaking');
            const result = await evaluateFn({
                audioPath: path,
                mimeType,
                question: question.text,
                part: question.part || 1,
                cueCard: question.cueCard,
                examType,
                // Multilevel kontekstі: 2-qismdagi uchta savol, 3-qismdagi
                // pros/cons jadvali va savol rasmlari. IELTS'da ular yo'q va
                // server ularni o'qimaydi ham.
                bullets: question.bullets,
                prosCons: question.prosCons,
                photoPaths: question.photoPaths,
                sessionId,
                questionId: question.id,
                feedbackLang: lang,
                // Faqat shu ohang yoziladi — qolganlari so'ralganda qo'shiladi.
                feedbackMode: mode,
                durationSec,
                topicId: topic?.id,
                topicTitle: topic?.title,
                questionCount: topic?.questions?.length,
            });

            if (!mountedRef.current) return;

            const data = result.data.evaluation;
            pendingRef.current = null;
            answeredRef.current = { question, part: question.part || 1 };
            setQuota(result.data.quota || null);
            setEvaluation(data);
            setStatus('done');
            playFeedback(data.feedback[mode], mode);
        } catch (e) {
            console.error('Speaking evaluation error:', e);
            if (!mountedRef.current) return;
            // Kunlik limit tugagan bo'lsa qayta urinishning ma'nosi yo'q.
            const quotaHit = e.code === 'functions/resource-exhausted';
            setCanRetry(!quotaHit && Boolean(pendingRef.current));
            setError(e.message || 'Baholashda xato yuz berdi.');
            setStatus('error');
        }
    }, [sessionId, lang, mode, topic, examType, playFeedback]);

    /**
     * Savol uchun vaqtlar.
     *
     * IELTS'da bitta jadval yetardi — qism raqami javob uzunligini belgilardi.
     * Multilevel'da esa 1-qismning ichida ham savollar turli uzunlikda (30 s,
     * rasm savoliga 45 s), shuning uchun savolning INDEKSI ham kerak.
     */
    const timingFor = useCallback(
        (question) => {
            if (examType !== 'multilevel') {
                return { prepSec: 0, readySec: 0, limit: MAX_SECONDS[question.part] || 120 };
            }
            const part = question.part || 1;
            return {
                prepSec: mlPrepSeconds(part),
                readySec: ML_TASKS[part]?.readySec || 0,
                limit: mlAnswerSeconds(part, question.index ?? 0) || 120,
            };
        },
        [examType]
    );

    /**
     * Mikrofon oqimi tayyor bo'lgach, yozuvni haqiqatda boshlaydi.
     *
     * `start` dan ajratilgan, chunki tayyorgarlik hisobi bor bo'lganda bu
     * qism hisob tugagach, boshqa "tick" da ishga tushadi.
     */
    const beginRecording = useCallback(
        (stream, limit) => {
            if (!mountedRef.current) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }
            streamRef.current = null;
            chunksRef.current = [];
            setPrepRemaining(0);
            setPrepKind('');
            setElapsed(0);

            const recorder = new MediaRecorder(stream);
            recorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.start(1000);
            setStatus('recording');

            // Jonli daraja ko'rsatkichi — o'quvchi mikrofon ishlayotganini
            // gapirib bo'lgandan KEYIN emas, gapirayotganda ko'rishi kerak.
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const context = new AudioCtx();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 512;
                source.connect(analyser);
                const buffer = new Uint8Array(analyser.frequencyBinCount);
                // 100ms — ko'z uchun yetarli, render sonini esa cheklab turadi.
                const interval = setInterval(() => {
                    analyser.getByteTimeDomainData(buffer);
                    let peak = 0;
                    for (let i = 0; i < buffer.length; i += 1) {
                        const value = Math.abs(buffer[i] - 128) / 128;
                        if (value > peak) peak = value;
                    }
                    if (mountedRef.current) setLevel(peak);
                }, 100);
                meterRef.current = { context, source, interval };
            } catch (meterError) {
                // O'lchagich ikkinchi darajali — yozuvni to'xtatmaymiz.
                console.warn('Mic meter error:', meterError);
            }

            setMaxSeconds(limit);
            timerRef.current = setInterval(() => {
                setElapsed((prev) => {
                    const next = prev + 1;
                    // Vaqt tugadi — o'zi to'xtaydi (real imtihondagidek).
                    if (next >= limit) recorderRef.current?.stop();
                    return next;
                });
            }, 1000);
        },
        []
    );

    /**
     * Yozib olishni boshlaydi.
     *
     * Multilevel'da oldin tayyorgarlik hisobi ketadi (2 va 3-qismda bir
     * daqiqa o'ylash, 1-qismda qisqa hisob), keyin signal chalinadi va
     * yozuv o'zi boshlanadi — o'quvchi hech narsa bosmaydi, imtihondagidek.
     *
     * @param {{ id: string, text: string, part?: 1|2|3, index?: number,
     *           cueCard?: string, bullets?: string[], prosCons?: object,
     *           photoPaths?: string[] }} question
     */
    const start = useCallback(async (question) => {
        if (!question?.text) {
            setError('Savol berilmagan.');
            setStatus('error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            stopSpeechRef.current?.();
            stopQuestionRef.current?.();
            revokeSpeech();
            revokeAnswerUrl();
            setIsSpeaking(false);
            setIsQuestionPlaying(false);
            setTtsError('');
            setEvaluation(null);
            setError('');
            setCanRetry(false);
            setElapsed(0);
            questionRef.current = question;
            pendingRef.current = null;
            chunksRef.current = [];

            const { prepSec, readySec, limit } = timingFor(question);
            const countdown = prepSec || readySec;

            if (countdown <= 0) {
                beginRecording(stream, limit);
                return;
            }

            // Hisob ketayotganda oqim ochiq turadi — ruxsat allaqachon berilgan,
            // signal chalinishi bilan yozuv darhol boshlanadi.
            streamRef.current = stream;
            setPrepKind(prepSec > 0 ? 'prep' : 'ready');
            setPrepRemaining(countdown);
            setMaxSeconds(limit);
            setStatus('preparing');

            prepTimerRef.current = setInterval(() => {
                setPrepRemaining((prev) => {
                    if (prev > 1) return prev - 1;
                    clearInterval(prepTimerRef.current);
                    const pending = streamRef.current;
                    if (pending) {
                        playBeep();
                        beginRecording(pending, limit);
                    }
                    return 0;
                });
            }, 1000);
        } catch (e) {
            console.error('Mic error:', e);
            setError("Mikrofon ruxsati berilmadi. Brauzer sozlamalarini tekshiring.");
            setStatus('error');
        }
    }, [revokeAnswerUrl, timingFor, beginRecording]);

    /**
     * Tayyorgarlikni erta tugatadi.
     *
     * Haqiqiy imtihonda bunday tugma yo'q, lekin bu yer mashq: o'ylab
     * bo'lgan o'quvchini qolgan qirq soniyani kutishga majburlash mashqni
     * uzaytiradi, foyda bermaydi.
     */
    const skipPrep = useCallback(() => {
        if (status !== 'preparing') return;
        clearInterval(prepTimerRef.current);
        const stream = streamRef.current;
        if (!stream) return;
        setPrepRemaining(0);
        playBeep();
        beginRecording(stream, maxSeconds);
    }, [status, maxSeconds, beginRecording]);

    /** Yozuvni to'xtatadi va baholashga yuboradi. */
    const stop = useCallback(() => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;

        clearInterval(timerRef.current);
        stopMeter();

        recorder.onstop = async () => {
            recorder.stream.getTracks().forEach((t) => t.stop());
            setStatus('processing');

            try {
                const question = questionRef.current;
                const raw = new Blob(chunksRef.current, { type: recorder.mimeType });

                // Gemini webm ni qabul qilmaydi — WAV ga o'giramiz.
                const { blob, mimeType, durationSec, peak } = await toWav(raw);
                if (durationSec < 2) {
                    throw new Error('Javob juda qisqa. Kamida bir necha jumla gapiring.');
                }
                if (peak < SILENCE_PEAK) {
                    // AI ga yubormaymiz: bu bekorga sarf va noo'rin "band 0" degani.
                    throw new Error(
                        "Yozuvda ovoz eshitilmadi — mikrofon o'chiq yoki boshqa qurilma tanlangan. Tekshirib, qaytadan yozing."
                    );
                }

                if (!mountedRef.current) return;

                // O'z javobini eshitish — feedbackdan keyingi eng foydali qism.
                const localUrl = URL.createObjectURL(blob);
                answerUrlRef.current = localUrl;
                setAnswerAudioUrl(localUrl);

                pendingRef.current = { blob, mimeType, durationSec, question };
                await submit(pendingRef.current);
            } catch (e) {
                console.error('Speaking recording error:', e);
                if (!mountedRef.current) return;
                setCanRetry(false);
                setError(e.message || 'Yozuvni tayyorlashda xato yuz berdi.');
                setStatus('error');
            }
        };

        recorder.stop();
    }, [stopMeter, submit]);

    /** Xatodan keyin o'sha yozuvni qayta yuboradi — qaytadan gapirish shart emas. */
    const retry = useCallback(() => {
        if (!pendingRef.current) return;
        submit(pendingRef.current);
    }, [submit]);

    /**
     * Feedback ohangini almashtiradi.
     *
     * Javobdan oldin ham, keyin ham chaqiriladi: baholash hali yo'q bo'lsa
     * shunchaki tanlov saqlanadi.
     *
     * Matn allaqachon olingan bo'lsa — darhol o'qiydi. Bo'lmasa audiosiz
     * qisqa chaqiruv ketadi: ballar qayta hisoblanmaydi, faqat o'sha xulosa
     * boshqa ovozda yoziladi. Kunlik limit bunga tegmaydi.
     */
    const changeMode = useCallback(async (nextMode) => {
        if (!FEEDBACK_MODES[nextMode]) return;
        setMode(nextMode);
        try {
            localStorage.setItem(MODE_STORAGE_KEY, nextMode);
        } catch {
            // Shaxsiy rejimda localStorage yopiq bo'lishi mumkin — muhim emas.
        }

        if (!evaluation) return;
        if (evaluation.feedback?.[nextMode]) {
            playFeedback(evaluation.feedback[nextMode], nextMode);
            return;
        }

        // Ohang yozilayotganda oldingi ovoz gapirib turmasin.
        stopSpeechRef.current?.();
        setIsSpeaking(false);

        const requestId = toneRequestRef.current + 1;
        toneRequestRef.current = requestId;
        setIsFeedbackLoading(true);
        setFeedbackError('');

        try {
            const toneFn = httpsCallable(functions, 'speakingFeedbackTone');
            const result = await toneFn({
                mode: nextMode,
                sessionId,
                questionId: answeredRef.current?.question?.id,
                question: answeredRef.current?.question?.text,
                part: answeredRef.current?.part || 1,
                feedbackLang: lang,
                // Sessiyasiz mashqda serverda saqlangan hujjat bo'lmaydi —
                // kontekst shu yerdan boradi.
                evaluation: {
                    bands: evaluation.bands,
                    evidence: evaluation.evidence,
                    corrections: evaluation.corrections,
                    transcript: evaluation.transcript,
                },
            });

            // Bu orada boshqa ohang bosilgan bo'lsa, eskisini yozmaymiz.
            if (!mountedRef.current || toneRequestRef.current !== requestId) return;

            const text = result.data.feedback;
            setEvaluation((prev) => (
                prev ? { ...prev, feedback: { ...prev.feedback, [nextMode]: text } } : prev
            ));
            setIsFeedbackLoading(false);
            playFeedback(text, nextMode);
        } catch (e) {
            console.error('Speaking tone error:', e);
            if (!mountedRef.current || toneRequestRef.current !== requestId) return;
            setIsFeedbackLoading(false);
            setFeedbackError(e.message || "Bu ohangni tayyorlab bo'lmadi.");
        }
    }, [evaluation, playFeedback, sessionId, lang]);

    /**
     * Tanlangan ohang matni har doim mavjud bo'lishini kafolatlaydi.
     *
     * Asosan bitta holat uchun: o'quvchi baholash ketayotganda ohangni
     * almashtirsa, server boshqa ohangni yozib qaytaradi va ekranda bo'sh
     * joy qolardi. Xato bo'lsa qayta urinmaymiz — aks holda tsikl hosil
     * bo'ladi, "Eshitish" tugmasi qo'lda qayta so'rash uchun qoladi.
     */
    useEffect(() => {
        if (status !== 'done' || !evaluation) return;
        if (evaluation.feedback?.[mode]) return;
        if (isFeedbackLoading || feedbackError) return;
        changeMode(mode);
    }, [status, evaluation, mode, isFeedbackLoading, feedbackError, changeMode]);

    /**
     * Joriy feedbackni qayta eshittiradi.
     *
     * Matn hali yozilmagan bo'lsa (ohang so'rovi uzilib qolgan) —
     * "Eshitish" jimgina ishlamay qo'ymasin, qaytadan so'raydi.
     */
    const replay = useCallback(() => {
        if (evaluation?.feedback?.[mode]) {
            playFeedback(evaluation.feedback[mode], mode);
        } else if (evaluation) {
            changeMode(mode);
        }
    }, [evaluation, mode, playFeedback, changeMode]);

    /** Ovozni to'xtatadi. */
    const stopSpeaking = useCallback(() => {
        stopSpeechRef.current?.();
        setIsSpeaking(false);
    }, []);

    /** Keyingi savolga tayyorlaydi. */
    const reset = useCallback(() => {
        stopSpeechRef.current?.();
        stopQuestionRef.current?.();
        revokeSpeech();
        revokeAnswerUrl();
        pendingRef.current = null;
        answeredRef.current = null;
        // Yangi savolga o'tayotganda eski ohang so'rovi qaytib kelib
        // ekranga yopishmasin.
        toneRequestRef.current += 1;
        setIsSpeaking(false);
        setIsQuestionPlaying(false);
        setTtsError('');
        setEvaluation(null);
        setError('');
        setCanRetry(false);
        setIsFeedbackLoading(false);
        setFeedbackError('');
        setElapsed(0);
        // Tayyorgarlik o'rtasida boshqa savolga o'tilsa, hisob ham, ochiq
        // qolgan mikrofon oqimi ham o'zi bilan ketishi kerak.
        clearInterval(prepTimerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setPrepRemaining(0);
        setPrepKind('');
        setStatus('idle');
    }, [revokeAnswerUrl]);

    return {
        status,
        elapsed,
        maxSeconds,
        evaluation,
        error,
        ttsError,
        mode,
        isSpeaking,
        isRecording: status === 'recording',
        isBusy: status === 'processing',
        isPreparing: status === 'preparing',
        prepRemaining,
        prepKind,
        level,
        answerAudioUrl,
        quota,
        canRetry,
        isQuestionPlaying,
        isFeedbackLoading,
        feedbackError,
        start,
        stop,
        skipPrep,
        retry,
        speakQuestion,
        stopQuestion,
        changeMode,
        replay,
        stopSpeaking,
        reset,
    };
};

export default useSpeakingSession;
