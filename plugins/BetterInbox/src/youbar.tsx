import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

// The Hard Nuke: Triggers a React Native JS bundle reload
function hardReloadApp() {
    const BundleUpdaterModule = findByProps("reload", "supportsNativeInterface") ?? findByProps("reload");
    const DevMenuModule = findByProps("reload", "toggle");

    if (typeof BundleUpdaterModule?.reload === "function") {
        BundleUpdaterModule.reload();
    } else if (typeof DevMenuModule?.reload === "function") {
        DevMenuModule.reload();
    } else {
        console.warn("[BetterInbox] Hard reload module not found in Metro.");
    }
}

function attemptPatch(): boolean {
    if (unpatchYouBar) return true;

    try {
        const cleanup = patchYouBar();
        if (typeof cleanup === "function") {
            unpatchYouBar = cleanup;
            return true;
        }
    } catch (e) {
        console.error("[BetterInbox] Failed patching YouBar:", e);
    }
    return false;
}

export default {
    onLoad: () => {
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // 1. Initial patch attempt on load
        const patchedImmediately = attemptPatch();

        // 2. Continuous polling until Metro resolves YouBar
        if (!patchedImmediately) {
            let attempts = 0;
            watcherInterval = setInterval(() => {
                attempts++;
                const success = attemptPatch();

                if (success || attempts > 40) {
                    if (watcherInterval) clearInterval(watcherInterval);
                    watcherInterval = null;
                }
            }, 250);
        }

        // 3. Optional: Trigger the hard nuke 1.5s after boot if you need to force full fresh load
        /*
        setTimeout(() => {
            hardReloadApp();
        }, 1500);
        */
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
