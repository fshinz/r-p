import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;

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

        // Sets up instant module interception hook
        unpatchYouBar = patchYouBar();

        // Trigger Flux re-render pass
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
