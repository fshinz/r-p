import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { Stack, TableRadioGroup, TableRadioRow } from "shared:components";

const PLATFORMS = [
    { label: "Off", value: "off", subLabel: "Default mobile status" },
    { label: "Desktop (Windows)", value: "desktop", subLabel: "Shows Windows client icon" },
    { label: "Web / Browser (Chrome)", value: "web", subLabel: "Shows Chrome Linux icon" },
    { label: "Meta Quest / VR", value: "meta", subLabel: "Shows VR status" },
    { label: "Console (PlayStation)", value: "console", subLabel: "Shows PlayStation status" },
] as const;

type PlatformKey = typeof PLATFORMS[number]["value"];

export default function Settings() {
    const [selected, setSelected] = React.useState<PlatformKey>(storage.platform || "off");

    const handleSelect = (value: PlatformKey) => {
        storage.platform = value;
        setSelected(value);
    };

    return (
        <ReactNative.ScrollView style={{ flex: 1 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRadioGroup
                    title="PLATFORM SPOOF"
                    value={selected}
                    onChange={(v: PlatformKey) => handleSelect(v)}
                >
                    {PLATFORMS.map((opt) => (
                        <TableRadioRow
                            key={opt.value}
                            label={opt.label}
                            subLabel={opt.subLabel}
                            value={opt.value}
                        />
                    ))}
                </TableRadioGroup>
            </Stack>
        </ReactNative.ScrollView>
    );
}
