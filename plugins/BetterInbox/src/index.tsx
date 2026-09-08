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

function runPatchScan() {
    rescanAndPatchYouBar(cleanups);
}

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // 1. Initial scanning loop for instant startup
        let attempts = 0;
        const scanInterval = setInterval(() => {
            const patched = rescanAndPatchYouBar(cleanups);
            attempts++;
            if (patched || attempts > 60) {
                clearInterval(scanInterval);
            }
        }, 100);
        cleanups.push(() => clearInterval(scanInterval));

        // 2. Navigation & App State Event Link (ServerDrawer pattern)
        // Hooks Flux navigation events so every tab change or screen transition re-triggers the patch check
        const FluxDispatcher = findByProps("dispatch", "subscribe");
        if (FluxDispatcher?.subscribe) {
            const handleNavEvent = () => runPatchScan();

            FluxDispatcher.subscribe("NAVIGATION_SWITCH", handleNavEvent);
            FluxDispatcher.subscribe("SIDEBAR_VIEW", handleNavEvent);
            FluxDispatcher.subscribe("CHANNEL_SELECT", handleNavEvent);

            cleanups.push(() => {
                FluxDispatcher.unsubscribe("NAVIGATION_SWITCH", handleNavEvent);
                FluxDispatcher.unsubscribe("SIDEBAR_VIEW", handleNavEvent);
                FluxDispatcher.unsubscribe("CHANNEL_SELECT", handleNavEvent);
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
        refreshYouBarUI();
    },

    settings: SettingsUI,
};
