import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";

const { ScrollView } = findByProps("ScrollView");
const { TableRadioGroup, TableRadioRow, Stack } = findByProps(
    "TableRadioGroup",
    "TableRadioRow",
    "Stack"
);

const socketModule = findByProps("getSocket", "isConnected");

// Helper to safely render asset icons with color tinting
function renderIcon(name: string, tintColor?: string) {
    const assetId = getAssetIDByName(name);
    if (!assetId) return null;

    return (
        <RN.Image
            source={assetId}
            style={{
                width: 24,
                height: 24,
                ...(tintColor ? { tintColor } : {}),
            }}
        />
    );
}

const PLATFORMS = [
    {
        label: "Off",
        value: "off",
        subLabel: "Default mobile status",
        icon: () => renderIcon("MobilePhoneIcon"),
    },
    {
        label: "Desktop (Windows)",
        value: "desktop",
        subLabel: "Shows Windows client icon",
        // Forces black monitor icon to render white/light
        icon: () => renderIcon("ic_monitor", "#ffffff"), 
    },
    {
        label: "Web / Browser (Chrome)",
        value: "web",
        subLabel: "Shows Chrome Linux icon",
        icon: () => renderIcon("GlobeEarthIcon"),
    },
    {
        label: "Meta Quest / VR",
        value: "meta",
        subLabel: "Shows VR status",
        icon: () => renderIcon("ic_vr_headset_24px"),
    },
    {
        label: "Console (PlayStation)",
        value: "console",
        subLabel: "Shows PlayStation status",
        icon: () => renderIcon("ic_playstation_device_ps5_32px"),
    },
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
                            icon={opt.icon ? opt.icon() : undefined}
                            onPress={() => handleSelect(opt.value)}
                        />
                    ))}
                </TableRadioGroup>
            </Stack>
        </ScrollView>
    );
}
