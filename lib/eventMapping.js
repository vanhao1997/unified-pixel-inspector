/**
 * EVENT_DICTIONARY
 * Maps generic actions to GA4, Meta, TikTok, Zalo, and Google Ads.
 * Platform values use { name: '...' } format for compatibility with codeGenerator/gtmTagBuilder.
 */
const EVENT_DICTIONARY = {
    // --- E-COMMERCE EVENTS ---

    'view_content': {
        label: 'View Content (Xem nội dung)',
        icon: '👀',
        description: 'Track khi khách hàng xem trang chi tiết sản phẩm',
        ga4: { name: 'view_item' },
        meta: { name: 'ViewContent' },
        tiktok: { name: 'ViewContent' },
        zalo: { name: 'ViewContent' },
        google_ads: { name: 'conversion', note: 'Page Load conversion' },
        type: 'ecommerce',
        requiredParams: ['value', 'currency', 'items']
    },

    'add_to_cart': {
        label: 'Add to Cart (Thêm vào giỏ)',
        icon: '🛒',
        description: 'Track khi khách hàng bấm nút Thêm vào giỏ',
        ga4: { name: 'add_to_cart' },
        meta: { name: 'AddToCart' },
        tiktok: { name: 'AddToCart' },
        zalo: { name: 'AddToCart' },
        google_ads: { name: 'conversion', note: 'Add to Cart conversion' },
        type: 'ecommerce',
        requiredParams: ['value', 'currency', 'items']
    },

    'initiate_checkout': {
        label: 'Initiate Checkout (Bắt đầu thanh toán)',
        icon: '💳',
        description: 'Track khi khách hàng bấm nút Thanh toán / Checkout',
        ga4: { name: 'begin_checkout' },
        meta: { name: 'InitiateCheckout' },
        tiktok: { name: 'InitiateCheckout' },
        zalo: { name: 'InitiateCheckout' },
        google_ads: { name: 'conversion', note: 'Checkout conversion' },
        type: 'ecommerce',
        requiredParams: ['value', 'currency', 'items']
    },

    'purchase': {
        label: 'Purchase (Mua hàng)',
        icon: '💰',
        description: 'Track trang Cảm ơn sau khi mua hàng thành công',
        ga4: { name: 'purchase' },
        meta: { name: 'Purchase' },
        tiktok: { name: 'CompletePayment' },
        zalo: { name: 'Purchase' },
        google_ads: { name: 'conversion', note: 'Purchase conversion' },
        type: 'ecommerce',
        requiredParams: ['value', 'currency', 'transaction_id', 'items']
    },

    // --- LEAD GENERATION / USER ACTION EVENTS ---

    'generate_lead': {
        label: 'Submit Lead (Điền form tư vấn)',
        icon: '📝',
        description: 'Track khi khách hàng điền form nhận tư vấn',
        ga4: { name: 'generate_lead' },
        meta: { name: 'Lead' },
        tiktok: { name: 'SubmitForm' },
        zalo: { name: 'Lead' },
        google_ads: { name: 'conversion', note: 'Lead conversion' },
        type: 'general',
        requiredParams: ['value', 'currency']
    },

    'contact': {
        label: 'Contact (Liên hệ)',
        icon: '📞',
        description: 'Track khi khách hàng bấm nút Gọi, Zalo, Chat',
        ga4: { name: 'contact' },
        meta: { name: 'Contact' },
        tiktok: { name: 'Contact' },
        zalo: { name: 'Contact' },
        google_ads: { name: 'conversion', note: 'Contact conversion' },
        type: 'general',
        requiredParams: []
    },

    'search': {
        label: 'Search (Tìm kiếm)',
        icon: '🔍',
        description: 'Track hành vi tìm kiếm trên trang',
        ga4: { name: 'search' },
        meta: { name: 'Search' },
        tiktok: { name: 'Search' },
        zalo: { name: 'Search' },
        google_ads: { name: 'conversion', note: 'Search conversion' },
        type: 'general',
        requiredParams: ['search_term']
    },

    'registration': {
        label: 'Complete Registration (Đăng ký)',
        icon: '👤',
        description: 'Track khi khách hàng tạo tài khoản mới',
        ga4: { name: 'sign_up' },
        meta: { name: 'CompleteRegistration' },
        tiktok: { name: 'CompleteRegistration' },
        zalo: { name: 'CompleteRegistration' },
        google_ads: { name: 'conversion', note: 'Sign-up conversion' },
        type: 'general',
        requiredParams: []
    },

    // --- CUSTOM EVENT ---
    'custom': {
        label: 'Custom Event (Tùy chỉnh)',
        icon: '⚙️',
        description: 'Tự định nghĩa CSS Selector và tên sự kiện',
        ga4: { name: null },
        meta: { name: null },
        tiktok: { name: null },
        zalo: { name: null },
        google_ads: { name: null },
        type: 'custom',
        requiredParams: []
    }
};

/**
 * Generates the DataLayer push code based on the event selection.
 */
function generateDataLayerSnippet(eventKey, params = {}) {
    const eventConfig = EVENT_DICTIONARY[eventKey];
    if (!eventConfig) return '// Error: Unknown event type';

    const eventName = eventKey === 'custom'
        ? (params.customEventName || 'custom_event')
        : eventConfig.ga4.name;

    const dlObject = { 'event': eventName };

    if (eventConfig.type === 'ecommerce') {
        dlObject.ecommerce = {
            value: params.value || 0,
            currency: params.currency || 'VND',
            items: params.items || []
        };
        if (eventKey === 'purchase' && params.transaction_id) {
            dlObject.ecommerce.transaction_id = params.transaction_id;
        }
    } else {
        if (params.value) dlObject.value = params.value;
        if (params.currency) dlObject.currency = params.currency;
        if (params.search_term) dlObject.search_term = params.search_term;
        if (params.customParams) {
            Object.assign(dlObject, params.customParams);
        }
    }

    return `window.dataLayer = window.dataLayer || [];\nwindow.dataLayer.push(${JSON.stringify(dlObject, null, 2)});`;
}

// Expose globally
window.EVENT_DICTIONARY = EVENT_DICTIONARY;
window.generateDataLayerSnippet = generateDataLayerSnippet;
