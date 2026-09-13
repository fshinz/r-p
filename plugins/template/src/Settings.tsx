import { React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { General } from "@vendetta/ui/components";

// Fallback destructuring in case specific form elements vary by client build
const { FormSection, FormRow, FormSwitch, FormInput, FormText } = Forms || {};
const { ScrollView } = General || {};

export default function Settings() {
    // Safety check: Fallback to basic text if UI components fail to load
    if (!FormSection) {
        return (
            <ScrollView style={{ padding: 16 }}>
                <FormText style={{ color: "#fff" }}>
                    Failed to load standard UI components.
                </FormText>
            </ScrollView>
        );
    }

    return (
        <ScrollView style={{ flex: 1, padding: 16 }}>
            <FormSection title="PLUGIN SETTINGS">
                {FormRow && (
                    <FormRow
                        label="Enable Custom Features"
                        subLabel="Toggle plugin functionality"
                        control={
                            FormSwitch ? (
                                <FormSwitch
                                    value={true}
                                    onValueChange={(val: boolean) => {
                                        console.log("Toggled:", val);
                                    }}
                                />
                            ) : undefined
                        }
                    />
                )}
            </FormSection>
        </ScrollView>
    );
}
