import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React, NavigationNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

let unregisterCommands: Array<() => void> = [];

// 1. Target unique React Navigation router methods (avoids UIManager collision)
const Navigation = findByProps("push", "replace", "popToTop") || findByProps("push", "goBack");

// 2. Fetch the Navigator and header close button correctly
const Navigator = findByProps("Navigator")?.Navigator;
const modalCloseButton =
    findByProps("getRenderCloseButton")?.getRenderCloseButton ??
    findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

// Helper to find plugin ID by matching input string against URL or Manifest Name
function findPluginId(query: string): string | null {
    const q = query.trim().toLowerCase();

    return (
        Object.keys(plugins).find((id) => {
            const p = plugins[id];
            const name = p?.manifest?.name?.toLowerCase() || "";
            const url = id.toLowerCase();

            return url === q || name === q || url.includes(q) || name.includes(q);
        }) || null
    );
}

// Opens the plugin's exported settings screen safely
function openPluginSettings(pluginId: string) {
    console.log("[PluginCommands] Starting openPluginSettings for ID:", pluginId);

    const plugin = plugins[pluginId] as any;
    if (!plugin) {
        showToast("Error: Plugin object not found in store", undefined);
        return;
    }

    try {
        const SettingsComponent = getSettings(pluginId);
        console.log("[PluginCommands] getSettings output:", SettingsComponent);

        if (!SettingsComponent) {
            showToast("Plugin has no settings page", undefined);
            return;
        }

        if (!Navigation?.push) {
            showToast("Error: Navigation router missing", undefined);
            return;
        }

        // Fallback: If custom Navigator wrapper fails, push directly via standard navigation tree
        if (Navigator) {
            Navigation.push(() => (
                <Navigator
                    initialRouteName="PluginSettingsView"
                    goBackOnBackPress
                    screens={{
                        PluginSettingsView: {
                            title: plugin.manifest?.name || "Plugin Settings",
                            headerLeft: modalCloseButton?.(() => Navigation.pop()),
                            render: () => {
                                try {
                                    return <SettingsComponent />;
                                } catch (renderErr: any) {
                                    console.error("[PluginCommands] Render error inside settings:", renderErr);
                                    showToast(`Render error: ${renderErr?.message || renderErr}`, undefined);
                                    return null;
                                }
                            },
                        },
                    }}
                />
            ));
        } else {
            // Direct push fallback using React Navigation container
            Navigation.push(SettingsComponent, {
                title: plugin.manifest?.name || "Plugin Settings",
            });
        }
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
                description: "Open settings for an installed plugin",
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
