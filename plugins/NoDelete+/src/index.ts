import { findByStoreName, findByProps } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore, after as patchAfter } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";
import { patchEditStyling } from "./patches/editStyling";
import { patchRowStyling } from "./patches/rowStyling";

let MessageStore: any;
let AuthStore: any;
const ChannelMessages = findByProps("_channelMessages");
const patches: (() => void)[] = [];

// Separate live tracking from actually deleted messages
const liveCache = new Map<string, any>();
const deletedIds = new Set<string>(); 
const editMap = new Map<string, string[]>();

const MAX_CACHE_SIZE = 300;
storage.ignore ??= { users: [], bots: false, ownMessages: false };

function enforceMapLimit(map: Map<any, any>, max: number) {
  while (map.size > max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

function enforceSetLimit(set: Set<any>, max: number) {
  while (set.size > max) {
    const oldestKey = set.values().next().value;
    if (oldestKey === undefined) break;
    set.delete(oldestKey);
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
  };
}

function reinsertDeletedMessage(channelId: string, message: any) {
  if (!ChannelMessages || !channelId || !message) return;
  try {
    const record = ChannelMessages.get(channelId);
    if (!record) return;
    ChannelMessages.commit(record.receiveMessage(message));
  } catch (e) {
    console.error("[MessageLogger] Reinsert error:", e);
  }
}

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");
      AuthStore = findByStoreName("AuthenticationStore") || findByProps("getToken");

      const getCurrentUserId = () =>
        AuthStore?.getCurrentUser?.()?.id ||
        AuthStore?.getId?.() ||
        MessageStore?.getCurrentUser?.()?.id;

      // 1. Only track live messages for embed preservation
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type === "MESSAGE_CREATE" && event.message?.id) {
            liveCache.set(event.message.id, cloneSnapshot(event.message));
            enforceMapLimit(liveCache, MAX_CACHE_SIZE);
          }
        })
      );

      // 2. Handle Deletions: Move from Live to Deleted, then reinsert
      patches.push(
        patchAfter("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          const { channelId, id } = event;
          if (!id || !channelId) return;

          const currentUserId = getCurrentUserId();
          const cachedMsg = liveCache.get(id) || MessageStore?.getMessage(channelId, id);
          if (!cachedMsg) return;

          if (storage.ignore?.users?.includes(cachedMsg.author?.id)) return;
          if (storage.ignore?.bots && (cachedMsg.author?.bot || cachedMsg.author?.isNonUserBot?.())) return;
          if (storage.ignore?.ownMessages && cachedMsg.author?.id === currentUserId) return;

          deletedIds.add(id);
          enforceSetLimit(deletedIds, MAX_CACHE_SIZE);

          reinsertDeletedMessage(channelId, cloneSnapshot(cachedMsg));
        })
      );

      // 3. Handle Bulk Deletes gracefully
      patches.push(
        patchAfter("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          const { channelId, ids } = event;
          if (!ids?.length || !channelId) return;

          const currentUserId = getCurrentUserId();
          for (const id of ids) {
            const cachedMsg = liveCache.get(id);
            if (!cachedMsg) continue;

            if (storage.ignore?.users?.includes(cachedMsg.author?.id)) continue;
            if (storage.ignore?.bots && (cachedMsg.author?.bot || cachedMsg.author?.isNonUserBot?.())) continue;
            if (storage.ignore?.ownMessages && cachedMsg.author?.id === currentUserId) continue;

            deletedIds.add(id);
            reinsertDeletedMessage(channelId, cloneSnapshot(cachedMsg));
          }
          enforceSetLimit(deletedIds, MAX_CACHE_SIZE);
        })
      );

      // 4. Preserve Embeds on Edit Updates
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE" || !event?.message?.id) return;
          
          const newMsg = event.message;
          const currentUserId = getCurrentUserId();
          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id) || liveCache.get(newMsg.id);

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
          enforceMapLimit(editMap, MAX_CACHE_SIZE);
        })
      );

      // Pass the Set of IDs, not the Map of messages
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
    liveCache.clear();
    deletedIds.clear();
    editMap.clear();
  },
  settings: Settings,
};
