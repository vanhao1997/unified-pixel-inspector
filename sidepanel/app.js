import { UIController } from './modules/UIController.js';
import { PixelMonitor } from './modules/PixelMonitor.js';
import { SetupManager } from './modules/SetupManager.js';

// Unified Pixel Inspector - Side Panel Entry Point
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize UI Controller (Themes, Tabs, Toasts)
        const ui = new UIController();
        ui.init();

        // Initialize Pixel Monitor (Scan Tab & Logic)
        const monitor = new PixelMonitor(ui);
        await monitor.init();

        // Initialize Setup Manager (Setup Tab & GTM)
        const setup = new SetupManager(ui);
        setup.init();

        // Expose for debugging
        window.pixelInspector = monitor;
        window.setupWizard = setup;

        console.log('Unified Pixel Inspector initialized');
    } catch (error) {
        console.error('Initialization failed:', error);
    }
});
