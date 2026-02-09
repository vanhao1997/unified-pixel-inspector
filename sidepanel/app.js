// Side Panel App - Unified Pixel Inspector

class PixelInspector {
    constructor() {
        this.session = null;
        this.currentTab = 'scan';
        this.capturing = true;
        this.filters = { platform: '', event: '' };
        this.theme = 'light';

        this.init();
    }

    async init() {
        this.loadTheme();
        this.bindEvents();
        await this.loadSession();
        this.startListening();
    }

    loadTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            this.theme = result.theme || 'light';
            this.applyTheme();
        });
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);

        // Update theme toggle icon
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = this.theme === 'light' ? 'block' : 'none';
            moonIcon.style.display = this.theme === 'dark' ? 'block' : 'none';
        }

        // Update theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.theme);
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        chrome.storage.local.set({ theme: this.theme });
        this.applyTheme();
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Theme buttons in settings
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.theme = btn.dataset.theme;
                chrome.storage.local.set({ theme: this.theme });
                this.applyTheme();
            });
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());

        // Timeline controls
        document.getElementById('captureToggle').addEventListener('click', () => this.toggleCapture());
        document.getElementById('clearTimeline').addEventListener('click', () => this.clearTimeline());

        // Filters
        document.getElementById('platformFilter').addEventListener('change', (e) => {
            this.filters.platform = e.target.value;
            this.renderTimeline();
        });
        document.getElementById('eventFilter').addEventListener('input', (e) => {
            this.filters.event = e.target.value.toLowerCase();
            this.renderTimeline();
        });

        // Export buttons
        document.getElementById('exportText').addEventListener('click', () => this.exportText());
        document.getElementById('exportJson').addEventListener('click', () => this.exportJson());

        // Settings
        this.loadSettings();
    }

    switchTab(tabId) {
        this.currentTab = tabId;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}Tab`).classList.add('active');
    }

    async loadSession() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        this.tabId = tab.id;

        chrome.runtime.sendMessage({ type: 'GET_SESSION', tabId: this.tabId }, (response) => {
            this.session = response || { platforms: {}, events: [] };
            this.render();
        });
    }

    startListening() {
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'SESSION_UPDATED' && message.tabId === this.tabId) {
                this.session = message.session;
                this.render();
            }
        });
    }

    render() {
        this.renderPlatforms();
        this.renderDiagnostics();
        this.renderTimeline();
    }

    renderPlatforms() {
        const container = document.getElementById('platformList');
        const platforms = this.session?.platforms || {};
        const platformNames = {
            meta: 'Meta Pixel',
            tiktok: 'TikTok Pixel',
            google: 'Google Tags',
            zalo: 'Zalo Pixel',
            linkedin: 'LinkedIn Insight Tag'
        };

        const entries = Object.entries(platforms);
        document.getElementById('platformCount').textContent = entries.length;

        if (entries.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p>No tracking pixels detected</p>
        </div>
      `;
            return;
        }

        container.innerHTML = entries.map(([key, data]) => {
            // Special rendering for Google tags
            let tagsHtml = '';
            if (key === 'google' && data.tags && data.tags.length > 0) {
                tagsHtml = `
          <div class="tag-list">
            ${data.tags.map(tag => `
              <div class="tag-item">
                <span class="tag-type ${tag.type}">${tag.type.toUpperCase()}</span>
                <code>${tag.id}</code>
                <span style="color: var(--text-muted); font-size: 11px;">${tag.label}</span>
              </div>
            `).join('')}
          </div>
        `;
            }

            return `
        <div class="platform-card ${key}">
          <div class="platform-header">
            <span class="platform-name">${platformNames[key] || key}</span>
            <div class="platform-status">
              ${this.getStatusIndicator(data)}
            </div>
          </div>
          <div class="platform-details">
            ${key !== 'google' && data.pixelIds.length > 0 ? `<div>ID: <code>${data.pixelIds.join('</code>, <code>')}</code></div>` : ''}
            ${tagsHtml}
          </div>
        </div>
      `;
        }).join('');
    }

    getStatusIndicator(data) {
        if (data.fired) {
            return '<span class="status-indicator fired"><span class="status-dot"></span>Firing</span>';
        }
        if (data.loaded) {
            return '<span class="status-indicator loaded"><span class="status-dot"></span>Loaded</span>';
        }
        if (data.installed) {
            return '<span class="status-indicator installed"><span class="status-dot"></span>Installed</span>';
        }
        return '';
    }

    getStatusText(data) {
        if (data.fired) return '✅ Events firing';
        if (data.loaded) return '🔵 Script loaded';
        if (data.installed) return '🟡 Installed (not firing)';
        return '⚪ Unknown';
    }

    renderDiagnostics() {
        const container = document.getElementById('diagnosticsList');
        const platforms = this.session?.platforms || {};
        const diagnostics = [];

        for (const [key, data] of Object.entries(platforms)) {
            // Check for duplicate pixel IDs (except Google which can have multiple)
            if (key !== 'google' && data.pixelIds && data.pixelIds.length > 1) {
                diagnostics.push({
                    type: 'warning',
                    message: `Multiple ${key} pixel IDs detected: ${data.pixelIds.join(', ')}`
                });
            }

            // Check for installed but not firing
            if (data.installed && !data.fired) {
                diagnostics.push({
                    type: 'warning',
                    message: `${key} is installed but no events captured yet`
                });
            }

            // Add errors
            data.errors?.forEach(err => {
                diagnostics.push({ type: 'error', message: err.message });
            });

            // Add warnings
            data.warnings?.forEach(warn => {
                diagnostics.push({ type: 'warning', message: warn.message });
            });
        }

        if (diagnostics.length === 0) {
            container.innerHTML = `
        <div class="diagnostic-item success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
          <span>No issues detected</span>
        </div>
      `;
            return;
        }

        container.innerHTML = diagnostics.map(d => `
      <div class="diagnostic-item ${d.type}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${d.type === 'error'
                ? '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>'
                : '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'}
        </svg>
        <span>${d.message}</span>
      </div>
    `).join('');
    }

    renderTimeline() {
        const container = document.getElementById('eventTimeline');
        let events = this.session?.events || [];

        // Apply filters
        if (this.filters.platform) {
            events = events.filter(e => e.platform === this.filters.platform);
        }
        if (this.filters.event) {
            events = events.filter(e => e.event.toLowerCase().includes(this.filters.event));
        }

        if (events.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p>No events captured yet</p>
          <span class="hint">Interact with the page to capture events</span>
        </div>
      `;
            return;
        }

        container.innerHTML = events.slice().reverse().map(event => `
      <div class="event-item">
        <div class="event-header">
          <span class="event-name">${event.event}</span>
          <span class="event-platform ${event.platform}">${event.platform}</span>
        </div>
        <div class="event-time">${this.formatTime(event.timestamp)}</div>
        ${event.params ? `<pre class="event-params">${JSON.stringify(event.params, null, 2)}</pre>` : ''}
      </div>
    `).join('');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
    }

    async refresh() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.reload(tab.id);
            setTimeout(() => this.loadSession(), 1000);
        }
    }

    toggleCapture() {
        this.capturing = !this.capturing;
        const btn = document.getElementById('captureToggle');

        if (this.capturing) {
            btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        Pause
      `;
        } else {
            btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Resume
      `;
        }

        chrome.runtime.sendMessage({ type: 'TOGGLE_CAPTURE', tabId: this.tabId, capturing: this.capturing });
    }

    clearTimeline() {
        chrome.runtime.sendMessage({ type: 'CLEAR_SESSION', tabId: this.tabId }, () => {
            this.loadSession();
        });
    }

    loadSettings() {
        chrome.storage.local.get(['settings'], (result) => {
            const settings = result.settings || {};

            document.getElementById('enableMeta').checked = settings.enableMeta !== false;
            document.getElementById('enableTiktok').checked = settings.enableTiktok !== false;
            document.getElementById('enableGoogle').checked = settings.enableGoogle !== false;
            document.getElementById('enableZalo').checked = settings.enableZalo !== false;
            document.getElementById('enableLinkedin').checked = settings.enableLinkedin !== false;
            document.getElementById('maskSensitive').checked = settings.maskSensitive !== false;
            document.getElementById('advancedCapture').checked = settings.advancedCapture !== false;
        });

        // Bind save on change
        document.querySelectorAll('#settingsTab input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => this.saveSettings());
        });
    }

    saveSettings() {
        const settings = {
            enableMeta: document.getElementById('enableMeta').checked,
            enableTiktok: document.getElementById('enableTiktok').checked,
            enableGoogle: document.getElementById('enableGoogle').checked,
            enableZalo: document.getElementById('enableZalo').checked,
            enableLinkedin: document.getElementById('enableLinkedin').checked,
            maskSensitive: document.getElementById('maskSensitive').checked,
            advancedCapture: document.getElementById('advancedCapture').checked
        };

        chrome.storage.local.set({ settings });
    }

    exportText() {
        const platforms = this.session?.platforms || {};
        const events = this.session?.events || [];
        const platformNames = {
            meta: 'Meta Pixel',
            tiktok: 'TikTok Pixel',
            google: 'Google Tags',
            zalo: 'Zalo Pixel',
            linkedin: 'LinkedIn Insight Tag'
        };

        let text = '📊 PIXEL INSPECTOR REPORT\n';
        text += '═══════════════════════════════\n\n';

        text += '🔍 DETECTED PLATFORMS\n';
        text += '───────────────────────────────\n';

        for (const [key, data] of Object.entries(platforms)) {
            const status = data.fired ? '✅' : data.loaded ? '🔵' : '🟡';
            text += `${status} ${platformNames[key] || key}\n`;

            if (key === 'google' && data.tags && data.tags.length > 0) {
                data.tags.forEach(tag => {
                    text += `   • ${tag.type.toUpperCase()}: ${tag.id}\n`;
                });
            } else if (data.pixelIds.length > 0) {
                text += `   ID: ${data.pixelIds.join(', ')}\n`;
            }
        }

        if (events.length > 0) {
            text += '\n📡 CAPTURED EVENTS (last 10)\n';
            text += '───────────────────────────────\n';
            events.slice(-10).forEach(e => {
                text += `• [${e.platform}] ${e.event}\n`;
            });
        }

        text += '\n───────────────────────────────\n';
        text += `Generated: ${new Date().toLocaleString()}\n`;

        navigator.clipboard.writeText(text);
        this.showToast('Report copied to clipboard!');
    }

    exportJson() {
        const report = {
            timestamp: new Date().toISOString(),
            platforms: this.session?.platforms || {},
            events: this.session?.events || []
        };

        navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        this.showToast('JSON copied to clipboard!');
    }

    showToast(message) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new PixelInspector();
});
