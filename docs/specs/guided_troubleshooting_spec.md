# Guided Testing & Active Troubleshooting Specification

## 1. Overview
This feature aims to guide novice marketers through the process of verifying their tracking implementation and helping them fix common errors directly within the extension.

**Core Value Proposition:**
- **Guided Testing:** Tells the user *what* to test based on their website type.
- **Active Troubleshooting:** Tells the user *what is wrong* and *how to fix it*.

## 2. Feature 1: Guided Testing (Interactive Checklist)

### 2.1. User Flow
1.  User opens extension sidepanel.
2.  User sees a "Test Mode" or "Checklist" section (can be toggled/collapsed).
3.  User selects **Business Type**:
    *   **E-commerce** (Default)
    *   **Lead Generation / Service** (BĐS, Khóa học, Tư vấn)
    *   **Custom** (User defines list - *Phase 2*)
4.  Extension displays a **Testing Checklist** specific to that type.
    *   *E-commerce:* 
        1. ViewContent (Xem sản phẩm) ⬜
        2. AddToCart (Thêm giỏ hàng) ⬜
        3. InitiateCheckout (Bắt đầu thanh toán) ⬜
        4. Purchase (Mua hàng thành công) ⬜
    *   *Lead Gen:*
        1. ViewContent (Xem Landing Page) ⬜
        2. Keep in Touch/Lead (Điền Form/Chat) ⬜
        3. CompleteRegistration (Đăng ký thành công) ⬜
5.  As user interacts with the website:
    *   Extension listens for events.
    *   If a valid event fires (e.g., `fbq('track', 'AddToCart')` or `gtag('event', 'add_to_cart')`), the corresponding checklist item automatically marks as **Done ✅**.
6.  User can **Reset** the checklist to start over.

### 2.2. Data Structure (Checklist Templates)
```javascript
const CHECKLIST_TEMPLATES = {
    ecommerce: {
        id: 'ecommerce',
        name: 'E-commerce (TMĐT)',
        steps: [
            { id: 'view_item', label: 'Xem sản phẩm', expectedEvents: ['ViewContent', 'view_item'] },
            { id: 'add_to_cart', label: 'Thêm vào giỏ', expectedEvents: ['AddToCart', 'add_to_cart'] },
            { id: 'initiate_checkout', label: 'Thanh toán', expectedEvents: ['InitiateCheckout', 'begin_checkout'] },
            { id: 'purchase', label: 'Mua hàng', expectedEvents: ['Purchase', 'purchase'] }
        ]
    },
    lead_gen: {
        id: 'lead_gen',
        name: 'Lead Generation (Dịch vụ/BĐS)',
        steps: [
            { id: 'view_page', label: 'Xem trang đích', expectedEvents: ['ViewContent', 'page_view'] },
            { id: 'contact', label: 'Liên hệ/Điền form', expectedEvents: ['Lead', 'Contact', 'SubmitForm', 'generate_lead'] },
            { id: 'complete', label: 'Hoàn thành', expectedEvents: ['CompleteRegistration', 'sign_up'] }
        ]
    }
};
```

## 3. Feature 2: Active Troubleshooting (Real-time Validation)

### 3.1. Validation Logic
Every captured event is passed through a **Validator**.

**Validation Rules (Examples):**
*   **Missing Currency:** If event is `Purchase`/`AddPaymentInfo` AND `value` exists BUT `currency` is missing => **Warning**.
*   **Zero Value:** If event is `Purchase` AND `value` is 0 or undefined => **Error**.
*   **Duplicate Event:** If same eventID (or same event name + params) fires twice within 2 seconds => **Warning (Duplicate)**.
*   **PII Leak:** If URL or params contain email/phone in plain text => **Critical Error**.

### 3.2. UI Representation
*   **Timeline Item:** Add a status indicator.
    *   ✅ Green stroke/dot: Valid.
    *   ⚠️ Yellow icon: Warning (Non-critical, e.g., duplicate).
    *   🔴 Red icon: Error (Critical, e.g., missing value for Purchase).
*   **Tooltip:** Hovering the icon shows short error (e.g., "Missing Currency").

## 4. Feature 3: Smart Fix Assistant

### 4.1. Error Detail View
When clicking a Warning/Error event, the detail view shows a colored box:
*   **Problem:** "Sự kiện Purchase này thiếu mã tiền tệ (Currency)."
*   **Impact:** "Dữ liệu doanh thu sẽ không chính xác trên Facebook/Google Ads."
*   **Solution:** "Thêm tham số `currency` vào code."

### 4.2. Code Snippet Generation
Provide precise code examples based on the platform.

*   *Scenario: Missing Currency in Facebook Pixel Purchase*
    ```javascript
    // Code hiện tại của bạn:
    fbq('track', 'Purchase', { value: 100000 });

    // 👇 Code ĐÚNG (Copy dòng này):
    fbq('track', 'Purchase', { 
      value: 100000,
      currency: 'VND' // <-- Thêm dòng này
    });
    ```

## 5. Implementation Plan

### Phase 1: Guided Testing UI & Logic
1.  Create `ChecklistManager.js` module.
2.  Update `PixelMonitor.js` to render Checklist UI above Timeline.
3.  Inject checklist logic into `addEvent` flow to auto-check items.

### Phase 2: Validation Engine
1.  Create `EventValidator.js` lib.
2.  Define rules for Meta, TikTok, GTM/GA4.
3.  Integrate validator into `ProductMonitor.js`.

### Phase 3: Smart Fix & Code Gen
1.  Update `EventExplainer.js` to include fix suggestions.
2.  Enhance Event Detail UI to show "Fix It" section.
