import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import NotificationCenterUI from "./components/NotificationCenterUI";
import {
  DiscordUser,
  DiscordChannel,
  DiscordGuild,
  IncomingMessagePayload,
  IncomingReactionPayload,
  LocalStorage,
} from "./types";

interface FluxDispatcher {
  subscribe(event: string, callback: (payload: any) => void): void;
  unsubscribe(event: string, callback: (payload: any) => void): void;
}

interface UserStoreModule {
  getCurrentUser(): DiscordUser | null;
  getUser(id: string): DiscordUser | undefined;
}

interface ChannelStoreModule {
  getChannel(id: string): DiscordChannel | undefined;
}

interface GuildStoreModule {
  getGuild(id: string): DiscordGuild | undefined;
}

// Safe module resolution using findByProps/findByStoreName
const Dispatcher = findByProps("dispatch", "subscribe") as FluxDispatcher;
const UserStore = findByStoreName("UserStore") as UserStoreModule;
const ChannelStore = findByStoreName("ChannelStore") as ChannelStoreModule;
const GuildStore = findByStoreName("GuildStore") as GuildStoreModule;

const pluginStorage = storage as LocalStorage;

function processNotification(type: string, data: any): void {
  if (!UserStore) return;
  const currentUser = UserStore.getCurrentUser();
  if (!currentUser) return;

  const channelId = data.channel_id || data.channelId;
  const channel = ChannelStore?.getChannel(channelId);
  const guild = channel?.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;

  const baseNotification = {
    id: data.id || `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    guildName: guild ? guild.name : "Direct Message",
    channelName: channel?.name ? `#${channel.name}` : "DM",
    guildId: guild?.id,
    channelId: channelId,
    messageId: data.id || data.message_id,
  };

  // 1. REPLIES
  if (type === "MESSAGE_CREATE") {
    const msgData = data as IncomingMessagePayload;
    if (msgData.type === 19 && msgData.referenced_message) {
      if (msgData.referenced_message.author?.id === currentUser.id) {
        pluginStorage.notifications.unshift({
          ...baseNotification,
          category: "replies",
          author: msgData.author,
          content: msgData.content,
          title: `${msgData.author.username} replied to you`,
        });
      }
      return;
    }

    // 2. MENTIONS
    if (msgData.mentions?.some((m) => m.id === currentUser.id)) {
      const isBot = msgData.author?.bot === true;
      pluginStorage.notifications.unshift({
        ...baseNotification,
        category: "mentions",
        subCategory: isBot ? "bot" : "people",
        author: msgData.author,
        content: msgData.content,
        title: `${msgData.author.username} mentioned you`,
      });
      return;
    }
  }

  // 3. REACTIONS
  if (type === "MESSAGE_REACTION_ADD") {
    const rxnData = data as IncomingReactionPayload;
    if (rxnData.user_id !== currentUser.id) {
      const user = UserStore.getUser(rxnData.user_id);
      pluginStorage.notifications.unshift({
        ...baseNotification,
        category: "reactions",
        author: user || { id: rxnData.user_id, username: "Someone", avatar: null },
        emoji: rxnData.emoji,
        content: `Reacted with ${rxnData.emoji.name}`,
        title: `${user ? user.username : "Someone"} reacted to your message`,
      });
      return;
    }
  }
}

let handleDispatch: ((payload: any) => void) | null = null;

export const onLoad = (): void => {
  pluginStorage.notifications = pluginStorage.notifications || [];

  handleDispatch = (payload: any) => {
    if (payload && ["MESSAGE_CREATE", "MESSAGE_REACTION_ADD"].includes(payload.type)) {
      processNotification(payload.type, payload);
    }
  };

  if (Dispatcher?.subscribe) {
    Dispatcher.subscribe("MESSAGE_CREATE", handleDispatch);
    Dispatcher.subscribe("MESSAGE_REACTION_ADD", handleDispatch);
  }
};

export const onUnload = (): void => {
  if (Dispatcher?.unsubscribe && handleDispatch) {
    Dispatcher.unsubscribe("MESSAGE_CREATE", handleDispatch);
    Dispatcher.unsubscribe("MESSAGE_REACTION_ADD", handleDispatch);
  }
};

export const settings = NotificationCenterUI;
