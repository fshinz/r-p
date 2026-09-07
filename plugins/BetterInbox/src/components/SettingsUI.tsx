import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { refreshYouBarUI } from "../index";

const { ScrollView } = RN;

// Safely grab Discord's native UI containers and controls
const TableRowGroup = findByProps("TableRowGroup")?.TableRowGroup;
const TableSwitchRow = findByProps("TableSwitchRow")?.TableSwitchRow;
const Stack = findByProps("Stack")?.Stack;

export default function SettingsUI(): JSX.Element {
    useProxy(storage);

    const showDM = storage.showDMButton ?? false;
    const showSettings = storage.showSettingsButton ?? true;
    const showInbox = storage.showInboxButton ?? true;

    const handleToggle = (key: string, val: boolean) => {
        storage[key] = val;
        refreshYouBarUI();
    };

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            <Stack spacing={16}>
                {TableRowGroup && TableSwitchRow ? (
                    <TableRowGroup title="YOUBAR BUTTON TOGGLES">
                        <TableSwitchRow
                            label="Direct Messages Button"
                            subLabel="Show quick jump button to DM channel list"
                            value={showDM}
                            onValueChange={(val: boolean) => handleToggle("showDMButton", val)}
                        />
                        <TableSwitchRow
                            label="App Settings Button"
                            subLabel="Show quick button to open Discord settings"
                            value={showSettings}
                            onValueChange={(val: boolean) => handleToggle("showSettingsButton", val)}
                        />
                        <TableSwitchRow
                            label="BetterInbox Button"
                            subLabel="Show notification center icon in YouBar"
                            value={showInbox}
                            onValueChange={(val: boolean) => handleToggle("showInboxButton", val)}
                        />
                    </TableRowGroup>
                ) : null}
            </Stack>
        </ScrollView>
    );
}
