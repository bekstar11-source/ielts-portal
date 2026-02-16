import { db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Log an action to Firestore
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Short action code (e.g., 'LOGIN', 'TEST_START', 'USER_EDIT')
 * @param {object} details - Additional details about the action
 * @param {string} ip - Optional IP address
 */
export const logAction = async (userId, action, details = {}, ip = null) => {
    try {
        await addDoc(collection(db, 'logs'), {
            userId,
            action,
            details,
            ip,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to log action:", error);
    }
};
