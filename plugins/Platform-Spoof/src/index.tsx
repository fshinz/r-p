import { findByProps } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

// Find the Gateway socket module responsible for sending identify properties
const GatewaySocket = findByProps("socket", "identify")?.socket;

let unpatch: (() => void) | null = null;

export default {
    onLoad() {
        // Default settings state
        if (storage.enabled === undefined) storage.enabled = false;
        if (storage.platform === undefined) storage.platform = "desktop"; // "desktop" | "web" | "mobile"

        if (!GatewaySocket) {
            console.error("[PlatformSpoof] Gateway socket module not found!");
            return;
        }

        // Patch the socket's internal identify/properties function
        unpatch = instead("identify", GatewaySocket, (args, orig) => {
            if (storage.enabled && args[0]) {
                const targetPlatform = storage.platform || "desktop";

                // Standard Discord gateway identify properties
                if (targetPlatform === "desktop") {
                    args[0].properties = {
                        ...args[0].properties,
                        os: "Windows",
                        browser: "Discord Client",
                        device: "",
                        system_locale: "en-US",
                        client_build_number: 999999,
                    };
                } else if (targetPlatform === "web") {
                    args[0].properties = {
                        ...args[0].properties,
                        os: "Windows",
                        browser: "Chrome",
                        device: "",
                        system_locale: "en-US",
                    };
                } else if (targetPlatform === "mobile") {
                    args[0].properties = {
                        ...args[0].properties,
                        os: "Android",
                        browser: "Discord Android",
                        device: "Android Device",
                    };
                }
            }

            return orig.apply(GatewaySocket, args);
        });
    },

    onUnload() {
        unpatch?.();
        unpatch = null;
    },

    settings: Settings,
};

