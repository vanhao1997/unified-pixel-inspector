/**
 * Code Generator - Unified Action Tracking
 * Generates tracking code for multiple platforms from unified input
 * Supports both Direct installation and GTM (Google Tag Manager) mode
 */

class CodeGenerator {
    constructor() {
        this.templates = {
            meta: this.generateMetaCode.bind(this),
            tiktok: this.generateTikTokCode.bind(this),
            ga4: this.generateGA4Code.bind(this),
            zalo: this.generateZaloCode.bind(this)
        };

        this.gtmTemplates = {
            meta: this.generateMetaGTMCode.bind(this),
            tiktok: this.generateTikTokGTMCode.bind(this),
            ga4: this.generateGA4GTMCode.bind(this),
            zalo: this.generateZaloGTMCode.bind(this)
        };
    }

    /**
     * Generate tracking code for all selected platforms
     * Returns both direct and GTM-ready code
     */
    generate(config) {
        const { action, platforms, params, pixelIds } = config;
        const eventConfig = EVENT_MAPPING[action];

        if (!eventConfig) {
            throw new Error(`Unknown action: ${action}`);
        }

        const result = {
            combined: '',
            gtmCombined: '',
            platforms: {},
            gtmPlatforms: {}
        };

        platforms.forEach(platform => {
            // Direct code
            if (this.templates[platform]) {
                const code = this.templates[platform](eventConfig, params, pixelIds[platform]);
                result.platforms[platform] = code;
                result.combined += code + '\n\n';
            }
            // GTM code
            if (this.gtmTemplates[platform]) {
                const gtmCode = this.gtmTemplates[platform](eventConfig, params, pixelIds[platform], action);
                result.gtmPlatforms[platform] = gtmCode;
                result.gtmCombined += gtmCode + '\n\n';
            }
        });

        return result;
    }

    /**
     * Transform unified params to platform-specific format
     */
    transformParams(params, platform) {
        const transformed = { ...params };

        // Transform items array for different platforms
        if (params.items && params.items.length > 0) {
            switch (platform) {
                case 'meta':
                    transformed.content_ids = params.items.map(item => item.id);
                    transformed.content_type = params.items.length > 1 ? 'product_group' : 'product';
                    transformed.num_items = params.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    delete transformed.items;
                    break;

                case 'tiktok':
                    transformed.contents = params.items.map(item => ({
                        content_id: item.id,
                        content_name: item.name,
                        content_type: 'product',
                        price: item.price,
                        quantity: item.quantity || 1
                    }));
                    delete transformed.items;
                    break;

                case 'ga4':
                    transformed.items = params.items.map(item => ({
                        item_id: item.id,
                        item_name: item.name,
                        price: item.price,
                        quantity: item.quantity || 1
                    }));
                    break;

                case 'zalo':
                    transformed.content_ids = params.items.map(item => item.id);
                    delete transformed.items;
                    break;
            }
        }

        return transformed;
    }

    // ═══════════════════════════════════════
    // DIRECT CODE (paste vào website)
    // ═══════════════════════════════════════

    generateMetaCode(eventConfig, params, pixelId) {
        const eventName = eventConfig.meta.name;
        const transformedParams = this.transformParams(params, 'meta');
        const cleanParams = this.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        return `// ===== META PIXEL =====
// Pixel ID: ${pixelId || 'YOUR_PIXEL_ID'}
fbq('track', '${eventName}'${paramsStr});`;
    }

    generateTikTokCode(eventConfig, params, pixelId) {
        const eventName = eventConfig.tiktok.name;
        const transformedParams = this.transformParams(params, 'tiktok');
        const cleanParams = this.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        return `// ===== TIKTOK PIXEL =====
// Pixel ID: ${pixelId || 'YOUR_PIXEL_ID'}
ttq.track('${eventName}'${paramsStr});`;
    }

    generateGA4Code(eventConfig, params, measurementId) {
        const eventName = eventConfig.ga4.name;
        const transformedParams = this.transformParams(params, 'ga4');

        if (eventName === 'purchase' && !transformedParams.transaction_id) {
            transformedParams.transaction_id = 'TXN_' + Date.now();
        }

        const cleanParams = this.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        return `// ===== GOOGLE ANALYTICS 4 =====
// Measurement ID: ${measurementId || 'G-XXXXXXXXXX'}
gtag('event', '${eventName}'${paramsStr});`;
    }

    generateZaloCode(eventConfig, params, pixelId) {
        const eventName = eventConfig.zalo.name;
        const transformedParams = this.transformParams(params, 'zalo');
        const cleanParams = this.cleanParams(transformedParams);

        const paramsArr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        return `// ===== ZALO PIXEL =====
// Pixel ID: ${pixelId || 'YOUR_ZALO_PIXEL_ID'}
ZPP.push(['${eventName.toLowerCase()}'${paramsArr}]);`;
    }

