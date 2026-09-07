import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patchYouBar } from "./youbar";
import { initNotificationEngine, stopNotificationEngine } from "./notifications";
import SettingsUI from "./components/SettingsUI";

let unpatchYouBar: (() => void) | null = null;
let watcherInterval: ReturnType<typeof setInterval> | null = null;
let unbindTypingListener: (() => void) | null = null;

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

function setupTypingListener() {
    // 1. Hook into Discord's internal TypingStore or Text Input action dispatchers
    const TypingModule = findByProps("startTyping", "stopTyping") || findByProps("isTyping");
    const ChatInputStore = findByProps("getDraft", "addChangeListener");

    const onTypingOrInput = () => {
        if (!unpatchYouBar) {
            attemptPatch();
        }
    };

    // 2. Attach store change listener on draft/input changes
    if (ChatInputStore?.addChangeListener) {
        ChatInputStore.addChangeListener(onTypingOrInput);
        unbindTypingListener = () => ChatInputStore.removeChangeListener(onTypingOrInput);
    }

    // 3. Patch startTyping function execution to catch immediate keypresses
    if (TypingModule?.startTyping && typeof TypingModule.startTyping === "function") {
        const origStartTyping = TypingModule.startTyping;
        TypingModule.startTyping = function (...args: any[]) {
            onTypingOrInput();
            return origStartTyping.apply(this, args);
        };
    }
}

export default {
    onLoad: () => {
        storage.showDMButton ??= false;
        storage.showSettingsButton ??= true;
        storage.showInboxButton ??= true;

        initNotificationEngine();

        // Immediate patch attempt on plugin load
        attemptPatch();

        // Polling loop fallback
        watcherInterval = setInterval(() => {
            if (!unpatchYouBar) {
                attemptPatch();
            }
        }, 300);

        // Link patch checks directly to text input / typing events
        setupTypingListener();
    },

    onUnload: () => {
        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
        }

        if (unbindTypingListener) {
            unbindTypingListener();
            unbindTypingListener = null;
        }

        if (unpatchYouBar) {
            unpatchYouBar();
            unpatchYouBar = null;
        }

        stopNotificationEngine();
    },

    settings: SettingsUI,
};
