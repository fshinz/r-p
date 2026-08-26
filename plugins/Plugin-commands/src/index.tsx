import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps, findByName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

let unregisterCommands: Array<() => void> = [];

// Resolve Navigation modules
const Navigation = findByProps("push", "pushLazy", "pop");
const Navigator = findByName("Navigator") ?? findByProps("Navigator")?.Navigator;
const modalCloseButton =
    findByProps("getRenderCloseButton")?.getRenderCloseButton ??
    findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

// Helper to reliably format choices for Discord's autocomplete popup
function buildAutocompleteChoices(query: string) {
    const q = (query || "").toLowerCase().trim();
    
    if (!plugins || typeof plugins !== "object") {
        return [{ name: "No plugins loaded", value: "none" }];
    }

    const entries = Object.entries(plugins);

    if (entries.length === 0) {
        return [{ name: "No plugins installed", value: "none" }];
    }

    const matches = entries
        .map(([id, plugin]: [string, any]) => {
            const name = plugin?.manifest?.name || id;
            return {
                name: `${plugin?.enabled ? "✅" : "❌"} ${name}`,
                value: id, // Store the raw plugin ID/URL
                searchKey: name.toLowerCase(),
            };
        })
        .filter((choice) => choice.searchKey.includes(q) || choice.value.toLowerCase().includes(q))
        .slice(0, 25);

    if (matches.length === 0) {
        return [{ name: "No matching plugins found", value: "none" }];
    }

    return matches.map(({ name, value }) => ({ name, value }));
}

// Open settings page for selected plugin
function openPluginSettings(pluginId: string) {
    if (!pluginId || pluginId === "none") return;

    const plugin = (plugins as Record<string, any>)[pluginId];
    if (!plugin) {
        showToast("Plugin not found in store", undefined);
        return;
    }

    try {
        const SettingsComponent = getSettings(pluginId);
        if (!SettingsComponent) {
            showToast(`${plugin?.manifest?.name || "Plugin"} has no settings page`, undefined);
            return;
        }

        if (!Navigation || !Navigator) {
            showToast("Navigation modules missing", undefined);
            return;
        }

        const title = plugin?.manifest?.name || "Plugin Settings";

        Navigation.push(() =>
            React.createElement(Navigator, {
                initialRouteName: "PluginSettingsModal",
                screens: {
                    PluginSettingsModal: {
                        title: title,
                        headerLeft: modalCloseButton?.(() => {
                            if (typeof Navigation?.pop === "function") Navigation.pop();
                        }),
                        render: () => React.createElement(SettingsComponent),
                    },
                },
            })
        );
    } catch (err: any) {
        showToast(`Error opening settings: ${err?.message || err}`, undefined);
    }
}

export default {
    onLoad: () => {
        // 1. /plugin-install [url]
        unregisterCommands.push(
            registerCommand({
                name: "plugin-install",
                displayName: "plugin-install",
                description: "Install a client plugin directly from a manifest URL",
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

        // 2. /plugin-uninstall [plugin]
        unregisterCommands.push(
            registerCommand({
                name: "plugin-uninstall",
                displayName: "plugin-uninstall",
                description: "Uninstall an installed plugin",
                options: [
                    {
                        name: "plugin",
                        displayName: "plugin",
                        description: "Select a plugin to uninstall",
                        type: 3, // STRING
                        required: true,
                        autocomplete: true,
                    },
                ],
                onAutoComplete: (args) => {
                    const focused = args.find((opt: any) => opt.focused);
                    return buildAutocompleteChoices(focused?.value);
                },
                execute: async (args) => {
                    const targetId = args[0]?.value?.trim();
                    if (!targetId || targetId === "none") return;

                    try {
                        await removePlugin(targetId);
                        showToast("Plugin uninstalled", undefined);
                    } catch (err: any) {
                        showToast(`Failed: ${err?.message || err}`, undefined);
                    }
                },
            })
        );

        // 3. /plugin-settings [plugin]
        unregisterCommands.push(
            registerCommand({
                name: "plugin-settings",
                displayName: "plugin-settings",
                description: "Open settings for an installed plugin",
                options: [
                    {
                        name: "plugin",
                        displayName: "plugin",
                        description: "Select a plugin to configure",
                        type: 3, // STRING
                        required: true,
                        autocomplete: true,
                    },
                ],
                onAutoComplete: (args) => {
                    const focused = args.find((opt: any) => opt.focused);
                    return buildAutocompleteChoices(focused?.value);
                },
                execute: (args) => {
                    const targetId = args[0]?.value?.trim();
                    openPluginSettings(targetId);
                },
            })
        );
    },

    onUnload: () => {
        unregisterCommands.forEach((unreg) => unreg());
        unregisterCommands = [];
    },
};
