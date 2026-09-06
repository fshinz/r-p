import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

function applyPatchWithRetry() {
    if (unpatchYouBar) return;

    const cleanup = patchYouBar();
    if (typeof cleanup === "function") {
        unpatchYouBar = cleanup;
        
        // Patch attached successfully; clear polling loop
        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
        }
    }
}

export default {
    onLoad: () => {
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // 1. Initial attempt
        applyPatchWithRetry();

        // 2. Poll until the module is rendered in memory
        if (!unpatchYouBar) {
            watcherInterval = setInterval(applyPatchWithRetry, 300);
        }

        // 3. Listen to transition/channel switch events to ensure target stays patched
        const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");
        if (SelectedChannelStore?.addChangeListener) {
            SelectedChannelStore.addChangeListener(() => {
                if (!unpatchYouBar) {
                    applyPatchWithRetry();
                }
            });
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
    },

    settings: SettingsUI,
};
