import { SessionStore } from '../../lib/sessionStore.js';
import { EventExplainer } from '../../lib/eventExplainer.js';
import { ChecklistManager } from './ChecklistManager.js';
import { EventValidator } from './EventValidator.js';

export class PixelMonitor {
  constructor(ui) {
    this.ui = ui;
    this.session = null;
    this.tabId = null;
    this.filters = { platform: '', event: '' };

    this._eventsBound = false;

    // Platform dashboard URLs
    this.dashboardUrls = {
      meta: 'https://business.facebook.com/events_manager',
      tiktok: 'https://ads.tiktok.com/i18n/events/',
      google: 'https://tagmanager.google.com/',
      zalo: 'https://oa.zalo.me/',
      linkedin: 'https://www.linkedin.com/campaignmanager/'
    };

    this.platformNames = {
      meta: 'Meta Pixel',
      tiktok: 'TikTok Pixel',
      google: 'Google Tags',
      zalo: 'Zalo Pixel',
      linkedin: 'LinkedIn Insight Tag'
    };
    this.checklistManager = new ChecklistManager(this.renderChecklist.bind(this));
  }

  async init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    this.tabId = tab.id;

    this.session = await SessionStore.get(this.tabId);
    this.render();

    // Only bind listeners once
    if (!this._eventsBound) {
      chrome.storage.session.onChanged.addListener((changes) => {
        const key = SessionStore.getKey(this.tabId);
        if (changes[key]) {
          const newValue = changes[key].newValue;
          this.session = newValue || { platforms: {}, events: [] };
          this.render();
        }
      });
      this.bindEvents();
      this._eventsBound = true;
    }
  }

  bindEvents() {
    document.getElementById('captureToggle')?.addEventListener('click', () => this.toggleCapture());
    document.getElementById('clearTimeline')?.addEventListener('click', () => this.clearTimeline());

    document.getElementById('platformFilter')?.addEventListener('change', (e) => {
      this.filters.platform = e.target.value;
      this.renderTimeline();
    });
    document.getElementById('eventFilter')?.addEventListener('input', (e) => {
      this.filters.event = e.target.value.toLowerCase();
      this.renderTimeline();
    });

    document.getElementById('exportText')?.addEventListener('click', () => this.exportText());
    document.getElementById('exportJson')?.addEventListener('click', () => this.exportJson());

    // Export timeline button
    document.getElementById('exportTimeline')?.addEventListener('click', () => this.exportTimelineFile());

    // DataLayer viewer
    document.getElementById('viewDataLayerBtn')?.addEventListener('click', () => this.viewDataLayer());

    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.init();
      chrome.tabs.reload(this.tabId);
      this.ui.showToast('Đang tải lại trang...');
    });

    // Delegate click for copy-id, open-dashboard, and diff checkboxes
    document.addEventListener('click', (e) => {
      // Copy pixel ID
      const copyBtn = e.target.closest('.copy-id-btn');
      if (copyBtn) {
        const id = copyBtn.dataset.pixelId;
        if (id) this.ui.copyToClipboard(id);
        return;
      }
      // Open dashboard
      const dashBtn = e.target.closest('.open-dashboard-btn');
      if (dashBtn) {
        const url = dashBtn.dataset.url;
        if (url) chrome.tabs.create({ url });
        return;
      }
    });



    // Close dataLayer modal
    document.getElementById('closeDataLayerModal')?.addEventListener('click', () => {
      document.getElementById('dataLayerModal').style.display = 'none';
    });

    // Checklist listeners
    document.getElementById('checklistContainer')?.addEventListener('change', (e) => {
      if (e.target.id === 'checklistTypeSelector') {
        this.checklistManager.setType(e.target.value);
        this.updateChecklist();
      }
    });

    document.getElementById('checklistContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('#resetChecklist');
      if (btn) {
        this.checklistManager.reset();
        this.updateChecklist();
      }
    });
  }

  toggleCapture() {
    const capturing = !this.session?.capturing;
    SessionStore.update(this.tabId, (s) => {
      s.capturing = capturing;
    }).then((s) => {
      this.renderCaptureState(s.capturing);
      this.ui.showToast(capturing ? 'Đã bật ghi nhận sự kiện' : 'Đã tạm dừng ghi nhận');
    });
  }

  clearTimeline() {
    SessionStore.update(this.tabId, (s) => {
      s.platforms = {};
      s.events = [];
    }).then(() => {
      this.selectedEventsForDiff = [];
      this.ui.showToast('Đã xóa dữ liệu phiên');
    });
  }

  render() {
    this.renderPlatforms();
    this.renderDiagnostics();
    this.renderTimeline();
    this.renderCaptureState(this.session?.capturing);
    this.updateChecklist();
  }

  renderCaptureState(capturing) {
    const btn = document.getElementById('captureToggle');
    if (btn) {
      btn.innerHTML = capturing
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Resume';
      btn.className = capturing ? 'btn btn-primary active' : 'btn btn-primary';
    }
  }

  // ═══════════════════════════════════════════════
  // PLATFORM RENDERING (with Copy ID + Dashboard)
  // ═══════════════════════════════════════════════

  renderPlatforms() {
    const container = document.getElementById('platformList');
    const platforms = this.session?.platforms || {};

    const entries = Object.entries(platforms);
    document.getElementById('platformCount').textContent = entries.length;

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p>Chưa phát hiện Pixel nào</p>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map(([key, data]) => {
      const dashUrl = this.dashboardUrls[key] || '';

      // Build pixel IDs with copy buttons
      let idsHtml = '';
      if (key !== 'google' && data.pixelIds && data.pixelIds.length > 0) {
        idsHtml = `<div class="pixel-ids">${data.pixelIds.map(id => `
          <span class="pixel-id-chip">
            <code>${id}</code>
            <button class="copy-id-btn" data-pixel-id="${id}" title="Copy ID">📋</button>
          </span>
        `).join('')}</div>`;
      }

      // Google tags with copy
      let tagsHtml = '';
      if (key === 'google' && data.tags && data.tags.length > 0) {
        tagsHtml = `
          <div class="tag-list">
            ${data.tags.map(tag => `
              <div class="tag-item">
                <span class="tag-type ${tag.type}">${tag.type.toUpperCase()}</span>
                <code>${tag.id}</code>
                <button class="copy-id-btn" data-pixel-id="${tag.id}" title="Copy ID">📋</button>
                <span style="color: var(--text-muted); font-size: 11px;">${tag.label}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="platform-card ${key}">
          <div class="platform-header">
            <span class="platform-name">${this.platformNames[key] || key}</span>
            <div class="platform-actions">
              ${dashUrl ? `<button class="open-dashboard-btn" data-url="${dashUrl}" title="Open ${this.platformNames[key]} Dashboard">🔗</button>` : ''}
              ${this.getStatusIndicator(data)}
            </div>
          </div>
          <div class="platform-details">
            ${idsHtml}
            ${tagsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  getStatusIndicator(data) {
    if (data.fired) return '<span class="status-indicator fired"><span class="status-dot"></span>Firing</span>';
    if (data.loaded) return '<span class="status-indicator loaded"><span class="status-dot"></span>Loaded</span>';
    if (data.installed) return '<span class="status-indicator installed"><span class="status-dot"></span>Installed</span>';
    return '';
  }

  // ═══════════════════════════════════════════════
  // SMART DIAGNOSTICS (Phase 1.1)
  // ═══════════════════════════════════════════════

  renderDiagnostics() {
    const container = document.getElementById('diagnosticsList');
    const platforms = this.session?.platforms || {};
    const events = this.session?.events || [];
    const diagnostics = [];

    for (const [key, data] of Object.entries(platforms)) {
      const name = this.platformNames[key] || key;

      // 1. Duplicate pixel IDs
      if (key !== 'google' && data.pixelIds && data.pixelIds.length > 1) {
        diagnostics.push({
          type: 'error',
          icon: '🔴',
          message: `${name}: Trùng Pixel ID (${data.pixelIds.join(', ')}). Có thể gây double-counting events.`,
          tip: 'Xóa Pixel ID thừa khỏi source code hoặc GTM.'
        });
      }

      // 2. Installed but not loaded
      if (data.installed && !data.loaded && !data.fired) {
        diagnostics.push({
          type: 'warning',
          icon: '⚠️',
          message: `${name}: Script đã được cài nhưng chưa khởi tạo (init).`,
          tip: `Kiểm tra xem ${key === 'meta' ? "fbq('init', 'YOUR_ID')" : key === 'tiktok' ? "ttq.load('YOUR_ID')" : 'init code'} đã chạy chưa.`
        });
      }

      // 3. Loaded but not fired
      if (data.loaded && !data.fired) {
        diagnostics.push({
          type: 'warning',
          icon: '⚠️',
          message: `${name}: Pixel đã init nhưng chưa fire sự kiện nào.`,
          tip: 'Thử tương tác trên trang (click, submit form,...) để kích hoạt events.'
        });
      }

      // 4. Firing via network but global object not found
      if (data.installed && !data.loaded && data.fired) {
        const globalVar = key === 'meta' ? 'window.fbq' : key === 'tiktok' ? 'window.ttq' : key === 'zalo' ? 'ZaloSocialSDK' : 'dataLayer';
        diagnostics.push({
          type: 'info',
          icon: 'ℹ️',
          message: `${name}: Events đang được gửi qua network requests, nhưng ${globalVar} chưa khả dụng trên page.`,
          tip: `Nguyên nhân phổ biến: pixel được load qua GTM hoặc async script. Kiểm tra tab Network > filter "${key === 'meta' ? 'facebook.com/tr' : key === 'tiktok' ? 'analytics.tiktok.com' : key === 'zalo' ? 'sp.zalo.me' : 'google-analytics.com'}" để xác nhận.`
        });
      }

      // 5. Forward errors and warnings from session
      data.errors?.forEach(err => diagnostics.push({ type: 'error', icon: '🔴', message: err.message, tip: '' }));
      data.warnings?.forEach(warn => diagnostics.push({ type: 'warning', icon: '⚠️', message: warn.message, tip: '' }));
    }

    // 6. Check captured events for missing required params
    const ecommerceEvents = ['Purchase', 'CompletePayment', 'AddToCart', 'ViewContent', 'InitiateCheckout',
      'purchase', 'add_to_cart', 'view_item', 'begin_checkout'];
    events.forEach(evt => {
      if (ecommerceEvents.some(e => e.toLowerCase() === evt.event?.toLowerCase())) {
        const params = evt.params || {};
        const paramStr = JSON.stringify(params);
        if (!paramStr.includes('value') && !paramStr.includes('price')) {
          diagnostics.push({
            type: 'warning',
            icon: '💰',
            message: `Event "${evt.event}" (${evt.platform}) thiếu tham số "value".`,
            tip: 'Ecommerce events nên có value & currency để tối ưu quảng cáo.'
          });
        }
      }
    });

    // 7. No platforms detected at all
    if (Object.keys(platforms).length === 0) {
      diagnostics.push({
        type: 'info',
        icon: '🔍',
        message: 'Chưa phát hiện tracking pixel nào trên trang.',
        tip: 'Mở trang web có cài đặt pixel và thử lại.'
      });
    }

    if (diagnostics.length === 0) {
      container.innerHTML = `
        <div class="diagnostic-item success">
          <span class="diagnostic-icon">✅</span>
          <div class="diagnostic-content">
            <span class="diagnostic-msg">Tất cả pixel đang hoạt động bình thường!</span>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = diagnostics.map(d => `
      <div class="diagnostic-item ${d.type}">
        <span class="diagnostic-icon">${d.icon}</span>
        <div class="diagnostic-content">
          <span class="diagnostic-msg">${d.message}</span>
          ${d.tip ? `<span class="diagnostic-tip">💡 ${d.tip}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  // ═══════════════════════════════════════════════
  // DATALAYER INSPECTOR (Phase 1.2)
  // ═══════════════════════════════════════════════

  async viewDataLayer() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      // Request dataLayer from content script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_DATALAYER' }, (response) => {
        if (chrome.runtime.lastError) {
          this.ui.showToast('Không thể đọc dataLayer. Hãy refresh trang.', 'error');
          return;
        }
        this.showDataLayerModal(response?.dataLayer || []);
      });
    } catch (err) {
      this.ui.showToast('Lỗi: ' + err.message, 'error');
    }
  }

  showDataLayerModal(dataLayer) {
    const modal = document.getElementById('dataLayerModal');
    const content = document.getElementById('dataLayerContent');

    if (dataLayer.length === 0) {
      content.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">window.dataLayer trống hoặc chưa được khởi tạo.</p>';
    } else {
      content.innerHTML = dataLayer.map((entry, i) => {
        const eventName = entry.event || '(no event)';
        const isGTMInternal = eventName.startsWith('gtm.');
        return `
          <details class="dl-entry ${isGTMInternal ? 'dl-internal' : ''}" ${i >= dataLayer.length - 3 ? 'open' : ''}>
            <summary>
              <span class="dl-index">#${i + 1}</span>
              <span class="dl-event-name">${eventName}</span>
            </summary>
            <pre class="dl-json">${JSON.stringify(entry, null, 2)}</pre>
          </details>
        `;
      }).join('');
    }

    modal.style.display = 'flex';
  }

  // ═══════════════════════════════════════════════
  // TIMELINE (with Diff + Export) — Phase 2
  // ═══════════════════════════════════════════════

  renderTimeline() {
    const container = document.getElementById('eventTimeline');
    let events = this.session?.events || [];

    if (this.filters.platform) events = events.filter(e => e.platform === this.filters.platform);
    if (this.filters.event) events = events.filter(e => e.event.toLowerCase().includes(this.filters.event));

    if (events.length === 0) {
      container.innerHTML = `
        <div class=\"empty-state\">
           <p style=\"color:var(--text-secondary)\">No events captured</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.slice().reverse().map((event, idx) => {
      const info = EventExplainer.getEvent(event.event);
      const isSystem = EventExplainer.isSystemEvent(event.event);
      const funnelStage = EventExplainer.getFunnelStage(event.event);
      const icon = info?.icon || '📡';
      const viName = info?.vi || event.event;
      const desc = info?.desc || '';

      // VALIDATION
      const issues = EventValidator.validate(event);
      const hasError = issues.some(i => i.type === 'error');
      const hasWarning = issues.some(i => i.type === 'warning');

      let badgeHtml = '';
      if (hasError) badgeHtml = `<span class=\"validation-badge v-error\" title=\"${issues.length} Issues\">🔴</span>`;
      else if (hasWarning) badgeHtml = `<span class=\"validation-badge v-warning\" title=\"${issues.length} Warnings\">⚠️</span>`;

      let issuesHtml = '';
      if (issues.length > 0) {
        issuesHtml = `<div class=\"event-validation-issues\">
          ${issues.map(iss => `<div class=\"issue-item ${iss.type === 'warning' ? 'warning' : ''}\">
            <span class=\"issue-title\">${iss.icon || '⚠️'} ${iss.title}</span>
            <span class=\"issue-msg\">${iss.message}</span>
            <span class=\"issue-fix\">🔧 Fix: ${iss.fix}</span>
          </div>`).join('')}
        </div>`;
      }

      // Format params with Vietnamese labels
      let paramsHtml = '';
      if (event.params && Object.keys(event.params).length > 0) {
        const explained = EventExplainer.explainParams(event.params);
        paramsHtml = `<div class=\"event-params-explained\">
          ${explained.map(p => `<div class=\"param-row\">
            <span class=\"param-key\" title=\"${p.desc}\">${p.label}</span>
            <span class=\"param-value\">${this.truncateValue(p.value, 80)}</span>
          </div>`).join('')}
        </div>`;
      }

      return `
      <div class=\"event-item ${isSystem ? 'event-system' : ''}\">
        ${badgeHtml}
        <div class=\"event-header\">
          <span class=\"event-icon\">${icon}</span>
          <div class=\"event-name-group\">
            <span class=\"event-name\">${event.event}</span>
            <span class=\"event-vi-name\">${viName}</span>
          </div>
          <span class=\"event-time\">${this.formatTime(event.timestamp)}</span>
        </div>
        
        <div class=\"event-meta-row\">
           <span class=\"event-platform ${event.platform}\">${event.platform}</span>
           ${funnelStage ? `<span class=\"event-funnel-badge\">${funnelStage}</span>` : ''}
        </div>

        ${issuesHtml}
        ${desc ? `<div class=\"event-desc\">${desc}</div>` : ''}
        ${paramsHtml}
      </div>
    `}).join('');
  }

  // ═══════════════════════════════════════════════
  // EXPORT (Phase 2.2)
  // ═══════════════════════════════════════════════

  exportTimelineFile() {
    const events = this.session?.events || [];
    if (events.length === 0) {
      this.ui.showToast('Chưa có events để xuất');
      return;
    }

    const data = {
      exportedAt: new Date().toISOString(),
      url: '',
      totalEvents: events.length,
      events: events.map(e => ({
        event: e.event,
        platform: e.platform,
        timestamp: new Date(e.timestamp).toISOString(),
        pixelId: e.pixelId || '',
        params: e.params || {}
      }))
    };

    // Get URL from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) data.url = tabs[0].url;
      this.downloadFile(JSON.stringify(data, null, 2), `pixel-timeline-${Date.now()}.json`, 'application/json');
      this.ui.showToast(`Đã xuất ${events.length} events`);
    });
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  truncateValue(value, maxLen) {
    if (!value) return '';
    const str = String(value);
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
  }

  exportJson() {
    const data = JSON.stringify(this.session, null, 2);
    navigator.clipboard.writeText(data).then(() => {
      this.ui.showToast('Đã copy JSON vào clipboard');
    }).catch(() => {
      this.downloadFile(data, 'pixel-inspector-session.json', 'application/json');
    });
  }

  exportText() {
    const platforms = this.session?.platforms || {};
    const events = this.session?.events || [];

    let text = '═══ Unified Pixel Inspector Report ═══\n';
    text += `Generated: ${new Date().toLocaleString()}\n\n`;

    text += '── Detected Platforms ──\n';
    for (const [key, data] of Object.entries(platforms)) {
      const name = this.platformNames[key] || key;
      const status = data.fired ? 'FIRING ✅' : data.loaded ? 'LOADED 🟡' : data.installed ? 'INSTALLED ⚪' : 'UNKNOWN';
      text += `  ${name}: ${status}\n`;
      if (data.pixelIds?.length) text += `    IDs: ${data.pixelIds.join(', ')}\n`;
      if (data.tags?.length) text += `    Tags: ${data.tags.map(t => `${t.type}:${t.id}`).join(', ')}\n`;
    }

    if (events.length > 0) {
      text += `\n── Events Timeline (${events.length}) ──\n`;
      events.forEach((e, i) => {
        text += `  [${i + 1}] ${e.event} (${e.platform}) @ ${this.formatTime(e.timestamp)}\n`;
        if (e.params) text += `      Params: ${JSON.stringify(e.params)}\n`;
      });
    }

    navigator.clipboard.writeText(text).then(() => {
      this.ui.showToast('Đã copy report vào clipboard');
    }).catch(() => {
      this.downloadFile(text, 'pixel-inspector.txt', 'text/plain');
    });
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ═══════════════════════════════════════════════
  // CHECKLIST LOGIC
  // ═══════════════════════════════════════════════

  updateChecklist() {
    if (!this.session?.events || !this.checklistManager) return;

    // Silent reset then re-check all events
    this.checklistManager.reset(true);

    this.session.events.forEach(e => {
      this.checklistManager.checkEvent(e.event, true);
    });

    this.checklistManager.render();
  }

  renderChecklist(type, steps) {
    const container = document.getElementById('checklistContainer');
    if (!container) return;

    let html = `
      <div class="checklist-header">
        <select id="checklistTypeSelector" class="checklist-select">
          <option value="ecommerce" ${type === 'ecommerce' ? 'selected' : ''}>E-commerce Flow</option>
          <option value="lead_gen" ${type === 'lead_gen' ? 'selected' : ''}>Lead Gen Flow</option>
        </select>
        <button id="resetChecklist" class="btn-icon" title="Reset Checklist">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>
      <div class="checklist-steps">
    `;

    steps.forEach(step => {
      html += `
        <div class="step-item ${step.done ? 'step-done' : ''}">
          <div class="step-icon">${step.done ? '✅' : '⬜'}</div>
          <span class="step-label">${step.label}</span>
        </div>
      `;
    });
    html += `</div>`;

    container.innerHTML = html;
  }
}
