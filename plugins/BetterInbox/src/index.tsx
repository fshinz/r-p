import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

// Solves the post-render race condition by triggering Flux state recalculation
function triggerNavReRender() {
    const UserStore = findByProps("getCurrentUser", "emitChange");
    const UnreadStore = findByProps("getUnreadCount", "emitChange");

    if (UserStore?.emitChange) {
        UserStore.emitChange();
    } else if (UnreadStore?.emitChange) {
        UnreadStore.emitChange();
    }
}

function attemptPatch(): boolean {
    if (unpatchYouBar) return true;

    try {
        const cleanup = patchYouBar();
        if (typeof cleanup === "function") {
            unpatchYouBar = cleanup;
            
            // Component was patched after initial mount; force immediate VDOM reconciliation
            setTimeout(triggerNavReRender, 50);
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

        // 1. Immediate attempt on cold boot
        if (!attemptPatch()) {
            // 2. Poll until Metro exposes YouBar, then force the initial render update
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
        triggerNavReRender();
    },

    settings: SettingsUI,
};
