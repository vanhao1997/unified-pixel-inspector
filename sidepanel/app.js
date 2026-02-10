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

// ===== SETUP WIZARD CLASS =====
class SetupWizard {
    constructor(inspector) {
        this.inspector = inspector;
        this.selectedAction = null;
        this.init();
    }

    init() {
        this.renderActionGrid();
        this.bindEvents();
        this.loadSavedPixelIds();
    }

    renderActionGrid() {
        const grid = document.getElementById('actionGrid');
        if (!grid || typeof EVENT_MAPPING === 'undefined') return;

        // Group by category
        const categories = {};
        for (const [key, event] of Object.entries(EVENT_MAPPING)) {
            const cat = event.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ key, ...event });
        }

        // Icon mapping
        const icons = {
            page_view: '📄',
            view_content: '👁️',
            add_to_cart: '🛒',
            checkout: '💳',
            add_payment: '💰',
            purchase: '✅',
            lead: '📝',
            signup: '👤',
            contact: '📞',
            search: '🔍',
            button_click: '🖱️',
            form_submit: '📋',
            download: '⬇️',
            scroll_depth: '📜',
            video_play: '▶️'
        };

        // Category order
        const catOrder = ['basic', 'ecommerce', 'lead', 'engagement', 'interaction'];

        let html = '';
        for (const cat of catOrder) {
            const events = categories[cat];
            if (!events) continue;
            const catInfo = EVENT_CATEGORIES?.[cat] || { label: cat, icon: '📌', description: '' };
            html += `
                <div class="action-category-header" style="grid-column: 1 / -1;">
                    <div class="category-title">${catInfo.icon} ${catInfo.label}</div>
                    <div class="category-desc">${catInfo.description || ''}</div>
                </div>
            `;

            for (const event of events) {
                html += `
                    <div class="action-item" data-action="${event.key}" title="${event.description}">
                        <span class="action-icon">${icons[event.key] || '📌'}</span>
                        <span class="action-label">${event.label}</span>
                    </div>
                `;
            }
        }

        grid.innerHTML = html;
    }

    bindEvents() {
        // Action selection
        document.getElementById('actionGrid')?.addEventListener('click', (e) => {
            const item = e.target.closest('.action-item');
            if (!item) return;

            document.querySelectorAll('.action-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            this.selectedAction = item.dataset.action;
            this.showNextSteps();
        });

        // Add product button
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.addProductRow();
        });

        // Remove product buttons (delegated)
        document.getElementById('productsList')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-product')) {
                const row = e.target.closest('.product-item');
                if (document.querySelectorAll('.product-item').length > 1) {
                    row.remove();
                }
            }
        });

        // Generate code button
        document.getElementById('generateCodeBtn')?.addEventListener('click', () => {
            this.generateCode();
        });

        // Copy code button
        document.getElementById('copyAllCode')?.addEventListener('click', () => {
            this.copyCode();
        });

        // Reset button
        document.getElementById('resetSetup')?.addEventListener('click', () => {
            this.reset();
        });

        // Code mode tabs (Direct / GTM)
        document.querySelector('.code-mode-tabs')?.addEventListener('click', (e) => {
            const tab = e.target.closest('.code-mode-tab');
            if (!tab) return;

            const mode = tab.dataset.mode;
            document.querySelectorAll('.code-mode-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Toggle panels
            document.getElementById('directCodePanel').style.display = mode === 'direct' ? 'block' : 'none';
            document.getElementById('gtmCodePanel').style.display = mode === 'gtm' ? 'block' : 'none';
        });

        // Auto-detect button
        document.getElementById('autoDetectBtn')?.addEventListener('click', () => {
            this.autoDetectFromSession();
        });

        // Element picker button
        document.getElementById('pickElementBtn')?.addEventListener('click', () => {
            this.startElementPicker();
        });

        // Listen for element picker results from content script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'ELEMENT_PICKED_RESULT') {
                this.handleElementPicked(message.data);
            }
            if (message.type === 'ELEMENT_PICKER_CANCELLED_RESULT') {
                this.handlePickerCancelled();
            }
        });

        // GTM Connect button
        document.getElementById('gtmConnectBtn')?.addEventListener('click', () => {
            if (gtmClient.isAuthenticated()) {
                this.disconnectGTM();
            } else {
                this.connectGTM();
            }
        });

        // GTM Account selector
        document.getElementById('gtmAccountSelect')?.addEventListener('change', (e) => {
            const path = e.target.value;
            if (path) {
                const accounts = this._gtmAccounts || [];
                gtmClient.selectedAccount = accounts.find(a => a.path === path);
                gtmClient.selectedContainer = null;
                gtmClient.selectedWorkspace = null;
                this.updateGTMUI();
                this.loadGTMContainers(path);
            }
        });

        // GTM Container selector
        document.getElementById('gtmContainerSelect')?.addEventListener('change', (e) => {
            const path = e.target.value;
            if (path) {
                const containers = this._gtmContainers || [];
                gtmClient.selectedContainer = containers.find(c => c.path === path);
                gtmClient.selectedWorkspace = null;
                this.updateGTMUI();
                this.loadGTMWorkspaces(path);
            }
        });

        // GTM Workspace selector
        document.getElementById('gtmWorkspaceSelect')?.addEventListener('change', (e) => {
            const path = e.target.value;
            if (path) {
                const workspaces = this._gtmWorkspaces || [];
                gtmClient.selectedWorkspace = workspaces.find(w => w.path === path);
                gtmClient.saveConnection();
                this.updateGTMUI();
            }
        });

        // Deploy to GTM button
        document.getElementById('deployToGTM')?.addEventListener('click', () => {
            this.deployToGTM();
        });

        // Configure GTM button (redirect to Settings)
        document.getElementById('configureGTM')?.addEventListener('click', () => {
            this.inspector.switchTab('settings');
        });

        // Try to restore GTM connection
        this.restoreGTMConnection();
    }

    startElementPicker() {
        const btn = document.getElementById('pickElementBtn');
        btn.classList.add('picking');
        btn.textContent = '⏳ Đang chọn...';
        document.getElementById('selectorHint').textContent = 'Chuyển sang tab trang web và click vào element bạn muốn chọn';

        chrome.runtime.sendMessage({ type: 'START_ELEMENT_PICKER' }, (response) => {
            if (!response?.success) {
                this.inspector.showToast('Không thể mở Element Picker. Hãy mở một trang web trước.');
                this.handlePickerCancelled();
            }
        });
    }

    handleElementPicked(data) {
        const { selector, elementInfo, tagName, text } = data;

        // Fill the CSS selector input
        document.getElementById('interactionSelector').value = selector;

        // Auto-fill interaction target if empty
        const targetInput = document.getElementById('interactionTarget');
        if (!targetInput.value && text) {
            targetInput.value = text.substring(0, 50);
        }

        // Show picked element info
        const infoDiv = document.getElementById('pickedElementInfo');
        document.getElementById('pickedTag').textContent = `✅ ${elementInfo}`;
        document.getElementById('pickedText').textContent = text ? `"${text.substring(0, 60)}"` : '';
        infoDiv.style.display = 'block';

        // Update hint
        document.getElementById('selectorHint').textContent = 'Element đã được chọn thành công!';

        // Reset button state
        this.handlePickerCancelled();
        this.inspector.showToast('Đã chọn element thành công!');
    }

    handlePickerCancelled() {
        const btn = document.getElementById('pickElementBtn');
        if (btn) {
            btn.classList.remove('picking');
            btn.textContent = '🎯 Chọn element';
        }
    }

    showNextSteps() {
        const eventConfig = EVENT_MAPPING[this.selectedAction];
        const isInteraction = eventConfig?.category === 'interaction';
        const isEcommerce = eventConfig?.category === 'ecommerce';

        // Show action name panel
        document.getElementById('actionNamePanel').style.display = 'block';

        // Show interaction config for interaction events
        const interactionConfig = document.getElementById('interactionConfig');
        if (isInteraction) {
            interactionConfig.style.display = 'block';
            // Set dynamic placeholder and title based on action type
            const targetInput = document.getElementById('interactionTarget');
            const configTitle = document.getElementById('interactionConfigTitle');
            const placeholders = {
                button_click: { target: 'VD: Nút Mua Ngay, Nút Đăng ký, Nút Hotline...', title: '🖱️ Button nào?' },
                form_submit: { target: 'VD: Form đăng ký, Form liên hệ, Form khảo sát...', title: '📋 Form nào?' },
                download: { target: 'VD: Ebook Marketing, Bảng giá 2024, Catalogue...', title: '⬇️ File nào?' },
                scroll_depth: { target: 'VD: Trang sản phẩm, Landing page, Blog...', title: '📜 Trang nào?' },
                video_play: { target: 'VD: Video giới thiệu, Video hướng dẫn, Testimonial...', title: '▶️ Video nào?' }
            };
            const config = placeholders[this.selectedAction] || { target: '', title: '⚙️ Cấu hình chi tiết' };
            targetInput.placeholder = config.target;
            configTitle.textContent = config.title;
        } else {
            interactionConfig.style.display = 'none';
        }

        // Show params step for ecommerce, hide for interaction/basic
        document.getElementById('paramsStep').style.display = isEcommerce ? 'block' : 'none';
        document.getElementById('platformsStep').style.display = 'block';
        document.getElementById('codeOutputStep').style.display = 'none';
    }

    addProductRow() {
        const list = document.getElementById('productsList');
        const row = document.createElement('div');
        row.className = 'product-item';
        row.innerHTML = `
            <input type="text" placeholder="Product ID" class="product-id">
            <input type="text" placeholder="Product Name" class="product-name">
            <input type="number" placeholder="Price" class="product-price">
            <input type="number" placeholder="Qty" value="1" class="product-qty">
            <button type="button" class="btn-remove-product">&times;</button>
        `;
        list.appendChild(row);
    }

    getParams() {
        const value = parseFloat(document.getElementById('paramValue')?.value) || 0;
        const currency = document.getElementById('paramCurrency')?.value || 'VND';

        const items = [];
        document.querySelectorAll('.product-item').forEach(row => {
            const id = row.querySelector('.product-id')?.value;
            const name = row.querySelector('.product-name')?.value;
            const price = parseFloat(row.querySelector('.product-price')?.value) || 0;
            const quantity = parseInt(row.querySelector('.product-qty')?.value) || 1;

            if (id || name) {
                items.push({ id: id || '', name: name || '', price, quantity });
            }
        });

        return { value, currency, items };
    }

    getSelectedPlatforms() {
        const platforms = [];
        if (document.getElementById('setupMeta')?.checked) platforms.push('meta');
        if (document.getElementById('setupTiktok')?.checked) platforms.push('tiktok');
        if (document.getElementById('setupGa4')?.checked) platforms.push('ga4');
        if (document.getElementById('setupZalo')?.checked) platforms.push('zalo');
        return platforms;
    }

    getPixelIds() {
        return {
            meta: document.getElementById('setupMetaId')?.value || '',
            tiktok: document.getElementById('setupTiktokId')?.value || '',
            ga4: document.getElementById('setupGa4Id')?.value || '',
            zalo: document.getElementById('setupZaloId')?.value || ''
        };
    }

    generateCode() {
        if (!this.selectedAction) {
            this.inspector.showToast('Please select an action first');
            return;
        }

        const platforms = this.getSelectedPlatforms();
        if (platforms.length === 0) {
            this.inspector.showToast('Please select at least one platform');
            return;
        }

        const params = this.getParams();
        const pixelIds = this.getPixelIds();



        const actionName = document.getElementById('actionName')?.value || '';
        const interactionTarget = document.getElementById('interactionTarget')?.value || '';
        const interactionSelector = document.getElementById('interactionSelector')?.value || '';

        // Save pixel IDs for future use
        this.savePixelIds(pixelIds);

        try {
            const result = codeGenerator.generate({
                action: this.selectedAction,
                platforms,
                params,
                pixelIds
            });

            // Build GTM header comment
            let gtmHeader = '';
            if (actionName) gtmHeader += `<!-- 📌 Action: ${actionName} -->\n`;
            if (interactionTarget) gtmHeader += `<!-- 🎯 Target: ${interactionTarget} -->\n`;
            if (interactionSelector) gtmHeader += `<!-- 🧩 CSS Selector: ${interactionSelector} -->\n`;
            if (gtmHeader) gtmHeader += '\n';

            // Populate GTM code
            document.getElementById('generatedGTMCode').textContent = gtmHeader + result.gtmCombined.trim();

            // Update GA4 event name in guide
            const eventConfig = EVENT_MAPPING[this.selectedAction];
            const ga4EventName = document.getElementById('gtmGA4EventName');
            if (ga4EventName && eventConfig?.ga4?.name) {
                ga4EventName.textContent = eventConfig.ga4.name;
            }

            // Populate trigger recommendation
            this.populateTriggerGuide();

            document.getElementById('codeOutputStep').style.display = 'block';
            document.getElementById('gtmCodePanel').style.display = 'block';

            // Scroll to output
            document.getElementById('codeOutputStep').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            this.inspector.showToast('Error generating code: ' + error.message);
        }
    }

    populateTriggerGuide() {
        const triggerGuide = document.getElementById('gtmTriggerGuide');
        if (!triggerGuide) return;

        const trigger = codeGenerator.getTriggerRecommendation(this.selectedAction);
        const eventConfig = EVENT_MAPPING[this.selectedAction];
        const label = eventConfig?.label || this.selectedAction;

        triggerGuide.innerHTML = `
            <div class="trigger-card">
                <div class="trigger-card-header">
                    🎯 Trigger cho: <strong>${label}</strong>
                </div>
                <div class="trigger-card-type">
                    Loại: <code>${trigger.type}</code>
                </div>
                <div class="trigger-card-config">
                    ${trigger.config}
                </div>
                <div class="trigger-card-detail">
                    <strong>Chi tiết cấu hình:</strong>
                    <pre class="trigger-detail-pre">${trigger.detail}</pre>
                </div>
            </div>
        `;
    }

    copyCode() {
        // Copy GTM code only
        const codeEl = document.getElementById('generatedGTMCode');
        const code = codeEl?.textContent;
        if (code) {
            navigator.clipboard.writeText(code);
            this.inspector.showToast('GTM Code copied!');
        }
    }

    reset() {
        this.selectedAction = null;
        document.querySelectorAll('.action-item').forEach(i => i.classList.remove('active'));
        document.getElementById('paramsStep').style.display = 'none';
        document.getElementById('platformsStep').style.display = 'none';
        document.getElementById('codeOutputStep').style.display = 'none';
        document.getElementById('actionNamePanel').style.display = 'none';
        document.getElementById('interactionConfig').style.display = 'none';

        // Clear form
        document.getElementById('paramValue').value = '';
        document.getElementById('paramCurrency').value = 'VND';
        document.getElementById('actionName').value = '';
        document.getElementById('interactionTarget').value = '';
        document.getElementById('interactionSelector').value = '';
        document.getElementById('pickedElementInfo').style.display = 'none';
        document.getElementById('selectorHint').textContent = 'Click "Chọn element" rồi rê chuột vào element trên trang';

        // Reset products to single row
        const list = document.getElementById('productsList');
        list.innerHTML = `
            <div class="product-item">
                <input type="text" placeholder="Product ID" class="product-id">
                <input type="text" placeholder="Product Name" class="product-name">
                <input type="number" placeholder="Price" class="product-price">
                <input type="number" placeholder="Qty" value="1" class="product-qty">
                <button type="button" class="btn-remove-product">&times;</button>
            </div>
        `;
    }

    savePixelIds(ids) {
        chrome.storage.local.set({ setupPixelIds: ids });
    }

    loadSavedPixelIds() {
        chrome.storage.local.get(['setupPixelIds'], (result) => {
            const ids = result.setupPixelIds || {};
            if (ids.meta) document.getElementById('setupMetaId').value = ids.meta;
            if (ids.tiktok) document.getElementById('setupTiktokId').value = ids.tiktok;
            if (ids.ga4) document.getElementById('setupGa4Id').value = ids.ga4;
            if (ids.zalo) document.getElementById('setupZaloId').value = ids.zalo;
        });
    }

    async autoDetectFromSession() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                this.inspector.showToast('Không tìm thấy tab hiện tại');
                return;
            }

            chrome.runtime.sendMessage({ type: 'GET_SESSION', tabId: tab.id }, (response) => {
                if (!response || !response.platforms) {
                    this.inspector.showToast('Chưa phát hiện pixel nào. Hãy scan trang trước!');
                    return;
                }

                let detectedCount = 0;
                const platforms = response.platforms;

                // Platform mapping: session key -> form elements
                const mapping = {
                    meta: { checkbox: 'setupMeta', input: 'setupMetaId' },
                    tiktok: { checkbox: 'setupTiktok', input: 'setupTiktokId' },
                    google: { checkbox: 'setupGa4', input: 'setupGa4Id' },
                    zalo: { checkbox: 'setupZalo', input: 'setupZaloId' }
                };

                for (const [platform, config] of Object.entries(mapping)) {
                    const platformData = platforms[platform];
                    if (platformData && platformData.pixelIds && platformData.pixelIds.length > 0) {
                        // Use the first detected pixel ID
                        const pixelId = platformData.pixelIds[0];
                        const inputEl = document.getElementById(config.input);
                        const checkboxEl = document.getElementById(config.checkbox);

                        if (inputEl && pixelId) {
                            inputEl.value = pixelId;
                            detectedCount++;
                        }
                        if (checkboxEl) {
                            checkboxEl.checked = true;
                        }
                    }
                }

                if (detectedCount > 0) {
                    this.inspector.showToast(`✅ Đã tự động điền ${detectedCount} pixel ID`);
                    // Save detected IDs
                    this.savePixelIds(this.getPixelIds());
                } else {
                    this.inspector.showToast('Không tìm thấy pixel ID. Hãy quay lại tab Scan!');
                }
            });
        } catch (error) {
            this.inspector.showToast('Lỗi khi detect pixel: ' + error.message);
        }
    }

    // ═══════════════════════════════════════
    // GTM INTEGRATION METHODS
    // ═══════════════════════════════════════

    async restoreGTMConnection() {
        try {
            const saved = await gtmClient.loadSavedConnection();
            if (saved) {
                // Restore email from saved connection
                if (saved.email) {
                    gtmClient.userEmail = saved.email;
                }
                // Try to silently get token
                await new Promise((resolve) => {
                    chrome.identity.getAuthToken({ interactive: false }, (token) => {
                        if (token) {
                            gtmClient.token = token;
                            gtmClient.fetchUserEmail().catch(() => { });
                        }
                        resolve();
                    });
                });
                if (gtmClient.isAuthenticated()) {
                    this.updateGTMUI();
                }
            }
        } catch (e) {
            // Fail silently
        }
    }

    async connectGTM() {
        const btn = document.getElementById('gtmConnectBtn');
        const statusText = document.getElementById('gtmStatusText');

        try {
            btn.disabled = true;
            btn.textContent = '⏳ Đang kết nối...';
            statusText.textContent = 'Đang xác thực Google...';

            await gtmClient.authenticate();

            // Fetch user email (wait a moment for it)
            await gtmClient.fetchUserEmail();

            statusText.textContent = 'Đang tải danh sách accounts...';
            await this.loadGTMAccounts();

            document.getElementById('gtmContainerSelector').style.display = 'block';
            this.updateGTMUI();

        } catch (error) {
            statusText.textContent = 'Lỗi kết nối: ' + error.message;
            document.getElementById('gtmStatusIcon').className = 'gtm-status-icon error';
            this.inspector.showToast('Không thể kết nối GTM: ' + error.message);
        } finally {
            btn.disabled = false;
        }
    }

    async disconnectGTM() {
        await gtmClient.logout();
        await gtmClient.clearConnection();

        // Reset selectors
        document.getElementById('gtmContainerSelector').style.display = 'none';
        document.getElementById('gtmAccountSelect').innerHTML = '<option value="">-- Chọn Account --</option>';
        document.getElementById('gtmContainerSelect').innerHTML = '<option value="">-- Chọn Container --</option>';
        document.getElementById('gtmWorkspaceSelect').innerHTML = '<option value="">-- Chọn Workspace --</option>';
        document.getElementById('deployToGTM').style.display = 'none';
        document.getElementById('gtmDeployResult').style.display = 'none';

        this.updateGTMUI();
        this.inspector.showToast('Đã ngắt kết nối GTM');
    }

    async loadGTMAccounts() {
        const select = document.getElementById('gtmAccountSelect');
        select.innerHTML = '<option value="">⏳ Đang tải...</option>';

        // Hide no-account message
        document.getElementById('gtmNoAccount').style.display = 'none';

        try {
            const accounts = await gtmClient.listAccounts();
            this._gtmAccounts = accounts;

            // No GTM accounts → show friendly message
            if (accounts.length === 0) {
                document.getElementById('gtmContainerSelector').style.display = 'none';
                document.getElementById('gtmNoAccount').style.display = 'block';
                return;
            }

            select.innerHTML = '<option value="">-- Chọn Account --</option>';
            accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.path;
                option.textContent = acc.name;
                select.appendChild(option);
            });

            // Auto-select if only 1 account
            if (accounts.length === 1) {
                select.value = accounts[0].path;
                gtmClient.selectedAccount = accounts[0];
                await this.loadGTMContainers(accounts[0].path);
            }
        } catch (error) {
            select.innerHTML = '<option value="">❌ Lỗi tải accounts</option>';
            throw error;
        }
    }

    async loadGTMContainers(accountPath) {
        const select = document.getElementById('gtmContainerSelect');
        select.innerHTML = '<option value="">⏳ Đang tải...</option>';
        select.disabled = false;

        // Reset workspace
        document.getElementById('gtmWorkspaceSelect').innerHTML = '<option value="">-- Chọn Workspace --</option>';
        document.getElementById('gtmWorkspaceSelect').disabled = true;

        try {
            const containers = await gtmClient.listContainers(accountPath);
            this._gtmContainers = containers;

            select.innerHTML = '<option value="">-- Chọn Container --</option>';
            containers.forEach(ctn => {
                const option = document.createElement('option');
                option.value = ctn.path;
                option.textContent = `${ctn.name} (${ctn.publicId || ctn.containerId})`;
                select.appendChild(option);
            });

            // Auto-select if only 1 container
            if (containers.length === 1) {
                select.value = containers[0].path;
                gtmClient.selectedContainer = containers[0];
                await this.loadGTMWorkspaces(containers[0].path);
            }
        } catch (error) {
            select.innerHTML = '<option value="">❌ Lỗi tải containers</option>';
        }
    }

    async loadGTMWorkspaces(containerPath) {
        const select = document.getElementById('gtmWorkspaceSelect');
        select.innerHTML = '<option value="">⏳ Đang tải...</option>';
        select.disabled = false;

        try {
            const workspaces = await gtmClient.listWorkspaces(containerPath);
            this._gtmWorkspaces = workspaces;

            select.innerHTML = '<option value="">-- Chọn Workspace --</option>';
            workspaces.forEach(ws => {
                const option = document.createElement('option');
                option.value = ws.path;
                option.textContent = ws.name;
                select.appendChild(option);
            });

            // Auto-select "Default Workspace" or first workspace
            const defaultWs = workspaces.find(w => w.name === 'Default Workspace') || workspaces[0];
            if (defaultWs) {
                select.value = defaultWs.path;
                gtmClient.selectedWorkspace = defaultWs;
                gtmClient.saveConnection();
                this.updateGTMUI();
            }
        } catch (error) {
            select.innerHTML = '<option value="">❌ Lỗi tải workspaces</option>';
        }
    }

    updateGTMUI() {
        const statusIcon = document.getElementById('gtmStatusIcon');
        const statusText = document.getElementById('gtmStatusText');
        const connectBtn = document.getElementById('gtmConnectBtn');
        const deployBtn = document.getElementById('deployToGTM');
        const configBtn = document.getElementById('configureGTM');
        const onboarding = document.getElementById('gtmOnboarding');
        const emailEl = document.getElementById('gtmUserEmail');
        const containerSelector = document.getElementById('gtmContainerSelector');
        const noAccountMsg = document.getElementById('gtmNoAccount');

        // Show/hide email
        if (gtmClient.userEmail && gtmClient.isAuthenticated()) {
            emailEl.textContent = gtmClient.userEmail;
            emailEl.style.display = 'block';
        } else {
            emailEl.style.display = 'none';
        }

        // Manage container selector visibility
        // Only show if authenticated AND "No Account" message is NOT visible
        const isNoAccount = noAccountMsg.style.display === 'block';
        if (gtmClient.isAuthenticated() && !isNoAccount) {
            containerSelector.style.display = 'block';
        } else {
            containerSelector.style.display = 'none';
        }

        if (gtmClient.isAuthenticated() && gtmClient.selectedWorkspace) {
            statusIcon.className = 'gtm-status-icon connected';
            statusText.textContent = `✅ ${gtmClient.selectedContainer?.name || 'Container'} → ${gtmClient.selectedWorkspace?.name || 'Workspace'}`;
            connectBtn.textContent = '🔌 Ngắt kết nối';
            connectBtn.classList.add('danger');

            deployBtn.style.display = 'inline-flex';
            configBtn.style.display = 'none';
            onboarding.style.display = 'none';
        } else if (gtmClient.isAuthenticated()) {
            statusIcon.className = 'gtm-status-icon pending';
            statusText.textContent = 'Đã đăng nhập — chọn Container';
            connectBtn.textContent = '🔌 Ngắt kết nối';
            connectBtn.classList.add('danger');

            deployBtn.style.display = 'none';
            configBtn.style.display = 'inline-flex';
            configBtn.textContent = '⚠️ Chọn Container';
            onboarding.style.display = 'none';
        } else {
            statusIcon.className = 'gtm-status-icon disconnected';
            statusText.textContent = 'Chưa kết nối GTM';
            connectBtn.textContent = '🔗 Kết nối GTM';
            connectBtn.classList.remove('danger');

            deployBtn.style.display = 'none';
            configBtn.style.display = 'inline-flex';
            configBtn.textContent = '⚙️ Kết nối GTM';
            onboarding.style.display = 'block';
        }
    }

    async deployToGTM() {
        if (!this.selectedAction) {
            this.inspector.showToast('Hãy chọn action và generate code trước');
            return;
        }

        if (!gtmClient.getWorkspacePath()) {
            this.inspector.showToast('Hãy chọn GTM Container/Workspace trước');
            return;
        }

        const deployBtn = document.getElementById('deployToGTM');
        const resultDiv = document.getElementById('gtmDeployResult');

        try {
            deployBtn.disabled = true;
            deployBtn.textContent = '⏳ Đang deploy...';

            const platforms = this.getSelectedPlatforms();
            const params = this.getParams();
            const pixelIds = this.getPixelIds();

            // Validate GA4 ID
            const ga4Id = pixelIds.ga4 ? pixelIds.ga4.trim() : '';
            if (!ga4Id) {
                this.inspector.showToast('⚠️ Vui lòng nhập Google Measurement ID (G-XXXXX)');
                document.getElementById('setupGa4Id').focus();
                deployBtn.disabled = false;
                deployBtn.textContent = '🚀 Deploy to GTM';
                return;
            }

            // Basic format check (starts with G- or variable {{)
            if (!ga4Id.startsWith('{{') && !/^[A-Z]{1,4}-[A-Z0-9]+$/.test(ga4Id)) {
                if (!confirm(`Measurement ID "${ga4Id}" có vẻ không đúng định dạng (VD: G-12345ABCDE). Bạn có chắc chắn muốn tiếp tục không?`)) {
                    deployBtn.disabled = false;
                    deployBtn.textContent = '🚀 Deploy to GTM';
                    return;
                }
            }

            const actionName = document.getElementById('actionName')?.value || '';
            const interactionSelector = document.getElementById('interactionSelector')?.value || '';

            // Build GTM payloads
            const { tagPayloads, triggerPayload } = gtmTagBuilder.buildAll({
                action: this.selectedAction,
                platforms,
                params,
                pixelIds,
                actionName,
                interactionSelector
            });

            // Deploy to GTM
            const result = await gtmClient.deploy({
                action: this.selectedAction,
                tagPayloads,
                triggerPayload
            });

            // Show result
            this.showDeployResult(result);

        } catch (error) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="deploy-result error">
                    <div class="deploy-result-icon">❌</div>
                    <div class="deploy-result-text">
                        <strong>Deploy thất bại</strong>
                        <p>${error.message}</p>
                    </div>
                </div>
            `;
            this.inspector.showToast('Deploy thất bại: ' + error.message);
        } finally {
            deployBtn.disabled = false;
            deployBtn.textContent = '🚀 Deploy to GTM';
        }
    }

    showDeployResult(result) {
        const resultDiv = document.getElementById('gtmDeployResult');
        resultDiv.style.display = 'block';

        const successTags = result.tags.length;
        const errorCount = result.errors.length;
        const triggerCreated = result.trigger ? 1 : 0;
        const gtmUrl = gtmClient.getGTMUrl();

        let html = '';

        if (errorCount === 0) {
            html += `
                <div class="deploy-result success">
                    <div class="deploy-result-icon">✅</div>
                    <div class="deploy-result-text">
                        <strong>Deploy thành công!</strong>
                        <p>Đã tạo ${triggerCreated} trigger + ${successTags} tags trong GTM</p>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="deploy-result warning">
                    <div class="deploy-result-icon">⚠️</div>
                    <div class="deploy-result-text">
                        <strong>Deploy một phần</strong>
                        <p>Tạo ${successTags} tags thành công, ${errorCount} lỗi</p>
                    </div>
                </div>
            `;
        }

        // Detail list
        html += '<div class="deploy-details">';
        if (result.trigger) {
            html += `<div class="deploy-detail-item trigger">🎯 Trigger: <strong>${result.trigger.name}</strong></div>`;
        }
        result.tags.forEach(tag => {
            html += `<div class="deploy-detail-item tag">🏷️ Tag: <strong>${tag.name}</strong></div>`;
        });
        result.errors.forEach(err => {
            html += `<div class="deploy-detail-item error">❌ ${err.name}: ${err.error}</div>`;
        });
        html += '</div>';

        // GTM link
        html += `
            <div class="deploy-gtm-link">
                <a href="${gtmUrl}" target="_blank" class="btn btn-sm btn-gtm">
                    🔗 Mở GTM để Preview & Publish
                </a>
            </div>
        `;

        resultDiv.innerHTML = html;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const inspector = new PixelInspector();
    new SetupWizard(inspector);
});

