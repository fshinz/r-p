import NotificationCenterUI from "./components/NotificationCenterUI";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import { patchYouBar } from "./youbar";

const unpatches: (() => void)[] = [];
let retryHandle: ReturnType<typeof setInterval> | undefined;

function stopRetrying() {
  if (retryHandle) {
    clearInterval(retryHandle);
    retryHandle = undefined;
  }
}

function attemptYouBarPatch() {
  try {
    const unpatch = patchYouBar();
    if (unpatch) {
      unpatches.push(unpatch);
      stopRetrying();
      console.log("[BetterInbox] Successfully patched YouBar");
    }
  } catch (e) {
    console.error(`[BetterInbox] Failed to patch YouBar: ${e}`);
    stopRetrying();
  }
}

export default {
  onLoad: () => {
    initNotificationEngine();

    attemptYouBarPatch();
    let ticks = 0;
    retryHandle = setInterval(() => {
      attemptYouBarPatch();
      if (++ticks >= 30) stopRetrying();
    }, 300);
  },

  onUnload: () => {
    stopRetrying();
    stopNotificationEngine();

    for (const unpatch of unpatches) unpatch?.();
    unpatches.length = 0;
  },

  settings: NotificationCenterUI,
};
