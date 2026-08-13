export type NotificationCategory =
  | "all"
  | "mentions"
  | "replies"
  | "reactions"
  | "friend_request"
  | "threads"
  | "other";

export type MentionSubCategory = "all" | "people" | "role" | "bot";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  subCategory?: MentionSubCategory;
  title: string;
  content: string;
  guildName: string;
  channelName: string;
  guildId?: string;
  channelId?: string;
  messageId?: string;
  timestamp: string;
  author?: {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
  };
}

export interface LocalStorage {
  notifications: NotificationItem[];
}
