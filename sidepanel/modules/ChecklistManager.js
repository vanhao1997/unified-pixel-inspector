export class ChecklistManager {
    constructor(renderCallback) {
        this.renderCallback = renderCallback;
        this.currentType = 'ecommerce'; // Default
        this.steps = {
            ecommerce: [
                { id: 'view_content', label: 'View Content', events: ['ViewContent', 'view_item'], done: false },
                { id: 'add_to_cart', label: 'Add To Cart', events: ['AddToCart', 'add_to_cart'], done: false },
                { id: 'initiate_checkout', label: 'Check Out', events: ['InitiateCheckout', 'begin_checkout'], done: false },
                { id: 'purchase', label: 'Purchase', events: ['Purchase', 'purchase'], done: false }
            ],
            lead_gen: [
                { id: 'view_page', label: 'View Page', events: ['ViewContent', 'page_view'], done: false },
                { id: 'lead', label: 'Submit Lead', events: ['Lead', 'Contact', 'generate_lead', 'SubmitForm'], done: false },
                { id: 'complete', label: 'Complete', events: ['CompleteRegistration', 'sign_up', 'conversion'], done: false }
            ]
        };
    }

    setType(type) {
        if (this.steps[type]) {
            this.currentType = type;
            this.reset();
        }
    }

    checkEvent(eventName, silent = false) {
        const checklist = this.steps[this.currentType];
        let updated = false;

        checklist.forEach(step => {
            if (!step.done && step.events.some(e => e.toLowerCase() === eventName.toLowerCase())) {
                step.done = true;
                updated = true;
            }
        });

        if (updated && !silent) {
            this.render();
        }
    }

    render() {
        this.renderCallback(this.currentType, this.steps[this.currentType]);
    }

    reset(silent = false) {
        this.steps[this.currentType].forEach(s => s.done = false);
        if (!silent) this.render();
    }

    getCurrentState() {
        return {
            type: this.currentType,
            items: this.steps[this.currentType]
        };
    }
}
