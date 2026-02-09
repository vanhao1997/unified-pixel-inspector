# 🔍 Unified Pixel Inspector

A Chrome extension for detecting, debugging, and monitoring marketing pixels and tracking tags across websites.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### Supported Platforms
| Platform | Detection | Events Capture | ID Extraction |
|----------|-----------|----------------|---------------|
| **Meta Pixel** | ✅ | ✅ | ✅ |
| **TikTok Pixel** | ✅ | ✅ | ✅ |
| **Google Tags** (GTM, GA4, Ads) | ✅ | ✅ | ✅ |
| **Zalo** (Pixel & OA Widget) | ✅ | ✅ | ✅ |

### Core Capabilities

🎯 **Real-time Detection**
- Automatically detects installed tracking pixels when you visit any website
- Shows pixel status: Installed → Loaded → Fired

📊 **Event Timeline**
- Captures all tracking events in real-time
- Filter by platform or event name
- View event parameters with masked sensitive data

🔧 **Diagnostics**
- Identifies duplicate pixel IDs
- Warns about pixels that are installed but not firing
- Provides actionable recommendations

📤 **Export Options**
- Copy report as formatted text (for Slack/Email)
- Export raw JSON data for developers

## 🚀 Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/user/unified-pixel-inspector.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked** and select the cloned folder

5. The extension icon will appear in your toolbar

## 📖 Usage

1. Click the extension icon to open the Side Panel
2. Navigate to any website with tracking pixels
3. View detected platforms in the **Scan** tab
4. Monitor real-time events in the **Timeline** tab
5. Configure settings in the **Settings** tab

### Screenshots

| Scan View | Timeline View |
|-----------|---------------|
| Detected platforms with status | Real-time event stream |

## 🛠️ Technical Details

### Architecture

```
unified-pixel-inspector/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for network monitoring
├── content/
│   ├── scanner.js         # DOM scanning for pixels
│   └── hooks.js           # API hooking in page context
├── sidepanel/
│   ├── index.html         # Side panel UI
│   ├── styles.css         # Styling (light/dark themes)
│   └── app.js             # UI logic and rendering
└── icons/                 # Extension icons
```

### Detection Methods

1. **Script Analysis**: Scans `<script>` tags for pixel libraries
2. **Global Check**: Verifies window objects (fbq, ttq, dataLayer, etc.)
3. **Network Monitoring**: Intercepts requests to tracking endpoints
4. **API Hooking**: Captures tracking function calls in real-time

### Permissions

- `activeTab`: Access current tab content
- `scripting`: Inject content scripts
- `storage`: Save user preferences
- `webRequest`: Monitor network requests
- `sidePanel`: Display side panel UI

## 🎨 Themes

The extension supports both **Light** and **Dark** themes, matching your preference.

## 🔒 Privacy

- All analysis happens locally in your browser
- No data is sent to external servers
- Sensitive parameters (email, phone) are automatically masked

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper) and [TikTok Pixel Helper](https://chrome.google.com/webstore/detail/tiktok-pixel-helper)
- Built with ❤️ by nguyenvanhao.name.vn
