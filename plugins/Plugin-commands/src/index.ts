import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, fetchPlugin } from "@vendetta/plugins";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";
import { pushModal } from "@vendetta/ui/modals";

let unregisterCommands: Array<() => void> = [];

// Helper to safely obtain the top-level native router
function getNavigation() {
    return (
        findByProps("push", "pop", "openLazy") ||
        findByProps("navigate", "push")
    );
}

// Opens the plugin's exported `settings` React Component
async function openPluginSettings(pluginId: string) {
    const plugin = plugins[pluginId];

    if (!plugin) {
        showToast("Plugin not installed or enabled", undefined);
        return;
    }

    try {
        // Fetch or resolve evaluated plugin module
        const loadedPlugin = await fetchPlugin(pluginId);
        
        // Grab default export or settings key
        const SettingsComponent = loadedPlugin?.settings || loadedPlugin?.default?.settings;

        if (!SettingsComponent) {
            showToast("This plugin has no settings UI", undefined);
            return;
        }

        const navigation = getNavigation();

        // 1. Primary Strategy: Push as a Custom Screen onto Navigation Router
        if (navigation?.push) {
            navigation.push("VendettaCustomPage", {
                title: plugin.manifest?.name || "Plugin Settings",
                render: () => React.createElement(SettingsComponent),
            });
            return;
        }

        // 2. Fallback Strategy: Render inside a Modal sheet
        pushModal({
            key: `plugin-settings-${pluginId}`,
            modal: {
                title: plugin.manifest?.name || "Plugin Settings",
                body: React.createElement(SettingsComponent),
            },
        });
    } catch (e: any) {
        showToast(`Error opening settings: ${e?.message || e}`, undefined);
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
                        description: "Direct manifest link",
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

        // 2. /plugin-uninstall [url]
        unregisterCommands.push(
            registerCommand({
                name: "plugin-uninstall",
                displayName: "plugin-uninstall",
                description: "Uninstall an installed plugin by URL or ID",
                options: [
                    {
                        name: "url",
                        displayName: "url",
                        description: "The plugin URL or ID to remove",
                        type: 3, // STRING
                        required: true,
                    },
                ],
                execute: async (args) => {
                    const target = args[0]?.value?.trim();
                    if (!target) return;

                    const matchedId = Object.keys(plugins).find(
                        (id) =>
                            id.toLowerCase() === target.toLowerCase() ||
                            plugins[id]?.manifest?.name?.toLowerCase() === target.toLowerCase()
                    );

                    if (matchedId) {
                        try {
                            await removePlugin(matchedId);
                            showToast("Plugin uninstalled", undefined);
                        } catch (err: any) {
                            showToast(`Failed to uninstall: ${err?.message || err}`, undefined);
                        }
                    } else {
                        showToast("Plugin not found in installed list", undefined);
                    }
                },
            })
        );

        // 3. /plugin-settings [plugin]
        unregisterCommands.push(
            registerCommand({
                name: "plugin-settings",
                displayName: "plugin-settings",
                description: "Open settings UI for an installed plugin",
                options: [
                    {
                        name: "plugin",
                        displayName: "plugin",
                        description: "Plugin URL or Name",
                        type: 3, // STRING
                        required: true,
                    },
                ],
                execute: async (args) => {
                    const query = args[0]?.value?.trim();
                    if (!query) return;

                    const matchedId = Object.keys(plugins).find(
                        (id) =>
                            id.toLowerCase() === query.toLowerCase() ||
                            plugins[id]?.manifest?.name?.toLowerCase() === query.toLowerCase()
                    );

                    if (matchedId) {
                        await openPluginSettings(matchedId);
                    } else {
                        showToast("No installed plugin matched that name/URL", undefined);
                    }
                },
            })
        );
    },

    onUnload: () => {
        unregisterCommands.forEach((unreg) => unreg());
        unregisterCommands = [];
    },
};
