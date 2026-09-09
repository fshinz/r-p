
import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import { linkYouBarAnimation, rescanAndPatchYouBar, resetYouBarPatchState, forceNavigationRerender } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

const cleanups: (() => void)[] = [];

export function refreshYouBarUI(): void {
    forceNavigationRerender();
}

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        let attempts = 0;
        const scanInterval = setInterval(() => {
            const success = linkYouBarAnimation(cleanups);
            attempts++;

            if (success || attempts > 100) {
                clearInterval(scanInterval);
            }
        }, 50);

        cleanups.push(() => clearInterval(scanInterval));
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
