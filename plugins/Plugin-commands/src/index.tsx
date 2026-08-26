import { registerCommand } from "@vendetta/commands";
import { installPlugin, removePlugin, plugins, getSettings } from "@vendetta/plugins";
import { findByProps, findByName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { alerts } from "@vendetta/ui";
import { React } from "@vendetta/metro/common";

let unregisterCommands: Array<() => void> = [];

// Resolve Navigation & Clyde/Message modules using safe fallbacks
const Navigation = findByProps("push", "pushLazy", "pop");
const Navigator = findByName("Navigator") ?? findByProps("Navigator")?.Navigator;
const modalCloseButton =
    findByProps("getRenderCloseButton")?.getRenderCloseButton ??
    findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

const Clyde = findByProps("sendBotMessage");

// Safely iterate plugins using standard Object.values (as in your snippet)
function getPluginList() {
    if (!plugins || typeof plugins !== "object") return [];
    
    return Object.values(plugins).filter(
        (p) => p && typeof p === "object" && p.id
    );
}

// Safely format authors list
function formatAuthors(authors: any): string {
    if (!authors) return "Unknown";
    if (!Array.isArray(authors)) return "Unknown";
    return (
        authors
            .filter((a) => a && (typeof a === "string" || a.name))
            .map((a) => (typeof a === "string" ? a : a.name || "Unknown"))
            .join(", ") || "Unknown"
    );
}

// Open settings modal safely
function openSettingsForPlugin(pluginId: string, pluginName: string) {
    try {
        const SettingsComponent = getSettings(pluginId);

        if (!SettingsComponent) {
            showToast(`${pluginName} has no settings page`, undefined);
            return;
        }

        if (!Navigation || !Navigator) {
            showToast("Navigation stack missing", undefined);
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
                description: "Install a plugin directly from a manifest URL",
                options: [
                    {
                        name: "url",
                        displayName: "url",
                        description: "Direct manifest link or GitHub repo URL",
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

        // 2. /plugin-uninstall (Shows installed list / prompt)
        unregisterCommands.push(
            registerCommand({
                name: "plugin-uninstall",
                displayName: "plugin-uninstall",
                description: "Uninstall an installed plugin",
                options: [
                    {
                        name: "name",
                        displayName: "name",
                        description: "Name or URL of the plugin to uninstall (leave blank to search)",
                        type: 3, // STRING
                        required: false,
                    },
                ],
                execute: async (args, ctx) => {
                    const input = args[0]?.value?.trim().toLowerCase();
                    const allPlugins = getPluginList();

                    if (allPlugins.length === 0) {
                        Clyde?.sendBotMessage(ctx.channel.id, "No plugins are currently installed.");
                        return;
                    }

                    // Direct match if query provided
                    if (input) {
                        const target = allPlugins.find(
                            (p) =>
                                p.id.toLowerCase() === input ||
                                p.manifest?.name?.toLowerCase().includes(input)
                        );

                        if (!target) {
                            showToast("Plugin not found", undefined);
                            return;
                        }

                        try {
                            await removePlugin(target.id);
                            showToast(`Uninstalled ${target.manifest?.name || "plugin"}`, undefined);
                        } catch (err: any) {
                            showToast(`Failed: ${err?.message || err}`, undefined);
                        }
                        return;
                    }

                    // If no query, print clean interactive list to channel
                    const listLines = [
                        "**Installed Plugins (Copy ID to uninstall):**\n",
                        ...allPlugins.map((p) => {
                            const name = p.manifest?.name || "Unknown";
                            const status = p.enabled ? "✅" : "❌";
                            return `> ${status} **${name}** — \`${p.id}\``;
                        }),
                    ];

                    Clyde?.sendBotMessage(ctx.channel.id, listLines.join("\n"));
                },
            })
        );

        // 3. /plugin-settings
        unregisterCommands.push(
            registerCommand({
                name: "plugin-settings",
                displayName: "plugin-settings",
                description: "Open settings for an installed plugin",
                options: [
                    {
                        name: "name",
                        displayName: "name",
                        description: "Plugin name or URL (leave blank to show list)",
                        type: 3, // STRING
                        required: false,
                    },
                ],
                execute: (args, ctx) => {
                    const input = args[0]?.value?.trim().toLowerCase();
                    const allPlugins = getPluginList();

                    if (allPlugins.length === 0) {
                        Clyde?.sendBotMessage(ctx.channel.id, "No plugins installed.");
                        return;
                    }

                    if (input) {
                        const target = allPlugins.find(
                            (p) =>
                                p.id.toLowerCase() === input ||
                                p.manifest?.name?.toLowerCase().includes(input)
                        );

                        if (!target) {
                            showToast("Plugin not found", undefined);
                            return;
                        }

                        openSettingsForPlugin(target.id, target.manifest?.name || "Plugin Settings");
                        return;
                    }

                    // Print quick settings menu choices to Clyde
                    const listLines = [
                        "**Plugins with Settings Pages:**\n",
                        ...allPlugins.map((p) => {
                            const name = p.manifest?.name || "Unknown";
                            return `> **${name}**: Type \`/plugin-settings ${name}\``;
                        }),
                    ];

                    Clyde?.sendBotMessage(ctx.channel.id, listLines.join("\n"));
                },
            })
        );
    },

    onUnload: () => {
        unregisterCommands.forEach((unreg) => unreg());
        unregisterCommands = [];
    },
};
