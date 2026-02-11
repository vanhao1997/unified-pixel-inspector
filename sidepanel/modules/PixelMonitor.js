import { SessionStore } from '../../lib/sessionStore.js';

export class PixelMonitor {
  constructor(ui) {
    this.ui = ui;
    this.session = null;
    this.tabId = null;
    this.filters = { platform: '', event: '' };
  }

  async init() {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    this.tabId = tab.id;

    // Initial Load
    this.session = await SessionStore.get(this.tabId);
    this.render();

    // Reactive Updates (listen to storage changes)
    chrome.storage.session.onChanged.addListener((changes) => {
      const key = SessionStore.getKey(this.tabId);
      if (changes[key]) {
        const newValue = changes[key].newValue;
        // If session was cleared (undefined), use empty structure
        this.session = newValue || { platforms: {}, events: [] };
        this.render();
      }
    });

    this.bindEvents();
  }

  bindEvents() {
    // Timeline controls
    document.getElementById('captureToggle')?.addEventListener('click', () => this.toggleCapture());
    document.getElementById('clearTimeline')?.addEventListener('click', () => this.clearTimeline());

    // Filters
    document.getElementById('platformFilter')?.addEventListener('change', (e) => {
      this.filters.platform = e.target.value;
      this.renderTimeline();
    });
    document.getElementById('eventFilter')?.addEventListener('input', (e) => {
      this.filters.event = e.target.value.toLowerCase();
      this.renderTimeline();
    });

    // Export buttons
    document.getElementById('exportText')?.addEventListener('click', () => this.exportText());
    document.getElementById('exportJson')?.addEventListener('click', () => this.exportJson());

    // Refresh button (manual reload)
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.init();
      // Reload the active tab to re-detect pixels
      chrome.tabs.reload(this.tabId);
      this.ui.showToast('Đang tải lại trang...');
    });
  }

  toggleCapture() {
    const capturing = !this.session?.capturing;
    // Update via message to background (to keep capture state consistent if background manages logic)
    // Or update storage directly. Background reads storage?
    // Background logic for capturing is:
    // handleEventCaptured: checks `session.capturing`.
    // So updating storage directly works!

    SessionStore.update(this.tabId, (s) => {
      s.capturing = capturing;
    }).then((s) => {
      this.renderCaptureState(s.capturing);
      this.ui.showToast(capturing ? 'Đã bật ghi nhận sự kiện' : 'Đã tạm dừng ghi nhận');
    });
  }

  clearTimeline() {
    SessionStore.update(this.tabId, (s) => {
      s.events = [];
      s.platforms = {}; // Also clear platforms? User might want to keep platform status but clear events.
      // app.js cleared session entirely usually.
      // Let's clear events only or reset session?
      // "Clear Session" usually means everything.
      s.platforms = {};
      s.events = [];
      // Reset platform status
    }).then(() => {
      this.ui.showToast('Đã xóa dữ liệu phiên');
    });
  }

  render() {
    this.renderPlatforms();
    this.renderDiagnostics();
    this.renderTimeline();
    this.renderCaptureState(this.session?.capturing);
  }

  renderCaptureState(capturing) {
    const btn = document.getElementById('captureToggle');
    if (btn) {
      btn.innerHTML = capturing
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Resume';
      btn.className = capturing ? 'active' : '';
    }
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
          <p>Chưa phát hiện Pixel nào</p>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map(([key, data]) => {
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
    if (data.fired) return '<span class="status-indicator fired"><span class="status-dot"></span>Firing</span>';
    if (data.loaded) return '<span class="status-indicator loaded"><span class="status-dot"></span>Loaded</span>';
    if (data.installed) return '<span class="status-indicator installed"><span class="status-dot"></span>Installed</span>';
    return '';
  }

  renderDiagnostics() {
    const container = document.getElementById('diagnosticsList');
    const platforms = this.session?.platforms || {};
    const diagnostics = [];

    for (const [key, data] of Object.entries(platforms)) {
      if (key !== 'google' && data.pixelIds && data.pixelIds.length > 1) {
        diagnostics.push({
          type: 'warning',
          message: `Multiple ${key} pixel IDs detected: ${data.pixelIds.join(', ')}`
        });
      }
      if (data.installed && !data.fired) {
        diagnostics.push({
          type: 'warning',
          message: `${key} is installed but no events captured yet`
        });
      }
      data.errors?.forEach(err => diagnostics.push({ type: 'error', message: err.message }));
      data.warnings?.forEach(warn => diagnostics.push({ type: 'warning', message: warn.message }));
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

    if (this.filters.platform) events = events.filter(e => e.platform === this.filters.platform);
    if (this.filters.event) events = events.filter(e => e.event.toLowerCase().includes(this.filters.event));

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
           <p style="color:var(--text-secondary)">No events captured</p>
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
    return new Date(timestamp).toLocaleTimeString();
  }

  exportJson() {
    const data = JSON.stringify(this.session, null, 2);
    this.downloadFile(data, 'pixel-inspector-session.json', 'application/json');
  }

  exportText() {
    let text = 'Pixel Inspector Report\n====================\n\n';
    // Add text generation logic (simplified)
    text += JSON.stringify(this.session, null, 2);
    this.downloadFile(text, 'pixel-inspector.txt', 'text/plain');
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
}
