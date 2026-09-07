import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;

/**
 * Triggers a Flux store re-render on components listening to UserStore (such as YouBar)
 * by emitting a CURRENT_USER_UPDATE payload without causing global navigation shifts.
 */
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

export default {
    onLoad: () => {
        logger.log("[BetterInbox] Plugin loading...");

        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // Patch YouBar icon components
        unpatchYouBar = patchYouBar();

        // Trigger initial Flux store pass to load patched elements
        refreshYouBarUI();
    },

    onUnload: () => {
        logger.log("[BetterInbox] Unloading plugin...");

        if (unpatchYouBar) {
            unpatchYouBar();
            unpatchYouBar = null;
        }

        stopNotificationEngine();
        refreshYouBarUI();
    },

    settings: SettingsUI,
};
