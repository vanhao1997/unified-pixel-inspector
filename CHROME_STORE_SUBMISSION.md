# Chrome Web Store - Phương thức bảo vệ quyền riêng tư

Tài liệu này chứa tất cả nội dung cần điền vào thẻ **Phương thức bảo vệ quyền riêng tư** khi submit extension lên Chrome Web Store.

---

## 1. Mô tả mục đích (Single Purpose Description)

```
Unified Pixel Inspector là công cụ dành cho marketer và developer để phát hiện, debug và giám sát các tracking pixel trên website. Extension này giúp:

- Phát hiện các pixel đã cài đặt: Meta Pixel, TikTok Pixel, Google Tags (GTM/GA4/Ads), Zalo Pixel
- Xem các sự kiện pixel đang fire theo thời gian thực
- Debug các vấn đề tracking pixel

Extension CHỈ đọc dữ liệu từ trang web đang mở, KHÔNG thu thập hay gửi bất kỳ dữ liệu nào ra ngoài.
```

---

## 2. Lý do sử dụng mã từ xa (Remote Code Justification)

```
Extension này KHÔNG sử dụng mã từ xa (remote code). 

Tất cả code JavaScript đều được đóng gói sẵn trong extension:
- background.js: Service worker xử lý logic
- content/scanner.js: Quét pixel trên trang
- content/hooks.js: Hook vào các hàm pixel để theo dõi events
- sidepanel/app.js: Giao diện người dùng

Không có code nào được tải từ server bên ngoài.
```

---

## 3. Lý do sử dụng quyền `activeTab`

```
Quyền activeTab được sử dụng để:

1. Truy cập nội dung tab hiện tại khi người dùng click vào extension
2. Inject content script để quét và phát hiện tracking pixel
3. Đọc DOM của trang để tìm các script pixel (Meta, TikTok, Google, Zalo)

Quyền này CHỈ kích hoạt khi người dùng chủ động tương tác với extension, đảm bảo quyền riêng tư vì extension không tự động truy cập tab mà không có sự cho phép.
```

---

## 4. Lý do sử dụng quyền `scripting`

```
Quyền scripting được sử dụng để:

1. Inject file hooks.js vào trang web đang mở
2. Hook vào các hàm pixel (fbq, ttq, gtag, dataLayer) để theo dõi events
3. Lắng nghe các sự kiện pixel fire (PageView, AddToCart, Purchase, v.v.)

Điều này cần thiết vì các pixel tracking thường chạy trong JavaScript context của trang, và extension cần inject code để theo dõi chúng.
```

---

## 5. Lý do sử dụng quyền `sidePanel`

```
Quyền sidePanel được sử dụng để:

1. Hiển thị giao diện chính của extension dưới dạng Chrome Side Panel
2. Cho phép người dùng xem kết quả phát hiện pixel
3. Hiển thị timeline các sự kiện pixel theo thời gian thực
4. Cung cấp cài đặt người dùng (theme, filters)

Side Panel cho phép người dùng theo dõi pixel mà không làm ảnh hưởng đến trang web đang duyệt.
```

---

## 6. Lý do sử dụng quyền `storage`

```
Quyền storage được sử dụng để:

1. Lưu tùy chọn giao diện của người dùng (dark/light theme)
2. Lưu cài đặt filter (ẩn/hiện các platform cụ thể)
3. Lưu trạng thái capturing (bật/tắt theo dõi events)

Tất cả dữ liệu được lưu cục bộ trong browser (chrome.storage.local), KHÔNG gửi ra server bên ngoài.
```

---

## 7. Lý do sử dụng quyền từ phía máy chủ / Host Permissions (`<all_urls>`)

```
Quyền <all_urls> được sử dụng vì:

1. Tracking pixel có thể được cài đặt trên BẤT KỲ website nào
2. Extension cần quét pixel trên mọi domain để phục vụ mục đích debug
3. Đây là công cụ dành cho marketer/developer, cần hoạt động trên tất cả website

Tương tự các extension tương tự như:
- Meta Pixel Helper (by Meta)
- TikTok Pixel Helper (by TikTok)
- Tag Assistant (by Google)

Các extension này đều yêu cầu quyền <all_urls> vì tracking pixel có thể tồn tại trên bất kỳ website nào.

Extension CHỈ đọc dữ liệu, KHÔNG:
- Gửi dữ liệu ra ngoài
- Thu thập thông tin người dùng
- Theo dõi hành vi browse
```

---

## 8. Lý do sử dụng quyền `webRequest`

```
Quyền webRequest được sử dụng để:

1. Theo dõi các network request đến các server pixel:
   - connect.facebook.net (Meta Pixel)
   - analytics.tiktok.com (TikTok Pixel)
   - googletagmanager.com, google-analytics.com (Google Tags)
   - zalo.me (Zalo Pixel)

2. Phát hiện khi pixel fire bằng cách đọc URL parameters
3. Hiển thị thông tin event trong timeline

Quyền này CHỈ đọc (read-only), KHÔNG chặn hay sửa đổi bất kỳ request nào.
```

---

## 9. Chứng nhận tuân thủ chính sách

Tôi chứng nhận rằng extension này:

✅ **KHÔNG thu thập dữ liệu người dùng** - Tất cả xử lý diễn ra cục bộ

✅ **KHÔNG gửi dữ liệu ra ngoài** - Không có API calls đến server bên ngoài

✅ **KHÔNG sử dụng mã từ xa** - Tất cả code đều bundled trong extension

✅ **KHÔNG theo dõi người dùng** - Không analytics, không tracking

✅ **KHÔNG hiển thị quảng cáo** - Extension hoàn toàn miễn phí

✅ **Mã nguồn mở** - Có thể kiểm tra tại GitHub

---

## 10. Thông tin liên hệ

**Email liên hệ:** [Điền email của bạn]

**GitHub:** https://github.com/vanhao1997/unified-pixel-inspector

**Privacy Policy URL:** https://github.com/vanhao1997/unified-pixel-inspector/blob/main/PRIVACY_POLICY.md

---

## Checklist trước khi submit

- [ ] Điền email liên hệ trong thẻ Tài khoản
- [ ] Xác minh email
- [ ] Copy các nội dung trên vào thẻ Phương thức bảo vệ quyền riêng tư
- [ ] Tick checkbox chứng nhận tuân thủ chính sách
- [ ] Upload ảnh store_assets/
- [ ] Submit để review
