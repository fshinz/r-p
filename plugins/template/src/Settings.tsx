import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta";
import { Forms, General } from "@vendetta/ui/components";

const { FormSection, FormInput, FormButton, FormText } = Forms;
const { View, ScrollView } = General;

export default function Settings() {
    // Component state for new badge creation
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [iconUrl, setIconUrl] = React.useState("");
    const [link, setLink] = React.useState("");

    // Force re-render on list updates
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    const handleAddBadge = () => {
        if (!iconUrl.trim()) return;

        const newBadge = {
            id: `custom_badge_${Date.now()}`,
            description: description.trim() || name.trim() || "Custom Badge",
            iconUrl: iconUrl.trim(),
            ...(link.trim() ? { link: link.trim() } : {})
        };

        storage.customBadges = [...(storage.customBadges || []), newBadge];

        // Clear input fields
        setName("");
        setDescription("");
        setIconUrl("");
        setLink("");
        forceUpdate();
    };

    const handleRemoveBadge = (id: string) => {
        storage.customBadges = (storage.customBadges || []).filter((b: any) => b.id !== id);
        forceUpdate();
    };

    return (
        <ScrollView style={{ flex: 1, padding: 12 }}>
            <FormSection title="ADD NEW CUSTOM BADGE">
                <FormInput
                    label="Badge Name / Tooltip"
                    placeholder="e.g. Verified Developer"
                    value={name}
                    onChange={(v: string) => setName(v)}
                />

                <FormInput
                    label="Description"
                    placeholder="e.g. System Administrator & Contributor"
                    value={description}
                    onChange={(v: string) => setDescription(v)}
                />

                <FormInput
                    label="Icon Image URL (PNG, GIF, JPG)"
                    placeholder="https://i.imgur.com/example.png"
                    value={iconUrl}
                    onChange={(v: string) => setIconUrl(v)}
                />

                <FormInput
                    label="Click Link (Optional)"
                    placeholder="https://github.com/yourname"
                    value={link}
                    onChange={(v: string) => setLink(v)}
                />

                <View style={{ marginTop: 8 }}>
                    <FormButton
                        text="Add Badge"
                        onPress={handleAddBadge}
                    />
                </View>
            </FormSection>

            <FormSection title={`ACTIVE CUSTOM BADGES (${(storage.customBadges || []).length})`}>
                {(storage.customBadges || []).length === 0 ? (
                    <FormText style={{ padding: 8, opacity: 0.6 }}>
                        No custom badges configured yet.
                    </FormText>
                ) : (
                    (storage.customBadges || []).map((badge: any) => (
                        <View 
                            key={badge.id} 
                            style={{ 
                                marginBottom: 12, 
                                padding: 10, 
                                backgroundColor: "rgba(255, 255, 255, 0.05)", 
                                borderRadius: 8 
                            }}
                        >
                            <FormText style={{ fontWeight: "bold" }}>
                                {badge.description}
                            </FormText>
                            <FormText style={{ fontSize: 12, opacity: 0.7 }}>
                                {badge.iconUrl}
                            </FormText>

                            <View style={{ marginTop: 6 }}>
                                <FormButton
                                    text="Delete"
                                    color="red"
                                    onPress={() => handleRemoveBadge(badge.id)}
                                />
                            </View>
                        </View>
                    ))
                )}
            </FormSection>
        </ScrollView>
    );
}
