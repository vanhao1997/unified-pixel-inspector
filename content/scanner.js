// Content Script - DOM Scanner
// Scans for installed tracking pixels and injects hooks

(function () {
    'use strict';

    // Platform detection patterns
    const platformPatterns = {
        meta: {
            name: 'Meta Pixel',
            scriptPatterns: [
                /connect\.facebook\.net/,
                /www\.facebook\.com\/tr/
            ],
            globalCheck: 'fbq',
            idPattern: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/g
        },
        tiktok: {
            name: 'TikTok Pixel',
            scriptPatterns: [
                /analytics\.tiktok\.com/,
                /tiktok\.com\/i18n\/pixel/
            ],
            globalCheck: 'ttq',
            idPatterns: {
                load: /ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/g,
                script: /sdkid=([A-Z0-9]+)/gi,
                instance: /ttq\.instance\s*\(\s*['"]([A-Z0-9]+)['"]/g
            }
        },
        google: {
            name: 'Google Tags',
            scriptPatterns: [
                /googletagmanager\.com\/gtm\.js/,
                /googletagmanager\.com\/gtag/,
                /google-analytics\.com\/analytics\.js/,
                /googleads\.g\.doubleclick\.net/,
                /googlesyndication\.com/,
                /googleadservices\.com/
            ],
            globalCheck: 'dataLayer',
            // Enhanced pattern to capture all Google tag types
            idPatterns: {
                gtm: /GTM-[A-Z0-9]+/g,
                ga4: /G-[A-Z0-9]+/g,
                ua: /UA-\d+-\d+/g,
                ads: /AW-\d+/g,
                dc: /DC-\d+/g
            }
        },
        zalo: {
            name: 'Zalo',
            scriptPatterns: [
                /sp\.zalo\.me/,
                /zaloapp\.com/,
                /page\.widget\.zalo\.me/
            ],
            globalCheck: 'ZaloSocialSDK',
            idPatterns: {
                pixel: /zaloPixelId\s*[:=]\s*['"]?(\d+)/g,
                oaid: /oaid['":\s]+['"]?(\d+)/gi,
                widget: /data-oaid=['"](\d+)/gi
            }
        }
    };

    // Scan DOM for scripts
    function scanScripts() {
        const scripts = document.querySelectorAll('script[src], script:not([src])');
        const detected = {};

        scripts.forEach(script => {
            const src = script.src || '';
            const content = script.textContent || '';

            for (const [key, platform] of Object.entries(platformPatterns)) {
                // Check script src
                for (const pattern of platform.scriptPatterns) {
                    if (pattern.test(src)) {
                        if (!detected[key]) {
                            detected[key] = { installed: true, pixelIds: [], tags: [], source: 'script_src' };
                        }
                    }
                }

                // Check inline script content
                if (content.length > 0) {
                    for (const pattern of platform.scriptPatterns) {
                        if (pattern.test(content)) {
                            if (!detected[key]) {
                                detected[key] = { installed: true, pixelIds: [], tags: [], source: 'inline_script' };
                            }
                        }
                    }

                    // Extract pixel IDs - special handling for platforms with idPatterns
                    if (platform.idPatterns) {
                        if (!detected[key]) {
                            detected[key] = { installed: true, pixelIds: [], tags: [], source: 'inline_script' };
                        }

                        for (const [tagType, pattern] of Object.entries(platform.idPatterns)) {
                            const matches = content.matchAll(pattern);
                            for (const match of matches) {
                                const tagId = match[1] || match[0];
                                if (!detected[key].tags.some(t => t.id === tagId)) {
                                    let label = tagType;
                                    if (key === 'google') label = getGoogleTagLabel(tagType);
                                    else if (key === 'tiktok') label = 'TikTok Pixel';
                                    else if (key === 'zalo') label = tagType === 'oaid' ? 'Zalo OA' : 'Zalo Pixel';

                                    detected[key].tags.push({
                                        type: tagType,
                                        id: tagId,
                                        label: label
                                    });
                                    if (!detected[key].pixelIds.includes(tagId)) {
                                        detected[key].pixelIds.push(tagId);
                                    }
                                }
                            }
                        }
                    } else if (platform.idPattern) {
                        const matches = content.matchAll(platform.idPattern);
                        for (const match of matches) {
                            if (match[1]) {
                                if (!detected[key]) {
                                    detected[key] = { installed: true, pixelIds: [], tags: [], source: 'inline_script' };
                                }
                                if (!detected[key].pixelIds.includes(match[1])) {
                                    detected[key].pixelIds.push(match[1]);
                                }
                            }
                        }
                    }
                }
            }
        });

        // Also check script src for Google tag IDs
        scripts.forEach(script => {
            const src = script.src || '';
            if (src.includes('googletagmanager.com') || src.includes('google-analytics.com')) {
                const patterns = platformPatterns.google.idPatterns;
                for (const [tagType, pattern] of Object.entries(patterns)) {
                    const matches = src.matchAll(pattern);
                    for (const match of matches) {
                        const tagId = match[0];
                        if (!detected.google) {
                            detected.google = { installed: true, pixelIds: [], tags: [], source: 'script_src' };
                        }
                        if (!detected.google.tags.some(t => t.id === tagId)) {
                            detected.google.tags.push({
                                type: tagType,
                                id: tagId,
                                label: getGoogleTagLabel(tagType)
                            });
                            if (!detected.google.pixelIds.includes(tagId)) {
                                detected.google.pixelIds.push(tagId);
                            }
                        }
                    }
                }
            }
        });

        return detected;
    }

    function getGoogleTagLabel(type) {
        const labels = {
            gtm: 'Google Tag Manager',
            ga4: 'Google Analytics 4',
            ua: 'Universal Analytics',
            ads: 'Google Ads',
            dc: 'Floodlight'
        };
        return labels[type] || type.toUpperCase();
    }

    // Check for global functions
    // NOTE: Content script runs in isolated world, cannot access page globals.
    // Globals are detected by hooks.js (page context) and sent via postMessage.
    function checkGlobals() {
        return {}; // Always empty from content script — hooks.js handles this
    }

    // Additional scan for Zalo widget OAID from DOM elements
    function scanZaloWidget() {
        const result = {};

        // Look for Zalo widget elements with OAID
        const zaloWidgets = document.querySelectorAll('[data-oaid], .zalo-chat-widget, #zalo-oa-widget, .widget-za-button');

        for (const widget of zaloWidgets) {
            const oaid = widget.getAttribute('data-oaid');
            if (oaid) {
                result.oaid = oaid;
                break;
            }
        }

        // Also check iframes for Zalo widget
        const iframes = document.querySelectorAll('iframe[src*="zalo"]');
        for (const iframe of iframes) {
            const src = iframe.src || '';
            const match = src.match(/oaid=(\d+)/i);
            if (match && match[1]) {
                result.oaid = match[1];
                break;
            }
        }

        return result;
    }

    // Inject hooks script into page context
    function injectHooks() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('content/hooks.js');
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    }

    // Listen for messages from injected hooks (events + globals + dataLayer)
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (!event.data || !event.data.type) return;

        // Captured pixel events from hooks
        if (event.data.type === 'PIXEL_INSPECTOR_EVENT') {
            chrome.runtime.sendMessage({
                type: 'EVENT_CAPTURED',
                data: event.data.payload
            });
        }

        // Globals broadcast from hooks.js (page context)
        if (event.data.type === 'PIXEL_INSPECTOR_GLOBALS') {
            const globals = event.data.globals || {};
            for (const [platform, loaded] of Object.entries(globals)) {
                if (loaded) {
                    chrome.runtime.sendMessage({
                        type: 'PIXEL_GLOBAL_LOADED',
                        data: { platform, loaded: true }
                    });
                }
            }
        }
    });

    // Main scan function
    function performScan() {
        const scriptDetections = scanScripts();
        const globalDetections = checkGlobals(); // Always empty from content script — hooks.js handles globals
        const zaloWidgetData = scanZaloWidget();

        // Merge results
        const allPlatforms = new Set([
            ...Object.keys(scriptDetections),
            ...Object.keys(globalDetections)
        ]);

        // Add Zalo if we found OAID from widget but not from scripts
        if (zaloWidgetData.oaid && !scriptDetections.zalo) {
            scriptDetections.zalo = {
                installed: true,
                pixelIds: [zaloWidgetData.oaid],
                tags: [{ type: 'oaid', id: zaloWidgetData.oaid, label: 'Zalo OA' }],
                source: 'widget'
            };
            allPlatforms.add('zalo');
        } else if (zaloWidgetData.oaid && scriptDetections.zalo) {
            // Merge OAID into existing Zalo detection
            if (!scriptDetections.zalo.pixelIds.includes(zaloWidgetData.oaid)) {
                scriptDetections.zalo.pixelIds.push(zaloWidgetData.oaid);
                scriptDetections.zalo.tags.push({
                    type: 'oaid',
                    id: zaloWidgetData.oaid,
                    label: 'Zalo OA'
                });
            }
        }

        for (const platform of allPlatforms) {
            const scriptData = scriptDetections[platform] || {};
            const globalData = globalDetections[platform] || {}; // This will be empty

            chrome.runtime.sendMessage({
                type: 'PIXEL_DETECTED',
                data: {
                    platform,
                    pixelId: scriptData.pixelIds?.[0] || null,
                    status: globalData.loaded ? 'loaded' : 'installed', // status will primarily be 'installed' from content script
                    source: scriptData.source || 'global_check',
                    allPixelIds: scriptData.pixelIds || [],
                    tags: scriptData.tags || []
                }
            });
        }
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectHooks();
            setTimeout(performScan, 500);
        });
    } else {
        injectHooks();
        setTimeout(performScan, 500);
    }

    // Delayed re-scans to catch late-loading pixels
    setTimeout(performScan, 1500);
    setTimeout(performScan, 3000);

    // Re-scan on SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(performScan, 1000);
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(performScan, 1000);
    };

    window.addEventListener('popstate', () => {
        setTimeout(performScan, 1000);
    });

    // ── DataLayer Inspector handler ──
    // Uses postMessage to hooks.js (page context) instead of inline script (CSP-safe)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'GET_DATALAYER') {
            let responded = false;

            // 1. Set up listener for response from hooks.js
            const handler = (event) => {
                if (event.source !== window) return;
                if (event.data?.type === 'PIXEL_INSPECTOR_DATALAYER') {
                    window.removeEventListener('message', handler);
                    if (!responded) {
                        responded = true;
                        sendResponse({ dataLayer: event.data.dataLayer || [] });
                    }
                }
            };
            window.addEventListener('message', handler);

            // 2. Request dataLayer from hooks.js via postMessage (page context, bypasses CSP)
            window.postMessage({ type: 'PIXEL_INSPECTOR_REQUEST_DATALAYER' }, '*');

            // 3. Timeout fallback
            setTimeout(() => {
                window.removeEventListener('message', handler);
                if (!responded) {
                    responded = true;
                    sendResponse({ dataLayer: [] });
                }
            }, 3000);

            return true; // keep message channel open
        }
    });

})();
