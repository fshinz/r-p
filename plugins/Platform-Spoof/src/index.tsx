import { storage } from "@vendetta/plugin";
import { React, ReactNative } from "@vendetta/metro";
import { findByProps } from "@vendetta/metro";
import { Forms } from "@vendetta/ui/components";

const { FormRadioRow, FormSection } = Forms;

// Find socket module safely using direct findByProps
const socketModule = findByProps("getSocket", "isConnected");

const PLATFORMS = [
    { label: "Off", value: "off" },
    { label: "Desktop (Windows)", value: "desktop" },
    { label: "Web / Browser (Chrome)", value: "web" },
    { label: "Meta Quest / VR", value: "meta" },
    { label: "Console (PlayStation)", value: "console" },
];

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
let unpatchSocket = null;

function applySpoof(data) {
    const currentPlatform = storage.platform || "off";
    if (currentPlatform === "off" || !SPOOF_PROPERTIES[currentPlatform]) return;

    if (data && data.properties) {
        Object.assign(data.properties, SPOOF_PROPERTIES[currentPlatform]);
    }
}

function patchGateway() {
    const socket = socketModule?.getSocket();
    if (!socket) return;

    const origSend = socket.send;
    socket.send = function (op, data, flag) {
        if (op === IDENTIFY && data) {
            applySpoof(data);
        }
        return origSend.call(this, op, data, flag);
    };

    const ws = socket.webSocket;
    let origWsSend = null;
    if (ws && typeof ws.send === "function") {
        origWsSend = ws.send;
        ws.send = function (data) {
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

function reconnectGateway() {
    const socket = socketModule?.getSocket();
    if (!socket) return;
    
    socket.sessionId = null;
    if (socket.webSocket) {
        socket.webSocket.close();
    } else if (typeof socket.close === "function") {
        socket.close();
    }
}

function Settings() {
    const [selected, setSelected] = React.useState(storage.platform || "off");

    return (
        <FormSection title="Select Spoofed Platform">
            {PLATFORMS.map((opt) => (
                <FormRadioRow
                    key={opt.value}
                    label={opt.label}
                    selected={selected === opt.value}
                    onPress={() => {
                        storage.platform = opt.value;
                        setSelected(opt.value);
                        reconnectGateway();
                    }}
                />
            ))}
        </FormSection>
    );
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
