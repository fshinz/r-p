import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React, NavigationNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

let unregisterCommands: Array<() => void> = [];

// Locate the app's actual navigation stack dispatcher (pushPage / push)
const router = 
    findByProps("pushPage", "popPage") || 
    findByProps("push", "pop", "openLazy") ||
    findByProps("push", "popToTop");

// Locate the screen wrapper components
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
    const plugin = plugins[pluginId] as any;
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

        const title = plugin.manifest?.name || "Plugin Settings";

        // Strategy 1: Modern pushPage dispatcher (ShiggyCord / standard client routes)
        if (typeof router?.pushPage === "function") {
            router.pushPage(() => <SettingsComponent />, { title });
            return;
        }

        // Strategy 2: Legacy push with Navigator wrapper
        if (typeof router?.push === "function" && Navigator) {
            router.push(() => (
                <Navigator
                    initialRouteName="PluginSettingsView"
                    goBackOnBackPress
                    screens={{
                        PluginSettingsView: {
                            title,
                            headerLeft: modalCloseButton?.(() => {
                                if (typeof router?.pop === "function") router.pop();
                            }),
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
            return;
        }

        // Strategy 3: Standard NavigationNative action dispatch fallback
        if (NavigationNative?.useNavigation) {
            showToast("Opening settings via screen stack...", undefined);
            if (typeof router?.push === "function") {
                router.push(SettingsComponent);
                return;
            }
        }

        showToast("Error: Could not locate a valid page router", undefined);
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
