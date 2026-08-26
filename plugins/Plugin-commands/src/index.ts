import { plugins, getSettings } from "@vendetta/plugins";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { React } from "@vendetta/metro/common";

const Navigation = findByProps("push", "pop");

async function openPluginSettings(pluginId: string) {
    const plugin = plugins[pluginId] as any;

    if (!plugin) {
        showToast("Plugin not installed", undefined);
        return;
    }

    try {
        // Retrieve the plugin's exported settings component directly from Vendetta
        const SettingsComponent = typeof getSettings === "function" 
            ? getSettings(pluginId) 
            : null;

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
            showToast("Navigation router not found", undefined);
        }
    } catch (err: any) {
        showToast(`Failed to open settings: ${err?.message || err}`, undefined);
    }
}
