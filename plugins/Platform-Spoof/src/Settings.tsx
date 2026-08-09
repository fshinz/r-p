import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { findByProps } from "@vendetta/metro";
import { General } from "@vendetta/ui/components";
import { forceIdentify, Platform } from "./index";

const { ScrollView, View } = findByProps("ScrollView", "View");
const { FormSection, FormRadioRow, FormText } = General;

const PLATFORMS: Array<{ label: string; sublabel: string; value: Platform }> = [
    { label: "Off", sublabel: "Use native client properties", value: "off" },
    { label: "Desktop (Windows)", sublabel: "Shows green desktop indicator", value: "desktop" },
    { label: "Web / Browser", sublabel: "Shows web/browser status", value: "web" },
    { label: "Mobile (Android)", sublabel: "Standard Discord Android client", value: "mobile" },
    { label: "Meta Quest / VR", sublabel: "Shows VR status", value: "meta" },
    { label: "Console", sublabel: "Shows PlayStation/Console status", value: "console" },
];

export default function Settings() {
    useProxy(storage);

    return (
        <ScrollView style={{ flex: 1, padding: 16 }}>
            <FormSection title="PLATFORM SPOOFER">
                <View style={{ marginBottom: 12 }}>
                    <FormText color="text-muted" variant="text-sm/normal">
                        Select which platform status Discord's Gateway should broadcast to other users.
                    </FormText>
                </View>

                {PLATFORMS.map((item) => (
                    <FormRadioRow
                        key={item.value}
                        label={item.label}
                        subLabel={item.sublabel}
                        selected={storage.platform === item.value}
                        onPress={() => {
                            storage.platform = item.value;
                            forceIdentify();
                        }}
                    />
                ))}
            </FormSection>
        </ScrollView>
    );
}
