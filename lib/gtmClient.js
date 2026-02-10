/**
 * GTM API Client — Google Tag Manager API v2 wrapper
 * Uses chrome.identity for OAuth2 authentication
 * Calls GTM REST API to manage tags, triggers, and workspaces
 */

class GTMClient {
    constructor() {
        this.BASE_URL = 'https://tagmanager.googleapis.com/tagmanager/v2';
        this.token = null;
        this.userEmail = null;
        this.selectedAccount = null;
        this.selectedContainer = null;
        this.selectedWorkspace = null;
    }

    // ═══════════════════════════════════════
    // AUTHENTICATION
    // ═══════════════════════════════════════

    /**
     * Authenticate via chrome.identity OAuth2
     * Returns access token for GTM API calls
     */
    async authenticate() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                this.token = token;
                // Fetch user email after auth
                this.fetchUserEmail().catch(() => { });
                resolve(token);
            });
        });
    }

    /**
     * Fetch authenticated user's email
     */
    async fetchUserEmail() {
        if (!this.token) return null;
        try {
            const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                this.userEmail = data.email || null;
                return this.userEmail;
            }
        } catch (e) {
            // Non-critical, fail silently
        }
        return null;
    }

    /**
     * Revoke token and sign out
     */
    async logout() {
        if (!this.token) return;

        return new Promise((resolve) => {
            chrome.identity.removeCachedAuthToken({ token: this.token }, () => {
                // Also revoke the token on Google's end
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${this.token}`)
                    .catch(() => { }) // Ignore errors
                    .finally(() => {
                        this.token = null;
                        this.userEmail = null;
                        this.selectedAccount = null;
                        this.selectedContainer = null;
                        this.selectedWorkspace = null;
                        resolve();
                    });
            });
        });
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get saved GTM connection from storage
     */
    async loadSavedConnection() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['gtmConnection'], (result) => {
                if (result.gtmConnection) {
                    this.selectedAccount = result.gtmConnection.account;
                    this.selectedContainer = result.gtmConnection.container;
                    this.selectedWorkspace = result.gtmConnection.workspace;
                }
                resolve(result.gtmConnection || null);
            });
        });
    }

    /**
     * Save GTM connection to storage
     */
    async saveConnection() {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                gtmConnection: {
                    account: this.selectedAccount,
                    container: this.selectedContainer,
                    workspace: this.selectedWorkspace,
                    email: this.userEmail
                }
            }, resolve);
        });
    }

    /**
     * Clear saved connection
     */
    async clearConnection() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['gtmConnection'], resolve);
        });
    }

    // ═══════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════

    /**
     * Make authenticated API request
     */
    async apiCall(endpoint, method = 'GET', body = null) {
        if (!this.token) {
            await this.authenticate();
        }

        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.BASE_URL}${endpoint}`, options);

        if (response.status === 401) {
            // Token expired, try to refresh
            this.token = null;
            await this.authenticate();
            options.headers['Authorization'] = `Bearer ${this.token}`;
            const retryResponse = await fetch(`${this.BASE_URL}${endpoint}`, options);
            if (!retryResponse.ok) {
                const error = await retryResponse.json().catch(() => ({}));
                throw new Error(error.error?.message || `API error: ${retryResponse.status}`);
            }
            return retryResponse.json();
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(this.friendlyError(response.status, error));
        }

        return response.json();
    }

    /**
     * Translate API errors into friendly Vietnamese messages
     */
    friendlyError(status, errorBody) {
        const msg = errorBody?.error?.message || '';

        if (status === 403) {
            if (msg.includes('tagmanager')) {
                return 'Bạn chưa được cấp quyền Tag Manager API. Hãy đăng xuất và đăng nhập lại để cấp quyền.';
            }
            return 'Không có quyền truy cập. Hãy kiểm tra quyền GTM của bạn.';
        }
        if (status === 404) {
            return 'Không tìm thấy tài nguyên GTM. Container/Workspace có thể đã bị xóa.';
        }
        if (status === 429) {
            return 'Quá nhiều yêu cầu. Vui lòng đợi 1 phút rồi thử lại.';
        }
        if (status === 400) {
            if (msg.includes('already exists')) {
                return 'Tag/Trigger trùng tên đã tồn tại. Đổi tên action hoặc xóa tag cũ trong GTM.';
            }
            return `Dữ liệu không hợp lệ: ${msg}`;
        }

        return msg || `Lỗi GTM (${status}). Vui lòng thử lại.`;
    }

    /**
     * List all GTM accounts
     */
    async listAccounts() {
        const result = await this.apiCall('/accounts');
        return result.account || [];
    }

    /**
     * List containers for an account
     */
    async listContainers(accountPath) {
        const result = await this.apiCall(`/${accountPath}/containers`);
        return result.container || [];
    }

    /**
     * List workspaces for a container
     */
    async listWorkspaces(containerPath) {
        const result = await this.apiCall(`/${containerPath}/workspaces`);
        return result.workspace || [];
    }

    /**
     * Create a tag in a workspace
     */
    async createTag(workspacePath, tagConfig) {
        return await this.apiCall(`/${workspacePath}/tags`, 'POST', tagConfig);
    }

    /**
     * Create a trigger in a workspace
     */
    async createTrigger(workspacePath, triggerConfig) {
        return await this.apiCall(`/${workspacePath}/triggers`, 'POST', triggerConfig);
    }

    /**
     * List existing tags in workspace (to check duplicates)
     */
    async listTags(workspacePath) {
        const result = await this.apiCall(`/${workspacePath}/tags`);
        return result.tag || [];
    }

    /**
     * List existing triggers in workspace
     */
    async listTriggers(workspacePath) {
        const result = await this.apiCall(`/${workspacePath}/triggers`);
        return result.trigger || [];
    }

    /**
     * Get the workspace path string
     */
    getWorkspacePath() {
        if (!this.selectedWorkspace) return null;
        return this.selectedWorkspace.path;
    }

    /**
     * Get GTM URL for the current workspace
     */
    getGTMUrl() {
        if (!this.selectedAccount || !this.selectedContainer) return 'https://tagmanager.google.com';
        return `https://tagmanager.google.com/#/container/accounts/${this.selectedAccount.accountId}/containers/${this.selectedContainer.containerId}/workspaces`;
    }

    // ═══════════════════════════════════════
    // DEPLOY ORCHESTRATOR
    // ═══════════════════════════════════════

    /**
     * Deploy tags + trigger to GTM
     * @param {Object} config
     * @param {string} config.action - Action name (e.g., 'purchase')
     * @param {Array} config.tagPayloads - Array of tag configs from gtmTagBuilder
     * @param {Object} config.triggerPayload - Trigger config from gtmTagBuilder
     * @returns {Object} Deployment result
     */
    async deploy(config) {
        const { tagPayloads, triggerPayload } = config;
        const workspacePath = this.getWorkspacePath();

        if (!workspacePath) {
            throw new Error('Chưa chọn GTM workspace. Hãy kết nối GTM trước.');
        }

        const result = {
            trigger: null,
            tags: [],
            errors: []
        };

        try {
            // Fetch existing entities to check for duplicates
            const existingTriggers = await this.listTriggers(workspacePath);
            const existingTags = await this.listTags(workspacePath);

            // Ensure unique trigger name
            let originalTriggerName = triggerPayload.name;
            let triggerName = originalTriggerName;
            let counter = 1;
            while (existingTriggers.some(t => t.name === triggerName)) {
                triggerName = `${originalTriggerName} (${counter++})`;
            }
            triggerPayload.name = triggerName;

            // Step 1: Create trigger
            const trigger = await this.createTrigger(workspacePath, triggerPayload);
            result.trigger = trigger;
            const triggerId = trigger.triggerId;

            // Step 2: Create tags, each linked to the trigger
            for (const tagPayload of tagPayloads) {
                try {
                    // Ensure unique tag name
                    let originalTagName = tagPayload.name;
                    let tagName = originalTagName;
                    let tCounter = 1;
                    while (existingTags.some(t => t.name === tagName)) {
                        tagName = `${originalTagName} (${tCounter++})`;
                    }
                    tagPayload.name = tagName;

                    // Link trigger to tag
                    tagPayload.firingTriggerId = [triggerId];

                    const tag = await this.createTag(workspacePath, tagPayload);
                    result.tags.push(tag);
                } catch (tagError) {
                    result.errors.push({
                        type: 'tag',
                        name: tagPayload.name,
                        error: tagError.message
                    });
                }
            }
        } catch (triggerError) {
            result.errors.push({
                type: 'trigger',
                name: triggerPayload.name,
                error: triggerError.message
            });
        }

        return result;
    }
}

// Global instance
const gtmClient = new GTMClient();
