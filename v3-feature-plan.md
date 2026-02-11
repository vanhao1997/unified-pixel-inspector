# Unified Pixel Inspector v3 — Feature Plan

## Goal
Tăng giá trị cho user hiện tại bằng tính năng debug/setup thông minh hơn, và thêm section "Tip" (donate) không bắt buộc.

## Tasks

### Phase 1: Smart Diagnostics (Scan Tab)
- [x] **1.1 Pixel Health Check** — Enhanced diagnostics with 7 check types:
  - Duplicate pixel IDs → 🔴 Error
  - Installed but not loaded → ⚠️ Warning
  - Loaded but not fired → ⚠️ Warning
  - Async load detection → ℹ️ Info
  - Session errors/warnings forwarding
  - Missing ecommerce params (value/currency) → ⚠️ Warning
  - No platforms detected → ℹ️ Info + tip
  - Each diagnostic has an actionable tip

- [x] **1.2 DataLayer Inspector** — View `window.dataLayer` from sidepanel:
  - Button "📊 DataLayer" in Diagnostics section header
  - Modal with accordion list of all dataLayer entries
  - GTM internal events dimmed, last 3 entries auto-opened
  - Content script handler: `GET_DATALAYER` → inject → postMessage

### Phase 2: Enhanced Timeline (Timeline Tab)
- [x] **2.1 Event Diff / Compare** — Checkbox per event, select 2 → diff panel:
  - Diff table comparing all parameters side-by-side
  - Changed values highlighted in yellow
  - Close button to dismiss
  
- [x] **2.2 Export Timeline** — Download events as JSON file:
  - Button "📥 Export" in timeline controls
  - JSON with metadata (url, timestamp, total events)
  - Toast notification on export

### Phase 3: Quick Actions (Scan Tab)
- [x] **3.1 One-Click Copy Pixel ID** — 📋 button next to each ID
- [x] **3.2 Open Platform Dashboard** — 🔗 button linking to platform dashboard

### Phase 4: Tip / Donate Section (Settings Tab)
- [x] **4.1 "Buy me a coffee" Section** — Warm card with donate link
  - Dark mode compatible
  - "100% free, no feature gating" note

### Phase 5: Verification & Polish
- [x] **5.1** Bump version to 3.0.0
- [ ] **5.2** Test extension in Chrome
- [ ] **5.3** Commit & push v3

## Done When
- [x] Diagnostics with 7 health checks + actionable tips
- [x] DataLayer viewer via modal
- [x] Event diff comparison
- [x] Timeline export as JSON
- [x] Copy pixel ID
- [x] Open platform dashboard  
- [x] Tip section in Settings
- [ ] All verified working in Chrome
