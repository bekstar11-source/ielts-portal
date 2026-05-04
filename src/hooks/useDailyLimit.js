import { useState, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

/**
 * useDailyLimit Hook
 * Handles daily test limits and cliffhanger logic
 * @param {Object} userData - Current user's Firestore data
 */
export const useDailyLimit = (userData) => {
  const [checking, setChecking] = useState(false);

  /**
   * checkLimit
   * @param {string} type - 'reading' or 'listening'
   * @returns {boolean} - true if allowed, false if limit reached
   */
  const checkLimit = useCallback((type) => {
    if (!userData) return true;
    if (type === 'reading' || type === 'listening') {
      if (userData.isPro || userData.isPremium || userData.accountType === 'premium' || userData.accountType === 'pro' || userData.accountType === 'standard') return true;
      return false; // No free tests for Reading and Listening
    }

    return true;
  }, [userData]);

  /**
   * incrementUsage
   * Increments the usage count for the given type and updates the lastActivityDate
   * @param {string} type - 'reading' or 'listening'
   */
  const incrementUsage = async (type) => {
    if (!userData?.uid) return;
    if (userData.isPremium || userData.isPro || userData.accountType === 'pro' || userData.accountType === 'standard') return;

    setChecking(true);
    const today = new Date().toISOString().split('T')[0];
    const stats = userData.usageStats || {};
    const userRef = doc(db, 'users', userData.uid);

    try {
      const isNewDay = stats.lastActivityDate !== today;

      const updates = {
        'usageStats.lastActivityDate': today,
      };

      if (isNewDay) {
        // Reset counts for the new day
        updates['usageStats.dailyReadingCount'] = type === 'reading' ? 1 : 0;
        updates['usageStats.dailyListeningCount'] = type === 'listening' ? 1 : 0;
        updates['usageStats.totalDaysActive'] = increment(1);
      } else {
        if (type === 'reading') updates['usageStats.dailyReadingCount'] = increment(1);
        if (type === 'listening') updates['usageStats.dailyListeningCount'] = increment(1);
      }

      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error incrementing usage stats:', error);
    } finally {
      setChecking(false);
    }
  };

  return { checkLimit, incrementUsage, checking };
};
