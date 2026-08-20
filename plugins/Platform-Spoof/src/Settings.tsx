import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";

// Safely grab Table elements and ScrollView via Metro
const { ScrollView } = findByProps("ScrollView");
const { TableRadioGroup, TableRadioRow, Stack } = findByProps(
    "TableRadioGroup",
    "TableRadioRow",
    "Stack"
);

const socketModule = findByProps("getSocket", "isConnected");

const PLATFORMS = [
    { label: "Off", value: "off", subLabel: "Default mobile status" },
    { label: "Desktop (Windows)", value: "desktop", subLabel: "Shows Windows client icon" },
    { label: "Web / Browser (Chrome)", value: "web", subLabel: "Shows Chrome Linux icon" },
    { label: "Meta Quest / VR", value: "meta", subLabel: "Shows VR status" },
    { label: "Console (PlayStation)", value: "console", subLabel: "Shows PlayStation status" },
];

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

export default function Settings() {
    useProxy(storage);
    const selected = storage.platform || "off";

    const handleSelect = (value: string) => {
        storage.platform = value;
        reconnectGateway();
    };

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            <Stack spacing={16}>
                <TableRadioGroup
                    title="SELECT SPOOFED PLATFORM"
                    value={selected}
                    onChange={(val: string) => handleSelect(val)}
                >
                    {PLATFORMS.map((opt) => (
                        <TableRadioRow
                            key={opt.value}
                            label={opt.label}
                            subLabel={opt.subLabel}
                            value={opt.value}
                            selected={selected === opt.value}
                            onPress={() => handleSelect(opt.value)}
                        />
                    ))}
                </TableRadioGroup>
            </Stack>
        </ScrollView>
    );
}
