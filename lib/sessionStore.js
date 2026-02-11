/**
 * SessionStore - Wrapper for chrome.storage.session
 * Manages per-tab pixel sessions with persistence and concurrency safety.
 */

const PREFIX = 'session_';
const MAX_EVENTS = 100; // Limit history to prevent storage quota issues

// Helper to interact with storage
const storage = {
    get: (keys) => chrome.storage.session.get(keys),
    set: (items) => chrome.storage.session.set(items),
    remove: (keys) => chrome.storage.session.remove(keys)
};

export const SessionStore = {
    getKey(tabId) {
        return `${PREFIX}${tabId}`;
    },

    /**
     * Atomically update the session for a tab.
     * Uses Web Locks API to prevent race conditions during async storage access.
     * @param {number} tabId 
     * @param {Function} updateFn Reducer function (session) => modified_session
     * @returns {Promise<Object>} The updated session
     */
    async update(tabId, updateFn) {
        const lockName = `lock_tab_${tabId}`;

        return navigator.locks.request(lockName, async () => {
            const key = this.getKey(tabId);
            const data = await storage.get(key);
            let session = data[key];

            // Initialize if missing
            if (!session) {
                session = {
                    platforms: {},
                    events: [],
                    capturing: true,
                    startTime: Date.now()
                };
            }

            // Apply update Logic (mutates or returns new)
            // We assume updateFn mutates the session object
            updateFn(session);

            // Enforce limits on events to save memory/storage
            if (session.events && session.events.length > MAX_EVENTS) {
                // Keep newest events, drop oldest
                session.events = session.events.slice(-MAX_EVENTS);
            }

            // Save back
            await storage.set({ [key]: session });

            return session;
        });
    },

    /**
     * Get session without locking (read-only)
     * @param {number} tabId 
     * @returns {Promise<Object|null>}
     */
    async get(tabId) {
        const key = this.getKey(tabId);
        const data = await storage.get(key);
        return data[key] || null;
    },

    /**
     * Remove session for a tab
     * @param {number} tabId 
     */
    async remove(tabId) {
        const key = this.getKey(tabId);
        await storage.remove(key);
    }
};
