import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps, findByName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

let unregisterCommands: Array<() => void> = [];

// Resolve Navigation & UI ActionSheet modules safely
const Navigation = findByProps("push", "pushLazy", "pop");
const Navigator = findByName("Navigator") ?? findByProps("Navigator")?.Navigator;
const modalCloseButton =
    findByProps("getRenderCloseButton")?.getRenderCloseButton ??
    findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

const ActionSheet = findByProps("openLazy", "hideActionSheet") ?? findByProps("showSimpleActionSheet");

// Get installed plugins using the exact same structure from your working snippet
function getInstalledPluginsList() {
    if (!plugins || typeof plugins !== "object") return [];

    return Object.entries(plugins).map(([id, plugin]: [string, any]) => ({
        id: plugin?.id || id,
        name: plugin?.manifest?.name || "Unknown Plugin",
        enabled: Boolean(plugin?.enabled),
    }));
}

// Safely open plugin settings modal
function openPluginSettings(pluginId: string, pluginName: string) {
    try {
        const SettingsComponent = getSettings(pluginId);

        if (!SettingsComponent) {
            showToast(`${pluginName} has no settings page`, undefined);
            return;
        }

        if (!Navigation || !Navigator) {
            showToast("Navigation modules missing", undefined);
            return;
        }

        Navigation.push(() =>
            React.createElement(Navigator, {
                initialRouteName: "PluginSettingsModal",
                screens: {
                    PluginSettingsModal: {
                        title: pluginName,
                        headerLeft: modalCloseButton?.(() => {
                            if (typeof Navigation?.pop === "function") Navigation.pop();
                        }),
                        render: () => React.createElement(SettingsComponent),
                    },
                },
            })
        );
    } catch (err: any) {
        showToast(`Error: ${err?.message || err}`, undefined);
    }
}

// Open native Discord Action Sheet popup for choices
function showPluginPicker(title: string, onSelect: (pluginId: string, name: string) => void) {
    const list = getInstalledPluginsList();

    if (list.length === 0) {
        showToast("No plugins installed", undefined);
        return;
    }

    const options = list.map((p) => ({
        label: `${p.enabled ? "✅" : "❌"} ${p.name}`,
        onPress: () => onSelect(p.id, p.name),
    }));

    if (ActionSheet?.showSimpleActionSheet) {
        ActionSheet.showSimpleActionSheet({
            key: "plugin-picker-sheet",
            header: { title: title },
            options: options,
        });
    } else if (ActionSheet?.openLazy) {
        ActionSheet.openLazy(
            Promise.resolve({
                default: () => null,
            }),
            "PluginPicker",
            { title, options }
        );
    } else {
        showToast("ActionSheet UI module not found", undefined);
    }
}

export default {
    onLoad: () => {
        // 1. /plugin-install [url]
        unregisterCommands.push(
            registerCommand({
                name: "plugin-install",
                displayName: "plugin-install",
                description: "Install a plugin directly from a URL",
                options: [
                    {
                        name: "url",
                        displayName: "url",
                        description: "Direct manifest link or repository URL",
                        type: 3, // STRING
                        required: true,
                    },
                ],
                execute: async (args) => {
                    const url = args[0]?.value?.trim();
                    if (!url) return;

                    try {
                        showToast("Installing plugin...", undefined);
                        await installPlugin(url);
                        showToast("Plugin installed successfully!", undefined);
                    } catch (err: any) {
                        showToast(`Failed: ${err?.message || err}`, undefined);
                    }
                },
            })
        );

        // 2. /plugin-uninstall (Pops up menu on command send)
        unregisterCommands.push(
            registerCommand({
                name: "plugin-uninstall",
                displayName: "plugin-uninstall",
                description: "Select an installed plugin to uninstall",
                execute: () => {
                    showPluginPicker("Select Plugin to Uninstall", async (pluginId, name) => {
                        try {
                            await removePlugin(pluginId);
                            showToast(`Uninstalled ${name}`, undefined);
                        } catch (err: any) {
                            showToast(`Failed: ${err?.message || err}`, undefined);
                        }
                    });
                },
            })
        );

        // 3. /plugin-settings (Pops up menu on command send)
        unregisterCommands.push(
            registerCommand({
                name: "plugin-settings",
                displayName: "plugin-settings",
                description: "Select an installed plugin to open settings",
                execute: () => {
                    showPluginPicker("Select Plugin Settings", (pluginId, name) => {
                        openPluginSettings(pluginId, name);
                    });
                },
            })
        );
    },

    onUnload: () => {
        unregisterCommands.forEach((unreg) => unreg());
        unregisterCommands = [];
    },
};
