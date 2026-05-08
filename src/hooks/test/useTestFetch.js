import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { doc, getDoc, getDocs, collection, query, where, limit } from "firebase/firestore";

export function useTestFetch(testId, user, userData, navigate) {
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!testId || !user) return;

        const fetchTest = async () => {
            setLoading(true);
            try {
                const testSnap = await getDoc(doc(db, "tests", testId));
                if (!testSnap.exists()) {
                    alert("Test topilmadi!");
                    navigate("/dashboard");
                    return;
                }

                const testData = { id: testSnap.id, ...testSnap.data() };
                if (testData.type) testData.type = testData.type.toLowerCase().trim();

                // Check attempts if student
                if (userData?.role !== 'admin') {
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
            } finally {
                setLoading(false);
            }
        };

        fetchTest();
    }, [testId, user, userData?.role]);

    return { test, loading };
}
