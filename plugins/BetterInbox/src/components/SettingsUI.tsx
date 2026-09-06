import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { ScrollView } = ReactNative;
const { FormSwitch, FormSection, FormTitle } = Forms;

export default function SettingsUI(): JSX.Element {
  useProxy(storage);

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      <FormSection title="YOUBAR BUTTON TOGGLES">
        <FormSwitch
          label="Direct Messages Button"
          subLabel="Show quick jump button to DM channel list"
          value={storage.showDMButton ?? false}
          onValueChange={(val: boolean) => {
            storage.showDMButton = val;
          }}
        />
        <FormSwitch
          label="App Settings Button"
          subLabel="Show quick button to open Discord settings"
          value={storage.showSettingsButton ?? true}
          onValueChange={(val: boolean) => {
            storage.showSettingsButton = val;
          }}
        />
        <FormSwitch
          label="BetterInbox Button"
          subLabel="Show notification center icon in YouBar"
          value={storage.showInboxButton ?? true}
          onValueChange={(val: boolean) => {
            storage.showInboxButton = val;
          }}
        />
      </FormSection>
    </ScrollView>
  );
}
