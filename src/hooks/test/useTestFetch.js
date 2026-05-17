import { useState, useEffect } from "react";
import { db, functions } from "../../firebase/firebase";
import { doc, getDoc, getDocs, collection, query, where, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export function useTestFetch(testId, user, userData, navigate) {
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!testId || !user) return;

        const fetchTest = async () => {
            setLoading(true);
            try {
                let testData = null;
                const isStaff = userData?.role === 'admin' || userData?.role === 'teacher';

                if (isStaff) {
                    const testSnap = await getDoc(doc(db, "tests", testId));
                    if (!testSnap.exists()) {
                        alert("Test topilmadi!");
                        navigate("/dashboard");
                        return;
                    }
                    testData = { id: testSnap.id, ...testSnap.data() };
                } else {
                    const getSanitizedTestFn = httpsCallable(functions, 'getSanitizedTest');
                    const res = await getSanitizedTestFn({ testId });
                    testData = res.data;
                }

                if (testData.type) testData.type = testData.type.toLowerCase().trim();

                // Check attempts if student
                if (!isStaff) {
                    const resultsSnap = await getDocs(query(
                        collection(db, 'results'),
                        where('userId', '==', user.uid),
                        where('testId', '==', testId)
                    ));
                    
                    // Simple limit check for now
                    if (resultsSnap.size >= 5) { // Example limit
                         alert("Siz bu testni topshirish limitiga yetgansiz!");
                         navigate("/dashboard");
                         return;
                    }
                }

                setTest(testData);
            } catch (err) {
                console.error(err);
                alert("Testni yuklashda xatolik yuz berdi.");
                navigate("/dashboard");
            } finally {
                setLoading(false);
            }
        };

        fetchTest();
    }, [testId, user, userData?.role]);

    return { test, loading };
}
