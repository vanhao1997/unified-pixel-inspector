export class UIController {
    constructor() {
        this.theme = 'light';
    }

    init() {
        this.loadTheme();
        this.bindThemeEvents();
        this.bindTabEvents();
    }

    loadTheme() {
        chrome.storage.local.get(['theme'], (result) => {
            this.theme = result.theme || 'light';
            this.applyTheme();
        });
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);

        // Update icons
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = this.theme === 'light' ? 'block' : 'none';
            moonIcon.style.display = this.theme === 'dark' ? 'block' : 'none';
        }

        // Update buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.theme);
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        chrome.storage.local.set({ theme: this.theme });
        this.applyTheme();
    }

    bindThemeEvents() {
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.theme = btn.dataset.theme;
                chrome.storage.local.set({ theme: this.theme });
                this.applyTheme();
            });
        });
    }

    bindTabEvents() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const tab = document.querySelector(`[data-tab="${tabId}"]`);
        const content = document.getElementById(`${tabId}Tab`);

        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Appear
        requestAnimationFrame(() => toast.classList.add('show'));

        // Disappear
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Đã copy vào clipboard!');
        } catch (err) {
            this.showToast('Lỗi copy', 'error');
        }
    }
}
