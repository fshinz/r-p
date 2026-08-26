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

// Direct store resolver checking global client spaces (Vendetta, Bunny, Revenge)
function getRawPluginsStore(): Record<string, any> {
    const w = window as any;
    return (
        w.vendetta?.plugins?.plugins ||
        w.bunny?.plugins?.plugins ||
        w.revenge?.plugins?.plugins ||
        (plugins as any)?.plugins ||
        plugins ||
        {}
    );
}

// Find key/ID by matching given query string against object keys or manifest names
function resolvePluginKey(query: string): string | null {
    if (!query || query === "none") return null;
    const store = getRawPluginsStore();
    const q = query.trim().toLowerCase();

    // 1. Exact match by ID key
    if (store[query]) return query;

    // 2. Exact match by lowercase key or manifest name
    const foundKey = Object.keys(store).find((id) => {
        const p = store[id];
        const name = p?.manifest?.name?.toLowerCase() || "";
        const key = id.toLowerCase();
        return key === q || name === q || key.includes(q) || name.includes(q);
    });

    return foundKey || null;
}

// Returns formatted choices for autocomplete dropdown menu
function getPluginAutocompleteChoices(input: string) {
    const query = input.toLowerCase().trim();
    const store = getRawPluginsStore();
    const keys = Object.keys(store);

    if (keys.length === 0) {
        return [
            {
                name: "No installed plugins found",
                displayName: "No installed plugins found",
                value: "none",
            },
        ];
    }

    return keys
        .map((id) => {
            const plugin = store[id];
            const name = plugin?.manifest?.name || id;
            return {
                name: name,
                displayName: name,
                value: id, // Pass raw store key
            };
        })
        .filter((choice) => choice.name.toLowerCase().includes(query) || choice.value.toLowerCase().includes(query))
        .slice(0, 25);
}

// Opens the plugin settings page using Modal implementation
function openPluginSettings(query: string) {
    const targetKey = resolvePluginKey(query);
    if (!targetKey) {
        showToast("Error: Plugin object not found in store", undefined);
        return;
    }

    const store = getRawPluginsStore();
    const plugin = store[targetKey];

    try {
        const SettingsComponent = getSettings(targetKey);

        if (!SettingsComponent) {
            showToast("Plugin has no settings page", undefined);
            return;
        }

        if (!Navigation || !Navigator) {
            showToast("Error: Navigation stack modules not found", undefined);
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
                    const query = args[0]?.value?.trim();
                    if (!query || query === "none") return;

                    const targetKey = resolvePluginKey(query);
                    if (!targetKey) {
                        showToast("Plugin not found in store", undefined);
                        return;
                    }

                    try {
                        await removePlugin(targetKey);
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
                    const query = args[0]?.value?.trim();
                    if (!query || query === "none") return;

                    openPluginSettings(query);
                },
            })
        );
    },

    onUnload: () => {
        unregisterCommands.forEach((unreg) => unreg());
        unregisterCommands = [];
    },
};
