export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  bot?: boolean;
}

export interface DiscordEmoji {
  id: string | null;
  name: string;
}

export interface DiscordChannel {
  id: string;
  name?: string;
  guild_id?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
}

export interface IncomingMessagePayload {
  type: number;
  id: string;
  channel_id: string;
  channelId?: string;
  content: string;
  author: DiscordUser;
  mentions?: DiscordUser[];
  referenced_message?: {
    author?: DiscordUser;
  };
}

export interface IncomingReactionPayload {
  type: string;
  channel_id: string;
  channelId?: string;
  message_id: string;
  user_id: string;
  emoji: DiscordEmoji;
}

export type NotificationCategory = "mentions" | "replies" | "reactions" | "other";
export type MentionSubCategory = "people" | "bot";

export interface NotificationItem {
  id: string;
  timestamp: string;
  guildName: string;
  channelName: string;
  guildId?: string;
  channelId: string;
  messageId: string;
  category: NotificationCategory;
  subCategory?: MentionSubCategory;
  author: DiscordUser;
  content: string;
  title: string;
  emoji?: DiscordEmoji;
}

export interface LocalStorage {
  notifications: NotificationItem[];
}

