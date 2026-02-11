import { SessionStore } from '../../lib/sessionStore.js';

export class SetupManager {
    constructor(ui) {
        this.ui = ui;
        this.selectedAction = null;
        this.pickerMode = 'selector';
        this._gtmAccounts = [];
        this._gtmContainers = [];
        this._gtmWorkspaces = [];

        // Globals
        this.gtmClient = window.gtmClient;
        this.codeGenerator = window.codeGenerator;
        this.gtmTagBuilder = window.gtmTagBuilder;
        this.EVENT_DICTIONARY = window.EVENT_DICTIONARY;
    }

    init() {
        this.renderActionGrid();
        this.bindEvents();
        this.loadSavedPixelIds();
    }

    renderActionGrid() {
        const grid = document.getElementById('actionGrid');
        if (!grid || !this.EVENT_DICTIONARY) return;

        const categories = {};
        for (const [key, event] of Object.entries(this.EVENT_DICTIONARY)) {
            const type = event.type || 'custom';
            if (!categories[type]) categories[type] = [];
            categories[type].push({ key, ...event });
        }

        const catConfig = {
            ecommerce: { label: 'E-commerce', icon: '🛒', description: 'Sự kiện mua sắm chuẩn' },
            general: { label: 'Lead & Interaction', icon: '🎯', description: 'Thu thập Lead và tương tác' },
            custom: { label: 'Custom', icon: '⚙️', description: 'Sự kiện tùy chỉnh' }
        };

        const catOrder = ['ecommerce', 'general', 'custom'];
        let html = '';

        for (const cat of catOrder) {
            const events = categories[cat];
            if (!events) continue;
            const catInfo = catConfig[cat] || { label: cat, icon: '📌' };

            html += `
                <div class="action-category-header" style="grid-column: 1 / -1;">
                    <div class="category-title">${catInfo.icon} ${catInfo.label}</div>
                    <div class="category-desc">${catInfo.description || ''}</div>
                </div>
            `;

            for (const event of events) {
                html += `
                    <div class="action-item" data-action="${event.key}" title="${event.description}">
                        <span class="action-icon">${event.icon || '📌'}</span>
                        <span class="action-label">${event.label}</span>
                    </div>
                `;
            }
        }

        grid.innerHTML = html;
    }

