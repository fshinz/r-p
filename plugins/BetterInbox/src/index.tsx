import { FluxDispatcher } from "@vendetta/metro/common";
import { findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import type { LocalStorage, NotificationItem } from "./types";
import NotificationCenterUI from "./components/NotificationCenterUI";
import { patchYouBar } from "./youbar";

// Retrieve Discord Stores safely
const UserStore: any = findByStoreName("UserStore");
const ChannelStore: any = findByStoreName("ChannelStore");
const GuildStore: any = findByStoreName("GuildStore");
const MessageStore: any = findByStoreName("MessageStore");

const pluginStorage = (storage as LocalStorage) || { notifications: [] };

// Array to track active unpatch functions
const unpatches: (() => void)[] = [];

function processNotification(type: string, payload: any): void {
  try {
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) return;

    // Handle both wrapped payload.message and direct payload
    const msg = payload.message || payload;
    const author = msg?.author;

    // Ignore self actions
    if (author?.id === currentUser.id || payload.user_id === currentUser.id) return;

    const channelId = msg?.channel_id || msg?.channelId || payload.channel_id;
    const channel = ChannelStore?.getChannel(channelId);
    const guild = channel?.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;

    const guildName = guild?.name || (channel?.isGroupDM() ? "Group DM" : "Direct Message");
    const channelName = channel?.name ? `#${channel.name}` : "DM";
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!Array.isArray(pluginStorage.notifications)) {
      pluginStorage.notifications = [];
    }

    // -------------------------------------------------------------
    // 1. MESSAGE CREATION (Mentions & Replies)
    // -------------------------------------------------------------
    if (type === "MESSAGE_CREATE") {
      if (!msg) return;

      // REPLIES (Message type 19 or referenced_message)
      const isReply =
        msg.type === 19 &&
        (msg.referenced_message?.author?.id === currentUser.id ||
         msg.messageReference?.message_id);

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

      // MENTIONS: Bulletproof check across all Discord mention formats
      const mentionsArray = Array.isArray(msg.mentions) ? msg.mentions : [];

      const isExplicitlyMentioned =
        msg.mentioned === true ||
        payload.mentioned === true ||
        mentionsArray.some((m: any) =>
          typeof m === "string" ? m === currentUser.id : m?.id === currentUser.id
        );

      // Check raw content string as fallback (<@USER_ID> or <@!USER_ID>)
      const isContentMentioned =
        typeof msg.content === "string" &&
        (msg.content.includes(`<@${currentUser.id}>`) ||
         msg.content.includes(`<@!${currentUser.id}>`));

      const isEveryoneMention = msg.mentionEveryone || msg.mention_everyone;

      if (isExplicitlyMentioned || isContentMentioned || isEveryoneMention) {
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

    // -------------------------------------------------------------
    // 2. REACTION ADD (Your messages only + Full Avatar support)
    // -------------------------------------------------------------
    if (type === "MESSAGE_REACTION_ADD") {
      const targetMessageId = payload.message_id || payload.messageId;
      const reactorId = payload.user_id || payload.userId;

      // 1. Ignore if YOU reacted to a message
      if (reactorId === currentUser.id) return;

      // 2. Fetch target message from MessageStore
      const targetMessage = MessageStore?.getMessage(channelId, targetMessageId);

      // STRICT FILTER: If the message exists in cache and isn't yours, ignore!
      if (targetMessage && targetMessage.author?.id !== currentUser.id) {
        return;
      }

      // 3. Extract the reactor's full User Object (payload -> UserStore fallback)
      const reactorUser =
        payload.member?.user ||
        payload.user ||
        UserStore?.getUser(reactorId);

      const finalAuthor = reactorUser || {
        id: reactorId,
        username: payload.member?.nick || "Someone",
        globalName: payload.member?.nick || "Someone",
        avatar: null,
      };

      const reactorName =
        finalAuthor.globalName ||
        finalAuthor.username ||
        "Someone";

      const emoji = payload.emoji;
      const emojiName = emoji?.name || "an emoji";

      console.log("[BetterInbox] Caught Reaction on your message from", reactorName);

      pluginStorage.notifications = [
        {
          id: `${targetMessageId}-${reactorId}-${Date.now()}`,
          category: "reactions",
          title: `${reactorName} reacted ${emojiName}`,
          content: targetMessage?.content ? `"${targetMessage.content}"` : `Reacted to your message in ${channelName}`,
          guildName,
          channelName,
          guildId: guild?.id,
          channelId,
          messageId: targetMessageId,
          timestamp,
          author: finalAuthor,
        },
        ...pluginStorage.notifications,
      ];
    }
  } catch (err) {
    console.error("[BetterInbox] Listener error:", err);
  }
}

const handleMessageCreate = (payload: any) => processNotification("MESSAGE_CREATE", payload);
const handleReactionAdd = (payload: any) => processNotification("MESSAGE_REACTION_ADD", payload);

export default {
  onLoad: () => {
    console.log("[BetterInbox] Loaded successfully");

    if (!pluginStorage.notifications) {
      pluginStorage.notifications = [];
    }

    // Subscribe to Flux events
    FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
    FluxDispatcher.subscribe("MESSAGE_REACTION_ADD", handleReactionAdd);

    // Patch YouBar bell icon
    try {
      unpatches.push(patchYouBar());
    } catch (err) {
      console.error("[BetterInbox] Failed to patch YouBar:", err);
    }
  },

  onUnload: () => {
    console.log("[BetterInbox] Unloaded");

    // Unsubscribe from events
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
    FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD", handleReactionAdd);

    // Clean up patches
    for (const unpatch of unpatches) {
      unpatch?.();
    }
    unpatches.length = 0;
  },

  settings: NotificationCenterUI,
};
