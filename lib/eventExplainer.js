/**
 * Event Explainer — Giải thích sự kiện bằng tiếng Việt cho người mới
 * Provides human-friendly descriptions for tracking events across all platforms.
 */

export const EventExplainer = {

    // ═══════════════════════════════════════════════
    // EVENT DESCRIPTIONS (Vietnamese + English)
    // ═══════════════════════════════════════════════

    events: {
        // ── Pageview / Navigation ──
        'PageView': { icon: '📄', vi: 'Xem trang', en: 'Page View', desc: 'Người dùng đã mở/xem một trang web. Đây là sự kiện cơ bản nhất, tự động ghi lại mỗi lần trang được tải.' },
        'Pageview': { icon: '📄', vi: 'Xem trang', en: 'Page View', desc: 'Người dùng đã mở/xem một trang web. Đây là sự kiện cơ bản nhất, tự động ghi lại mỗi lần trang được tải.' },
        'page_view': { icon: '📄', vi: 'Xem trang', en: 'Page View', desc: 'Người dùng đã mở/xem một trang web. Tự động theo dõi bởi Google Analytics.' },
        'LandingPageView': { icon: '🛬', vi: 'Xem trang đích', en: 'Landing Page View', desc: 'Người dùng vào trang đích (landing page) — thường là trang quảng cáo dẫn đến.' },

        // ── Content / Product ──
        'ViewContent': { icon: '👀', vi: 'Xem nội dung sản phẩm', en: 'View Content', desc: 'Người dùng đang xem chi tiết một sản phẩm hoặc nội dung. Giúp bạn biết sản phẩm nào được quan tâm nhất.' },
        'view_item': { icon: '👀', vi: 'Xem sản phẩm', en: 'View Item', desc: 'Người dùng xem trang chi tiết sản phẩm. Dữ liệu này giúp tối ưu quảng cáo cho sản phẩm được quan tâm.' },
        'view_item_list': { icon: '📋', vi: 'Xem danh sách sản phẩm', en: 'View Item List', desc: 'Người dùng xem danh mục/danh sách sản phẩm (trang category).' },
        'select_item': { icon: '👆', vi: 'Chọn sản phẩm', en: 'Select Item', desc: 'Người dùng click vào một sản phẩm trong danh sách để xem chi tiết.' },

        // ── E-commerce Funnel ──
        'AddToCart': { icon: '🛒', vi: 'Thêm vào giỏ hàng', en: 'Add to Cart', desc: 'Người dùng bấm nút "Thêm vào giỏ". Cho biết có bao nhiêu người quan tâm đủ để mua.' },
        'add_to_cart': { icon: '🛒', vi: 'Thêm vào giỏ hàng', en: 'Add to Cart', desc: 'Người dùng bấm nút "Thêm vào giỏ". Rất quan trọng để đo tỷ lệ chuyển đổi.' },
        'AddToWishlist': { icon: '❤️', vi: 'Thêm vào yêu thích', en: 'Add to Wishlist', desc: 'Người dùng lưu sản phẩm vào danh sách yêu thích để mua sau.' },
        'add_to_wishlist': { icon: '❤️', vi: 'Thêm vào yêu thích', en: 'Add to Wishlist', desc: 'Người dùng lưu sản phẩm vào danh sách yêu thích.' },

        'InitiateCheckout': { icon: '💳', vi: 'Bắt đầu thanh toán', en: 'Initiate Checkout', desc: 'Người dùng bắt đầu quy trình thanh toán. Họ đã sẵn sàng mua — nếu bỏ giữa chừng, có thể retarget lại!' },
        'begin_checkout': { icon: '💳', vi: 'Bắt đầu thanh toán', en: 'Begin Checkout', desc: 'Người dùng bắt đầu quy trình thanh toán. Sự kiện này rất quan trọng để tối ưu phễu bán hàng.' },
        'AddPaymentInfo': { icon: '💵', vi: 'Nhập thông tin thanh toán', en: 'Add Payment Info', desc: 'Người dùng đã nhập thông tin thẻ/ví điện tử. Gần đến bước mua hàng rồi!' },
        'add_payment_info': { icon: '💵', vi: 'Nhập thông tin thanh toán', en: 'Add Payment Info', desc: 'Người dùng nhập thông tin thanh toán trong quy trình checkout.' },
        'add_shipping_info': { icon: '🚚', vi: 'Nhập địa chỉ giao hàng', en: 'Add Shipping Info', desc: 'Người dùng nhập địa chỉ giao hàng trong quy trình checkout.' },

        'Purchase': { icon: '💰', vi: 'Mua hàng thành công!', en: 'Purchase', desc: 'Đơn hàng đã hoàn tất! Đây là sự kiện quan trọng nhất — dùng để tính ROAS (Return on Ad Spend).' },
        'purchase': { icon: '💰', vi: 'Mua hàng thành công!', en: 'Purchase', desc: 'Đơn hàng đã hoàn tất! Giá trị đơn hàng + ID giao dịch giúp đo ROI quảng cáo.' },
        'CompletePayment': { icon: '💰', vi: 'Thanh toán thành công', en: 'Complete Payment', desc: 'Người dùng đã thanh toán thành công (TikTok). Tương đương với Purchase trên các nền tảng khác.' },
        'PlaceAnOrder': { icon: '📦', vi: 'Đặt hàng', en: 'Place an Order', desc: 'Người dùng đã bấm nút đặt hàng (TikTok). Đơn hàng đã được gửi.' },

        // ── Lead Generation ──
        'Lead': { icon: '📝', vi: 'Gửi thông tin liên hệ', en: 'Lead', desc: 'Khách hàng tiềm năng đã điền form để lại thông tin. Rất quan trọng cho các chiến dịch thu lead!' },
        'generate_lead': { icon: '📝', vi: 'Tạo lead mới', en: 'Generate Lead', desc: 'Khách hàng gửi form liên hệ/đăng ký tư vấn. Giúp đo hiệu quả chiến dịch thu lead.' },
        'SubmitForm': { icon: '📋', vi: 'Gửi biểu mẫu', en: 'Submit Form', desc: 'Người dùng đã gửi biểu mẫu (form) trên trang. Có thể là form liên hệ, đăng ký, khảo sát...' },
        'CompleteRegistration': { icon: '👤', vi: 'Đăng ký tài khoản', en: 'Complete Registration', desc: 'Người dùng đã tạo tài khoản mới. Giúp đo tỷ lệ đăng ký từ quảng cáo.' },
        'sign_up': { icon: '👤', vi: 'Đăng ký', en: 'Sign Up', desc: 'Người dùng tạo tài khoản mới trên hệ thống.' },

        // ── Engagement ──
        'Contact': { icon: '📞', vi: 'Liên hệ', en: 'Contact', desc: 'Người dùng bấm nút gọi điện, nhắn tin, hoặc mở chat. Cho biết họ muốn nói chuyện trực tiếp.' },
        'Search': { icon: '🔍', vi: 'Tìm kiếm', en: 'Search', desc: 'Người dùng sử dụng chức năng tìm kiếm trên trang. Từ khóa tìm kiếm giúp hiểu nhu cầu.' },
        'search': { icon: '🔍', vi: 'Tìm kiếm', en: 'Search', desc: 'Người dùng tìm kiếm trên website. Dữ liệu search_term cho biết họ cần gì.' },
        'ClickButton': { icon: '🖱️', vi: 'Bấm nút', en: 'Click Button', desc: 'Người dùng bấm vào một nút trên trang. Giúp theo dõi tương tác với CTA (Call-to-Action).' },
        'Download': { icon: '📥', vi: 'Tải xuống', en: 'Download', desc: 'Người dùng tải xuống tài liệu/file. Ví dụ: bảng báo giá, brochure, ebook...' },
        'Subscribe': { icon: '🔔', vi: 'Đăng ký nhận tin', en: 'Subscribe', desc: 'Người dùng đăng ký nhận thông báo/email newsletter.' },
        'share': { icon: '🔗', vi: 'Chia sẻ', en: 'Share', desc: 'Người dùng chia sẻ nội dung lên mạng xã hội hoặc copy link.' },

        // ── Google Internal / GTM ──
        'gtm.js': { icon: '⚙️', vi: 'GTM đã tải', en: 'GTM Loaded', desc: 'Google Tag Manager đã khởi tạo xong. Đây là sự kiện hệ thống, không phải hành vi người dùng.' },
        'gtm.dom': { icon: '⚙️', vi: 'DOM sẵn sàng (qua GTM)', en: 'GTM DOM Ready', desc: 'GTM nhận biết rằng cấu trúc trang (DOM) đã tải xong. Sự kiện hệ thống.' },
        'gtm.load': { icon: '⚙️', vi: 'Window loaded (qua GTM)', en: 'GTM Window Load', desc: 'Toàn bộ trang (bao gồm ảnh, script) đã tải xong. Sự kiện hệ thống.' },
        'gtm.click': { icon: '🖱️', vi: 'Click (qua GTM)', en: 'GTM Click', desc: 'GTM phát hiện người dùng click vào phần tử trên trang. Được kích hoạt bởi Click trigger trong GTM.' },
        'gtm.formSubmit': { icon: '📋', vi: 'Gửi form (qua GTM)', en: 'GTM Form Submit', desc: 'GTM phát hiện một form đã được gửi (submit) trên trang.' },
        'gtm.historyChange': { icon: '🔄', vi: 'Chuyển trang (SPA)', en: 'GTM History Change', desc: 'URL trang thay đổi trong ứng dụng SPA (Single Page Application) mà không cần tải lại trang.' },
        'gtm.scrollDepth': { icon: '📜', vi: 'Cuộn trang (qua GTM)', en: 'GTM Scroll Depth', desc: 'GTM đo mức cuộn trang của người dùng (25%, 50%, 75%, 90%).' },
        'gtm.timer': { icon: '⏱️', vi: 'Hẹn giờ (qua GTM)', en: 'GTM Timer', desc: 'Sự kiện được kích hoạt sau khoảng thời gian nhất định (cấu hình trong GTM).' },
        'gtm.video': { icon: '🎬', vi: 'Tương tác video (qua GTM)', en: 'GTM Video', desc: 'GTM theo dõi tương tác với video YouTube nhúng trên trang.' },

        // ── GA4 Auto Events ──
        'page_view': { icon: '📄', vi: 'Xem trang', en: 'Page View', desc: 'Google Analytics tự động ghi lại mỗi lần trang được tải.' },
        'session_start': { icon: '🟢', vi: 'Bắt đầu phiên', en: 'Session Start', desc: 'Một phiên truy cập mới bắt đầu. Phiên = chuỗi thao tác liên tiếp của 1 người dùng.' },
        'first_visit': { icon: '🆕', vi: 'Lượt truy cập đầu tiên', en: 'First Visit', desc: 'Người dùng truy cập website lần đầu tiên (chưa từng vào trước đó).' },
        'user_engagement': { icon: '⏳', vi: 'Tương tác người dùng', en: 'User Engagement', desc: 'Người dùng đã ở trên trang đủ lâu (>10 giây) và tương tác. GA4 tự động đo.' },
        'scroll': { icon: '📜', vi: 'Cuộn trang 90%', en: 'Scroll', desc: 'Người dùng đã cuộn xuống 90% chiều dài trang. Cho biết họ đọc hầu hết nội dung.' },
        'click': { icon: '🖱️', vi: 'Click link ra ngoài', en: 'Outbound Click', desc: 'Người dùng click vào link dẫn ra website khác. GA4 Enhanced Measurement tự theo dõi.' },
        'file_download': { icon: '📥', vi: 'Tải file', en: 'File Download', desc: 'Người dùng tải xuống file (PDF, XLSX, DOCX...). GA4 tự động theo dõi.' },
        'video_start': { icon: '▶️', vi: 'Bắt đầu xem video', en: 'Video Start', desc: 'Người dùng bấm play video YouTube nhúng trên trang.' },
        'video_progress': { icon: '⏯️', vi: 'Tiến trình video', en: 'Video Progress', desc: 'Đo tiến trình xem video (10%, 25%, 50%, 75%). Giúp biết người dùng xem đến đâu.' },
        'video_complete': { icon: '🏁', vi: 'Xem hết video', en: 'Video Complete', desc: 'Người dùng đã xem hết video. Tỷ lệ hoàn thành video cho biết nội dung có hấp dẫn không.' },
        'form_start': { icon: '✏️', vi: 'Bắt đầu điền form', en: 'Form Start', desc: 'Người dùng bắt đầu điền vào ô đầu tiên của form. Chưa bấm gửi.' },
        'form_submit': { icon: '✅', vi: 'Gửi form', en: 'Form Submit', desc: 'Người dùng bấm nút gửi form. GA4 Enhanced Measurement tự theo dõi.' },

        // ── Config / Init (không phải hành vi) ──
        'config': { icon: '⚙️', vi: 'Cấu hình GA4', en: 'GA4 Config', desc: 'Khởi tạo kết nối với Google Analytics. Đây là event hệ thống, không phải hành vi người dùng.' },
        'PixelInitialized': { icon: '🔌', vi: 'Pixel đã khởi tạo', en: 'Pixel Initialized', desc: 'Pixel đã được khởi tạo (init) thành công trên trang. Bây giờ nó sẵn sàng ghi nhận sự kiện.' },
        'PixelDetected': { icon: '🔍', vi: 'Phát hiện pixel', en: 'Pixel Detected', desc: 'Extension phát hiện pixel tracking trên trang thông qua phân tích mã nguồn.' },
        'PixelLoaded': { icon: '✅', vi: 'Pixel đã tải', en: 'Pixel Loaded', desc: 'Pixel tracking đã tải thành công và sẵn sàng hoạt động.' },
        'Identify': { icon: '🪪', vi: 'Nhận diện người dùng', en: 'Identify', desc: 'Gắn thông tin nhận dạng (email, phone) vào người dùng để theo dõi xuyên thiết bị.' },

        // ── Conversion catchall ──
        'conversion': { icon: '🎯', vi: 'Chuyển đổi', en: 'Conversion', desc: 'Một hành động chuyển đổi đã xảy ra. Đây là sự kiện quan trọng nhất khi chạy quảng cáo.' },
    },

    // ═══════════════════════════════════════════════
    // PARAMETER DESCRIPTIONS
    // ═══════════════════════════════════════════════

    params: {
        'value': { vi: 'Giá trị đơn hàng', desc: 'Số tiền của giao dịch/hành động (VD: 500000)' },
        'currency': { vi: 'Loại tiền tệ', desc: 'Mã tiền tệ (VD: VND, USD)' },
        'transaction_id': { vi: 'Mã giao dịch', desc: 'ID duy nhất của đơn hàng (VD: ORDER-12345)' },
        'items': { vi: 'Danh sách sản phẩm', desc: 'Các sản phẩm trong giỏ hàng/đơn hàng' },
        'item_id': { vi: 'Mã sản phẩm', desc: 'ID duy nhất của sản phẩm' },
        'item_name': { vi: 'Tên sản phẩm', desc: 'Tên hiển thị của sản phẩm' },
        'item_category': { vi: 'Danh mục', desc: 'Danh mục sản phẩm thuộc về' },
        'price': { vi: 'Giá', desc: 'Giá của sản phẩm' },
        'quantity': { vi: 'Số lượng', desc: 'Số lượng sản phẩm' },
        'content_type': { vi: 'Loại nội dung', desc: 'Phân loại nội dung (product, article...)' },
        'content_id': { vi: 'Mã nội dung', desc: 'ID của nội dung được xem' },
        'content_name': { vi: 'Tên nội dung', desc: 'Tên nội dung/sản phẩm' },
        'search_term': { vi: 'Từ khóa tìm kiếm', desc: 'Từ khóa người dùng đã nhập để tìm kiếm' },
        'num_items': { vi: 'Số sản phẩm', desc: 'Tổng số sản phẩm trong giỏ/đơn' },
        'send_to': { vi: 'Gửi đến', desc: 'ID tài khoản GA4/Google Ads nhận dữ liệu' },
        'page_title': { vi: 'Tiêu đề trang', desc: 'Title tag của trang web hiện tại' },
        'page_location': { vi: 'Đường dẫn trang', desc: 'URL đầy đủ của trang' },
        'page_referrer': { vi: 'Trang nguồn', desc: 'Trang trước đó mà người dùng đến từ' },
        'measurement_id': { vi: 'Mã đo lường', desc: 'ID tài khoản Google Analytics (G-XXXXXXXXXX)' },
        'event_category': { vi: 'Danh mục sự kiện', desc: 'Nhóm phân loại của sự kiện' },
        'event_label': { vi: 'Nhãn sự kiện', desc: 'Mô tả chi tiết hơn cho sự kiện' },
        'url': { vi: 'Đường dẫn', desc: 'URL liên quan đến sự kiện' },
        'pixelId': { vi: 'Mã Pixel', desc: 'ID của pixel tracking trên nền tảng quảng cáo' },
        'options': { vi: 'Tùy chọn', desc: 'Cấu hình bổ sung khi khởi tạo pixel' },
    },

    // ═══════════════════════════════════════════════
    // STATUS DESCRIPTIONS
    // ═══════════════════════════════════════════════

    status: {
        'installed': {
            icon: '⚪',
            label: 'Đã cài đặt',
            desc: 'Script pixel được tìm thấy trong mã nguồn trang, nhưng chưa chắc đã chạy.',
            color: '#94a3b8'
        },
        'loaded': {
            icon: '🟡',
            label: 'Đã khởi tạo',
            desc: 'Pixel đã tải và sẵn sàng. Biến toàn cục (fbq, ttq...) đã hoạt động.',
            color: '#f59e0b'
        },
        'fired': {
            icon: '🟢',
            label: 'Đang hoạt động',
            desc: 'Pixel đang gửi dữ liệu! Các sự kiện đã được fire thành công.',
            color: '#22c55e'
        }
    },

    // ═══════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════

    /**
     * Get explanation for an event name
     * @param {string} eventName - e.g. 'PageView', 'add_to_cart', 'gtm.js'
     * @returns {{ icon, vi, en, desc } | null}
     */
    getEvent(eventName) {
        return this.events[eventName] || null;
    },

    /**
     * Get explanation for a parameter
     * @param {string} paramName - e.g. 'value', 'currency'
     * @returns {{ vi, desc } | null}
     */
    getParam(paramName) {
        return this.params[paramName] || null;
    },

    /**
     * Get explanation for a status
     * @param {string} status - 'installed', 'loaded', 'fired'
     * @returns {{ icon, label, desc, color } | null}
     */
    getStatus(statusName) {
        return this.status[statusName] || null;
    },

    /**
     * Check if this is a system/internal event (not user behavior)
     * @param {string} eventName
     * @returns {boolean}
     */
    isSystemEvent(eventName) {
        const systemEvents = [
            'gtm.js', 'gtm.dom', 'gtm.load', 'config',
            'PixelInitialized', 'PixelDetected', 'PixelLoaded'
        ];
        return systemEvents.includes(eventName) || eventName?.startsWith('gtm.');
    },

    /**
     * Check if this is an e-commerce event
     * @param {string} eventName
     * @returns {boolean}
     */
    isEcommerceEvent(eventName) {
        const ecomEvents = [
            'ViewContent', 'view_item', 'view_item_list', 'select_item',
            'AddToCart', 'add_to_cart', 'AddToWishlist', 'add_to_wishlist',
            'InitiateCheckout', 'begin_checkout',
            'AddPaymentInfo', 'add_payment_info', 'add_shipping_info',
            'Purchase', 'purchase', 'CompletePayment', 'PlaceAnOrder'
        ];
        return ecomEvents.includes(eventName);
    },

    /**
     * Get a funnel stage label for e-commerce events
     * @param {string} eventName
     * @returns {string}
     */
    getFunnelStage(eventName) {
        const stages = {
            'ViewContent': '1️⃣ Quan tâm', 'view_item': '1️⃣ Quan tâm', 'view_item_list': '1️⃣ Khám phá',
            'AddToCart': '2️⃣ Cân nhắc', 'add_to_cart': '2️⃣ Cân nhắc',
            'InitiateCheckout': '3️⃣ Quyết định', 'begin_checkout': '3️⃣ Quyết định',
            'AddPaymentInfo': '4️⃣ Thanh toán', 'add_payment_info': '4️⃣ Thanh toán',
            'Purchase': '5️⃣ Mua hàng', 'purchase': '5️⃣ Mua hàng', 'CompletePayment': '5️⃣ Mua hàng'
        };
        return stages[eventName] || '';
    },

    /**
     * Format params with Vietnamese labels
     * @param {object} params
     * @returns {Array<{ key, label, value }>}
     */
    explainParams(params) {
        if (!params || typeof params !== 'object') return [];
        return Object.entries(params).map(([key, value]) => {
            const info = this.params[key];
            return {
                key,
                label: info ? info.vi : key,
                desc: info ? info.desc : '',
                value: typeof value === 'object' ? JSON.stringify(value) : String(value)
            };
        });
    }
};
