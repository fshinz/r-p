import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

function startYouBarWatcher() {
    watcherInterval = setInterval(() => {
        if (!unpatchYouBar) {
            try {
                const cleanup = patchYouBar();
                if (typeof cleanup === "function") {
                    unpatchYouBar = cleanup;
                }
            } catch (e) {
                console.error("[BetterInbox] Failed patching YouBar:", e);
            }
        }
    }, 250);
}

export default {
    onLoad: () => {
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();
        startYouBarWatcher();
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
    },

    settings: SettingsUI,
};
