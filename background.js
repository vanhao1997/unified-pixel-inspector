// Background Service Worker - Unified Pixel Inspector
// Manages session per tab, badge count, message routing

const tabSessions = new Map();

// Initialize session for a tab
function initSession(tabId) {
    if (!tabSessions.has(tabId)) {
        tabSessions.set(tabId, {
            platforms: {},
            events: [],
            capturing: true,
            startTime: Date.now()
        });
    }
    return tabSessions.get(tabId);
}

// Update badge with issue count
function updateBadge(tabId, count) {
    const text = count > 0 ? String(count) : '';
    const color = count > 0 ? '#ef4444' : '#22c55e';

    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
}

// Handle messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id || message.tabId;

    switch (message.type) {
        case 'PIXEL_DETECTED':
            handlePixelDetected(tabId, message.data);
            break;

        case 'EVENT_CAPTURED':
            handleEventCaptured(tabId, message.data);
            break;

        case 'GET_SESSION':
            const session = tabSessions.get(tabId) || initSession(tabId);
            sendResponse(session);
            return true;

        case 'CLEAR_SESSION':
            tabSessions.delete(tabId);
            initSession(tabId);
            updateBadge(tabId, 0);
            sendResponse({ success: true });
            return true;

        case 'TOGGLE_CAPTURE':
            const sess = tabSessions.get(tabId);
            if (sess) {
                sess.capturing = message.capturing;
            }
            sendResponse({ capturing: sess?.capturing });
            return true;
    }
});

function handlePixelDetected(tabId, data) {
    const session = initSession(tabId);
    const { platform, pixelId, status, source, allPixelIds, tags } = data;

    if (!session.platforms[platform]) {
        session.platforms[platform] = {
            pixelIds: [],
            tags: [],
            installed: false,
            loaded: false,
            fired: false,
            errors: [],
            warnings: []
        };
    }

    const platformData = session.platforms[platform];

    if (pixelId && !platformData.pixelIds.includes(pixelId)) {
        platformData.pixelIds.push(pixelId);
    }

    // Merge all pixel IDs if provided
    if (allPixelIds && allPixelIds.length > 0) {
        allPixelIds.forEach(id => {
            if (!platformData.pixelIds.includes(id)) {
                platformData.pixelIds.push(id);
            }
        });
    }

    // Merge tags for platforms (Google, TikTok, Zalo)
    if (tags && tags.length > 0) {
        tags.forEach(tag => {
            if (!platformData.tags.some(t => t.id === tag.id)) {
                platformData.tags.push(tag);
            }
        });
    }

    if (status === 'installed') platformData.installed = true;
    if (status === 'loaded') platformData.loaded = true;
    if (status === 'fired') platformData.fired = true;

    // Check for duplicates (skip for Google which can have multiple tags)
    if (platform !== 'google' && platformData.pixelIds.length > 1) {
        const existingWarning = platformData.warnings.find(w => w.code === 'DUPLICATE_PIXEL');
        if (!existingWarning) {
            platformData.warnings.push({
                code: 'DUPLICATE_PIXEL',
                message: `Multiple ${platform} pixel IDs detected: ${platformData.pixelIds.join(', ')}`
            });
        }
    }

    // Update badge
    const issueCount = Object.values(session.platforms)
        .reduce((acc, p) => acc + p.errors.length + p.warnings.length, 0);
    updateBadge(tabId, issueCount);

    // Notify side panel
    chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', tabId, session });
}

function handleEventCaptured(tabId, data) {
    const session = initSession(tabId);

    if (!session.capturing) return;

    session.events.push({
        ...data,
        timestamp: Date.now()
    });

    // Mark platform as fired
    if (session.platforms[data.platform]) {
        session.platforms[data.platform].fired = true;
    }

    // Notify side panel
    chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', tabId, session });
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    tabSessions.delete(tabId);
});

// Re-initialize when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        tabSessions.delete(tabId);
        updateBadge(tabId, 0);
    }
});

// Open side panel when action is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// Monitor network requests for tracking pixels
chrome.webRequest.onCompleted.addListener(
    (details) => {
        const url = details.url;

        // TikTok Pixel - Extract pixel ID and event from URL
        if (/analytics\.tiktok\.com/.test(url)) {
            const pixelIdMatch = url.match(/sdkid=([A-Z0-9]+)/i);
            const eventMatch = url.match(/event=([^&]+)/i);

            handlePixelDetected(details.tabId, {
                platform: 'tiktok',
                pixelId: pixelIdMatch ? pixelIdMatch[1] : null,
                status: 'fired',
                source: 'network',
                url: url
            });

            // Also capture as event if event parameter exists
            if (eventMatch) {
                handleEventCaptured(details.tabId, {
                    platform: 'tiktok',
                    event: decodeURIComponent(eventMatch[1]),
                    params: { url: url },
                    pixelId: pixelIdMatch ? pixelIdMatch[1] : null
                });
            }
            return;
        }

        // Meta Pixel
        if (/facebook\.com\/tr/.test(url)) {
            const pixelIdMatch = url.match(/id=(\d+)/i);
            const eventMatch = url.match(/ev=([^&]+)/i);

            handlePixelDetected(details.tabId, {
                platform: 'meta',
                pixelId: pixelIdMatch ? pixelIdMatch[1] : null,
                status: 'fired',
                source: 'network',
                url: url
            });

            if (eventMatch) {
                handleEventCaptured(details.tabId, {
                    platform: 'meta',
                    event: decodeURIComponent(eventMatch[1]),
                    params: { url: url },
                    pixelId: pixelIdMatch ? pixelIdMatch[1] : null
                });
            }
            return;
        }

        // Google Analytics / GTM
        if (/google-analytics\.com|googletagmanager\.com|www\.google-analytics\.com/.test(url)) {
            const tidMatch = url.match(/tid=([^&]+)/i) || url.match(/id=([^&]+)/i);
            const eventMatch = url.match(/en=([^&]+)/i) || url.match(/t=([^&]+)/i);

            handlePixelDetected(details.tabId, {
                platform: 'google',
                pixelId: tidMatch ? tidMatch[1] : null,
                status: 'fired',
                source: 'network',
                url: url
            });
            return;
        }

        // Zalo Pixel
        if (/sp\.zalo\.me|zalo\.me|zaloapp\.com/.test(url)) {
            const pixelIdMatch = url.match(/pixelId=(\d+)/i) || url.match(/pixel_id=(\d+)/i);

            handlePixelDetected(details.tabId, {
                platform: 'zalo',
                pixelId: pixelIdMatch ? pixelIdMatch[1] : null,
                status: 'fired',
                source: 'network',
                url: url
            });
            return;
        }
    },
    { urls: ['<all_urls>'] }
);