    // ═══════════════════════════════════════
    // GTM CODE (dùng trong Google Tag Manager)
    // ═══════════════════════════════════════

    /**
     * Meta Pixel → GTM: Custom HTML Tag
     */
    generateMetaGTMCode(eventConfig, params, pixelId, action) {
        const eventName = eventConfig.meta.name;
        const transformedParams = this.transformParams(params, 'meta');
        const cleanParams = this.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 4)}`
            : '';

        const label = eventConfig.label || action;

        return `<!-- ═══ GTM: META PIXEL — ${label} ═══ -->
<!-- Tag Type: Custom HTML -->
<!-- Tag Name: Meta - ${eventName} -->
<script>
  fbq('track', '${eventName}'${paramsStr});
</script>`;
    }

    /**
     * TikTok Pixel → GTM: Custom HTML Tag
     */
    generateTikTokGTMCode(eventConfig, params, pixelId, action) {
        const eventName = eventConfig.tiktok.name;
        const transformedParams = this.transformParams(params, 'tiktok');
        const cleanParams = this.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 4)}`
            : '';

        const label = eventConfig.label || action;

        return `<!-- ═══ GTM: TIKTOK PIXEL — ${label} ═══ -->
<!-- Tag Type: Custom HTML -->
<!-- Tag Name: TikTok - ${eventName} -->
<script>
  ttq.track('${eventName}'${paramsStr});
</script>`;
    }

    /**
     * GA4 → GTM: dataLayer.push (dùng với GA4 Event Tag)
     * Trong GTM, KHÔNG dùng gtag() — phải dùng dataLayer.push
     */
    generateGA4GTMCode(eventConfig, params, measurementId, action) {
        const eventName = eventConfig.ga4.name;
        const transformedParams = this.transformParams(params, 'ga4');

        if (eventName === 'purchase' && !transformedParams.transaction_id) {
            transformedParams.transaction_id = 'TXN_' + Date.now();
        }

        const cleanParams = this.cleanParams(transformedParams);
        const label = eventConfig.label || action;

        // Build dataLayer object
        const dlObj = { event: eventName };

        // For ecommerce events, nest under ecommerce key
        const ecommerceEvents = ['add_to_cart', 'begin_checkout', 'add_payment_info', 'purchase', 'view_item'];
        if (ecommerceEvents.includes(eventName)) {
            dlObj.ecommerce = cleanParams;
        } else {
            Object.assign(dlObj, cleanParams);
        }

        return `// ═══ GTM: GOOGLE ANALYTICS 4 — ${label} ═══
// ⚠️ KHÔNG tạo Custom HTML tag!
// → Tạo "GA4 Event" tag trong GTM
// → Event Name: ${eventName}
// → Trigger: Custom Event = "${eventName}"
//
// Paste code này vào website hoặc Custom HTML tag riêng:
dataLayer.push(${JSON.stringify(dlObj, null, 2)});`;
    }

    /**
     * Zalo Pixel → GTM: Custom HTML Tag
     */
    generateZaloGTMCode(eventConfig, params, pixelId, action) {
        const eventName = eventConfig.zalo.name;
        const transformedParams = this.transformParams(params, 'zalo');
        const cleanParams = this.cleanParams(transformedParams);

        const paramsArr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 4)}`
            : '';

        const label = eventConfig.label || action;

        return `<!-- ═══ GTM: ZALO PIXEL — ${label} ═══ -->
<!-- Tag Type: Custom HTML -->
<!-- Tag Name: Zalo - ${eventName} -->
<script>
  ZPP.push(['${eventName.toLowerCase()}'${paramsArr}]);
