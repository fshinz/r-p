import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;

function hardReloadApp() {
    const BundleUpdaterModule = findByProps("reload", "supportsNativeInterface") ?? findByProps("reload");
    const DevMenuModule = findByProps("reload", "toggle");

    if (typeof BundleUpdaterModule?.reload === "function") {
        BundleUpdaterModule.reload();
    } else if (typeof DevMenuModule?.reload === "function") {
        DevMenuModule.reload();
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

        const patchedImmediately = attemptPatch();

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
