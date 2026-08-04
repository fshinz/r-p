import { storage } from "@vendetta/plugin";
import { FluxDispatcher, UserStore, ChannelStore, GuildStore } from "@vendetta/metro/common";
import NotificationCenterUI from "./components/NotificationCenterUI";
import { LocalStorage } from "./types";

const pluginStorage = storage as LocalStorage;

function processNotification(type: string, data: any): void {
  try {
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) {
      console.log("[BetterInbox] Current user not loaded yet.");
      return;
    }

    // Ignore self messages
    if (data.author?.id === currentUser.id || data.user_id === currentUser.id) {
      return;
    }

    const channelId = data.channel_id || data.channelId;
    const channel = ChannelStore?.getChannel(channelId);
    const guild = channel?.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;

    const guildName = guild?.name || (channel?.isGroupDM() ? "Group DM" : "Direct Message");
    const channelName = channel?.name ? `#${channel.name}` : "DM";

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Ensure array exists
    if (!Array.isArray(pluginStorage.notifications)) {
      pluginStorage.notifications = [];
    }

    // 1. MESSAGE CREATION (Mentions & Replies)
    if (type === "MESSAGE_CREATE") {
      const isReply = data.type === 19 && data.referenced_message?.author?.id === currentUser.id;
      const isMention = data.mentions?.some((m: any) => m.id === currentUser.id) || data.mention_everyone;

      if (isReply) {
        console.log("[BetterInbox] Caught Reply from", data.author?.username);
        pluginStorage.notifications = [
          {
            id: data.id || `${Date.now()}`,
            category: "replies",
            title: `${data.author?.username || "Someone"} replied to you`,
            content: data.content || "",
            guildName,
            channelName,
            guildId: guild?.id,
            channelId,
            messageId: data.id,
            timestamp,
            author: data.author,
          },
          ...pluginStorage.notifications,
        ];
        return;
      }

      if (isMention) {
        console.log("[BetterInbox] Caught Mention from", data.author?.username);
        const isBot = Boolean(data.author?.bot);
        pluginStorage.notifications = [
          {
            id: data.id || `${Date.now()}`,
            category: "mentions",
            subCategory: isBot ? "bot" : "people",
            title: `${data.author?.username || "Someone"} mentioned you`,
            content: data.content || "",
            guildName,
            channelName,
            guildId: guild?.id,
            channelId,
            messageId: data.id,
            timestamp,
            author: data.author,
          },
          ...pluginStorage.notifications,
        ];
        return;
      }
    }

    // 2. REACTION ADD
    if (type === "MESSAGE_REACTION_ADD") {
      console.log("[BetterInbox] Caught Reaction on message", data.message_id);
      const user = UserStore?.getUser(data.user_id);
      const username = user?.username || "Someone";

      pluginStorage.notifications = [
        {
          id: `${data.message_id}-${Date.now()}`,
          category: "reactions",
          title: `${username} reacted with ${data.emoji?.name || "an emoji"}`,
          content: `Reacted in ${channelName}`,
          guildName,
          channelName,
          guildId: guild?.id,
          channelId,
          messageId: data.message_id,
          timestamp,
          author: user || { id: data.user_id, username, avatar: null },
        },
        ...pluginStorage.notifications,
      ];
    }
  } catch (err) {
    console.error("[BetterInbox] Error processing dispatcher event:", err);
  }
}

let handleDispatch: ((payload: any) => void) | null = null;

export const onLoad = (): void => {
  if (!Array.isArray(pluginStorage.notifications)) {
    pluginStorage.notifications = [];
  }

  handleDispatch = (payload: any) => {
    if (payload && ["MESSAGE_CREATE", "MESSAGE_REACTION_ADD"].includes(payload.type)) {
      processNotification(payload.type, payload);
    }
  };

  if (FluxDispatcher?.subscribe) {
    FluxDispatcher.subscribe("MESSAGE_CREATE", handleDispatch);
    FluxDispatcher.subscribe("MESSAGE_REACTION_ADD", handleDispatch);
  }
};

export const onUnload = (): void => {
  if (FluxDispatcher?.unsubscribe && handleDispatch) {
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleDispatch);
    FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD", handleDispatch);
  }
};

export const settings = NotificationCenterUI;
