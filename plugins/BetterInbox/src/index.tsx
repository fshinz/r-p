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
        // Soft navigation tick forces YouBar to re-evaluate without reloading the full client
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

        // Initialize storage toggles with defaults
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // 1. Attach patch synchronously on boot
        unpatchYouBar = patchYouBar();

        // 2. Immediate soft UI refresh to bind patched buttons
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
