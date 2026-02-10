/**
 * GTM Tag Builder — Converts tracking configs into GTM API payloads
 * Builds proper tag and trigger objects for the GTM API v2
 */

class GTMTagBuilder {

    /**
     * Build all tag payloads for a given action + platforms
     * @param {Object} config
     * @param {string} config.action - Action key (e.g., 'purchase')
     * @param {string[]} config.platforms - Array of platform names
     * @param {Object} config.params - Event parameters
     * @param {Object} config.pixelIds - Platform pixel IDs
     * @param {string} config.actionName - Custom action name
     * @param {string} config.interactionSelector - CSS selector for interaction
     * @returns {Object} { tagPayloads: [], triggerPayload: {} }
     */
    buildAll(config) {
        const { action, platforms, params, pixelIds, actionName, interactionSelector } = config;
        const eventConfig = EVENT_MAPPING[action];

        if (!eventConfig) {
            throw new Error(`Unknown action: ${action}`);
        }

        const tagPayloads = [];

        platforms.forEach(platform => {
            const builder = this[`build${platform.charAt(0).toUpperCase() + platform.slice(1)}Tag`];
            if (builder) {
                const tag = builder.call(this, eventConfig, params, pixelIds[platform], action, actionName);
                if (tag) tagPayloads.push(tag);
            }
        });

        const triggerPayload = this.buildTrigger(action, eventConfig, interactionSelector, actionName);

        return { tagPayloads, triggerPayload };
    }

    // ═══════════════════════════════════════
    // TAG BUILDERS
    // ═══════════════════════════════════════

    /**
     * Meta Pixel → Custom HTML tag
     */
    buildMetaTag(eventConfig, params, pixelId, action, actionName) {
        const eventName = eventConfig.meta.name;
        const transformedParams = codeGenerator.transformParams(params, 'meta');
        const cleanParams = codeGenerator.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        const html = `<script>\n  fbq('track', '${eventName}'${paramsStr});\n</script>`;
        const label = actionName || eventConfig.label || action;

        return {
            name: `Meta - ${eventName} (${label})`,
            type: 'html',
            parameter: [
                {
                    type: 'template',
                    key: 'html',
                    value: html
                },
                {
                    type: 'boolean',
                    key: 'supportDocumentWrite',
                    value: 'false'
                }
            ],
            tagFiringOption: 'oncePerEvent'
        };
    }

    /**
     * TikTok Pixel → Custom HTML tag
     */
    buildTiktokTag(eventConfig, params, pixelId, action, actionName) {
        const eventName = eventConfig.tiktok.name;
        const transformedParams = codeGenerator.transformParams(params, 'tiktok');
        const cleanParams = codeGenerator.cleanParams(transformedParams);

        const paramsStr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        const html = `<script>\n  ttq.track('${eventName}'${paramsStr});\n</script>`;
        const label = actionName || eventConfig.label || action;

        return {
            name: `TikTok - ${eventName} (${label})`,
            type: 'html',
            parameter: [
                {
                    type: 'template',
                    key: 'html',
                    value: html
                },
                {
                    type: 'boolean',
                    key: 'supportDocumentWrite',
                    value: 'false'
                }
            ],
            tagFiringOption: 'oncePerEvent'
        };
    }

    /**
     * GA4 → GA4 Event tag (native, NOT Custom HTML)
     * Uses gaEventName + event parameters
     */
    buildGa4Tag(eventConfig, params, measurementId, action, actionName) {
        const eventName = eventConfig.ga4.name;
        const transformedParams = codeGenerator.transformParams(params, 'ga4');

        if (eventName === 'purchase' && !transformedParams.transaction_id) {
            transformedParams.transaction_id = 'TXN_{{DLV - transaction_id}}';
        }

        const cleanParams = codeGenerator.cleanParams(transformedParams);
        const label = actionName || eventConfig.label || action;

        // Build GA4 Event tag parameters
        const tagParams = [
            {
                type: 'template',
                key: 'eventName',
                value: eventName
            }
        ];

        // Add measurement ID if provided (override check)
        if (measurementId && measurementId.trim().length > 0) {
            tagParams.push({
                type: 'template',
                key: 'measurementIdOverride',
                value: measurementId.trim()
            });
        }

        // Add event parameters as a list
        if (Object.keys(cleanParams).length > 0) {
            const eventParams = Object.entries(cleanParams)
                .filter(([key]) => key !== 'items') // items handled separately
                .map(([key, value]) => ({
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: key },
                        { type: 'template', key: 'value', value: String(value) }
                    ]
                }));

