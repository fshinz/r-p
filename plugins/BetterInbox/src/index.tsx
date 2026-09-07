import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;

export function refreshYouBarUI() {
    const Dispatcher = findByProps("dispatch", "subscribe");
    const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");

    if (Dispatcher?.dispatch && SelectedChannelStore) {
        const currentChannelId = SelectedChannelStore.getChannelId();
        Dispatcher.dispatch({
            type: "CHANNEL_SELECT",
            channelId: currentChannelId,
            messageId: null,
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

        unpatchYouBar = patchYouBar();

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
