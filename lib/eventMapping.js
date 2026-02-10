/**
 * Event Mapping Library - Unified Action Tracking
 * Maps unified event names to platform-specific events
 */

const EVENT_MAPPING = {
    // === BASIC EVENTS ===
    page_view: {
        label: 'Page View',
        category: 'basic',
        description: 'Khi người dùng xem trang',
        trigger: 'Tự động khi load trang',
        element: 'Trang web',
        meta: { name: 'PageView', requiredParams: [], optionalParams: [] },
        tiktok: { name: 'PageView', requiredParams: [], optionalParams: [] },
        ga4: { name: 'page_view', requiredParams: [], optionalParams: ['page_title', 'page_location'] },
        zalo: { name: 'PageView', requiredParams: [], optionalParams: [] }
    },

    // === E-COMMERCE EVENTS ===
    view_content: {
        label: 'View Content',
        category: 'ecommerce',
        description: 'Khi người dùng xem sản phẩm',
        trigger: 'Khi mở trang chi tiết sản phẩm',
        element: 'Trang sản phẩm',
        meta: {
            name: 'ViewContent',
            requiredParams: ['content_ids', 'content_type'],
            optionalParams: ['value', 'currency', 'content_name']
        },
        tiktok: {
            name: 'ViewContent',
            requiredParams: ['contents'],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'view_item',
            requiredParams: ['items'],
            optionalParams: ['value', 'currency']
        },
        zalo: {
            name: 'ViewContent',
            requiredParams: ['content_ids'],
            optionalParams: ['value', 'currency']
        }
    },

    add_to_cart: {
        label: 'Add to Cart',
        category: 'ecommerce',
        description: 'Khi thêm sản phẩm vào giỏ',
        trigger: 'Click nút "Thêm vào giỏ hàng"',
        element: 'Nút Add to Cart',
        meta: {
            name: 'AddToCart',
            requiredParams: ['content_ids', 'content_type', 'value', 'currency'],
            optionalParams: ['content_name', 'num_items']
        },
        tiktok: {
            name: 'AddToCart',
            requiredParams: ['contents', 'value', 'currency'],
            optionalParams: []
        },
        ga4: {
            name: 'add_to_cart',
            requiredParams: ['items', 'value', 'currency'],
            optionalParams: []
        },
        zalo: {
            name: 'AddToCart',
            requiredParams: ['content_ids', 'value', 'currency'],
            optionalParams: []
        }
    },

    checkout: {
        label: 'Initiate Checkout',
        category: 'ecommerce',
        description: 'Khi bắt đầu thanh toán',
        trigger: 'Click nút "Thanh toán"',
        element: 'Nút Checkout',
        meta: {
            name: 'InitiateCheckout',
            requiredParams: ['value', 'currency'],
            optionalParams: ['content_ids', 'content_type', 'num_items']
        },
        tiktok: {
            name: 'InitiateCheckout',
            requiredParams: ['contents', 'value', 'currency'],
            optionalParams: []
        },
        ga4: {
            name: 'begin_checkout',
            requiredParams: ['items', 'value', 'currency'],
            optionalParams: ['coupon']
        },
        zalo: {
            name: 'InitiateCheckout',
            requiredParams: ['value', 'currency'],
            optionalParams: []
        }
    },

    add_payment: {
        label: 'Add Payment Info',
        category: 'ecommerce',
        description: 'Khi nhập thông tin thanh toán',
        trigger: 'Hoàn thành form thanh toán',
        element: 'Form thanh toán',
        meta: {
            name: 'AddPaymentInfo',
            requiredParams: ['value', 'currency'],
            optionalParams: ['content_ids', 'content_type']
        },
        tiktok: {
            name: 'AddPaymentInfo',
            requiredParams: ['value', 'currency'],
            optionalParams: ['contents']
        },
        ga4: {
            name: 'add_payment_info',
            requiredParams: ['value', 'currency'],
            optionalParams: ['items', 'payment_type', 'coupon']
        },
        zalo: {
            name: 'AddPaymentInfo',
            requiredParams: ['value', 'currency'],
            optionalParams: []
        }
    },

    purchase: {
        label: 'Purchase',
        category: 'ecommerce',
        description: 'Khi hoàn tất mua hàng',
        trigger: 'Đơn hàng thành công (Thank you page)',
        element: 'Trang cảm ơn',
        meta: {
            name: 'Purchase',
            requiredParams: ['value', 'currency'],
            optionalParams: ['content_ids', 'content_type', 'content_name', 'num_items']
        },
        tiktok: {
            name: 'CompletePayment',
            requiredParams: ['contents', 'value', 'currency'],
            optionalParams: []
        },
        ga4: {
            name: 'purchase',
            requiredParams: ['items', 'value', 'currency', 'transaction_id'],
            optionalParams: ['tax', 'shipping', 'coupon']
        },
        zalo: {
            name: 'Purchase',
            requiredParams: ['value', 'currency'],
            optionalParams: ['content_ids']
        }
    },

    // === LEAD GENERATION EVENTS ===
    lead: {
        label: 'Generate Lead',
        category: 'lead',
        description: 'Khi gửi form liên hệ / đăng ký',
        trigger: 'Submit form đăng ký tư vấn',
        element: 'Form đăng ký',
        meta: {
            name: 'Lead',
            requiredParams: [],
            optionalParams: ['value', 'currency', 'content_name']
        },
        tiktok: {
            name: 'SubmitForm',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'generate_lead',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        zalo: {
            name: 'Lead',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        }
    },

    signup: {
        label: 'Complete Registration',
        category: 'lead',
        description: 'Khi hoàn tất đăng ký tài khoản',
        trigger: 'Đăng ký thành công',
        element: 'Form đăng ký',
        meta: {
            name: 'CompleteRegistration',
            requiredParams: [],
            optionalParams: ['value', 'currency', 'content_name', 'status']
        },
        tiktok: {
            name: 'CompleteRegistration',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'sign_up',
            requiredParams: [],
            optionalParams: ['method']
        },
        zalo: {
            name: 'CompleteRegistration',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        }
    },

    contact: {
        label: 'Contact',
        category: 'lead',
        description: 'Khi liên hệ (gọi, chat, email)',
        trigger: 'Click nút liên hệ / hotline',
        element: 'Nút Liên hệ',
        meta: {
            name: 'Contact',
            requiredParams: [],
            optionalParams: []
        },
        tiktok: {
            name: 'Contact',
            requiredParams: [],
            optionalParams: []
        },
        ga4: {
            name: 'contact',
            requiredParams: [],
            optionalParams: []
        },
        zalo: {
            name: 'Contact',
            requiredParams: [],
            optionalParams: []
        }
    },

    // === ENGAGEMENT EVENTS ===
    search: {
        label: 'Search',
        category: 'engagement',
        description: 'Khi tìm kiếm sản phẩm/nội dung',
        trigger: 'Submit ô tìm kiếm',
        element: 'Ô tìm kiếm',
        meta: {
            name: 'Search',
            requiredParams: ['search_string'],
            optionalParams: ['content_ids', 'content_type']
        },
        tiktok: {
            name: 'Search',
            requiredParams: ['query'],
            optionalParams: []
        },
        ga4: {
            name: 'search',
            requiredParams: ['search_term'],
            optionalParams: []
        },
        zalo: {
            name: 'Search',
            requiredParams: ['search_string'],
            optionalParams: []
        }
    },

    // === INTERACTION EVENTS ===
    button_click: {
        label: 'Button Click',
        category: 'interaction',
        description: 'Khi click vào nút CTA bất kỳ',
        trigger: 'Click vào button',
        element: 'Button / CTA',
        meta: {
            name: 'CustomEvent',
            requiredParams: [],
            optionalParams: ['content_name', 'content_category']
        },
        tiktok: {
            name: 'ClickButton',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'click',
            requiredParams: [],
            optionalParams: ['link_url', 'link_text', 'outbound']
        },
        zalo: {
            name: 'Click',
            requiredParams: [],
            optionalParams: []
        }
    },

    form_submit: {
        label: 'Form Submit',
        category: 'interaction',
        description: 'Khi gửi biểu mẫu bất kỳ',
        trigger: 'Submit form (liên hệ, khảo sát...)',
        element: 'Form / Biểu mẫu',
        meta: {
            name: 'SubmitApplication',
            requiredParams: [],
            optionalParams: ['content_name', 'value', 'currency']
        },
        tiktok: {
            name: 'SubmitForm',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'form_submit',
            requiredParams: [],
            optionalParams: ['form_id', 'form_name']
        },
        zalo: {
            name: 'SubmitForm',
            requiredParams: [],
            optionalParams: []
        }
    },

    download: {
        label: 'Download',
        category: 'interaction',
        description: 'Khi tải file (ebook, tài liệu...)',
        trigger: 'Click nút Download',
        element: 'Link tải / Button',
        meta: {
            name: 'CustomEvent',
            requiredParams: [],
            optionalParams: ['content_name', 'content_category']
        },
        tiktok: {
            name: 'Download',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'file_download',
            requiredParams: [],
            optionalParams: ['file_name', 'file_extension', 'link_url']
        },
        zalo: {
            name: 'Download',
            requiredParams: [],
            optionalParams: []
        }
    },

    scroll_depth: {
        label: 'Scroll Depth',
        category: 'interaction',
        description: 'Khi cuộn trang đến mức nhất định',
        trigger: 'Cuộn 25% / 50% / 75% / 100%',
        element: 'Trang web (scroll)',
        meta: {
            name: 'CustomEvent',
            requiredParams: [],
            optionalParams: ['content_name']
        },
        tiktok: {
            name: 'Scroll',
            requiredParams: [],
            optionalParams: []
        },
        ga4: {
            name: 'scroll',
            requiredParams: [],
            optionalParams: ['percent_scrolled']
        },
        zalo: {
            name: 'Scroll',
            requiredParams: [],
            optionalParams: []
        }
    },

    video_play: {
        label: 'Video Play',
        category: 'interaction',
        description: 'Khi xem video trên trang',
        trigger: 'Click play video',
        element: 'Video player',
        meta: {
            name: 'ViewContent',
            requiredParams: [],
            optionalParams: ['content_name', 'content_type']
        },
        tiktok: {
            name: 'ViewContent',
            requiredParams: [],
            optionalParams: ['value', 'currency']
        },
        ga4: {
            name: 'video_start',
            requiredParams: [],
            optionalParams: ['video_title', 'video_provider', 'video_url']
        },
        zalo: {
            name: 'ViewContent',
            requiredParams: [],
            optionalParams: []
        }
    }
};

// Common currencies
const CURRENCIES = [
    { code: 'VND', name: 'Vietnamese Dong' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'KRW', name: 'Korean Won' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'SGD', name: 'Singapore Dollar' }
];

// Event categories
const EVENT_CATEGORIES = {
    basic: { label: 'Basic', icon: '📄', description: 'Sự kiện cơ bản' },
    ecommerce: { label: 'E-commerce', icon: '🛒', description: 'Mua sắm trực tuyến' },
    lead: { label: 'Lead Generation', icon: '📝', description: 'Thu thập khách hàng tiềm năng' },
    engagement: { label: 'Engagement', icon: '🔍', description: 'Tương tác nội dung' },
    interaction: { label: 'Interaction', icon: '👆', description: 'Tương tác UI (click, submit, scroll...)' }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EVENT_MAPPING, CURRENCIES, EVENT_CATEGORIES };
}
