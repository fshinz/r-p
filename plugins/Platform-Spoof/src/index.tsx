import { findByProps } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";

const { ScrollView } = ReactNative;

// Safely resolve components via Metro
const FormRadioRow = findByProps("FormRadioRow")?.FormRadioRow || findByProps("TableRow", "TableRadioGroup")?.FormRadioRow;
const FormSection = findByProps("FormSection")?.FormSection || findByProps("TableSection")?.FormSection;
const socketModule = findByProps("getSocket", "isConnected");

const PLATFORMS = [
    { label: "Off", value: "off", subLabel: "Default mobile status" },
    { label: "Desktop (Windows)", value: "desktop", subLabel: "Shows Windows client icon" },
    { label: "Web / Browser (Chrome)", value: "web", subLabel: "Shows Chrome Linux icon" },
    { label: "Meta Quest / VR", value: "meta", subLabel: "Shows VR status" },
    { label: "Console (PlayStation)", value: "console", subLabel: "Shows PlayStation status" },
] as const;

type PlatformKey = typeof PLATFORMS[number]["value"];

const SPOOF_PROPERTIES: Record<Exclude<PlatformKey, "off">, Record<string, string>> = {
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
    const currentPlatform = (storage.platform || "off") as PlatformKey;
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

function Settings() {
    const [selected, setSelected] = React.useState<PlatformKey>(storage.platform || "off");

    const handleSelect = (value: PlatformKey) => {
        storage.platform = value;
        setSelected(value);
    };

    if (!FormSection || !FormRadioRow) {
        return null;
    }

    return (
        <ScrollView style={{ flex: 1 }}>
            <FormSection title="PLATFORM SPOOF">
                {PLATFORMS.map((opt) => (
                    <FormRadioRow
                        key={opt.value}
                        label={opt.label}
                        subLabel={opt.subLabel}
                        selected={selected === opt.value}
                        onPress={() => handleSelect(opt.value)}
                    />
                ))}
            </FormSection>
        </ScrollView>
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
