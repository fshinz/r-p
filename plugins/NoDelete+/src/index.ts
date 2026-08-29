import { findByStoreName, findByProps } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";
import { patchEditStyling } from "./patches/editStyling";
import { patchRowStyling } from "./patches/rowStyling";

let MessageStore: any;
let AuthStore: any;
let ChannelStore: any;
const ChannelMessages = findByProps("_channelMessages");
const patches: (() => void)[] = [];

// Track message snapshots mapped by ID
const messageMap = new Map<string, any>();
const deletedIds = new Set<string>(); 
const editMap = new Map<string, string[]>();

const MAX_CACHE_SIZE = 500;
storage.ignore ??= { users: [], bots: false, ownMessages: false };

function enforceCacheLimits() {
  while (messageMap.size > MAX_CACHE_SIZE) {
    const oldestKey = messageMap.keys().next().value;
    if (oldestKey === undefined) break;
    messageMap.delete(oldestKey);
  }
  while (deletedIds.size > MAX_CACHE_SIZE) {
    const oldestKey = deletedIds.values().next().value;
    if (oldestKey === undefined) break;
    deletedIds.delete(oldestKey);
  }
}

function cloneSnapshot(msg: any) {
  if (!msg) return null;
  return {
    ...msg,
    content: msg.content || "",
    embeds: Array.isArray(msg.embeds) ? JSON.parse(JSON.stringify(msg.embeds)) : [],
    attachments: Array.isArray(msg.attachments) ? JSON.parse(JSON.stringify(msg.attachments)) : [],
    components: Array.isArray(msg.components) ? JSON.parse(JSON.stringify(msg.components)) : [],
    sticker_items: msg.sticker_items || msg.stickerItems || [],
  };
}

function keepDeletedInStore(channelId: string, msg: any) {
  if (!ChannelMessages || !channelId || !msg) return;
  try {
    const record = ChannelMessages.get(channelId);
    if (!record) return;
    
    // Force native ChannelMessages collection to accept the restored snapshot
    const updatedRecord = record.receiveMessage(msg);
    ChannelMessages.commit(updatedRecord);
  } catch (e) {
    console.error("[MessageLogger] Re-injection failed:", e);
  }
}

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");
      AuthStore = findByStoreName("AuthenticationStore") || findByProps("getToken");
      ChannelStore = findByStoreName("ChannelStore");

      const getCurrentUserId = () =>
        AuthStore?.getCurrentUser?.()?.id ||
        AuthStore?.getId?.() ||
        MessageStore?.getCurrentUser?.()?.id;

      // 1. Capture ALL incoming/updated messages into our persistent snapshot map
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (!event?.type) return;

          if (event.type === "MESSAGE_CREATE" || event.type === "LOAD_MESSAGES_SUCCESS") {
            const msgs = event.messages ? event.messages : [event.message];
            for (const msg of msgs) {
              if (msg?.id) {
                messageMap.set(msg.id, cloneSnapshot(msg));
              }
            }
            enforceCacheLimits();
          }
        })
      );

      // 2. Intercept SINGLE Deletions BEFORE the store clears the record
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          const { channelId, id } = event;
          if (!id || !channelId) return;

          const currentUserId = getCurrentUserId();
          const targetMsg = messageMap.get(id) || MessageStore?.getMessage(channelId, id);
          if (!targetMsg) return;

          if (storage.ignore?.users?.includes(targetMsg.author?.id)) return;
          if (storage.ignore?.bots && (targetMsg.author?.bot || targetMsg.author?.isNonUserBot?.())) return;
          if (storage.ignore?.ownMessages && targetMsg.author?.id === currentUserId) return;

          // Flag ID as deleted for row styling
          deletedIds.add(id);
          const snapshot = cloneSnapshot(targetMsg);
          messageMap.set(id, snapshot);

          // Force-inject back into Discord's row manager
          setTimeout(() => keepDeletedInStore(channelId, snapshot), 0);
        })
      );

      // 3. Intercept BULK Deletions
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          const { channelId, ids } = event;
          if (!ids?.length || !channelId) return;

          const currentUserId = getCurrentUserId();
          for (const id of ids) {
            const targetMsg = messageMap.get(id) || MessageStore?.getMessage(channelId, id);
            if (!targetMsg) continue;

            if (storage.ignore?.users?.includes(targetMsg.author?.id)) continue;
            if (storage.ignore?.bots && (targetMsg.author?.bot || targetMsg.author?.isNonUserBot?.())) continue;
            if (storage.ignore?.ownMessages && targetMsg.author?.id === currentUserId) continue;

            deletedIds.add(id);
            const snapshot = cloneSnapshot(targetMsg);
            messageMap.set(id, snapshot);

            setTimeout(() => keepDeletedInStore(channelId, snapshot), 0);
          }
          enforceCacheLimits();
        })
      );

      // 4. Preserve Embeds / Attachments on Message Edits
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE" || !event?.message?.id) return;
          
          const newMsg = event.message;
          const currentUserId = getCurrentUserId();
          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id) || messageMap.get(newMsg.id);

          if (oldMsg) {
            if (oldMsg.embeds?.length && !newMsg.embeds?.length) {
              newMsg.embeds = JSON.parse(JSON.stringify(oldMsg.embeds));
            }
            if (oldMsg.attachments?.length && !newMsg.attachments?.length) {
              newMsg.attachments = JSON.parse(JSON.stringify(oldMsg.attachments));
            }
          }

          if (!newMsg.content || !oldMsg?.content || oldMsg.content === newMsg.content) return;
          if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
          if (storage.ignore?.ownMessages && newMsg.author?.id === currentUserId) return;

          let history = editMap.get(newMsg.id) || [];
          if (history.length === 0 || history[history.length - 1] !== oldMsg.content) {
            history.push(oldMsg.content);
          }
          if (history.length > 5) history = history.slice(-5);
          editMap.set(newMsg.id, history);
        })
      );

      patches.push(patchRowStyling(deletedIds, editMap));
      patches.push(patchEditStyling(editMap));
      patches.push(patchContextMenu());

      showToast("Message Logger loaded", getAssetIDByName("Check"));
    } catch (e) {
      console.error("[MessageLogger] Load error:", e);
    }
  },

  onUnload() {
    for (const unpatch of patches) unpatch();
    patches.length = 0;
    messageMap.clear();
    deletedIds.clear();
    editMap.clear();
  },
  settings: Settings,
};
