// src/pages/admin/AdminMultilevelSpeaking.jsx
//
// Multilevel Speaking testlarini yaratish va tahrirlash.
//
// Bu sahifa bo'lmasa admin Firestore konsolida ichma-ich massivlar yasashi va
// rasmlarni Storage'ga qo'lda qo'yishi kerak bo'lardi. Eng muhim yordami —
// SAQLASHDAN OLDINGI tekshiruv: yarim to'ldirilgan test o'quvchiga chiqib,
// o'rtasida tugab qolgandan ko'ra, umuman saqlanmagani yaxshi.
//
// Rasmlar `multilevel/` ostiga yuklanadi — server aynan shu prefiksni
// tekshiradi (`functions/evaluateSpeaking.js`), boshqa yo'lni o'qimaydi.

import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Loader2, Plus, Save, Trash2 } from 'lucide-react';

import { db, storage } from '../../firebase/firebase';
import { ML_TASKS } from '../../utils/multilevelSpeaking';
import { MULTILEVEL_TESTS, validateMultilevelTest } from '../../utils/multilevelTest';

const PERSONAL_COUNT = ML_TASKS[1].questions.filter((q) => q.type === 'personal').length;
const PHOTO_COUNT = ML_TASKS[1].questions.filter((q) => q.type === 'photo').length;
const BULLET_COUNT = ML_TASKS[2].questions[0].bulletCount;

const emptyTest = () => ({
    title: '',
    description: '',
    published: false,
    part1: {
        personal: Array(PERSONAL_COUNT).fill(''),
        photoPaths: [],
        photoQuestions: Array(PHOTO_COUNT).fill(''),
    },
    part2: { prompt: 'Look at the photograph.', photoPath: '', bullets: Array(BULLET_COUNT).fill('') },
    part3: { topic: '', pros: ['', '', ''], cons: ['', '', ''] },
});

const input =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
const label = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

/** Storage'ga rasm qo'yadi va YO'LNI qaytaradi (URL emas — server yo'l kutadi). */
async function uploadPhoto(file) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `multilevel/${Date.now()}_${safe}`;
    await uploadBytes(ref(storage, path), file, { contentType: file.type });
    return path;
}

