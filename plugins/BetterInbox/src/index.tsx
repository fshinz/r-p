import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchButtons: (() => void) | null = null;
let retryInterval: any = null;

export default {
  onLoad: () => {
    storage.showDMButton ??= false;
    storage.showSettingsButton ??= true;
    storage.showInboxButton ??= true;
    storage.notifications ??= [];

    initNotificationEngine();

    const tryPatch = () => {
      if (unpatchButtons) return;
      try {
        const cleanup = patchYouBar();
        if (typeof cleanup === "function") {
          unpatchButtons = cleanup;
          if (retryInterval) clearInterval(retryInterval);
        }
      } catch (e) {
        console.error("[BetterInbox] Failed to patch YouBar:", e);
      }
    };

    tryPatch();
    let ticks = 0;
    retryInterval = setInterval(() => {
      tryPatch();
      if (++ticks >= 60 && retryInterval) clearInterval(retryInterval);
    }, 250);
  },

  onUnload: () => {
    if (retryInterval) clearInterval(retryInterval);
    if (unpatchButtons) unpatchButtons();
    stopNotificationEngine();
  },

  settings: SettingsUI,
};
