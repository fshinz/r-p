import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar, setYouBarReady } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;
let readyTimeout: ReturnType<typeof setTimeout> | null = null;

function triggerYouBarAnimation() {
    const AccessibilityStore = findByProps("setYouBarAnimations");
    if (typeof AccessibilityStore?.setYouBarAnimations === "function") {
        logger.log("[BetterInbox] Triggering setYouBarAnimations after boot deferral");
        AccessibilityStore.setYouBarAnimations(true);
    }
}

function setupDeferredPatch() {
    unpatchYouBar = patchYouBar();

    if (unpatchYouBar) {
        logger.log("[BetterInbox] Patch attached in passive mode (waiting for post-boot trigger)...");

        // Wait for app to finish initial layout renders (e.g. 1-2 seconds after boot)
        readyTimeout = setTimeout(() => {
            logger.log("[BetterInbox] Activating patch & triggering YouBar animation");
            setYouBarReady(true);
            triggerYouBarAnimation();
        }, 1500);
    }
}

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();
        setYouBarReady(false);

        // Poll for Metro module readiness, then attach in passive mode
        watcherInterval = setInterval(() => {
            const YouBarModule = findByProps("YouBarButtonContainer");
            if (YouBarModule?.YouBarButtonContainer) {
                if (watcherInterval) clearInterval(watcherInterval);
                watcherInterval = null;

                setupDeferredPatch();
            }
        }, 200);
    },

    onUnload: () => {
        logger.log("[BetterInbox] Unloading plugin...");

        setYouBarReady(false);

        if (watcherInterval) clearInterval(watcherInterval);
        if (readyTimeout) clearTimeout(readyTimeout);

        if (unpatchYouBar) {
            unpatchYouBar();
            unpatchYouBar = null;
        }

        stopNotificationEngine();
        triggerYouBarAnimation();
    },

    settings: SettingsUI,
};
