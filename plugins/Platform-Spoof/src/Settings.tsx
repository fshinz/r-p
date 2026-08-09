import { React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { FormSwitchRow, FormRadioRow, FormSection } = Forms;

export default function Settings() {
    useProxy(storage);

    return (
        <FormSection title="Platform Spoof Settings">
            <FormSwitchRow
                label="Enable Platform Spoofing"
                subLabel="Requires reconnecting or restarting app to take effect."
                value={storage.enabled}
                onValueChange={(val: boolean) => {
                    storage.enabled = val;
                }}
            />

            {storage.enabled && (
                <FormSection title="Target Platform">
                    <FormRadioRow
                        label="Desktop (Windows Client)"
                        selected={storage.platform === "desktop"}
                        onPress={() => {
                            storage.platform = "desktop";
                        }}
                    />
                    <FormRadioRow
                        label="Web Browser (Chrome)"
                        selected={storage.platform === "web"}
                        onPress={() => {
                            storage.platform = "web";
                        }}
                    />
                    <FormRadioRow
                        label="Mobile (Android)"
                        selected={storage.platform === "mobile"}
                        onPress={() => {
                            storage.platform = "mobile";
                        }}
                    />
                </FormSection>
            )}
        </FormSection>
    );
}
