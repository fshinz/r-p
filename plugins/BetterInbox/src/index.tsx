import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

function forceAppRefresh() {
    // Triggers a subtle UI re-render on the active screen stack without logging out
    const AppRenderStore = findByProps("emitChange", "addChangeListener");
    if (AppRenderStore?.emitChange) {
        AppRenderStore.emitChange();
    }
}

function attemptPatch() {
    if (unpatchYouBar) return true;

    try {
        const cleanup = patchYouBar();
        if (typeof cleanup === "function") {
            unpatchYouBar = cleanup;
            
            // Force React to re-evaluate current view tree so YouBar updates without switching accounts
            setTimeout(forceAppRefresh, 100);
            return true;
        }
    } catch (e) {
        console.error("[BetterInbox] Patch error:", e);
    }
    return false;
}

export default {
    onLoad: () => {
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // 1. Immediate attempt
        if (!attemptPatch()) {
            // 2. Poll rapidly during startup until Metro loads YouBar
            let attempts = 0;
            watcherInterval = setInterval(() => {
                attempts++;
                const success = attemptPatch();
                
                // Stop watching after successful patch or 10 seconds cutoff
                if (success || attempts > 40) {
                    if (watcherInterval) clearInterval(watcherInterval);
                    watcherInterval = null;
                }
            }, 250);
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
        forceAppRefresh();
    },

    settings: SettingsUI,
};
