# Privacy Policy - Unified Pixel Inspector

**Last Updated: February 9, 2026**  
**Version: 1.0.0**

---

## 🔒 Summary

**We do NOT collect, store, or transmit any of your data.** All processing happens locally in your browser.

---

## 1. Data Collection

This extension does **NOT** collect any personal data:

- ❌ No user accounts or registration
- ❌ No analytics or usage tracking  
- ❌ No data sent to external servers
- ❌ No cookies stored by extension
- ❌ No advertising or monetization

---

## 2. Minimal Permissions Approach

We request **only** the permissions strictly necessary for core functionality:

### Required Permissions

| Permission | Purpose | Justification |
|------------|---------|---------------|
| `activeTab` | Access current tab | Scan for pixels on active page |
| `storage` | Local storage only | Save theme preferences |
| `sidePanel` | Display UI | Core feature for results display |
| `scripting` | Content scripts | Inject pixel detection code |
| `webRequest` | Network monitoring | Track pixel firing events |

### Host Permission

| Permission | Purpose | Justification |
|------------|---------|---------------|
| `<all_urls>` | All websites | Marketing pixels exist on any website |

**Why all URLs?** As a debugging tool for marketers and developers, this extension must be able to scan pixels on any website. This is the same permission model used by similar tools like Meta Pixel Helper and TikTok Pixel Helper.

---

## 3. Data Handling

### What We Access (Read-Only)
- **Page DOM**: Find pixel scripts (Meta, TikTok, Google, Zalo)
- **Network requests**: Detect pixel events firing
- **Local storage**: Your preferences only

### Security Measures  
- ✅ Sensitive data (email, phone) automatically masked
- ✅ All data stays in browser memory only
- ✅ Session data cleared when tab closes
- ✅ No external API calls
- ✅ Open source for transparency

---

## 4. No Third-Party Services

This extension uses **ZERO** third-party services:
- ❌ No Google Analytics
- ❌ No Firebase or crash reporting
- ❌ No advertising networks
- ❌ No remote servers

---

## 5. Open Source

Full source code available at:  
**https://github.com/vanhao1997/unified-pixel-inspector**

---

## 6. Contact

- **GitHub**: https://github.com/vanhao1997/unified-pixel-inspector/issues
- **Chrome Web Store**: Contact through extension listing

---

## 7. Policy Updates

Changes will be posted on GitHub with updated version numbers.

---

*Extension provided "as is" without warranty.*
