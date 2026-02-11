// Page Context Hooks - Unified Pixel Inspector
// Hooks into tracking APIs to capture events in real-time

(function () {
    'use strict';

    // TikTok Standard Events (from TikTok documentation)
    const TIKTOK_STANDARD_EVENTS = [
        'AddPaymentInfo', 'AddToCart', 'AddToWishlist', 'ClickButton',
        'CompletePayment', 'CompleteRegistration', 'Contact', 'Download',
        'InitiateCheckout', 'PlaceAnOrder', 'Search', 'SubmitForm',
        'Subscribe', 'ViewContent', 'Pageview', 'LandingPageView'
    ];

    // Helper to send events to content script
    function sendEvent(platform, eventName, params, pixelId, eventType) {
        window.postMessage({
            type: 'PIXEL_INSPECTOR_EVENT',
            payload: {
                platform,
                event: eventName,
                params: maskSensitiveData(params),
                pixelId,
                eventType: eventType || 'custom',
                source: 'function_hook',
                timestamp: Date.now()
            }
        }, '*');
    }

    // Mask sensitive parameters
    function maskSensitiveData(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const sensitiveKeys = ['email', 'em', 'phone', 'ph', 'fn', 'ln', 'first_name', 'last_name', 'external_id'];
        const masked = Array.isArray(obj) ? [...obj] : { ...obj };

        for (const key of Object.keys(masked)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                masked[key] = '[MASKED]';
            } else if (typeof masked[key] === 'object' && masked[key] !== null) {
                masked[key] = maskSensitiveData(masked[key]);
            }
        }

        return masked;
    }

    // ============================================
    // META PIXEL HOOKS
    // ============================================
    function hookFbq() {
        if (typeof window.fbq !== 'undefined') {
            const originalFbq = window.fbq;

            window.fbq = function (...args) {
                try {
                    const [action, eventName, params] = args;

                    if (action === 'track' || action === 'trackCustom') {
                        sendEvent('meta', eventName, params, window.fbq._pixelId, action);
                    } else if (action === 'init') {
                        window.fbq._pixelId = eventName;
                        sendEvent('meta', 'PixelInitialized', { pixelId: eventName }, eventName, 'init');
                    }
                } catch (e) {
                    console.warn('[Pixel Inspector] Error hooking fbq:', e);
                }

                return originalFbq.apply(this, args);
            };

            Object.assign(window.fbq, originalFbq);
        }
    }

    // ============================================
    // TIKTOK PIXEL HOOKS (Enhanced)
    // ============================================
    let ttqPixelId = null;
    let ttqHooked = false;

    function hookTtq() {
        // Get pixel ID from various TikTok pixel structures
        function extractPixelId() {
            try {
                // Method 1: From ttq._i array (most common)
                if (window.ttq && window.ttq._i && window.ttq._i.length > 0) {
                    const firstInstance = window.ttq._i[0];
                    if (Array.isArray(firstInstance) && firstInstance[0]) {
                        return firstInstance[0];
                    }
                }

                // Method 2: From ttq.methods queue
                if (window.ttq && window.ttq._o && window.ttq._o.pixelCode) {
                    return window.ttq._o.pixelCode;
                }

                // Method 3: From window global
                if (window.TiktokAnalyticsObject) {
                    const obj = window[window.TiktokAnalyticsObject];
                    if (obj && obj._i && obj._i[0]) {
                        return obj._i[0][0];
                    }
                }

                // Method 4: Search in scripts for ttq.load call
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const content = script.textContent || '';
                    const match = content.match(/ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/i);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
            } catch (e) { }
            return ttqPixelId;
        }

        function doHook() {
            if (ttqHooked || !window.ttq) return;

            ttqPixelId = extractPixelId();

            const ttq = window.ttq;

            // Hook track method
            if (typeof ttq.track === 'function' && !ttq._trackHooked) {
                const originalTrack = ttq.track.bind(ttq);
                ttq.track = function (eventName, params) {
                    try {
                        const pid = ttqPixelId || extractPixelId();
                        const isStandard = TIKTOK_STANDARD_EVENTS.includes(eventName);
                        sendEvent('tiktok', eventName, params || {}, pid, isStandard ? 'standard' : 'custom');
                    } catch (e) { }
                    return originalTrack(eventName, params);
                };
                ttq._trackHooked = true;
            }

            // Hook page method
            if (typeof ttq.page === 'function' && !ttq._pageHooked) {
                const originalPage = ttq.page.bind(ttq);
                ttq.page = function () {
                    try {
                        const pid = ttqPixelId || extractPixelId();
                        sendEvent('tiktok', 'Pageview', { url: window.location.href }, pid, 'pageview');
                    } catch (e) { }
                    return originalPage.apply(this, arguments);
                };
                ttq._pageHooked = true;
            }

            // Hook identify method
            if (typeof ttq.identify === 'function' && !ttq._identifyHooked) {
                const originalIdentify = ttq.identify.bind(ttq);
                ttq.identify = function (params) {
                    try {
                        const pid = ttqPixelId || extractPixelId();
                        sendEvent('tiktok', 'Identify', params || {}, pid, 'identify');
                    } catch (e) { }
                    return originalIdentify(params);
                };
                ttq._identifyHooked = true;
            }

            // Hook load method to capture pixel ID
            if (typeof ttq.load === 'function' && !ttq._loadHooked) {
                const originalLoad = ttq.load.bind(ttq);
                ttq.load = function (pixelId, options) {
                    try {
                        ttqPixelId = pixelId;
                        sendEvent('tiktok', 'PixelLoaded', { pixelId, options }, pixelId, 'load');
                    } catch (e) { }
                    return originalLoad(pixelId, options);
                };
                ttq._loadHooked = true;
            }

            // Hook instance method for multi-pixel setup
            if (typeof ttq.instance === 'function' && !ttq._instanceHooked) {
                const originalInstance = ttq.instance.bind(ttq);
                ttq.instance = function (pixelId) {
                    const instance = originalInstance(pixelId);
                    if (instance && typeof instance.track === 'function' && !instance._trackHooked) {
                        const origTrack = instance.track.bind(instance);
                        instance.track = function (eventName, params) {
                            try {
                                sendEvent('tiktok', eventName, params || {}, pixelId, 'instance_track');
                            } catch (e) { }
                            return origTrack(eventName, params);
                        };
                        instance._trackHooked = true;
                    }
                    return instance;
                };
                ttq._instanceHooked = true;
            }

            ttqHooked = true;

            // Send initial pixel detection if ID found
            if (ttqPixelId) {
                window.postMessage({
                    type: 'PIXEL_INSPECTOR_EVENT',
                    payload: {
                        platform: 'tiktok',
                        event: 'PixelDetected',
                        params: {},
                        pixelId: ttqPixelId,
                        eventType: 'detection',
                        source: 'script_analysis'
                    }
                }, '*');
            }
        }

        // Try to hook immediately
        doHook();

        // Also watch for ttq to be defined later
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window.ttq && !ttqHooked) {
                doHook();
            }
            if (ttqHooked || attempts > 20) {
                clearInterval(interval);
            }
        }, 500);

        // Hook the array push if ttq starts as array
        if (window.ttq && Array.isArray(window.ttq)) {
            const originalPush = Array.prototype.push;
            window.ttq.push = function (...args) {
                try {
                    for (const arg of args) {
                        if (Array.isArray(arg)) {
                            const [method, ...params] = arg;
                            if (method === 'load' && params[0]) {
                                ttqPixelId = params[0];
                            } else if (method === 'track' && params[0]) {
                                sendEvent('tiktok', params[0], params[1] || {}, ttqPixelId, 'queue');
                            } else if (method === 'page') {
                                sendEvent('tiktok', 'Pageview', {}, ttqPixelId, 'queue');
                            }
                        }
                    }
                } catch (e) { }
                return originalPush.apply(this, args);
            };
        }
    }

    // ============================================
    // GOOGLE TAG HOOKS
    // ============================================
    function hookGtag() {
        // Hook gtag function
        if (typeof window.gtag !== 'undefined') {
            const originalGtag = window.gtag;

            window.gtag = function (...args) {
                try {
                    const [command, target, params] = args;

                    if (command === 'event') {
                        sendEvent('google', target, params, null, 'gtag_event');
                    } else if (command === 'config') {
                        sendEvent('google', 'config', { measurement_id: target, ...(params || {}) }, target, 'gtag_config');
                    }
                } catch (e) {
                    console.warn('[Pixel Inspector] Error hooking gtag:', e);
                }

                return originalGtag.apply(this, args);
            };
        }

        // Hook dataLayer.push
        if (window.dataLayer && Array.isArray(window.dataLayer)) {
            const originalPush = window.dataLayer.push;

            window.dataLayer.push = function (...args) {
                try {
                    for (const item of args) {
                        if (item && typeof item === 'object') {
                            if (item.event) {
                                sendEvent('google', item.event, item, null, 'dataLayer');
                            }
                            // Also capture ecommerce events
                            if (item.ecommerce) {
                                sendEvent('google', 'ecommerce', item, null, 'dataLayer_ecommerce');
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Pixel Inspector] Error hooking dataLayer:', e);
                }

                return originalPush.apply(this, args);
            };
        }
    }

    // ============================================
    // LINKEDIN INSIGHT TAG HOOKS
    // ============================================
    function hookLinkedIn() {
        if (typeof window.lintrk !== 'undefined') {
            const originalLintrk = window.lintrk;

            window.lintrk = function (action, data) {
                try {
                    sendEvent('linkedin', action, data, window._linkedin_partner_id, 'lintrk');
                } catch (e) {
                    console.warn('[Pixel Inspector] Error hooking lintrk:', e);
                }

                return originalLintrk.apply(this, arguments);
            };
        }

        // Also capture partner ID
        if (window._linkedin_partner_id) {
            sendEvent('linkedin', 'PartnerIdDetected', { partnerId: window._linkedin_partner_id }, window._linkedin_partner_id, 'detection');
        }
    }

    // ============================================
    // ZALO PIXEL HOOKS
    // ============================================
    function hookZalo() {
        // Zalo Ads Pixel uses different SDK patterns
        // Method 1: ZaloSocialSDK
        if (typeof window.ZaloSocialSDK !== 'undefined') {
            if (window.ZaloSocialSDK.Event && typeof window.ZaloSocialSDK.Event.track === 'function') {
                const originalTrack = window.ZaloSocialSDK.Event.track;
                window.ZaloSocialSDK.Event.track = function (eventName, params) {
                    try {
                        sendEvent('zalo', eventName, params, null, 'zalo_event');
                    } catch (e) { }
                    return originalTrack.apply(this, arguments);
                };
            }
        }

        // Method 2: Zalo Pixel via sp.zalo.me
        // This is tracked via network requests in background.js

        // Method 3: Check for Zalo pixel ID in page
        try {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent || '';
                const src = script.src || '';

                // Look for Zalo pixel patterns
                const pixelMatch = content.match(/zaloPixelId\s*[:=]\s*['"]?(\d+)/i);
                if (pixelMatch && pixelMatch[1]) {
                    sendEvent('zalo', 'PixelDetected', { pixelId: pixelMatch[1] }, pixelMatch[1], 'detection');
                }

                // Check script src for Zalo
                if (src.includes('sp.zalo.me') || src.includes('zaloapp.com')) {
                    const urlPixelId = src.match(/pixelId=(\d+)/i);
                    if (urlPixelId && urlPixelId[1]) {
                        sendEvent('zalo', 'PixelDetected', { pixelId: urlPixelId[1] }, urlPixelId[1], 'detection');
                    }
                }
            }
        } catch (e) { }

        // Hook for Zalo's conversion tracking
        if (window.zaPixel && typeof window.zaPixel === 'function') {
            const originalZaPixel = window.zaPixel;
            window.zaPixel = function (...args) {
                try {
                    sendEvent('zalo', 'zaPixel', { args }, null, 'zalo_pixel');
                } catch (e) { }
                return originalZaPixel.apply(this, args);
            };
        }
    }

    // ============================================
    // GLOBALS BROADCAST (to content script)
    // ============================================
    function broadcastGlobals() {
        const globals = {};
        if (typeof window.fbq !== 'undefined') globals.meta = true;
        if (typeof window.ttq !== 'undefined') globals.tiktok = true;
        if (typeof window.dataLayer !== 'undefined') globals.google = true;
        if (typeof window.gtag !== 'undefined') globals.google = true;
        if (typeof window.ZaloSocialSDK !== 'undefined') globals.zalo = true;
        if (typeof window.zaPixel !== 'undefined') globals.zalo = true;
        if (typeof window.lintrk !== 'undefined') globals.linkedin = true;

        window.postMessage({
            type: 'PIXEL_INSPECTOR_GLOBALS',
            globals: globals
        }, '*');
    }

    // ============================================
    // DATALAYER REQUEST HANDLER
    // ============================================
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'PIXEL_INSPECTOR_REQUEST_DATALAYER') {
            try {
                const dl = window.dataLayer || [];
                const safe = [];
                for (let i = 0; i < dl.length; i++) {
                    try {
                        safe.push(JSON.parse(JSON.stringify(dl[i])));
                    } catch (e) {
                        safe.push({ _error: 'Non-serializable entry', index: i });
                    }
                }
                window.postMessage({
                    type: 'PIXEL_INSPECTOR_DATALAYER',
                    dataLayer: safe
                }, '*');
            } catch (e) {
                window.postMessage({
                    type: 'PIXEL_INSPECTOR_DATALAYER',
                    dataLayer: []
                }, '*');
            }
        }
    });

    // ============================================
    // INITIALIZATION
    // ============================================
    function initHooks() {
        hookFbq();
        hookTtq();
        hookGtag();
        hookLinkedIn();
        hookZalo();
    }

    // Run immediately and retry for late-loading scripts
    initHooks();
    broadcastGlobals();

    setTimeout(() => { initHooks(); broadcastGlobals(); }, 1000);
    setTimeout(() => { initHooks(); broadcastGlobals(); }, 2500);
    setTimeout(() => { initHooks(); broadcastGlobals(); }, 5000);

    // Also listen for DOM changes to catch dynamically loaded pixels
    if (typeof MutationObserver !== 'undefined') {
        let lastHookTime = 0;
        const observer = new MutationObserver((mutations) => {
            const now = Date.now();
            if (now - lastHookTime > 2000) {
                lastHookTime = now;
                initHooks();
                broadcastGlobals();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

})();