</script>`;
    }

    // ═══════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════

    cleanParams(params) {
        const cleaned = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value) && value.length === 0) continue;
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    validateParams(action, params, platform) {
        const eventConfig = EVENT_MAPPING[action];
        if (!eventConfig || !eventConfig[platform]) {
            return { valid: false, errors: ['Unknown action or platform'] };
        }

        const required = eventConfig[platform].requiredParams;
        const errors = [];

        required.forEach(param => {
            if (param === 'items' || param === 'contents' || param === 'content_ids') {
                if (!params.items || params.items.length === 0) {
                    errors.push(`Missing required: product items`);
                }
            } else if (!params[param]) {
                errors.push(`Missing required: ${param}`);
            }
        });

        return { valid: errors.length === 0, errors };
    }

    /**
     * Generate GTM Trigger recommendation based on action type
     */
    getTriggerRecommendation(action) {
        const triggers = {
            page_view: {
                type: 'Page View',
                config: 'Page View — All Pages hoặc specific pages',
                detail: 'Trigger Type: Page View\nFiring: All Pages (hoặc chọn Some Pages với URL chứa path cụ thể)'
            },
            view_content: {
                type: 'Page View',
                config: 'Page View — Some Pages (URL chứa /product/ hoặc /san-pham/)',
                detail: 'Trigger Type: Page View\nFiring: Some Pages\nCondition: Page URL contains "/product/" hoặc "/san-pham/"'
            },
            add_to_cart: {
                type: 'Custom Event',
                config: 'Custom Event — add_to_cart',
                detail: 'Trigger Type: Custom Event\nEvent Name: add_to_cart\n⚠️ Website cần push dataLayer event khi click nút Thêm vào giỏ'
            },
            checkout: {
                type: 'Page View',
                config: 'Page View — URL chứa /checkout/',
                detail: 'Trigger Type: Page View\nFiring: Some Pages\nCondition: Page URL contains "/checkout/"'
            },
            add_payment: {
                type: 'Custom Event',
                config: 'Custom Event — add_payment_info',
                detail: 'Trigger Type: Custom Event\nEvent Name: add_payment_info'
            },
            purchase: {
                type: 'Custom Event',
                config: 'Custom Event — purchase hoặc Page View trang Thank You',
                detail: 'Trigger Type: Page View\nFiring: Some Pages\nCondition: Page URL contains "/thank-you/" hoặc "/dat-hang-thanh-cong/"\n\nHoặc:\nTrigger Type: Custom Event\nEvent Name: purchase'
            },
            lead: {
                type: 'Form Submission',
                config: 'Form Submission — All Forms hoặc form cụ thể',
                detail: 'Trigger Type: Form Submission\nFiring: All Forms (hoặc Some Forms với Form ID/Class cụ thể)\n✅ Bật "Check Validation" nếu dùng AJAX form'
            },
            signup: {
                type: 'Custom Event',
                config: 'Custom Event — sign_up hoặc Form Submission',
                detail: 'Trigger Type: Form Submission (nếu là form đăng ký)\nHoặc: Custom Event với Event Name: sign_up'
            },
            contact: {
                type: 'Click',
                config: 'Click — nút Liên hệ hoặc Hotline',
                detail: 'Trigger Type: Click — All Elements\nFiring: Some Clicks\nCondition: Click URL contains "tel:" hoặc Click Text contains "Liên hệ"'
            },
            search: {
                type: 'Custom Event',
                config: 'Custom Event — search hoặc Form Submission',
                detail: 'Trigger Type: Form Submission (search form)\nHoặc: Custom Event Event Name: search'
            },
            button_click: {
                type: 'Click',
                config: 'Click — All Elements → filter theo CSS Selector / Click Text',
                detail: 'Trigger Type: Click — All Elements\nFiring: Some Clicks\nCondition:\n  - Click Element matches CSS selector: [YOUR_SELECTOR]\n  - Hoặc Click Text equals: [button text]'
            },
            form_submit: {
                type: 'Form Submission',
                config: 'Form Submission — filter theo Form ID/Class',
                detail: 'Trigger Type: Form Submission\nFiring: Some Forms\nCondition: Form ID equals [form-id] hoặc Form Classes contains [class]\n✅ Bật "Check Validation" để chỉ fire khi form valid'
            },
            download: {
                type: 'Click',
                config: 'Click — Just Links → filter theo Click URL chứa file extension',
                detail: 'Trigger Type: Click — Just Links\nFiring: Some Link Clicks\nCondition: Click URL ends with .pdf / .xlsx / .zip'
            },
            scroll_depth: {
                type: 'Scroll Depth',
                config: 'Scroll Depth — Vertical Scroll 25%, 50%, 75%, 90%',
                detail: 'Trigger Type: Scroll Depth\nFiring: Vertical Scroll Depths\nPercentages: 25, 50, 75, 90\n✅ GTM có sẵn trigger này, không cần Custom Event'
            },
            video_play: {
                type: 'YouTube Video',
                config: 'YouTube Video → Start / Pause / Complete',
                detail: 'Trigger Type: YouTube Video\nCapture: Start, Pause, Complete, Progress (25%, 50%, 75%)\n⚠️ Chỉ hoạt động với YouTube embed. Video khác cần Custom Event'
            }
        };

        return triggers[action] || {
            type: 'Custom Event',
            config: 'Custom Event',
            detail: 'Trigger Type: Custom Event\nEvent Name: [tên event]'
        };
    }
}

// Create global instance
const codeGenerator = new CodeGenerator();
