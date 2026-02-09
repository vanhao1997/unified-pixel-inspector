# Unified Pixel Inspector - Build & Publish Guide

## Quick Build (ZIP for Chrome Web Store)

```bash
# Create distribution folder
mkdir dist
cd unified-pixel-inspector

# Create ZIP excluding unnecessary files
Compress-Archive -Path "manifest.json","background.js","content","sidepanel","icons","README.md","LICENSE","PRIVACY_POLICY.md" -DestinationPath "unified-pixel-inspector-v1.0.0.zip" -Force
```

## Chrome Web Store Submission Checklist

### Required Assets
- [ ] Extension ZIP file
- [ ] Icon 128x128 (already have)
- [ ] Screenshot 1280x800 (store listing)
- [ ] Small promo tile 440x280
- [ ] Privacy policy URL

### Store Listing Info
- **Name**: Unified Pixel Inspector
- **Short Description**: Detect and debug tracking pixels/tags across Meta, TikTok, Google/GTM, and Zalo on any website
- **Category**: Developer Tools
- **Language**: English (Vietnamese support coming)

### Justification for Broad Host Permissions

The `<all_urls>` permission is required because:
1. Marketing pixels can be installed on ANY website
2. Users need to inspect pixels on their own websites and client websites
3. This is a developer/debugging tool that needs universal access
