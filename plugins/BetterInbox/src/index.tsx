import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

function forceYouBarRefresh() {
    const AccessibilityStore = findByProps("setYouBarAnimations");
    if (typeof AccessibilityStore?.setYouBarAnimations === "function") {
        logger.log("[BetterInbox] Triggering setYouBarAnimations refresh");
        AccessibilityStore.setYouBarAnimations(true);
        return;
    }

    const UserStore = findByProps("getCurrentUser", "emitChange");
    if (UserStore?.emitChange) {
        logger.log("[BetterInbox] Triggering UserStore emitChange refresh");
        UserStore.emitChange();
    }
}

function attemptPatch(): boolean {
    if (unpatchYouBar) return true;

    try {
        const cleanup = patchYouBar();
        if (typeof cleanup === "function") {
            unpatchYouBar = cleanup;
            logger.log("[BetterInbox] Successfully patched YouBarButtonContainer");
            
            setTimeout(forceYouBarRefresh, 50);
            return true;
        }
    } catch (e) {
        logger.log(`[BetterInbox] Error patching YouBar: ${e}`);
    }
    return false;
}

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        if (!attemptPatch()) {
            logger.log("[BetterInbox] Module 16392 not ready yet, starting watcher interval");
            let attempts = 0;
            watcherInterval = setInterval(() => {
                attempts++;
                const success = attemptPatch();

                if (success || attempts > 40) {
                    if (watcherInterval) clearInterval(watcherInterval);
                    watcherInterval = null;
                    if (!success) logger.log("[BetterInbox] Watcher timed out finding YouBar");
                }
            }, 200);
        }
    },

    onUnload: () => {
        logger.log("[BetterInbox] Unloading plugin...");

        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
        }

        if (unpatchYouBar) {
            unpatchYouBar();
            unpatchYouBar = null;
        }

        stopNotificationEngine();
        forceYouBarRefresh();
    },

    settings: SettingsUI,
};
