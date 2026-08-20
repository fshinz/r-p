import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

const socketModule = findByProps("getSocket", "isConnected");

const SPOOF_PROPERTIES = {
    desktop: {
        os: "Windows",
        browser: "Discord Client",
        device: "",
        release_channel: "stable",
        client_version: "1.0.9187",
        os_version: "10.0.19045",
    },
    web: {
        os: "Linux",
        browser: "Chrome",
        device: "",
        release_channel: "stable",
        client_version: "9999",
        browser_user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        browser_version: "124.0.0.0",
    },
    meta: {
        os: "Android",
        browser: "Discord VR",
        device: "Meta Quest",
        release_channel: "stable",
        client_version: "1.0.0",
        os_version: "12",
    },
    console: {
        os: "Playstation",
        browser: "Discord Embedded",
        device: "PlayStation",
        release_channel: "stable",
        client_version: "1.0.0",
    },
};

const IDENTIFY = 2;
let unpatchSocket: (() => void) | null = null;

function applySpoof(data: any) {
    const currentPlatform = storage.platform || "off";
    if (currentPlatform === "off" || !SPOOF_PROPERTIES[currentPlatform]) return;

    if (data && data.properties) {
        Object.assign(data.properties, SPOOF_PROPERTIES[currentPlatform]);
    }
}

function patchGateway() {
    const socket = socketModule?.getSocket();
    if (!socket) return null;

    const origSend = socket.send;
    socket.send = function (op: number, data: any, flag: any) {
        if (op === IDENTIFY && data) {
            applySpoof(data);
        }
        return origSend.call(this, op, data, flag);
    };

    const ws = socket.webSocket;
    let origWsSend: any = null;
    if (ws && typeof ws.send === "function") {
        origWsSend = ws.send;
        ws.send = function (data: any) {
            if (typeof data === "string") {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed?.op === IDENTIFY && parsed.d) {
                        applySpoof(parsed.d);
                        data = JSON.stringify(parsed);
                    }
                } catch (e) {}
            }
            return origWsSend.call(this, data);
        };
    }

    return () => {
        if (socket) socket.send = origSend;
        if (ws && origWsSend) ws.send = origWsSend;
    };
}

export default {
    onLoad: () => {
        if (!storage.platform) storage.platform = "off";

        setTimeout(() => {
            unpatchSocket = patchGateway();
        }, 500);
    },
    onUnload: () => {
        if (unpatchSocket) unpatchSocket();
    },
    settings: Settings,
};
