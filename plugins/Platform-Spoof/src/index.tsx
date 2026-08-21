import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import Settings from "./Settings";

const socketModule = findByProps("getSocket", "isConnected");
const IDENTIFY = 2;

const patchedTransports = new WeakMap();
let origSend: Function | null = null;
let origHandleIdentify: Function | null = null;
let watchdogInterval: any = null;

const SPOOF_PROPERTIES: Record<string, Record<string, string>> = {
    desktop: { os: "Windows", browser: "Discord Client", release_channel: "stable" },
    web: { os: "Linux", browser: "Chrome", release_channel: "stable" },
    meta: { os: "Android", browser: "Discord VR", device: "Meta Quest" },
    console: { os: "Playstation", browser: "Discord Embedded", device: "PlayStation" },
};

function applySpoof(target: any) {
    const platform = storage.platform || "off";
    if (platform !== "off" && SPOOF_PROPERTIES[platform] && target) {
        Object.assign(target, SPOOF_PROPERTIES[platform]);
    }
}

function patchTransport(socket: any) {
    const ws = socket?.webSocket;
    if (!ws || typeof ws.send !== "function" || patchedTransports.has(ws)) return;

    const origWsSend = ws.send.bind(ws);
    patchedTransports.set(ws, origWsSend);

    ws.send = function (data: any) {
        if (typeof data === "string") {
            try {
                const parsed = JSON.parse(data);
                if (parsed?.op === IDENTIFY && parsed.d?.properties) {
                    applySpoof(parsed.d.properties);
                    data = JSON.stringify(parsed);
                }
            } catch (e) {}
        }
        return origWsSend.call(this, data);
    };
}

function patchSocket(socket: any) {
    if (!socket) return;
    patchTransport(socket);

    if (socket.__psPatched) return;

    origSend = socket.send.bind(socket);
    socket.send = function (op: number, data: any, flag: any) {
        if (op === IDENTIFY && data?.properties) {
            applySpoof(data.properties);
        }
        return origSend.call(this, op, data, flag);
    };

    if (typeof socket.handleIdentify === "function") {
        origHandleIdentify = socket.handleIdentify.bind(socket);
        socket.handleIdentify = function (...args: any[]) {
            const res = origHandleIdentify!.apply(this, args);
            patchTransport(socket);
            return res;
        };
    }

    socket.__psPatched = true;
}

function startWatchdog() {
    let elapsed = 0;
    let lastSocket = socketModule?.getSocket();

    watchdogInterval = setInterval(() => {
        elapsed += 500;
        const currentSocket = socketModule?.getSocket();
        
        if (currentSocket) {
            patchSocket(currentSocket);
            if (currentSocket !== lastSocket) {
                lastSocket = currentSocket;
            }
        }

        if (elapsed >= 15000) {
            clearInterval(watchdogInterval);
            watchdogInterval = null;
        }
    }, 500);
}

export default {
    onLoad: () => {
        if (!storage.platform) storage.platform = "off";

        const initialSocket = socketModule?.getSocket();
        if (initialSocket) {
            patchSocket(initialSocket);
        }
        
        startWatchdog();
    },
    onUnload: () => {
        if (watchdogInterval) clearInterval(watchdogInterval);
        const socket = socketModule?.getSocket();
        if (socket && origSend) {
            socket.send = origSend;
            if (origHandleIdentify) socket.handleIdentify = origHandleIdentify;
            delete socket.__psPatched;
        }
    },
    settings: Settings,
};
