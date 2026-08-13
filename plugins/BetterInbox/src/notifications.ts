import { FluxDispatcher } from "@vendetta/metro/common";
import { findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import type { LocalStorage, MentionSubCategory, NotificationItem } from "./types";

const UserStore: any = findByStoreName("UserStore");
const ChannelStore: any = findByStoreName("ChannelStore");
const GuildStore: any = findByStoreName("GuildStore");
const MessageStore: any = findByStoreName("MessageStore");
const GuildMemberStore: any = findByStoreName("GuildMemberStore");
const RelationshipStore: any = findByStoreName("RelationshipStore");

const ACTIVITY_TYPE_CUSTOM_STATUS = 4;
const RELATIONSHIP_PENDING_INCOMING = 3;

const pluginStorage = (storage as LocalStorage) || { notifications: [] };
let memoryNotifications: NotificationItem[] = [];

const listeners = new Set<() => void>();
const lastActivitySignature = new Map<string, string>();
let saveTimeout: any = null;

function syncStorageDebounced() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    pluginStorage.notifications = memoryNotifications.slice(0, 100);
  }, 2000);
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

export function pushNotification(item: NotificationItem) {
  if (memoryNotifications.some((n) => n.id === item.id)) return;
  memoryNotifications = [item, ...memoryNotifications];
  syncStorageDebounced();
  notifyListeners();
}

export function getNotifications(): NotificationItem[] {
  return memoryNotifications;
}

export function clearAllNotifications() {
  memoryNotifications = [];
  pluginStorage.notifications = [];
  notifyListeners();
}

export function subscribeToNotifications(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Handlers
function handleIncomingMessage(payload: any) {
  try {
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) return;

    const msg = payload?.message || payload;
    if (!msg || !msg.channel_id) return;
    if (msg.author?.id === currentUser.id) return;

    const isDirectMention = msg.mentions?.some((u: any) => u.id === currentUser.id);
    const isReplyToMe = msg.referenced_message?.author?.id === currentUser.id;

    let isRoleMention = false;
    const msgRoles = msg.mention_roles || msg.mentionRoles || [];
    if (msgRoles.length > 0 && msg.guild_id) {
      const myMember = GuildMemberStore?.getMember(msg.guild_id, currentUser.id);
      const myRoles: string[] = myMember?.roles || [];
      isRoleMention = msgRoles.some((roleId: string) => myRoles.includes(roleId));
    }

    if (!isDirectMention && !isReplyToMe && !isRoleMention) return;

    const channel = ChannelStore?.getChannel(msg.channel_id);
    const guild = channel?.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;
    const author = msg.author || UserStore?.getUser(msg.author?.id);

    const isReply = isReplyToMe;
    const category = isReply ? "replies" : "mentions";
    let subCategory: MentionSubCategory = "people";

    if (author?.bot) {
      subCategory = "bot";
    } else if (isRoleMention) {
      subCategory = "role";
    }

    pushNotification({
      id: msg.id || `${Date.now()}`,
      category,
      subCategory,
      title: isReply
        ? `${author?.globalName || author?.username || "Someone"} replied to you`
        : subCategory === "role"
        ? `${author?.globalName || author?.username || "Someone"} mentioned your role`
        : `${author?.globalName || author?.username || "Someone"} mentioned you`,
      content: msg.content || "",
      guildName: guild?.name || "Direct Message",
      channelName: channel?.name ? `#${channel.name}` : "DM",
      guildId: guild?.id,
      channelId: msg.channel_id,
      messageId: msg.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      author,
    });
  } catch (err) {
    console.error("[BetterInbox] Message Handler Error:", err);
  }
}

function handleReactionAdd(payload: any) {
  try {
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) return;

    const channelId = payload.channel_id || payload.channelId;
    const targetMessageId = payload.message_id || payload.messageId;
    const reactorId = payload.user_id || payload.userId;
    if (reactorId === currentUser.id) return;

    const targetMessage = MessageStore?.getMessage(channelId, targetMessageId);
    if (targetMessage && targetMessage.author?.id !== currentUser.id) return;

    const channel = ChannelStore?.getChannel(channelId);
    const guild = channel?.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;
    const reactorUser = payload.member?.user || payload.user || UserStore?.getUser(reactorId);

    pushNotification({
      id: `react-${targetMessageId}-${reactorId}`,
      category: "reactions",
      title: `${reactorUser?.globalName || reactorUser?.username || "Someone"} reacted ${payload.emoji?.name || "an emoji"}`,
      content: targetMessage?.content ? `"${targetMessage.content}"` : `Reacted in ${channel?.name ? `#${channel.name}` : "DM"}`,
      guildName: guild?.name || "Direct Message",
      channelName: channel?.name ? `#${channel.name}` : "DM",
      guildId: guild?.id,
      channelId,
      messageId: targetMessageId,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      author: reactorUser,
    });
  } catch (err) {
    console.error("[BetterInbox] Reaction Handler Error:", err);
  }
}

