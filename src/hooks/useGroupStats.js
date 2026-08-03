/**
 * O'qituvchining guruhlari, ulardagi o'quvchilar va natijalari.
 *
 * Bu hook endi mustaqil o'qimaydi — u `useTeacherWorkspace` ustidagi yupqa
 * qatlam. Sabab: Dashboard, Tests, AllResults va bu sahifa aynan bir xil
 * ma'lumotni so'raydi; ilgari har biri o'zicha o'qib, bitta sessiyada
 * Firestore o'qishlari sahifalar soniga ko'paytirilardi.
 *
 * Sahifa uchun tashqi API (`groups/students/results/testSetsMap/...`)
 * o'zgarmagan.
 */

import { useTeacherWorkspace } from './useTeacherWorkspace';

export function useGroupStats(userData) {
    const { groups, students, results, testSetsMap, loading, isRefreshing, error, refresh } =
        useTeacherWorkspace({ uid: userData?.uid });

    return { groups, students, results, testSetsMap, loading, isRefreshing, error, refresh };
}
