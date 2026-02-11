/**
 * Element Picker - Injected into the active tab
 * Listen for activation message to start picking
 */
(function () {
    let isActive = false;
    let overlay, tooltip, banner;
    let hoveredElement = null;

    // Listen for activation message
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ACTIVATE_ELEMENT_PICKER') {
            if (!isActive) {
                initPicker();
                sendResponse({ success: true });
            } else {
                sendResponse({ success: true, message: 'Already active' });
            }
            return true;
        }

        if (message.type === 'DEACTIVATE_ELEMENT_PICKER') {
            cleanup();
            sendResponse({ success: true });
            return true;
        }
    });

    function createUI() {
        // Create overlay highlight element
        overlay = document.createElement('div');
        overlay.id = '__pixel-inspector-picker-overlay';
        overlay.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 2147483647;
            border: 2px solid #6366f1;
            background: rgba(99, 102, 241, 0.12);
            border-radius: 4px;
            transition: all 0.1s ease;
            display: none;
        `;

        // Create tooltip label
        tooltip = document.createElement('div');
        tooltip.id = '__pixel-inspector-picker-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            z-index: 2147483647;
            background: #1e1b4b;
            color: #e0e7ff;
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            pointer-events: none;
            white-space: nowrap;
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        `;

        // Create instruction banner
        banner = document.createElement('div');
        banner.id = '__pixel-inspector-picker-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2147483647;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            padding: 8px 16px;
            text-align: center;
            box-shadow: 0 2px 12px rgba(99, 102, 241, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        `;
        banner.innerHTML = `
            <span>🎯 <strong>Element Picker</strong> — Click vào element bạn muốn chọn</span>
            <button id="__pixel-inspector-picker-cancel" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 3px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            ">ESC để huỷ</button>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(tooltip);
        document.body.appendChild(banner);

        // Cancel button
        document.getElementById('__pixel-inspector-picker-cancel')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'ELEMENT_PICKER_CANCELLED' });
            cleanup();
        });
    }

    function initPicker() {
        if (isActive) return;
        isActive = true;

        createUI();

        // Start listening
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown, true);

        // Change cursor
        document.body.style.cursor = 'crosshair';
    }

    function cleanup() {
        if (!isActive) return;
        isActive = false;

        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);

        if (overlay) overlay.remove();
        if (tooltip) tooltip.remove();
        if (banner) banner.remove();

        // Restore cursor
        document.body.style.cursor = '';
    }

    /**
     * Generate a unique, readable CSS selector for an element
     */
    function getSelector(el) {
        // If element has a meaningful ID
        if (el.id && !el.id.startsWith('__pixel')) {
            return `#${CSS.escape(el.id)}`;
        }

        // Try to build a readable selector
        const parts = [];
        let current = el;
        let depth = 0;

        while (current && current !== document.body && depth < 4) {
            let selector = current.tagName.toLowerCase();

            // Add ID if it has one
            if (current.id && !current.id.startsWith('__pixel')) {
                selector = `#${CSS.escape(current.id)}`;
                parts.unshift(selector);
                break;
            }

            // Add meaningful classes (skip utility/framework classes)
            const meaningfulClasses = Array.from(current.classList)
                .filter(c => !c.startsWith('__pixel') && c.length < 30)
                .slice(0, 2);

            if (meaningfulClasses.length > 0) {
                selector += '.' + meaningfulClasses.map(c => CSS.escape(c)).join('.');
            }

            // Add nth-child if needed to disambiguate
            if (!current.id && current.parentElement) {
                const siblings = Array.from(current.parentElement.children)
                    .filter(s => s.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-child(${index})`;
                }
            }

            parts.unshift(selector);
            current = current.parentElement;
            depth++;
        }

        return parts.join(' > ');
    }

    /**
     * Get a human-readable description of the element
     */
    function getElementInfo(el) {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().substring(0, 50);
        const type = el.getAttribute('type') || '';
        const name = el.getAttribute('name') || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const placeholder = el.getAttribute('placeholder') || '';

        let info = tag;
        if (el.id) info += `#${el.id}`;
        if (type) info += `[type="${type}"]`;
        if (name) info += `[name="${name}"]`;
        if (text && text.length < 30) info += ` "${text}"`;
        else if (ariaLabel) info += ` "${ariaLabel}"`;
        else if (placeholder) info += ` "${placeholder}"`;

        return info;
    }

    function onMouseMove(e) {
        if (!isActive) return;

        const el = e.target;

        // Don't highlight our own elements
        if (el.id && el.id.startsWith('__pixel-inspector-picker')) return;

        hoveredElement = el;

        // Position overlay
        const rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';

        // Position tooltip
        const selectorText = getSelector(el);
        tooltip.textContent = selectorText;
        tooltip.style.display = 'block';

        let tooltipTop = rect.top - 28;
        if (tooltipTop < 0) tooltipTop = rect.bottom + 4; // below if off screen top
        tooltip.style.top = tooltipTop + 'px';
        tooltip.style.left = Math.max(4, rect.left) + 'px';
    }

    function onClick(e) {
        if (!isActive) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!hoveredElement) return;

        const selector = getSelector(hoveredElement);
        const elementInfo = getElementInfo(hoveredElement);
        const tagName = hoveredElement.tagName.toLowerCase();
        const text = (hoveredElement.textContent || '').trim().substring(0, 60);

        // Send result back to extension
        chrome.runtime.sendMessage({
            type: 'ELEMENT_PICKED',
            data: {
                selector,
                elementInfo,
                tagName,
                text
            }
        });

        cleanup();
    }

    function onKeyDown(e) {
        if (!isActive) return;

        if (e.key === 'Escape') {
            chrome.runtime.sendMessage({
                type: 'ELEMENT_PICKER_CANCELLED'
            });
            cleanup();
        }
    }

})();
