# Project Context — Unified Pixel Inspector
> Auto-updated bởi team workflows. KHÔNG xóa file này.

## 🎯 Vision
- **Sản phẩm**: Unified Pixel Inspector
- **Mô tả**: Browser extension hỗ trợ debug các nền tảng pixel (Facebook, Google, Tiktok...), quét DataLayer và cung cấp diagnostic errors/warnings.
- **Target users**: Marketers, Web tracking implementers, Developers
- **Status**: Execution (v3)

## 🎨 Brand
- **Primary color**: TBD
- **Font**: System default / Inter
- **Tone**: Technical, Professional, Helpful
- **Logo**: icons/

## 🏗️ Tech Stack
- **Frontend**: Vanilla JS (ES6), HTML, CSS extensions API (Manifest V3)
- **Backend**: None
- **Database**: None (Local storage)
- **Auth**: None
- **Hosting**: Chrome Web Store

## 📋 Current Sprint
- [x] CEO: Define vision → /ceo
- [x] PM: Write PRD & Task Checklist → /pm
- [x] QA: Verify unpacked extension & features (Static Analysis) → /qa
- [x] DevOps: Verify ZIP size constraints & publishing → /devops

## 📝 Key Decisions
- [2026-04-03]: Đóng gói v3 bằng native script (PowerShell Compress-Archive) — Reason: Nhanh gọn cho vanilla extension không có dependencies phức tạp.

## ⚠️ Constraints & Rules
- Phải tuân thủ các chính sách của Chrome Web Store (Manifest V3).
- Dung lượng phải nhẹ, load nhanh.

## 📂 Docs Index
- Vision: docs/vision/
- Specs: docs/specs/
- Architecture: docs/architecture/
- Design: docs/design/
- Reports: docs/reports/
- Ops: docs/ops/
