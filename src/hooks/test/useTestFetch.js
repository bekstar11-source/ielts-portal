import { useState, useEffect } from "react";
import { db, functions } from "../../firebase/firebase";
import { doc, getDoc, getDocs, collection, query, where, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

const safeDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

export function useTestFetch(testId, user, userData, navigate) {
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);
    const [lockedMeta, setLockedMeta] = useState(null);

    useEffect(() => {
        if (!testId || !user) return;

        const fetchTest = async () => {
            setLoading(true);
            setLocked(false);
            setLockedMeta(null);
            try {
                let testData = null;
                const isStaff = userData?.role === 'admin' || userData?.role === 'teacher';
                const cleanId = testId.split('_part_')[0];

                if (isStaff) {
                    const testSnap = await getDoc(doc(db, "tests", cleanId));
                    if (!testSnap.exists()) {
                        alert("Test topilmadi!");
                        navigate("/dashboard");
                        return;
                    }
                    testData = { id: testSnap.id, ...testSnap.data() };
                } else {
                    const getSanitizedTestFn = httpsCallable(functions, 'getSanitizedTest');
                    const res = await getSanitizedTestFn({ testId: cleanId });
                    testData = res.data;
                }

                if (testData.type) testData.type = testData.type.toLowerCase().trim();

                // Check attempts if student
                if (!isStaff) {
                    const resultsSnap = await getDocs(query(
                        collection(db, 'results'),
                        where('userId', '==', user.uid),
                        where('testId', '==', cleanId)
                    ));

                    // Fetch user's groups to find teacher assignments
                    const groupsSnap = await getDocs(query(
                        collection(db, 'groups'),
                        where('studentIds', 'array-contains', user.uid)
                    ));

                    // Combine user assignments and group assignments
                    const userAssigns = userData?.assignedTests || [];
                    const groupAssigns = [];
                    groupsSnap.docs.forEach(docSnap => {
                        const gData = docSnap.data();
                        if (gData.assignedTests) {
                            groupAssigns.push(...gData.assignedTests);
                        }
                    });

                    const allAssigns = [...userAssigns, ...groupAssigns];
                    // Find the assignment for this test
                    const assignment = allAssigns.find(a => String(a.id).trim() === cleanId);

                    const hasGroupId = userData?.groupId && userData?.groupId !== 'none';
                    let maxAttempts = null;
                    let deadline = null;

                    if (assignment) {
                        maxAttempts = Number(assignment.maxAttempts) || 1;
                        deadline = assignment.deadline || assignment.endDate || null;
                        testData.isAssignment = true;
                    } else if (hasGroupId) {
                        maxAttempts = Infinity;
                        testData.isAssignment = false;
                    } else {
                        maxAttempts = 5;
                        testData.isAssignment = false;
                    }

                    // 1. Deadline check
                    if (deadline) {
                        const now = new Date();
                        const deadlineDate = new Date(deadline);
                        if (now > deadlineDate) {
                            alert("Ushbu testni topshirish muddati tugagan! (Deadline: " + deadlineDate.toLocaleString('uz-UZ') + ")");
                            navigate("/dashboard");
                            return;
                        }
                    }

                    // 2. Attempts check
                    const resultsDocs = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    let attemptsList = [];
                    resultsDocs.forEach(d => {
                        if (d.attempts && Array.isArray(d.attempts)) {
                            attemptsList.push(...d.attempts);
                        } else {
                            attemptsList.push(d);
                        }
                    });

                    let attemptsCount = attemptsList.length;
                    if (maxAttempts === 1 || maxAttempts === 2) {
                        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                        attemptsCount = attemptsList.filter(att => {
                            const dateVal = safeDate(att.createdAt || att.date);
                            return dateVal && dateVal >= threeDaysAgo;
                        }).length;
                    }

                    if (attemptsCount >= maxAttempts) {
                        alert(`Siz bu testni topshirish limitiga yetgansiz! Maksimal urinishlar soni: ${maxAttempts}`);
                        navigate("/dashboard");
                        return;
                    }
                }

                setTest(testData);
            } catch (err) {
                console.error(err);
                if (err.code === 'functions/permission-denied') {
                    const cleanId = testId.split('_part_')[0];
                    try {
                        const metaSnap = await getDoc(doc(db, "tests_metadata", cleanId));
                        setLockedMeta(metaSnap.exists() ? { id: metaSnap.id, ...metaSnap.data() } : null);
                    } catch (metaErr) {
                        console.error(metaErr);
                        setLockedMeta(null);
                    }
                    setLocked(true);
                } else {
                    alert("Testni yuklashda xatolik yuz berdi.");
                    navigate("/dashboard");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTest();
    }, [testId, user, userData?.role, userData?.groupId, userData?.assignedTests]);

    return { test, loading, locked, lockedMeta };
}
