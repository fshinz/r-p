import { storage } from "@vendetta/plugin";
import { React, Forms } from "@vendetta/metro";

const { FormRadioRow, FormSection } = Forms;

const PLATFORMS = [
    { label: "Off", value: "off" },
    { label: "Desktop (Windows)", value: "desktop" },
    { label: "Web / Browser (Chrome)", value: "web" },
    { label: "Meta Quest / VR", value: "meta" },
    { label: "Console (PlayStation)", value: "console" },
];

export default function Settings() {
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
                    }}
                />
            ))}
        </FormSection>
    );
}
