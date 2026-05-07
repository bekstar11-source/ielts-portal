import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';

export function useStudentSearch(localStudents, searchTerm) {
    const [dbSearchResults, setDbSearchResults] = useState(null);
    const [isSearchingDb, setIsSearchingDb] = useState(false);

    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setDbSearchResults(null);
            setIsSearchingDb(false);
            return;
        }

        const term = searchTerm.trim();
        const searchDb = async () => {
            setIsSearchingDb(true);
            try {
                const resultsMap = new Map();

                if (term.length > 5 && !term.includes('/')) {
                    try {
                        const docSnap = await getDoc(doc(db, 'users', term));
                        if (docSnap.exists()) resultsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
                    } catch (e) { }
                }

                const emailQ = query(collection(db, 'users'), where('email', '>=', term.toLowerCase()), where('email', '<=', term.toLowerCase() + '\uf8ff'), limit(20));
                const emailSnap = await getDocs(emailQ);
                emailSnap.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() }));

                const capitalized = term.charAt(0).toUpperCase() + term.slice(1);
                const nameQ1 = query(collection(db, 'users'), where('fullName', '>=', term), where('fullName', '<=', term + '\uf8ff'), limit(20));
                const nameQ2 = query(collection(db, 'users'), where('fullName', '>=', capitalized), where('fullName', '<=', capitalized + '\uf8ff'), limit(20));
                const phoneQ = query(collection(db, 'users'), where('phoneNumber', '>=', term), where('phoneNumber', '<=', term + '\uf8ff'), limit(20));

                const [n1, n2, p1] = await Promise.all([getDocs(nameQ1), getDocs(nameQ2), getDocs(phoneQ)]);
                n1.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() }));
                n2.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() }));
                p1.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() }));

                const finalResults = Array.from(resultsMap.values()).filter(user => user.role !== 'admin' && user.role !== 'teacher');
                setDbSearchResults(finalResults);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearchingDb(false);
            }
        };

        const timer = setTimeout(searchDb, 600);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const combinedStudents = useMemo(() => {
        const localMatches = localStudents.filter(s => 
            s.fullName?.toLowerCase().includes((searchTerm || '').toLowerCase()) || 
            s.email?.toLowerCase().includes((searchTerm || '').toLowerCase()) ||
            s.id?.toLowerCase().includes((searchTerm || '').toLowerCase())
        );
        
        if (dbSearchResults !== null) {
            const combinedMap = new Map();
            localMatches.forEach(s => combinedMap.set(s.id, s));
            dbSearchResults.forEach(s => combinedMap.set(s.id, s));
            return Array.from(combinedMap.values());
        }
        return localMatches;
    }, [localStudents, dbSearchResults, searchTerm]);

    return { combinedStudents, isSearchingDb };
}
