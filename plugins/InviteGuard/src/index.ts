import { storage } from "@vendetta/plugin";
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

    patches.push(patchInviteEmbed());

    // Auto-lurk stored guilds after load
    setTimeout(() => {
      for (const gid of storage.autoLurkGuilds ?? []) {
        if (gid?.trim()) GuildActions?.joinGuild?.(gid.trim(), { lurker: true });
      }
    }, 3000);
  },

  onUnload: () => {
    for (const unpatch of patches) unpatch();
    patches = [];
  },

  settings: Settings,
};
