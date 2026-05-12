import { useState } from 'react';
import { db } from '../firebase/firebase';
import { doc, updateDoc, arrayUnion, increment, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const XP_REWARDS = {
    test: 50,
    podcast: 20,
    article: 10,
    daily_login: 5,
};

export function useGamification() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const awardXP = async (type, itemId, title = '', customAmount = null) => {
        if (!user) return { success: false, error: 'User not logged in' };
        if (!itemId) return { success: false, error: 'Item ID is required' };

        const amount = customAmount !== null ? customAmount : (XP_REWARDS[type] || 0);
        if (amount <= 0) return { success: false, error: 'Invalid XP amount' };

        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                return { success: false, error: 'User not found' };
            }

            const userData = userSnap.data();
            const awardedItems = userData.awardedItems || [];

            // Check if already awarded
            if (awardedItems.includes(itemId)) {
                return { success: false, message: 'Already awarded for this item', alreadyAwarded: true };
            }

            // Update user document
            await updateDoc(userRef, {
                points: increment(amount),
                awardedItems: arrayUnion(itemId),
            });

            // Log history
            await addDoc(collection(userRef, 'xpHistory'), {
                type,
                itemId,
                title: title || `${type} completion`,
                amount,
                date: serverTimestamp()
            });

            return { success: true, amount, message: `Earned ${amount} XP!` };
        } catch (error) {
            console.error('Error awarding XP:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    return {
        awardXP,
        loading,
        XP_REWARDS
    };
}
