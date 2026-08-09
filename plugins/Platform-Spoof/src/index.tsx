import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { patcher } from "@vendetta";
import Settings from "./Settings";

const IDENTIFY = 2;

export type Platform = "off" | "desktop" | "web" | "mobile" | "meta" | "console";

storage.platform ??= "desktop";

export function getSpoofProps(): Record<string, string> | null {
    switch (storage.platform as Platform) {
        case "desktop": return { os: "Windows",     browser: "Discord Client",   device: "" };
        case "web":     return { os: "Linux",       browser: "Chrome",           device: "" };
        case "mobile":  return { os: "Android",     browser: "Discord Android",  device: "Discord Android" };
        case "meta":    return { os: "Android",     browser: "Discord VR",       device: "Meta Quest" };
        case "console": return { os: "Playstation", browser: "Discord Embedded", device: "PlayStation" };
        default:        return null;
    }
}

let unpatches: Array<any> = [];

export function forceIdentify() {
    if (storage.platform === "off") return;

    try {
        const gatewayModule = findByProps("getSocket", "isConnected");
        const socket = gatewayModule?.getSocket?.();
        if (!socket) return;

        socket.sessionId = null;
        socket.seq = 0;

        const ws = socket.webSocket;
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1000);
        } else if (typeof socket.close === "function") {
            socket.close();
            setTimeout(() => socket.connect?.(), 500);
        }
    } catch (e) {
        console.error("[PlatformSpoof] Error in forceIdentify:", e);
    }
}

export default {
    onLoad() {
        unpatches = [];

        try {
            const gatewayModule = findByProps("getSocket", "isConnected");
            const socket = gatewayModule?.getSocket?.();

            if (socket) {
                const socketProto = Object.getPrototypeOf(socket);
                const target = socketProto?.send ? socketProto : socket;

                if (typeof target.send === "function") {
                    const unpatchSend = patcher.before(target, "send", (args) => {
                        const [op, data] = args;
                        if (op === IDENTIFY && data?.properties) {
                            const spoof = getSpoofProps();
                            if (spoof) {
                                Object.assign(data.properties, spoof);
                            }
                        }
                    });
                    if (unpatchSend) unpatches.push(unpatchSend);
                }
            }

            const SuperProps = findByProps("getSuperProperties");
            if (SuperProps?.getSuperProperties) {
                const unpatchSuperProps = patcher.after(SuperProps, "getSuperProperties", (_, ret) => {
                    const spoof = getSpoofProps();
                    if (spoof && ret) {
                        ret.os = spoof.os;
                        ret.browser = spoof.browser;
                        ret.device = spoof.device;
                    }
                    return ret;
                });
                if (unpatchSuperProps) unpatches.push(unpatchSuperProps);
            }

            if (gatewayModule?.isConnected?.()) {
                forceIdentify();
            }
        } catch (err) {
            console.error("[PlatformSpoof] Error inside onLoad:", err);
        }
    },

    onUnload() {
        for (const unpatch of unpatches) {
            try {
                if (typeof unpatch === "function") {
                    unpatch();
                } else if (unpatch && typeof unpatch.unpatch === "function") {
                    unpatch.unpatch();
                }
            } catch (e) {
                console.error("[PlatformSpoof] Unpatch failed:", e);
            }
        }
        unpatches = [];
    },

    settings: Settings,
};
