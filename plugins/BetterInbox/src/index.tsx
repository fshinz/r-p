import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { setupYouBarHooks, resetYouBarPatchState, forceNavigationRerender } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

const cleanups: (() => void)[] = [];

export function refreshYouBarUI() {
    forceNavigationRerender();
}

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // High-frequency startup polling
        let attempts = 0;
        const scanInterval = setInterval(() => {
            const success = setupYouBarHooks(cleanups);
            attempts++;

            if (success || attempts > 100) {
                clearInterval(scanInterval);
            }
        }, 50);

        cleanups.push(() => clearInterval(scanInterval));

        // Subscribes to Discord Flux Navigation Dispatcher
        const Dispatcher = findByProps("dispatch", "subscribe");
        if (Dispatcher?.subscribe) {
            const navHandler = () => setupYouBarHooks(cleanups);

            Dispatcher.subscribe("NAVIGATION_SWITCH", navHandler);
            Dispatcher.subscribe("TRACK", navHandler);
            Dispatcher.subscribe("POST_CONNECTION_OPEN", navHandler);

            cleanups.push(() => {
                Dispatcher.unsubscribe("NAVIGATION_SWITCH", navHandler);
                Dispatcher.unsubscribe("TRACK", navHandler);
                Dispatcher.unsubscribe("POST_CONNECTION_OPEN", navHandler);
            });
        }

        refreshYouBarUI();
    },

    onUnload: () => {
        logger.log("[BetterInbox] Unloading plugin...");

        for (const cleanup of cleanups) {
            try {
                cleanup();
            } catch (err) {
                logger.log(`[BetterInbox] Cleanup error: ${err}`);
            }
        }
        cleanups.length = 0;

        resetYouBarPatchState();
        stopNotificationEngine();
    },

    settings: SettingsUI,
};
