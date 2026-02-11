export class EventValidator {
    static validate(event) {
        const issues = [];
        const name = event.event || '';
        const params = event.params || {};
        const lowerName = name.toLowerCase();

        // ═══════════════════════════════════════════════
        // RULE 1: E-commerce Logic (Value & Currency)
        // ═══════════════════════════════════════════════
        const isPurchase = lowerName.includes('purchase') || lowerName.includes('completepayment');
        const isCartOrCheck = lowerName.includes('addtocart') || lowerName.includes('add_to_cart') || lowerName.includes('checkout');

        if (isPurchase || isCartOrCheck) {
            // Check Value
            const hasValue = 'value' in params || 'price' in params;
            if (!hasValue) {
                issues.push({
                    type: 'error',
                    icon: '💰',
                    title: 'Thiếu giá trị (Value)',
                    message: 'Sự kiện này quan trọng nhưng thiếu tham số `value`. Quảng cáo sẽ không thể tối ưu ROAS.',
                    fix: 'Thêm `value: TONG_TIEN` vào code tracking.'
                });
            }

            // Check Currency (if Value exists)
            if (hasValue) {
                const val = parseFloat(params.value || params.price);
                const hasCurrency = 'currency' in params;

                if (!hasCurrency && val > 0) {
                    issues.push({
                        type: 'warning',
                        icon: '💱',
                        title: 'Thiếu loại tiền tệ (Currency)',
                        message: 'Có `value` nhưng thiếu `currency`. Hệ thống có thể hiểu sai (VD: 100.000 USD thay vì VND).',
                        fix: "Thêm `currency: 'VND'` vào code."
                    });
                }

                // Check Zero Value for Purchase
                if (isPurchase && val === 0) {
                    issues.push({
                        type: 'warning',
                        icon: '0️⃣',
                        title: 'Giá trị bằng 0',
                        message: 'Đơn hàng ghi nhận giá trị 0đ. Nếu không phải hàng tặng, hãy kiểm tra lại.',
                        fix: 'Kiểm tra biến lấy doanh thu trong code.'
                    });
                }
            }
        }

        // ═══════════════════════════════════════════════
        // RULE 2: PII (Thông tin cá nhân) Check
        // ═══════════════════════════════════════════════
        // Regex đơn giản tìm email
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

        for (const [key, val] of Object.entries(params)) {
            if (typeof val === 'string' && emailRegex.test(val)) {
                // Nếu key không phải là trường chuẩn (em, email, user_data.email...)
                // Note: FB Pixel tự động hash nếu dùng trường chuẩn, nhưng tốt nhất vẫn cảnh báo
                if (!key.toLowerCase().includes('email') && !key.toLowerCase().includes('hash')) {
                    issues.push({
                        type: 'error',
                        icon: '🔒',
                        title: 'Lộ thông tin cá nhân (PII)',
                        message: `Tham số '${key}' chứa Email dạng rỗng. Điều này vi phạm chính sách bảo mật.`,
                        fix: 'Hãy mã hóa SHA256 thông tin này hoặc loại bỏ khỏi tham số sự kiện.'
                    });
                }
            }
        }

        return issues;
    }
}
