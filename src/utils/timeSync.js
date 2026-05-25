// src/utils/timeSync.js

let serverTimeOffset = 0;
let serverTimeOnLoad = null;
let performanceTimeOnLoad = null;
let isTimeSynced = false;
let syncPromise = null;

/**
 * Sync client time with server time using a fast same-origin HTTP HEAD request.
 * Extracts the Date header to determine the server's time and offset.
 */
export async function syncServerTime() {
    if (isTimeSynced) return;
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
        try {
            const t0 = Date.now();
            // HEAD request to window.location.origin / index.html to fetch headers only (very fast)
            const res = await fetch(window.location.origin + '/index.html', { 
                method: 'HEAD', 
                headers: { 'Cache-Control': 'no-cache' } 
            });
            const t1 = Date.now();
            const serverDateStr = res.headers.get('Date');
            if (serverDateStr) {
                const serverTime = new Date(serverDateStr).getTime();
                const latency = (t1 - t0) / 2;
                
                // Set baseline for monotonic server time tracking
                serverTimeOnLoad = serverTime + latency;
                performanceTimeOnLoad = performance.now();
                serverTimeOffset = serverTimeOnLoad - t0;
                isTimeSynced = true;
            } else {
                throw new Error("Date header not present in response");
            }
        } catch (err) {
            console.error("Failed to sync server time, falling back to local system clock:", err);
            // Fallback: Use local time
            serverTimeOnLoad = Date.now();
            performanceTimeOnLoad = performance.now();
            serverTimeOffset = 0;
            isTimeSynced = true;
        }
    })();

    return syncPromise;
}

/**
 * Returns the current server time in milliseconds.
 * Immune to user system clock updates after sync, since it tracks time elapsed
 * via the monotonic performance.now() API.
 */
export function getCurrentServerTime() {
    if (!isTimeSynced || serverTimeOnLoad === null) {
        return Date.now();
    }
    return serverTimeOnLoad + (performance.now() - performanceTimeOnLoad);
}
