import { useState, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import {
  canAccessPremiumContent,
  hasDirectAssignment,
  isAssignedItem,
  isStaff
} from '../utils/subscription';

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
  /**
   * @param {'reading'|'listening'|string} type
   * @param {object|string|null} test - test obyekti yoki test ID si (ixtiyoriy)
   */
  const checkLimit = useCallback((type, test = null) => {
    if (!userData) return true;
    if (type !== 'reading' && type !== 'listening') return true;

    // Obuna / xodim — bitta manbadan (utils/subscription).
    if (canAccessPremiumContent(userData)) return true;

    // O'qituvchi, guruh yoki access key orqali aynan shu test ochilgan bo'lsa ham
    // ruxsat. Ilgari bu tekshiruv faqat serverda (getSanitizedTest) bor edi —
    // klient esa biriktirilgan testni ham bloklab, "Upgrade" oynasini ko'rsatardi.
    if (test) {
      if (typeof test === 'object' && isAssignedItem(test)) return true;
      const testId = typeof test === 'object' ? (test.id || test.testId) : test;
      if (testId && hasDirectAssignment(userData, testId)) return true;
    }

    return false; // No free tests for Reading and Listening
  }, [userData]);

  /**
   * incrementUsage
   * Increments the usage count for the given type and updates the lastActivityDate
   * @param {string} type - 'reading' or 'listening'
   */
  const incrementUsage = async (type) => {
    if (!userData?.uid) return;
    // checkLimit bilan bir xil mantiq — ilgari bu yerda `premium` tashlab
    // ketilgani uchun premium foydalanuvchilarning statistikasi noto'g'ri o'sardi.
    if (isStaff(userData) || canAccessPremiumContent(userData)) return;

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
