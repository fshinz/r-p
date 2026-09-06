import { storage } from "@vendetta/plugin";
import patchYouBarButtons from "./youbar";
import { setInboxTracking } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchButtons: (() => void) | null = null;
let retryInterval: any = null;

export default {
  onLoad: () => {
    storage.showDMButton ??= false;
    storage.showSettingsButton ??= true;
    storage.showInboxButton ??= true;
    storage.notifications ??= [];

    setInboxTracking(true);

    const tryPatch = () => {
      if (unpatchButtons) return;
      try {
        const cleanup = patchYouBarButtons();
        if (cleanup && typeof cleanup === "function") {
          unpatchButtons = cleanup;
          if (retryInterval) clearInterval(retryInterval);
        }
      } catch (e) {
        console.error("[BetterInbox] Failed to patch YouBar:", e);
      }
    };

    tryPatch();
    let ticks = 0;
    // Retry every 250ms for up to 15 seconds to ensure lazy-loaded UI modules are hooked
    retryInterval = setInterval(() => {
      tryPatch();
      if (++ticks >= 60 && retryInterval) clearInterval(retryInterval);
    }, 250);
  },

  onUnload: () => {
    if (retryInterval) clearInterval(retryInterval);
    if (unpatchButtons) unpatchButtons();
    setInboxTracking(false);
  },

  settings: SettingsUI,
};
