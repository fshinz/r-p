import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findByProps } from "@vendetta/metro";
import patchInviteEmbed from "./patches/InviteEmbedButton";
import Settings from "./Settings";

let patches: (() => void)[] = [];

export default {
  onLoad: () => {
    // Init defaults
    storage.showJoinButton ??= true;
    storage.showLurkButton ??= true;
    storage.showInfoButton ??= true;
    storage.showBlockButton ??= true;
    storage.autoLurkGuilds ??= [];
    storage.blockedInvites ??= [];

    // Patch the invite embed component
    patches.push(patchInviteEmbed());

    // Auto-lurk stored guilds after load
    setTimeout(() => {
      const GuildActions = findByProps("joinGuild", "acceptInvite");
      if (!GuildActions) return;
      for (const gid of storage.autoLurkGuilds ?? []) {
        if (gid?.trim()) {
          GuildActions.joinGuild?.(gid.trim(), { lurker: true }).catch(() => {});
        }
      }
      showToast("InviteGuard loaded", getAssetIDByName("Check"));
    }, 3000);
  },

  onUnload: () => {
    for (const unpatch of patches) unpatch();
    patches = [];
  },

  settings: Settings,
};