    bindEvents() {
        document.getElementById('actionGrid')?.addEventListener('click', (e) => {
            const item = e.target.closest('.action-item');
            if (!item) return;

            document.querySelectorAll('.action-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            this.selectedAction = item.dataset.action;
            this.showNextSteps();
        });

        document.getElementById('addProductBtn')?.addEventListener('click', () => this.addProductRow());
        document.getElementById('productsList')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-product')) {
                const row = e.target.closest('.product-item');
                if (document.querySelectorAll('.product-item').length > 1) row.remove();
            }
        });

        document.getElementById('autoDetectToggle')?.addEventListener('change', (e) => {
            if (e.target.checked) this.autoDetectFromSession();
            else {
                ['setupGa4Id', 'setupMetaId', 'setupTiktokId', 'setupZaloId', 'setupGoogleAdsId', 'setupGoogleAdsLabel'].forEach(id => {
                    document.getElementById(id).value = '';
                });
                this.ui.showToast('Auto-detect tắt. Nhập Pixel ID thủ công.');
            }
        });

        document.getElementById('generateCodeBtn')?.addEventListener('click', () => this.generateCode());
        document.getElementById('copyAllCode')?.addEventListener('click', () => this.copyCode());
        document.getElementById('resetSetup')?.addEventListener('click', () => this.reset());

        document.querySelector('.code-mode-tabs')?.addEventListener('click', (e) => {
            const tab = e.target.closest('.code-mode-tab');
            if (!tab) return;
            const mode = tab.dataset.mode;
            document.querySelectorAll('.code-mode-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('directCodePanel').style.display = mode === 'direct' ? 'block' : 'none';
            document.getElementById('gtmCodePanel').style.display = mode === 'gtm' ? 'block' : 'none';
        });

        document.getElementById('pickElementBtn')?.addEventListener('click', () => this.startElementPicker('selector'));
        document.getElementById('pickValueBtn')?.addEventListener('click', () => this.startElementPicker('value'));

        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'ELEMENT_PICKED_RESULT') this.handleElementPicked(message.data);
            if (message.type === 'ELEMENT_PICKER_CANCELLED_RESULT') this.handlePickerCancelled();
        });

        ['setupGa4Id', 'setupMetaId', 'setupTiktokId', 'setupZaloId', 'setupGoogleAdsId'].forEach((inputId) => {
            const checkboxId = inputId.replace('Id', '');
            document.getElementById(inputId)?.addEventListener('input', (e) => {
                const checkbox = document.getElementById(checkboxId);
                if (checkbox && e.target.value.trim() !== '') checkbox.checked = true;
            });
        });

        document.getElementById('addParamBtn')?.addEventListener('click', () => this.addParameterRow());
        document.getElementById('parameterList')?.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-param')) e.target.closest('.param-row').remove();
        });

        document.getElementById('interactionType')?.addEventListener('change', () => this.updateInteractionConfig());
        document.getElementById('enableParamsToggle')?.addEventListener('change', (e) => {
            document.getElementById('paramsForm').style.display = e.target.checked ? 'block' : 'none';
        });

        document.body.addEventListener('click', (e) => {
            const icon = e.target.closest('.help-icon');
            if (icon) {
                this.showHelpBubble(icon, icon.dataset.help);
                e.stopPropagation();
            } else if (!e.target.closest('.help-bubble')) {
                this.hideHelpBubble();
            }
        });
        document.addEventListener('scroll', () => this.hideHelpBubble(), { capture: true, passive: true });

        document.getElementById('gtmConnectBtn')?.addEventListener('click', () => {
            if (this.gtmClient.isAuthenticated()) this.disconnectGTM();
            else this.connectGTM();
        });

        this.bindGTMSelectors();

        document.getElementById('deployToGTM')?.addEventListener('click', () => this.deployToGTM());
        document.getElementById('configureGTM')?.addEventListener('click', () => this.ui.switchTab('settings'));

        this.restoreGTMConnection();
    }

    bindGTMSelectors() {
        document.getElementById('gtmAccountSelect')?.addEventListener('change', (e) => {
            const path = e.target.value;
            if (path) {
                this.gtmClient.selectedAccount = this._gtmAccounts.find(a => a.path === path);
                this.gtmClient.selectedContainer = null;
                this.gtmClient.selectedWorkspace = null;
                this.updateGTMUI();
                this.loadGTMContainers(path);
            }
        });

        document.getElementById('gtmContainerSelect')?.addEventListener('change', (e) => {
            const path = e.target.value;
            if (path) {
                this.gtmClient.selectedContainer = this._gtmContainers.find(c => c.path === path);
                this.gtmClient.selectedWorkspace = null;
                this.updateGTMUI();
                this.loadGTMWorkspaces(path);
            }
        });

        document.getElementById('gtmWorkspaceSelect')?.addEventListener('change', (e) => {
            const path = e.target.value;
            if (path) {
                this.gtmClient.selectedWorkspace = this._gtmWorkspaces.find(w => w.path === path);
                this.gtmClient.saveConnection();
                this.updateGTMUI();
            }
        });
    }

    showHelpBubble(target, text) {
        const bubble = document.getElementById('helpBubble');
        if (!bubble || !text) return;
        bubble.textContent = text;

        bubble.style.visibility = 'hidden';
        bubble.style.display = 'block';
        const bubbleRect = bubble.getBoundingClientRect();
        bubble.style.display = '';
        bubble.style.visibility = '';

        const rect = target.getBoundingClientRect();
        let top = rect.bottom + 10 + window.scrollY;
        let left = rect.left - 10;

        if (left + bubbleRect.width > window.innerWidth - 10) left = window.innerWidth - bubbleRect.width - 10;
        if (left < 10) left = 10;

        bubble.style.top = `${top}px`;
        bubble.style.left = `${left}px`;
        bubble.classList.add('visible');
    }

    hideHelpBubble() {
        document.getElementById('helpBubble')?.classList.remove('visible');
    }

    showNextSteps() {
        const eventConfig = this.EVENT_DICTIONARY?.[this.selectedAction];
        const isCustom = eventConfig?.type === 'custom';
        const isEcommerce = eventConfig?.type === 'ecommerce';

        document.getElementById('actionNamePanel').style.display = 'block';

        const interactionConfig = document.getElementById('interactionConfig');
        if (isCustom) {
            interactionConfig.style.display = 'block';
            document.getElementById('interactionConfigTitle').textContent = '⚙️ Cấu hình Custom Event';
            this.updateInteractionConfig();
        } else {
            interactionConfig.style.display = 'none';
        }

        document.getElementById('paramsStep').style.display = 'block';
        document.getElementById('platformsStep').style.display = 'block';
        document.getElementById('codeOutputStep').style.display = 'none';

        document.getElementById('enableParamsToggle').checked = true;
        document.getElementById('paramsForm').style.display = 'block';

        const paramList = document.getElementById('parameterList');
        paramList.innerHTML = '';
        if (isEcommerce || eventConfig?.type === 'general') {
            this.addParameterRow('value', '');
            this.addParameterRow('currency', 'VND');
            if (document.getElementById('productsList')) {
                document.getElementById('productsList').style.display = isEcommerce ? 'block' : 'none';
            }
        }

        if (document.getElementById('autoDetectToggle')?.checked) {
            this.autoDetectFromSession();
        }
    }

    addParameterRow(key = '', value = '') {
        const list = document.getElementById('parameterList');
        const row = document.createElement('div');
        row.className = 'param-row';
        row.innerHTML = `
            <input type="text" class="param-key" placeholder="Key (e.g. coupon)" value="${key}">
            <input type="text" class="param-value" placeholder="Value" value="${value}">
            <button type="button" class="btn-remove-param" title="Remove">&times;</button>
        `;
        list.appendChild(row);
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

    updateInteractionConfig() {
        const type = document.getElementById('interactionType').value;
        const selectorConfig = document.getElementById('selectorConfig');
        const scrollConfig = document.getElementById('scrollConfig');

        if (type === 'click' || type === 'visibility' || type === 'submit') {
            selectorConfig.style.display = 'block';
            scrollConfig.style.display = 'none';
            const selectorInput = document.getElementById('interactionSelector');
            if (type === 'submit') selectorInput.placeholder = 'Form selector';
            else selectorInput.placeholder = 'CSS Selector';
        } else if (type === 'scroll') {
            selectorConfig.style.display = 'none';
            scrollConfig.style.display = 'block';
        }
    }

    startElementPicker(mode = 'selector') {
        this.pickerMode = mode;
        const btnId = mode === 'value' ? 'pickValueBtn' : 'pickElementBtn';
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.add('picking');
            btn.textContent = '⏳ Chọn...';
        }

        chrome.runtime.sendMessage({ type: 'START_ELEMENT_PICKER' }, (response) => {
            if (!response?.success) {
                this.ui.showToast('Không thể mở Element Picker. Hãy mở một trang web trước.');
                this.handlePickerCancelled();
            }
        });
    }

    handleElementPicked(data) {
        const { selector, elementInfo, text } = data;
        document.getElementById('interactionSelector').value = selector;

        const targetInput = document.getElementById('interactionTarget');
        if (!targetInput.value && text) targetInput.value = text.substring(0, 50);

        document.getElementById('pickedTag').textContent = `✅ ${elementInfo}`;
        document.getElementById('pickedText').textContent = text ? `"${text.substring(0, 60)}"` : '';
        document.getElementById('pickedElementInfo').style.display = 'block';

        this.handlePickerCancelled();
        this.ui.showToast('Đã chọn element thành công!');
    }

    handlePickerCancelled() {
        const pickerBtn = document.getElementById('pickElementBtn');
        if (pickerBtn) {
            pickerBtn.disabled = false;
            pickerBtn.textContent = '🎯 Chọn';
            pickerBtn.classList.remove('active');
        }
        const valueBtn = document.getElementById('pickValueBtn');
        if (valueBtn) {
            valueBtn.disabled = false;
            valueBtn.textContent = '🎯 Pick';
        }
    }

    async restoreGTMConnection() {
        try {
            const saved = await this.gtmClient.loadSavedConnection();
            if (saved) {
                if (saved.email) this.gtmClient.userEmail = saved.email;
                await new Promise(resolve => {
                    chrome.identity.getAuthToken({ interactive: false }, token => {
                        if (token) {
                            this.gtmClient.token = token;
                            this.gtmClient.fetchUserEmail().catch(() => { });
                        }
                        resolve();
                    });
                });
                if (this.gtmClient.isAuthenticated()) {
                    await this.loadGTMAccounts();
                    if (this.gtmClient.selectedAccount) {
                        document.getElementById('gtmAccountSelect').value = this.gtmClient.selectedAccount.path;
                        await this.loadGTMContainers(this.gtmClient.selectedAccount.path);
                    }
                    if (this.gtmClient.selectedContainer) {
                        document.getElementById('gtmContainerSelect').value = this.gtmClient.selectedContainer.path;
                        await this.loadGTMWorkspaces(this.gtmClient.selectedContainer.path);
                    }
                    if (this.gtmClient.selectedWorkspace) {
                        document.getElementById('gtmWorkspaceSelect').value = this.gtmClient.selectedWorkspace.path;
                    }
                    this.updateGTMUI();
                }
            }
        } catch (e) { console.error(e); }
    }

    async connectGTM() {
        const btn = document.getElementById('gtmConnectBtn');
        const statusText = document.getElementById('gtmStatusText');
        try {
            btn.disabled = true;
            btn.textContent = '⏳ Đang kết nối...';
            statusText.textContent = 'Đang xác thực...';
            await this.gtmClient.authenticate();
            await this.gtmClient.fetchUserEmail();
            await this.loadGTMAccounts();
            document.getElementById('gtmContainerSelector').style.display = 'block';
            this.updateGTMUI();
        } catch (error) {
            statusText.textContent = 'Lỗi kết nối';
            this.ui.showToast('Lỗi: ' + error.message);
        } finally {
            btn.disabled = false;
        }
    }

    async disconnectGTM() {
        await this.gtmClient.logout();
        await this.gtmClient.clearConnection();
        this.updateGTMUI();
        this.ui.showToast('Đã ngắt kết nối GTM');
    }

    async loadGTMAccounts() {
        const select = document.getElementById('gtmAccountSelect');
        select.innerHTML = '<option value="">⏳ Đang tải...</option>';
        document.getElementById('gtmNoAccount').style.display = 'none';
        try {
            const accounts = await this.gtmClient.listAccounts();
            this._gtmAccounts = accounts;
            if (accounts.length === 0) {
                document.getElementById('gtmNoAccount').style.display = 'block';
                return;
            }
            select.innerHTML = '<option value="">-- Chọn Account --</option>';
            accounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.path;
                opt.textContent = acc.name;
                select.appendChild(opt);
            });
            if (accounts.length === 1) {
                select.value = accounts[0].path;
                this.gtmClient.selectedAccount = accounts[0];
                await this.loadGTMContainers(accounts[0].path);
            }
        } catch (error) { select.innerHTML = '<option value="">❌ Lỗi</option>'; }
    }

    async loadGTMContainers(accountPath) {
        const select = document.getElementById('gtmContainerSelect');
        select.innerHTML = '<option value="">⏳ Đang tải...</option>';
        select.disabled = false;
        document.getElementById('gtmWorkspaceSelect').innerHTML = '<option value="">-- Chọn Workspace --</option>';
        document.getElementById('gtmWorkspaceSelect').disabled = true;
        try {
            const containers = await this.gtmClient.listContainers(accountPath);
            this._gtmContainers = containers;
            select.innerHTML = '<option value="">-- Chọn Container --</option>';
            containers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.path;
                opt.textContent = `${c.name} (${c.publicId})`;
                select.appendChild(opt);
            });
            if (containers.length === 1) {
                select.value = containers[0].path;
                this.gtmClient.selectedContainer = containers[0];
                await this.loadGTMWorkspaces(containers[0].path);
            }
        } catch (error) { select.innerHTML = '<option value="">❌ Lỗi</option>'; }
    }

    async loadGTMWorkspaces(containerPath) {
        const select = document.getElementById('gtmWorkspaceSelect');
        select.innerHTML = '<option value="">⏳ Đang tải...</option>';
        select.disabled = false;
        try {
            const workspaces = await this.gtmClient.listWorkspaces(containerPath);
            this._gtmWorkspaces = workspaces;
            select.innerHTML = '<option value="">-- Chọn Workspace --</option>';
            workspaces.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.path;
                opt.textContent = w.name;
                select.appendChild(opt);
            });
            const defaultWs = workspaces.find(w => w.name === 'Default Workspace') || workspaces[0];
            if (defaultWs) {
                select.value = defaultWs.path;
                this.gtmClient.selectedWorkspace = defaultWs;
                this.gtmClient.saveConnection();
                this.updateGTMUI();
            }
        } catch (error) { select.innerHTML = '<option value="">❌ Lỗi</option>'; }
    }

    updateGTMUI() {
        const statusIcon = document.getElementById('gtmStatusIcon');
        const statusText = document.getElementById('gtmStatusText');
        const connectBtn = document.getElementById('gtmConnectBtn');
        const deployBtn = document.getElementById('deployToGTM');
        const configBtn = document.getElementById('configureGTM');
        const emailEl = document.getElementById('gtmUserEmail');
        const containerSelector = document.getElementById('gtmContainerSelector');
        const noAccountMsg = document.getElementById('gtmNoAccount');

        const connected = this.gtmClient.isAuthenticated();

        if (connected && this.gtmClient.userEmail) {
            emailEl.textContent = this.gtmClient.userEmail;
            emailEl.style.display = 'block';
        } else {
            emailEl.style.display = 'none';
        }

        const isNoAccount = noAccountMsg.style.display === 'block';
        if (connected && !isNoAccount) containerSelector.style.display = 'block';
        else containerSelector.style.display = 'none';

        if (connected && this.gtmClient.selectedWorkspace) {
            statusIcon.className = 'gtm-status-icon connected';
            statusText.textContent = `✅ ${this.gtmClient.selectedContainer?.name}`;
            connectBtn.textContent = '🔌 Ngắt kết nối';
            connectBtn.classList.add('danger');
            deployBtn.style.display = 'inline-flex';
            configBtn.style.display = 'none';
            document.getElementById('gtmOnboarding').style.display = 'none';
        } else if (connected) {
            statusIcon.className = 'gtm-status-icon pending';
            statusText.textContent = 'Chọn Container';
            connectBtn.textContent = '🔌 Ngắt kết nối';
            connectBtn.classList.add('danger');
            deployBtn.style.display = 'none';
            configBtn.style.display = 'inline-flex';
            configBtn.textContent = '⚠️ Chọn Container';
            document.getElementById('gtmOnboarding').style.display = 'none';
        } else {
            statusIcon.className = 'gtm-status-icon disconnected';
            statusText.textContent = 'Chưa kết nối GTM';
            connectBtn.textContent = '🔗 Kết nối';
            connectBtn.classList.remove('danger');
            deployBtn.style.display = 'none';
            configBtn.style.display = 'inline-flex';
            configBtn.textContent = '⚙️ Kết nối GTM';
            document.getElementById('gtmOnboarding').style.display = 'block';
        }
    }

    async deployToGTM() {
        if (!this.selectedAction) return this.ui.showToast('Chọn action trước');
        if (!this.gtmClient.getWorkspacePath()) return this.ui.showToast('Chọn container trước');

        const deployBtn = document.getElementById('deployToGTM');
        try {
            deployBtn.disabled = true;
            deployBtn.textContent = '⏳ Deploying...';

            const platforms = this.getSelectedPlatforms();
            const params = this.getParams();
            const pixelIds = this.getPixelIds();
            const actionName = document.getElementById('actionName')?.value || '';
            const interactionSelector = document.getElementById('interactionSelector')?.value || '';

            const ga4Id = pixelIds.ga4 ? pixelIds.ga4.trim() : '';
            if (platforms.includes('ga4') && !ga4Id) {
                this.ui.showToast('Nhập GA4 Measurement ID');
                return;
            }

            const { tagPayloads, triggerPayload } = this.gtmTagBuilder.buildAll({
                action: this.selectedAction,
                platforms,
                params,
                pixelIds,
                actionName,
                interactionSelector
            });

            const result = await this.gtmClient.deploy({
                action: this.selectedAction,
                tagPayloads,
                triggerPayload
            });

            this.showDeployResult(result);
            this.ui.showToast('Deploy thành công!');
        } catch (error) {
            document.getElementById('gtmDeployResult').innerHTML = `
                <div class="deploy-result error">
                    <strong>Deploy thất bại</strong> <p>${error.message}</p>
                </div>
            `;
            document.getElementById('gtmDeployResult').style.display = 'block';
            this.ui.showToast('Deploy thất bại');
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

        let html = '';
        if (errorCount === 0) {
            html += `<div class="deploy-result success"><strong>Thành công!</strong> ${triggerCreated} trigger + ${successTags} tags.</div>`;
        } else {
            html += `<div class="deploy-result warning"><strong>Cảnh báo:</strong> ${successTags} tags ok, ${errorCount} lỗi.</div>`;
        }

        html += '<div class="deploy-details">';
        if (result.trigger) html += `<div class="deploy-detail-item trigger">Trigger: ${result.trigger.name}</div>`;
        result.tags.forEach(tag => html += `<div class="deploy-detail-item tag">Tag: ${tag.name}</div>`);
        result.errors.forEach(err => html += `<div class="deploy-detail-item error">Error: ${err.error}</div>`);
        html += '</div>';

        html += `<div class="deploy-gtm-link"><a href="${this.gtmClient.getGTMUrl()}" target="_blank">Open GTM</a></div>`;
        resultDiv.innerHTML = html;
    }

    async autoDetectFromSession() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            const session = await SessionStore.get(tab.id);
            if (!session || !session.platforms) {
                this.ui.showToast('Chưa scan được pixel nào.');
                return;
            }

            let detectedCount = 0;
            // Clear inputs
            ['setupMeta', 'setupTiktok', 'setupZalo', 'setupGoogleAds', 'setupGa4'].forEach(id => {
                const cb = document.getElementById(id);
                if (cb) cb.checked = false;
            });

            // Map platforms
            const platforms = session.platforms;
            const simpleMapping = {
                meta: { checkbox: 'setupMeta', input: 'setupMetaId' },
                tiktok: { checkbox: 'setupTiktok', input: 'setupTiktokId' },
                zalo: { checkbox: 'setupZalo', input: 'setupZaloId' }
            };

            for (const [platform, config] of Object.entries(simpleMapping)) {
                if (platforms[platform]?.pixelIds?.length > 0) {
                    document.getElementById(config.input).value = platforms[platform].pixelIds[0];
                    document.getElementById(config.checkbox).checked = true;
                    detectedCount++;
                }
            }

            // Google
            const googleData = platforms.google;
            if (googleData) {
                if (googleData.tags) {
                    const ga4 = googleData.tags.find(t => t.type === 'ga4');
                    if (ga4) {
                        document.getElementById('setupGa4Id').value = ga4.id;
                        document.getElementById('setupGa4').checked = true;
                        detectedCount++;
                    }
                    const ads = googleData.tags.find(t => t.type === 'ads');
                    if (ads) {
                        document.getElementById('setupGoogleAdsId').value = ads.id;
                        document.getElementById('setupGoogleAds').checked = true;
                        detectedCount++;
                    }
                }
                // Fallback pixelIds for Google
                if (googleData.pixelIds) {
                    googleData.pixelIds.forEach(id => {
                        if (/^G-/.test(id)) {
                            if (!document.getElementById('setupGa4Id').value) {
                                document.getElementById('setupGa4Id').value = id;
                                document.getElementById('setupGa4').checked = true;
                                detectedCount++;
                            }
                        } else if (/^AW-/.test(id)) {
                            if (!document.getElementById('setupGoogleAdsId').value) {
                                document.getElementById('setupGoogleAdsId').value = id;
                                document.getElementById('setupGoogleAds').checked = true;
                                detectedCount++;
                            }
                        }
                    });
                }
            }

            if (detectedCount > 0) {
                this.ui.showToast(`Đã tự động điền ${detectedCount} pixel ID`);
                this.savePixelIds(this.getPixelIds());
            } else {
                this.ui.showToast('Không tìm thấy ID mới.');
            }
        } catch (err) {
            this.ui.showToast('Auto-detect error ' + err.message);
        }
    }

    savePixelIds(ids) { chrome.storage.local.set({ setupPixelIds: ids }); }
    loadSavedPixelIds() {
        chrome.storage.local.get(['setupPixelIds'], (res) => {
            const ids = res.setupPixelIds || {};
            if (ids.meta) document.getElementById('setupMetaId').value = ids.meta;
            if (ids.tiktok) document.getElementById('setupTiktokId').value = ids.tiktok;
            if (ids.ga4) document.getElementById('setupGa4Id').value = ids.ga4;
            if (ids.zalo) document.getElementById('setupZaloId').value = ids.zalo;
        });
    }

    getSelectedPlatforms() {
        const platforms = [];
        if (document.getElementById('setupMeta')?.checked) platforms.push('meta');
        if (document.getElementById('setupTiktok')?.checked) platforms.push('tiktok');
        if (document.getElementById('setupGa4')?.checked) platforms.push('ga4');
        if (document.getElementById('setupZalo')?.checked) platforms.push('zalo');
        if (document.getElementById('setupGoogleAds')?.checked) platforms.push('google_ads');
        return platforms;
    }

    getParams() {
        const params = {};
        const paramsEnabled = document.getElementById('enableParamsToggle')?.checked ?? true;

        if (paramsEnabled) {
            document.querySelectorAll('.param-row').forEach(row => {
                const key = row.querySelector('.param-key').value.trim();
                const value = row.querySelector('.param-value').value.trim();
                if (key) {
                    const numVal = Number(value);
                    params[key] = !isNaN(numVal) && value !== '' ? numVal : value;
                }
            });
        }

        const eventConfig = this.EVENT_DICTIONARY?.[this.selectedAction];
        const isEcommerce = eventConfig?.type === 'ecommerce';

        if (isEcommerce && paramsEnabled) {
            const products = [];
            document.querySelectorAll('.product-item').forEach(item => {
                const id = item.querySelector('.product-id').value;
                const name = item.querySelector('.product-name').value;
                const price = item.querySelector('.product-price').value;
                const qty = item.querySelector('.product-qty').value;

                if (id || name) {
                    products.push({
                        item_id: id,
                        item_name: name,
                        price: Number(price) || 0,
                        quantity: Number(qty) || 1
                    });
                }
            });
            if (products.length > 0) params.items = products;
        }

        const isCustom = eventConfig?.type === 'custom';
        if (isCustom) {
            const type = document.getElementById('interactionType').value;
            params.interactionType = type;
            if (type === 'scroll') params.scrollDepth = document.getElementById('scrollDepth').value;
            else params.interactionSelector = document.getElementById('interactionSelector').value;
            params.customEventName = document.getElementById('actionName').value || 'custom_event';
        } else {
            params.actionName = document.getElementById('actionName').value;
        }

        return params;
    }

    getPixelIds() {
        return {
            meta: document.getElementById('setupMetaId')?.value || '',
            tiktok: document.getElementById('setupTiktokId')?.value || '',
            ga4: document.getElementById('setupGa4Id')?.value || '',
            zalo: document.getElementById('setupZaloId')?.value || '',
            google_ads: document.getElementById('setupGoogleAdsId')?.value || '',
            google_ads_label: document.getElementById('setupGoogleAdsLabel')?.value || ''
        };
    }

    generateCode() {
        if (!this.selectedAction) return this.ui.showToast('Please select action');
        const platforms = this.getSelectedPlatforms();
        if (platforms.length === 0) return this.ui.showToast('Select at least one platform');

        const params = this.getParams();
        const pixelIds = this.getPixelIds();
        const actionName = document.getElementById('actionName')?.value || '';
        const interactionSelector = document.getElementById('interactionSelector')?.value || '';

        this.savePixelIds(pixelIds);

        try {
            const result = this.codeGenerator.generate({
                action: this.selectedAction,
                platforms,
                params,
                pixelIds
            });

            let gtmHeader = '';
            if (actionName) gtmHeader += `<!-- Action: ${actionName} -->\n`;
            if (interactionSelector) gtmHeader += `<!-- Selector: ${interactionSelector} -->\n`;

            document.getElementById('generatedGTMCode').textContent = gtmHeader + result.gtmCombined.trim();

            this.populateTriggerGuide();

            document.getElementById('codeOutputStep').style.display = 'block';
            document.getElementById('gtmCodePanel').style.display = 'block';
            document.getElementById('codeOutputStep').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            this.ui.showToast('Error: ' + error.message);
        }
    }

    populateTriggerGuide() {
        const triggerGuide = document.getElementById('gtmTriggerGuide');
        if (!triggerGuide) return;
        const trigger = this.codeGenerator.getTriggerRecommendation(this.selectedAction);
        const eventConfig = this.EVENT_DICTIONARY?.[this.selectedAction];
        const label = eventConfig?.label || this.selectedAction;

        triggerGuide.innerHTML = `
            <div class="trigger-card">
                <div class="trigger-card-header">🎯 Trigger: <strong>${label}</strong></div>
                <div class="trigger-card-type">Type: <code>${trigger.type}</code></div>
                <div class="trigger-card-config">${trigger.config}</div>
                <div class="trigger-card-detail"><pre>${trigger.detail}</pre></div>
            </div>
        `;
    }

    copyCode() {
        const codeEl = document.getElementById('generatedGTMCode');
        const code = codeEl?.textContent;
        if (code) {
            navigator.clipboard.writeText(code);
            this.ui.showToast('GTM Code copied!');
        }
    }

    reset() {
        this.selectedAction = null;
        document.querySelectorAll('.action-item').forEach(i => i.classList.remove('active'));
        document.getElementById('paramsStep').style.display = 'none';
        document.getElementById('platformsStep').style.display = 'none';
        document.getElementById('codeOutputStep').style.display = 'none';
        document.getElementById('actionNamePanel').style.display = 'none';

        ['actionName', 'interactionTarget', 'interactionSelector'].forEach(id => document.getElementById(id).value = '');

        document.getElementById('pickedElementInfo').style.display = 'none';
        const interactionType = document.getElementById('interactionType');
        if (interactionType) {
            interactionType.value = 'click';
            interactionType.dispatchEvent(new Event('change'));
        }

        document.getElementById('parameterList').innerHTML = '';
        document.getElementById('generatedGTMCode').textContent = '';
        document.getElementById('gtmDeployResult').style.display = 'none';

        ['setupGa4Id', 'setupMetaId', 'setupTiktokId', 'setupZaloId', 'setupGoogleAdsId'].forEach(id => {
            document.getElementById(id).value = '';
        });
        ['setupGa4', 'setupMeta', 'setupTiktok', 'setupZalo', 'setupGoogleAds'].forEach(id => {
            const cb = document.getElementById(id);
            if (cb) cb.checked = false;
        });

        this.ui.showToast('Setup wizard reset.');
    }
}
