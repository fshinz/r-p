import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { rescanAndPatchYouBar, resetYouBarPatchState } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

const cleanups: (() => void)[] = [];

export function refreshYouBarUI() {
    const Dispatcher = findByProps("dispatch", "subscribe");
    const UserStore = findByProps("getCurrentUser");

    const currentUser = UserStore?.getCurrentUser();

    if (Dispatcher?.dispatch && currentUser) {
        Dispatcher.dispatch({
            type: "CURRENT_USER_UPDATE",
            user: currentUser,
        });
    }
}

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        let attempts = 0;

        // ServerDrawer polling pattern: Scan Metro repeatedly until component is hooked
        const scanInterval = setInterval(() => {
            const patched = rescanAndPatchYouBar(cleanups);
            attempts++;

            if (patched || attempts > 60) {
                clearInterval(scanInterval);
            }
        }, 100);

        cleanups.push(() => clearInterval(scanInterval));

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
        refreshYouBarUI();
    },

    settings: SettingsUI,
};
