/**
 * Log an action (console only — Firestore logging disabled for cost savings)
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Short action code (e.g., 'LOGIN', 'TEST_START', 'USER_EDIT')
 * @param {object} details - Additional details about the action
 */
export const logAction = (userId, action, details = {}) => {
    console.log(`[LOG] ${action}`, { userId, ...details, timestamp: new Date().toISOString() });
};
