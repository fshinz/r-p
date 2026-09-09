import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { rescanAndPatchYouBar, resetYouBarPatchState, forceNavigationRerender } from "./youbar";
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

        // 1. Initial scanning loop
        let attempts = 0;
        const scanInterval = setInterval(() => {
            const patched = rescanAndPatchYouBar(cleanups);
            attempts++;
            if (patched || attempts > 60) {
                clearInterval(scanInterval);
            }
        }, 100);
        cleanups.push(() => clearInterval(scanInterval));

        // 2. Link directly to React Navigation State changes
        const NavigationContainer = findByProps("useNavigationContainerRef", "NavigationContainer") || findByProps("getRootRef");
        const FluxDispatcher = findByProps("dispatch", "subscribe");

        const handleNavigationChange = () => {
            // Run hook scanner and issue the re-render dispatch
            rescanAndPatchYouBar(cleanups);
            forceNavigationRerender();
        };

        if (FluxDispatcher?.subscribe) {
            // Triggers every time you switch tabs, open channels, or change screens
            FluxDispatcher.subscribe("NAVIGATION_SWITCH", handleNavigationChange);
            FluxDispatcher.subscribe("CHANNEL_SELECT", handleNavigationChange);
            FluxDispatcher.subscribe("TRACK", handleNavigationChange);

            cleanups.push(() => {
                FluxDispatcher.unsubscribe("NAVIGATION_SWITCH", handleNavigationChange);
                FluxDispatcher.unsubscribe("CHANNEL_SELECT", handleNavigationChange);
                FluxDispatcher.unsubscribe("TRACK", handleNavigationChange);
            });
        }

        forceNavigationRerender();
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
