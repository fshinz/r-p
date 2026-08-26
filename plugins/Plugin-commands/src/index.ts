import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, fetchPlugin } from "@vendetta/plugins";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

let unregisterCommands: Array<() => void> = [];

// Helper to resolve navigation modules across client builds
function getNavigation() {
    return (
        findByProps("push", "pop", "openLazy") ||
        findByProps("navigate", "push")
    );
}

// Opens a plugin's settings view programmatically
async function openPluginSettings(pluginId: string) {
    const plugin = plugins[pluginId];

    if (!plugin) {
        showToast("Plugin not installed or enabled", undefined);
        return;
    }

    try {
        // Fetch/evaluate the plugin manifest and exports if not already present
        const loadedPlugin = await fetchPlugin(pluginId);
        const SettingsView = loadedPlugin?.settings;

        if (!SettingsView) {
            showToast("This plugin has no settings UI", undefined);
            return;
        }

        const navigation = getNavigation();

        if (navigation?.push) {
            // Push directly onto Discord's native navigation stack
            navigation.push("VendettaCustomPage", {
                title: plugin.manifest.name || "Plugin Settings",
                render: () => React.createElement(SettingsView),
            });
        } else {
            showToast("Failed to locate navigation router", undefined);
        }
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
                        description: "Direct manifest link (e.g. https://example.com/plugin/)",
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

                    // Match exact URL/ID or search by manifest plugin name
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

        // 3. /plugin-settings [url_or_name]
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