            if (eventParams.length > 0) {
                tagParams.push({
                    type: 'list',
                    key: 'eventParameters',
                    list: eventParams
                });
            }
        }

        return {
            name: `GA4 Event - ${eventName} (${label})`,
            type: 'gaawe', // GA4 Event tag type in GTM
            parameter: tagParams,
            tagFiringOption: 'oncePerEvent'
        };
    }

    /**
     * Zalo Pixel → Custom HTML tag
     */
    buildZaloTag(eventConfig, params, pixelId, action, actionName) {
        const eventName = eventConfig.zalo.name;
        const transformedParams = codeGenerator.transformParams(params, 'zalo');
        const cleanParams = codeGenerator.cleanParams(transformedParams);

        const paramsArr = Object.keys(cleanParams).length > 0
            ? `, ${JSON.stringify(cleanParams, null, 2)}`
            : '';

        const html = `<script>\n  ZPP.push(['${eventName.toLowerCase()}'${paramsArr}]);\n</script>`;
        const label = actionName || eventConfig.label || action;

        return {
            name: `Zalo - ${eventName} (${label})`,
            type: 'html',
            parameter: [
                {
                    type: 'template',
                    key: 'html',
                    value: html
                },
                {
                    type: 'boolean',
                    key: 'supportDocumentWrite',
                    value: 'false'
                }
            ],
            tagFiringOption: 'oncePerEvent'
        };
    }

    // ═══════════════════════════════════════
    // TRIGGER BUILDER
    // ═══════════════════════════════════════

    /**
     * Build trigger payload based on action type
     */
    buildTrigger(action, eventConfig, cssSelector, actionName) {
        const label = actionName || eventConfig.label || action;

        const triggerBuilders = {
            page_view: () => ({
                name: `Trigger - ${label}`,
                type: 'pageview'
            }),

            view_content: () => ({
                name: `Trigger - ${label}`,
                type: 'pageview',
                filter: [{
                    type: 'contains',
                    parameter: [
                        { type: 'template', key: 'arg0', value: '{{Page URL}}' },
                        { type: 'template', key: 'arg1', value: '/product' }
                    ]
                }]
            }),

            purchase: () => ({
                name: `Trigger - ${label}`,
                type: 'pageview',
                filter: [{
                    type: 'contains',
                    parameter: [
                        { type: 'template', key: 'arg0', value: '{{Page URL}}' },
                        { type: 'template', key: 'arg1', value: 'thank-you' }
                    ]
                }]
            }),

            lead: () => ({
                name: `Trigger - ${label}`,
                type: 'formSubmission'
            }),

            button_click: () => {
                const trigger = {
                    name: `Trigger - ${label}`,
                    type: 'click',
                    parameter: [
                        { type: 'boolean', key: 'setVarOnClick', value: 'false' },
                        { type: 'boolean', key: 'waitForTags', value: 'false' },
                        { type: 'boolean', key: 'checkValidation', value: 'false' }
                    ]
                };
                if (cssSelector) {
                    trigger.filter = [{
                        type: 'cssSelector',
                        parameter: [
                            { type: 'template', key: 'arg0', value: '{{Click Element}}' },
                            { type: 'template', key: 'arg1', value: cssSelector }
                        ]
                    }];
                }
                return trigger;
            },

            form_submit: () => ({
                name: `Trigger - ${label}`,
                type: 'formSubmission',
                parameter: [
                    { type: 'boolean', key: 'checkValidation', value: 'true' },
                    { type: 'boolean', key: 'waitForTags', value: 'true' },
                    { type: 'template', key: 'waitForTagsTimeout', value: '2000' }
                ]
            }),

            download: () => ({
                name: `Trigger - ${label}`,
                type: 'linkClick',
                filter: [{
                    type: 'matchRegex',
                    parameter: [
                        { type: 'template', key: 'arg0', value: '{{Click URL}}' },
                        { type: 'template', key: 'arg1', value: '\\.(pdf|xlsx|zip|doc|docx|csv)$' }
                    ]
                }]
            }),

            scroll_depth: () => ({
                name: `Trigger - ${label}`,
                type: 'scrollDepth',
                parameter: [
                    { type: 'boolean', key: 'verticalThresholdsOn', value: 'true' },
                    { type: 'template', key: 'verticalThresholdUnits', value: 'PERCENT' },
                    { type: 'template', key: 'verticalThresholdPercent', value: '25,50,75,90' }
                ]
            }),

            video_play: () => ({
                name: `Trigger - ${label}`,
                type: 'youTubeVideo',
                parameter: [
                    { type: 'boolean', key: 'captureStart', value: 'true' },
                    { type: 'boolean', key: 'captureComplete', value: 'true' },
                    { type: 'boolean', key: 'capturePause', value: 'true' },
                    { type: 'boolean', key: 'captureProgress', value: 'true' },
                    { type: 'template', key: 'progressThresholdsPercent', value: '25,50,75' }
                ]
            })
        };

        // Default: Custom Event trigger
        const defaultTrigger = () => ({
            name: `Trigger - ${label}`,
            type: 'customEvent',
            customEventFilter: [{
                type: 'equals',
                parameter: [
                    { type: 'template', key: 'arg0', value: '{{_event}}' },
                    { type: 'template', key: 'arg1', value: action }
                ]
            }]
        });

        const builder = triggerBuilders[action] || defaultTrigger;
        return builder();
    }
}

// Global instance
const gtmTagBuilder = new GTMTagBuilder();
