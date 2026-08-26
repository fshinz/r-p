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

// Safely pull option input from raw auto-complete arguments
function getFocusedInputValue(args: any): string {
    if (!args) return "";
    
    // Check array or object payload formats passed by mobile patchers
    const options = Array.isArray(args) ? args : args.options || [];
    const focusedOpt = options.find((opt: any) => opt.focused) || options[0];
    
    return typeof focusedOpt?.value === "string" ? focusedOpt.value : "";
}

// Generate autocomplete items using identical store extraction from your list script
function getPluginChoices(query: string) {
    if (!plugins || typeof plugins !== "object") {
        return [{ name: "No plugins available", value: "none" }];
    }

    const q = query.toLowerCase().trim();
    const pluginEntries = Object.entries(plugins);

    if (pluginEntries.length === 0) {
        return [{ name: "No plugins installed", value: "none" }];
    }

    const choices: Array<{ name: string; value: string }> = [];

    for (const [id, plugin] of pluginEntries) {
        if (!plugin || typeof plugin !== "object") continue;

        // Use plugin.id or key ID directly
        const pluginId = plugin.id || id;
        const name = plugin.manifest?.name || "Unknown Plugin";
        const status = plugin.enabled ? "✅" : "❌";
        
        const displayName = `${status} ${name}`;

        // Filter based on input query
        if (!q || name.toLowerCase().includes(q) || pluginId.toLowerCase().includes(q)) {
            choices.push({
                name: displayName,
                value: pluginId, // Exact store key
            });
        }
    }

    if (choices.length === 0) {
        return [{ name: "No matching plugins found", value: "none" }];
    }

    return choices.slice(0, 25);
}

// Resolve plugin object securely from store during command execution
function findPluginInStore(keyOrUrl: string) {
    if (!keyOrUrl || keyOrUrl === "none" || !plugins) return null;

    // Direct key lookup
    if (plugins[keyOrUrl]) {
        return { id: keyOrUrl, instance: plugins[keyOrUrl] };
    }

    // Match by plugin.id property or manifest name fallback
    const match = Object.entries(plugins).find(([id, p]: [string, any]) => {
        return (
            id === keyOrUrl ||
            p?.id === keyOrUrl ||
            p?.manifest?.name?.toLowerCase() === keyOrUrl.toLowerCase()
        );
    });

    return match ? { id: match[0], instance: match[1] } : null;
}

// Open settings modal safely on submit
function openPluginSettings(targetKey: string) {
    const matched = findPluginInStore(targetKey);

    if (!matched) {
        showToast("Error: Plugin object not found in store", undefined);
        return;
    }

    const { id: pluginId, instance: plugin } = matched;

    try {
        const SettingsComponent = getSettings(pluginId);

        if (!SettingsComponent) {
            showToast(`${plugin?.manifest?.name || "Plugin"} has no settings page`, undefined);
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
                                console.error("[PluginSettings] Render error:", renderErr);
                                showToast(`Render error: ${renderErr?.message || renderErr}`, undefined);
                                return null;
                            }
                        },
                    },
                },
            })
        );
    } catch (err: any) {
        console.error("[PluginSettings] Exception:", err);
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
                    const inputValue = getFocusedInputValue(args);
                    return getPluginChoices(inputValue);
                },
                execute: async (args) => {
                    const query = args[0]?.value?.trim();
                    if (!query || query === "none") return;

                    const matched = findPluginInStore(query);
                    if (!matched) {
                        showToast("Error: Plugin object not found in store", undefined);
                        return;
                    }

                    try {
                        await removePlugin(matched.id);
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
                    const inputValue = getFocusedInputValue(args);
                    return getPluginChoices(inputValue);
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
