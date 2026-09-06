import { React, ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { resolveSemanticColor } from "@vendetta/ui/colors";
import { findByProps } from "@vendetta/metro";

const { ScrollView, StyleSheet } = ReactNative;
const { TableRow, TableRowGroup, FormSwitch } = Forms;

// Fallback color resolution for background contrast
const ColorModule = findByProps("semanticColors", "rawColors") || findByProps("ThemeColorMap");
const semanticColors = ColorModule?.semanticColors ?? {};

const getColor = (semanticKey: string, fallback: string) => {
  try {
    if (semanticColors[semanticKey]) {
      return resolveSemanticColor(semanticColors[semanticKey]) || fallback;
    }
  } catch {}
  return fallback;
};

export default function SettingsUI(): JSX.Element {
  useProxy(storage);

  return (
    <ScrollView style={styles.container}>
      <TableRowGroup title="YOUBAR BUTTON TOGGLES">
        <TableRow
          label="Direct Messages Button"
          subLabel="Show quick jump button to DM channel list"
          action={
            <FormSwitch
              value={storage.showDMButton ?? false}
              onValueChange={(val: boolean) => {
                storage.showDMButton = val;
              }}
            />
          }
        />
        <TableRow
          label="App Settings Button"
          subLabel="Show quick button to open Discord settings"
          action={
            <FormSwitch
              value={storage.showSettingsButton ?? true}
              onValueChange={(val: boolean) => {
                storage.showSettingsButton = val;
              }}
            />
          }
        />
        <TableRow
          label="BetterInbox Button"
          subLabel="Show notification center icon in YouBar"
          action={
            <FormSwitch
              value={storage.showInboxButton ?? true}
              onValueChange={(val: boolean) => {
                storage.showInboxButton = val;
              }}
            />
          }
        />
      </TableRowGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: getColor("BACKGROUND_PRIMARY", "#111214"),
  },
});
