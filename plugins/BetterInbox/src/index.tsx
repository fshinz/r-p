import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

// Forces Module 16392 to re-evaluate via Module 14437 or Flux state tick
function forceYouBarRefresh() {
    const AccessibilityStore = findByProps("setYouBarAnimations");
    if (typeof AccessibilityStore?.setYouBarAnimations === "function") {
        AccessibilityStore.setYouBarAnimations(true);
        return;
    }

    const UserStore = findByProps("getCurrentUser", "emitChange");
    if (UserStore?.emitChange) {
        UserStore.emitChange();
    }
}

function attemptPatch(): boolean {
    if (unpatchYouBar) return true;

    try {
        const cleanup = patchYouBar();
        if (typeof cleanup === "function") {
            unpatchYouBar = cleanup;
            
            // Force immediate VDOM update once patch binds
            setTimeout(forceYouBarRefresh, 50);
            return true;
        }
    } catch (e) {
        console.error("[BetterInbox] Failed to patch YouBarButtonContainer:", e);
    }
    return false;
}

export default {
    onLoad: () => {
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // 1. Immediate patch attempt
        if (!attemptPatch()) {
            // 2. Poll until Metro loads Module 16392
            let attempts = 0;
            watcherInterval = setInterval(() => {
                attempts++;
                const success = attemptPatch();

                if (success || attempts > 40) {
                    if (watcherInterval) clearInterval(watcherInterval);
                    watcherInterval = null;
                }
            }, 200);
        }
    },

    onUnload: () => {
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
