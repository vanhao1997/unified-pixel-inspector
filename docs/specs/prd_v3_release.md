# V3 Final Release — PRD

## Overview
Phiên bản v3.0.0 của Unified Pixel Inspector tập trung nâng cấp diagnostic (Pixel health), DataLayer viewer, Event diff, Timeline export và thêm mục "Tip" để tăng trải nghiệm cho người dùng hiện tại mà không giới hạn tính năng. Các core features đã code xong, giai đoạn này tập trung vào Manual QA và Package.

## User Stories
1. Là một QA Engineer, tôi muốn test toàn bộ tính năng ở Chrome Extension không bị lỗi để đảm bảo chất lượng.
2. Là Publisher, tôi muốn commit code và đẩy bản release v3.0.0 lên Chrome Web Store.

## Task Breakdown
| Task | Details | Size | Priority | Assigned Role |
|------|---------|------|----------|---------------|
| QA Testing | Test diagnostics, dataLayer modal, event diff, export JSON, copy/link actions. | S | 🔴 Must | `/qa` |
| Code Review | Review final v3 codebase for clean logs/vars. | XS | 🟡 Should | `/reviewer` |
| Store Submission | Prepare manifest, zip file, store assets and CHROME_STORE_SUBMISSION.md. | XS | 🔴 Must | `/devops` |

## Dependencies
- Phải qua bước `/qa` test extension trên trình duyệt mới tiến hành upload. (Do đã build file `unified-pixel-inspector-v3.0.0.zip`)

## Timeline
Sprint: **V3 Launch** (1-2 Ngày)
- Milestone: QA Passed ✓
- Milestone: Deployed to Chrome Store ✓

## Success Criteria
- Extension chạy ổn định ở môi trường local khi load unpacked.
- File zip đáp ứng dung lượng nhẹ, load mượt.

## Risks & Mitigations
- **Rủi ro API/CSS conflict**: Các trang có layout phức tạp có thể bị vướng UI của DataLayer Viewer.
- **Biện pháp**: QA cần test ngẫu nhiên ở 3 trang web khác nhau.
