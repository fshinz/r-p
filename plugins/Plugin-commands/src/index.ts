import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

let unregisterCommands: Array<() => void> = [];

const Navigation = findByProps("push", "pop");

// Helper to find plugin ID by matching input string against URL or Manifest Name
function findPluginId(query: string): string | null {
    const q = query.trim().toLowerCase();
    
    return Object.keys(plugins).find((id) => {
        const p = plugins[id];
        const name = p?.manifest?.name?.toLowerCase() || "";
        const url = id.toLowerCase();

        return (
            url === q ||
            name === q ||
            url.includes(q) ||
            name.includes(q)
        );
    }) || null;
}

// Opens the plugin's exported settings screen
function openPluginSettings(pluginId: string) {
    const plugin = plugins[pluginId] as any;

    if (!plugin) {
        showToast("Plugin not installed", undefined);
        return;
    }

    try {
        const SettingsComponent = typeof getSettings === "function" ? getSettings(pluginId) : null;

        if (!SettingsComponent) {
            showToast("This plugin has no settings UI", undefined);
            return;
        }

        if (Navigation?.push) {
            Navigation.push("VendettaCustomPage", {
                title: plugin.manifest?.name || "Plugin Settings",
                render: () => React.createElement(SettingsComponent),
            });
        } else {
            showToast("Navigation router not available", undefined);
        }
    } catch (err: any) {
        showToast(`Failed to open settings: ${err?.message || err}`, undefined);
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
                description: "Uninstall an installed plugin by name or URL",
                options: [
                    {
                        name: "plugin",
                        displayName: "plugin",
                        description: "Plugin Name or URL",
                        type: 3, // STRING
                        required: true,
                    },
                ],
                execute: async (args) => {
                    const query = args[0]?.value?.trim();
                    if (!query) return;

                    const targetId = findPluginId(query);

                    if (targetId) {
                        try {
                            await removePlugin(targetId);
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
                        description: "Plugin Name or URL",
                        type: 3, // STRING
                        required: true,
                    },
                ],
                execute: (args) => {
                    const query = args[0]?.value?.trim();
                    if (!query) return;

                    const targetId = findPluginId(query);

                    if (targetId) {
                        openPluginSettings(targetId);
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