function handleRelationshipAdd(payload: any) {
  try {
    const relationship = payload?.relationship;
    if (!relationship || relationship.type !== RELATIONSHIP_PENDING_INCOMING) return;
    const user = relationship.user;
    if (!user) return;

    pushNotification({
      id: `friend-request-${relationship.id}`,
      category: "friend_request",
      title: `${user.globalName || user.username} sent you a friend request`,
      content: "Pending incoming request",
      guildName: "",
      channelName: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      author: user,
    });
  } catch (err) {
    console.error("[BetterInbox] Relationship Handler Error:", err);
  }
}

function handleThreadMembersUpdate(payload: any) {
  try {
    const currentUser = UserStore?.getCurrentUser();
    if (!currentUser) return;

    const addedMembers = payload?.addedMembers;
    if (!Array.isArray(addedMembers)) return;

    const isMeAdded = addedMembers.some((m: any) => m.userId === currentUser.id);
    if (!isMeAdded) return;

    const channel = ChannelStore?.getChannel(payload.id);
    if (!channel) return;

    const guild = channel.guild_id ? GuildStore?.getGuild(channel.guild_id) : undefined;

    pushNotification({
      id: `thread-${channel.id}-${Date.now()}`,
      category: "threads",
      title: `You were added to a thread`,
      content: channel.name ? `#${channel.name}` : "Thread",
      guildName: guild?.name || "Server",
      channelName: channel.name ? `#${channel.name}` : "Thread",
      guildId: guild?.id,
      channelId: channel.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  } catch (err) {
    console.error("[BetterInbox] Thread Handler Error:", err);
  }
}

function handlePresenceUpdates(payload: any) {
  try {
    const updates = payload?.updates;
    if (!Array.isArray(updates)) return;

    const currentUser = UserStore?.getCurrentUser();
    const friendIds: string[] = RelationshipStore?.getFriendIDs?.() ?? [];

    for (const update of updates) {
      const user = update?.user;
      if (!user || user.id === currentUser?.id || user.bot || !friendIds.includes(user.id)) continue;

      const customStatus = update.activities?.find((a: any) => a?.type === ACTIVITY_TYPE_CUSTOM_STATUS);
      const statusText = customStatus?.state || "";
      const emojiName = customStatus?.emoji?.name;

      const signature = statusText || emojiName || "";
      if (lastActivitySignature.get(user.id) === signature) continue;
      lastActivitySignature.set(user.id, signature);

      if (!signature) continue;

      pushNotification({
        id: `presence-${user.id}-${Date.now()}`,
        category: "other",
        title: `${user.globalName || user.username} updated their status`,
        content: statusText || (emojiName ? `:${emojiName}:` : ""),
        guildName: "",
        channelName: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        author: user,
      });
    }
  } catch (err) {
    console.error("[BetterInbox] Presence Handler Error:", err);
  }
}

export function initNotificationEngine() {
  if (!pluginStorage.notifications) pluginStorage.notifications = [];
  memoryNotifications = [...pluginStorage.notifications];

  FluxDispatcher.subscribe("MESSAGE_CREATE", handleIncomingMessage);
  FluxDispatcher.subscribe("MESSAGE_REACTION_ADD", handleReactionAdd);
  FluxDispatcher.subscribe("RELATIONSHIP_ADD", handleRelationshipAdd);
  FluxDispatcher.subscribe("THREAD_MEMBERS_UPDATE", handleThreadMembersUpdate);
  FluxDispatcher.subscribe("PRESENCE_UPDATES", handlePresenceUpdates);
}

export function stopNotificationEngine() {
  if (saveTimeout) clearTimeout(saveTimeout);
  pluginStorage.notifications = memoryNotifications.slice(0, 100);

  FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleIncomingMessage);
  FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD", handleReactionAdd);
  FluxDispatcher.unsubscribe("RELATIONSHIP_ADD", handleRelationshipAdd);
  FluxDispatcher.unsubscribe("THREAD_MEMBERS_UPDATE", handleThreadMembersUpdate);
  FluxDispatcher.unsubscribe("PRESENCE_UPDATES", handlePresenceUpdates);
}
