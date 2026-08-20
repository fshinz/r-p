import { storage } from "@vendetta/plugin";
import { findByProps, findByDisplayName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";

const { View, Text, Pressable, ScrollView } = ReactNative;

// Safely retrieve Discord's native TableRow and Radio components from Metro
const TableRow = findByProps("TableRow")?.TableRow || findByDisplayName("TableRow");
const TableRowGroup = findByProps("TableRowGroup")?.TableRowGroup || findByDisplayName("TableRowGroup");
const Radio = findByProps("Radio")?.Radio || findByDisplayName("Radio");

// Find socket module safely
const socketModule = findByProps("getSocket", "isConnected");

const PLATFORMS = [
    { label: "Off", value: "off", subLabel: "Default mobile status" },
    { label: "Desktop (Windows)", value: "desktop", subLabel: "Shows Windows client icon" },
    { label: "Web / Browser (Chrome)", value: "web", subLabel: "Shows Chrome Linux icon" },
    { label: "Meta Quest / VR", value: "meta", subLabel: "Shows VR status" },
    { label: "Console (PlayStation)", value: "console", subLabel: "Shows PlayStation status" },
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

// Fallback custom TableRow builder in case Metro components aren't resolved
function NativeTableRow({ label, subLabel, selected, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
            }}
        >
            <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "500" }}>{label}</Text>
                {subLabel ? (
                    <Text style={{ color: "#949BA4", fontSize: 12, marginTop: 2 }}>{subLabel}</Text>
                ) : null}
            </View>
            {Radio ? (
                <Radio selected={selected} />
            ) : (
                <View
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selected ? "#5865F2" : "#B5BAC1",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {selected && (
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: "#5865F2",
                            }}
                        />
                    )}
                </View>
            )}
        </Pressable>
    );
}

function Settings() {
    const [selected, setSelected] = React.useState(storage.platform || "off");

    const handleSelect = (value) => {
        storage.platform = value;
        setSelected(value);
        reconnectGateway();
    };

    // Use Discord's native TableRow / TableRowGroup if resolved by Metro
    if (TableRow && TableRowGroup) {
        return (
            <ScrollView style={{ flex: 1 }}>
                <TableRowGroup title="PLATFORM SPOOF">
                    {PLATFORMS.map((opt) => (
                        <TableRow
                            key={opt.value}
                            label={opt.label}
                            subLabel={opt.subLabel}
                            action={Radio ? <Radio selected={selected === opt.value} /> : null}
                            onPress={() => handleSelect(opt.value)}
                        />
                    ))}
                </TableRowGroup>
            </ScrollView>
        );
    }

    // Direct React Native fallback guaranteeing Table Row appearance
    return (
        <ScrollView style={{ flex: 1, paddingTop: 10 }}>
            <Text
                style={{
                    color: "#949BA4",
                    fontSize: 12,
                    fontWeight: "700",
                    marginLeft: 16,
                    marginBottom: 8,
                    letterSpacing: 0.5,
                }}
            >
                SELECT PLATFORM
            </Text>
            <View style={{ borderRadius: 8, overflow: "hidden", marginHorizontal: 10 }}>
                {PLATFORMS.map((opt) => (
                    <NativeTableRow
                        key={opt.value}
                        label={opt.label}
                        subLabel={opt.subLabel}
                        selected={selected === opt.value}
                        onPress={() => handleSelect(opt.value)}
                    />
                ))}
            </View>
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
