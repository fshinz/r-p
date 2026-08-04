import { FluxDispatcher } from "@vendetta/metro/common";
import { findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { LocalStorage } from "./types";
import NotificationCenterUI from "./components/NotificationCenterUI";

// Retrieve Discord Stores safely
const UserStore: any = findByStoreName("UserStore");
const ChannelStore: any = findByStoreName("ChannelStore");
const GuildStore: any = findByStoreName("GuildStore");

const pluginStorage = (storage as LocalStorage) || { notifications: [] };

function processNotification(type: string, payload: any): void {
  try {
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) return;

    // Handle both wrapped payload.message and direct payload
    const msg = payload.message || payload;
    const author = msg.author;

    // Ignore self messages
    if (author?.id === currentUser.id || payload.user_id === currentUser.id) return;

    const channelId = msg.channel_id || msg.channelId;
    const channel = ChannelStore?.getChannel(channelId);
    const guild = channel?.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;

    const guildName = guild?.name || (channel?.isGroupDM() ? "Group DM" : "Direct Message");
    const channelName = channel?.name ? `#${channel.name}` : "DM";
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!Array.isArray(pluginStorage.notifications)) {
      pluginStorage.notifications = [];
    }

    if (type === "MESSAGE_CREATE") {
      // 1. REPLIES (Message type 19)
      const isReply = msg.type === 19 && msg.referenced_message?.author?.id === currentUser.id;

      if (isReply) {
        console.log("[BetterInbox] Caught Reply from", author?.globalName || author?.username);
        pluginStorage.notifications = [
          {
            id: msg.id || `${Date.now()}`,
            category: "replies",
            title: `${author?.globalName || author?.username || "Someone"} replied to you`,
            content: msg.content || "",
            guildName,
            channelName,
            guildId: guild?.id,
            channelId,
            messageId: msg.id,
            timestamp,
            author,
          },
          ...pluginStorage.notifications,
        ];
        return;
      }

      // 2. MENTIONS (Check msg.mentioned boolean or array of string IDs)
      const isDirectMention =
        msg.mentioned === true ||
        (Array.isArray(msg.mentions) &&
          msg.mentions.some((m: any) => (typeof m === "string" ? m === currentUser.id : m?.id === currentUser.id)));

      const isEveryoneMention = msg.mentionEveryone || msg.mention_everyone;

      if (isDirectMention || isEveryoneMention) {
        console.log("[BetterInbox] Caught Mention from", author?.globalName || author?.username);
        const isBot = Boolean(author?.bot);
        pluginStorage.notifications = [
          {
            id: msg.id || `${Date.now()}`,
            category: "mentions",
            subCategory: isBot ? "bot" : "people",
            title: `${author?.globalName || author?.username || "Someone"} mentioned you`,
            content: msg.content || "",
            guildName,
            channelName,
            guildId: guild?.id,
            channelId,
            messageId: msg.id,
            timestamp,
            author,
          },
          ...pluginStorage.notifications,
        ];
        return;
      }
    }

    // 3. REACTION ADD
    if (type === "MESSAGE_REACTION_ADD") {
      const user = UserStore?.getUser(payload.user_id);
      const username = user?.globalName || user?.username || "Someone";

      pluginStorage.notifications = [
        {
          id: `${payload.message_id}-${Date.now()}`,
          category: "reactions",
          title: `${username} reacted with ${payload.emoji?.name || "an emoji"}`,
          content: `Reacted in ${channelName}`,
          guildName,
          channelName,
          guildId: guild?.id,
          channelId: payload.channel_id,
          messageId: payload.message_id,
          timestamp,
          author: user || { id: payload.user_id, username, avatar: null },
        },
        ...pluginStorage.notifications,
      ];
    }
  } catch (err) {
    console.error("[BetterInbox] Listener error:", err);
  }
}

// Global dispatcher handlers
const handleMessageCreate = (payload: any) => processNotification("MESSAGE_CREATE", payload);
const handleReactionAdd = (payload: any) => processNotification("MESSAGE_REACTION_ADD", payload);

export default {
  onLoad: () => {
    console.log("[BetterInbox] Loaded successfully");

    // Initialize notification storage if empty
    if (!pluginStorage.notifications) {
      pluginStorage.notifications = [];
    }

    // Subscribe to Discord Gateway events
    FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
    FluxDispatcher.subscribe("MESSAGE_REACTION_ADD", handleReactionAdd);
  },
  onUnload: () => {
    console.log("[BetterInbox] Unloaded");

    // Clean up subscriptions to prevent memory leaks
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
    FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD", handleReactionAdd);
  },
  settings: NotificationCenterUI,
};
