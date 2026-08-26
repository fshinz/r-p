import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps, findByName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

let unregisterCommands: Array<() => void> = [];

// 1. Resolve Navigation modules
const Navigation = findByProps("push", "pushLazy", "pop");
const Navigator = findByName("Navigator") ?? findByProps("Navigator")?.Navigator;
const modalCloseButton =
    findByProps("getRenderCloseButton")?.getRenderCloseButton ??
    findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

// Safely unwraps the reactive store into standard plugin objects
function getPluginsMap(): Record<string, any> {
    // Check internal store property if available, otherwise clone proxy
    const rawPlugins = (plugins as any)?.plugins || plugins || {};
    try {
        return typeof rawPlugins === "object" ? { ...rawPlugins } : {};
    } catch {
        return {};
    }
}

// Returns an array of formatted choices for the autocomplete dropdown menu
function getPluginAutocompleteChoices(input: string) {
    const query = input.toLowerCase().trim();
    const pluginMap = getPluginsMap();
    const pluginIds = Object.keys(pluginMap);

    if (pluginIds.length === 0) {
        return [
            {
                name: "No installed plugins found",
                displayName: "No installed plugins found",
                value: "none",
            },
        ];
    }

    return pluginIds
        .map((id) => {
            const plugin = pluginMap[id];
            const name = plugin?.manifest?.name || id;
            return {
                name: name,
                displayName: name,
                value: id,
            };
        })
        .filter((choice) => choice.name.toLowerCase().includes(query))
        .slice(0, 25);
}

// Opens the plugin settings page using the working Modal implementation
function openPluginSettings(pluginId: string) {
    const pluginMap = getPluginsMap();
    const plugin = pluginMap[pluginId];

    if (!plugin) {
        showToast("Error: Plugin object not found in store", undefined);
        return;
    }

    try {
        const SettingsComponent = getSettings(pluginId);

        if (!SettingsComponent) {
            showToast("Plugin has no settings page", undefined);
            return;
        }

        if (!Navigation || !Navigator) {
            showToast("Error: Navigation stack modules not found", undefined);
            return;
        }

        const title = plugin.manifest?.name || "Plugin Settings";

        Navigation.push(() =>
            React.createElement(Navigator, {
                initialRouteName: "PluginSettingsModal",
                screens: {
                    PluginSettingsModal: {
                        title: title,
                        headerLeft: modalCloseButton?.(() => {
                            if (typeof Navigation?.pop === "function") Navigation.pop();
                        }),
                        render: () => {
                            try {
                                return React.createElement(SettingsComponent);
                            } catch (renderErr: any) {
                                console.error("[PluginCommands] Render error inside settings:", renderErr);
                                showToast(`Render error: ${renderErr?.message || renderErr}`, undefined);
                                return null;
                            }
                        },
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("[PluginCommands] Exception caught in openPluginSettings:", err);
        showToast(`Fatal: ${err?.message || String(err)}`, undefined);
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
                        description: "Select an installed plugin to uninstall",
                        type: 3, // STRING
                        required: true,
                        autocomplete: true,
                    },
                ],
                onAutoComplete: (args) => {
                    const focusedOption = args.find((opt: any) => opt.focused);
                    const input = focusedOption?.value || "";
                    return getPluginAutocompleteChoices(input);
                },
                execute: async (args) => {
                    const targetId = args[0]?.value?.trim();
                    if (!targetId || targetId === "none") return;

                    try {
                        await removePlugin(targetId);
                        showToast("Plugin uninstalled", undefined);
                    } catch (err: any) {
                        showToast(`Failed to uninstall: ${err?.message || err}`, undefined);
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
                        description: "Select an installed plugin",
                        type: 3, // STRING
                        required: true,
                        autocomplete: true,
                    },
                ],
                onAutoComplete: (args) => {
                    const focusedOption = args.find((opt: any) => opt.focused);
                    const input = focusedOption?.value || "";
                    return getPluginAutocompleteChoices(input);
                },
                execute: (args) => {
                    const targetId = args[0]?.value?.trim();
                    if (!targetId || targetId === "none") return;

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
