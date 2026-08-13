// SessionStorage cache for the admin tests list (see useAdminTests).
// Kept in its own module so pages that write tests outside the hook
// (CreateTest, merge, imports) can invalidate it after saving.
export const ADMIN_TESTS_CACHE_KEY = "admin_tests_data";
export const ADMIN_TESTS_CACHE_TIME_KEY = "admin_tests_data_time";
export const ADMIN_TESTS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const invalidateAdminTestsCache = () => {
    try {
        sessionStorage.removeItem(ADMIN_TESTS_CACHE_KEY);
        sessionStorage.removeItem(ADMIN_TESTS_CACHE_TIME_KEY);
    } catch { /* sessionStorage unavailable — nothing to invalidate */ }
};
