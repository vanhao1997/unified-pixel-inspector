import { SessionStore } from './lib/sessionStore.js';

// Background Service Worker - Unified Pixel Inspector
// Manages session per tab using SessionStore (chrome.storage.session)

// Update badge with issue count
function updateBadge(tabId, count) {
    const text = count > 0 ? String(count) : '';
    const color = count > 0 ? '#ef4444' : '#22c55e';

    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
}

// Clear session on extension reload/install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.session.clear();
});

// Handle messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id || message.tabId;

    switch (message.type) {
        case 'PIXEL_DETECTED':
            if (tabId) handlePixelDetected(tabId, message.data);
            break;

        case 'EVENT_CAPTURED':
            if (tabId) handleEventCaptured(tabId, message.data);
            break;

        case 'GET_SESSION':
            if (tabId) {
                // Get or Init session
                SessionStore.update(tabId, (s) => s).then(session => {
                    sendResponse(session);
                });
                return true; // Async response
            }
            break;

        case 'CLEAR_SESSION':
            if (tabId) {
                SessionStore.remove(tabId).then(() => {
                    return SessionStore.update(tabId, (s) => s); // Re-init
                }).then(() => {
                    updateBadge(tabId, 0);
                    sendResponse({ success: true });
                });
                return true;
            }
            break;

        case 'TOGGLE_CAPTURE':
            if (tabId) {
                SessionStore.update(tabId, (s) => {
                    s.capturing = message.capturing;
                }).then(session => {
                    sendResponse({ capturing: session.capturing });
                });
                return true;
            }
            break;

        case 'START_ELEMENT_PICKER':
            // Send activation message to the active tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'ACTIVATE_ELEMENT_PICKER'
                    }).then(() => {
                        sendResponse({ success: true });
                    }).catch(err => {
                        // If content script is not injected yet or navigation happened
                        console.error('Failed to activate picker:', err);
                        sendResponse({ success: false, error: 'Could not activate picker. Refresh page and try again.' });
                    });
                }
            });
            return true;

        case 'ELEMENT_PICKED':
            // Forward picked element info to the side panel
            chrome.runtime.sendMessage({
                type: 'ELEMENT_PICKED_RESULT',
                data: message.data
            }).catch(() => { });
            break;

        case 'ELEMENT_PICKER_CANCELLED':
            chrome.runtime.sendMessage({
                type: 'ELEMENT_PICKER_CANCELLED_RESULT'
            }).catch(() => { });
            break;
    }
});

async function handlePixelDetected(tabId, data) {
    const { platform, pixelId, status, allPixelIds, tags } = data;

    const session = await SessionStore.update(tabId, (s) => {
        if (!s.platforms[platform]) {
            s.platforms[platform] = {
                pixelIds: [],
                tags: [],
                installed: false,
                loaded: false,
                fired: false,
                errors: [],
                warnings: []
            };
        }

        const platformData = s.platforms[platform];

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
    });

    // Update badge
    const issueCount = Object.values(session.platforms)
        .reduce((acc, p) => acc + p.errors.length + p.warnings.length, 0);
    updateBadge(tabId, issueCount);

    // Notify side panel
    chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', tabId, session }).catch(() => { });
}

async function handleEventCaptured(tabId, data) {
    const session = await SessionStore.update(tabId, (s) => {
        if (!s.capturing) return;

        s.events.push({
            ...data,
            timestamp: Date.now()
        });

        // Mark platform as fired
        if (s.platforms[data.platform]) {
            s.platforms[data.platform].fired = true;
        }
    });

    // Notify side panel
    chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', tabId, session }).catch(() => { });
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    SessionStore.remove(tabId);
});

// Re-initialize when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        SessionStore.remove(tabId).then(() => {
            updateBadge(tabId, 0);
        });
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

        // TikTok Pixel
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