/** Rasm — yuklash tugmasi va ko'rinishi. */
function PhotoSlot({ path, onChange, onRemove }) {
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        if (!path) {
            setUrl('');
            return undefined;
        }
        getDownloadURL(ref(storage, path))
            .then((value) => alive && setUrl(value))
            .catch(() => alive && setUrl(''));
        return () => {
            alive = false;
        };
    }, [path]);

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setBusy(true);
        try {
            onChange(await uploadPhoto(file));
        } catch (error) {
            console.error('Photo upload error:', error);
            toast.error('Rasm yuklanmadi: ' + error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-600">
            {url ? (
                <img src={url} alt="" className="mb-2 h-32 w-full rounded object-cover" />
            ) : (
                <div className="mb-2 grid h-32 place-items-center text-gray-400">
                    <ImageIcon size={28} />
                </div>
            )}
            <div className="flex items-center gap-2">
                <label className="cursor-pointer text-xs font-medium text-blue-600">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : 'Rasm tanlash'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
                {path && onRemove && (
                    <button type="button" className="text-xs text-red-500" onClick={onRemove}>
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

/** Ro'yxat maydonlari (pros/cons) — qo'shish va o'chirish bilan. */
function ListEditor({ items, onChange, placeholder }) {
    return (
        <div className="space-y-2">
            {items.map((value, i) => (
                <div key={i} className="flex gap-2">
                    <input
                        className={input}
                        value={value}
                        placeholder={placeholder}
                        onChange={(e) => {
                            const next = [...items];
                            next[i] = e.target.value;
                            onChange(next);
                        }}
                    />
                    <button
                        type="button"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => onChange(items.filter((_, j) => j !== i))}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-blue-600"
                onClick={() => onChange([...items, ''])}
            >
                <Plus size={14} /> Qo'shish
            </button>
        </div>
    );
}

export default function AdminMultilevelSpeaking() {
    const [tests, setTests] = useState([]);
    const [draft, setDraft] = useState(emptyTest);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        getDocs(collection(db, MULTILEVEL_TESTS))
            .then((snap) => {
                if (alive) setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            })
            .catch((error) => {
                console.error('Multilevel tests load error:', error);
                toast.error('Testlar yuklanmadi.');
            });
        return () => {
            alive = false;
        };
    }, []);

    const patch = (section, values) =>
        setDraft((prev) => ({ ...prev, [section]: { ...prev[section], ...values } }));

    const handleSave = async () => {
        if (!draft.title.trim()) {
            toast.error('Test nomini yozing.');
            return;
        }
        const problems = validateMultilevelTest(draft);
        if (problems.length > 0) {
            // Hammasini birdan ko'rsatamiz — bittalab tuzatib, har safar
            // saqlashga urinish admin uchun charchatuvchi.
            toast.error(problems.join('\n'), { duration: 8000 });
            return;
        }

        setSaving(true);
        try {
            const id = editingId || doc(collection(db, MULTILEVEL_TESTS)).id;
            const payload = { ...draft, examType: 'multilevel', updatedAt: new Date().toISOString() };
            await setDoc(doc(db, MULTILEVEL_TESTS, id), payload, { merge: true });
            setTests((prev) => {
                const rest = prev.filter((item) => item.id !== id);
                return [...rest, { id, ...payload }];
            });
            setEditingId(id);
            toast.success('Saqlandi.');
        } catch (error) {
            console.error('Multilevel test save error:', error);
            toast.error('Saqlashda xato: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <h1 className="text-xl font-bold dark:text-gray-100">Multilevel Speaking testlari</h1>

            {tests.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {tests.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs ${
                                editingId === item.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                            }`}
                            onClick={() => {
                                setEditingId(item.id);
                                setDraft({ ...emptyTest(), ...item });
                            }}
                        >
                            {item.title || 'Nomsiz'} {item.published ? '' : '· qoralama'}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500"
                        onClick={() => {
                            setEditingId(null);
                            setDraft(emptyTest());
                        }}
                    >
                        + Yangi
                    </button>
                </div>
            )}

            <div className="mt-6 space-y-6">
                <div>
                    <span className={label}>Test nomi</span>
                    <input
                        className={input}
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                </div>

                <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <h2 className="mb-3 font-semibold dark:text-gray-100">
                        1-qism · {PERSONAL_COUNT} shaxsiy + {PHOTO_COUNT} rasm savoli
                    </h2>
                    <div className="space-y-2">
                        {draft.part1.personal.map((value, i) => (
                            <input
                                key={i}
                                className={input}
                                placeholder={`Savol ${i + 1} (30 s)`}
                                value={value}
                                onChange={(e) => {
                                    const personal = [...draft.part1.personal];
                                    personal[i] = e.target.value;
                                    patch('part1', { personal });
                                }}
                            />
                        ))}
                    </div>

                    <p className={`${label} mt-4`}>Rasmlar (ikkitasi yonma-yon ko'rsatiladi)</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[0, 1].map((slot) => (
                            <PhotoSlot
                                key={slot}
                                path={draft.part1.photoPaths[slot] || ''}
                                onChange={(path) => {
                                    const photoPaths = [...draft.part1.photoPaths];
                                    photoPaths[slot] = path;
                                    patch('part1', { photoPaths: photoPaths.filter(Boolean) });
                                }}
                                onRemove={() =>
                                    patch('part1', {
                                        photoPaths: draft.part1.photoPaths.filter(
                                            (_, j) => j !== slot
                                        ),
                                    })
                                }
                            />
                        ))}
                    </div>

                    <div className="mt-4 space-y-2">
                        {draft.part1.photoQuestions.map((value, i) => (
                            <input
                                key={i}
                                className={input}
                                placeholder={`Rasm savoli ${i + 1} (${i === 0 ? '45' : '30'} s)`}
                                value={value}
                                onChange={(e) => {
                                    const photoQuestions = [...draft.part1.photoQuestions];
                                    photoQuestions[i] = e.target.value;
                                    patch('part1', { photoQuestions });
                                }}
                            />
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <h2 className="mb-3 font-semibold dark:text-gray-100">
                        2-qism · bitta rasm, {BULLET_COUNT} savol, bitta javob (1 daq + 2 daq)
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <PhotoSlot
                            path={draft.part2.photoPath}
                            onChange={(photoPath) => patch('part2', { photoPath })}
                            onRemove={() => patch('part2', { photoPath: '' })}
                        />
                    </div>
                    <div className="mt-3 space-y-2">
                        {draft.part2.bullets.map((value, i) => (
                            <input
                                key={i}
                                className={input}
                                placeholder={`Savol ${i + 1}`}
                                value={value}
                                onChange={(e) => {
                                    const bullets = [...draft.part2.bullets];
                                    bullets[i] = e.target.value;
                                    patch('part2', { bullets });
                                }}
                            />
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <h2 className="mb-3 font-semibold dark:text-gray-100">
                        3-qism · pros/cons (1 daq + 2 daq)
                    </h2>
                    <input
                        className={input}
                        placeholder="Mavzu"
                        value={draft.part3.topic}
                        onChange={(e) => patch('part3', { topic: e.target.value })}
                    />
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <div>
                            <span className={label}>Pros</span>
                            <ListEditor
                                items={draft.part3.pros}
                                placeholder="Ijobiy tomon"
                                onChange={(pros) => patch('part3', { pros })}
                            />
                        </div>
                        <div>
                            <span className={label}>Cons</span>
                            <ListEditor
                                items={draft.part3.cons}
                                placeholder="Salbiy tomon"
                                onChange={(cons) => patch('part3', { cons })}
                            />
                        </div>
                    </div>
                </section>

                <label className="flex items-center gap-2 text-sm dark:text-gray-200">
                    <input
                        type="checkbox"
                        checked={draft.published}
                        onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                    />
                    O'quvchilarga ochiq
                </label>

                <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Saqlash
                </button>
            </div>
        </div>
    );
}
