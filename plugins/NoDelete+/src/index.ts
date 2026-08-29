import { findByStoreName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
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
const patches: (() => void)[] = [];

// Lightweight in-memory caches
const deletedCache = new Map<string, any>();
const editMap = new Map<string, string[]>();
const MAX_CACHE_SIZE = 300;

storage.ignore ??= { users: [], bots: false, ownMessages: false };

function enforceCacheLimit(map: Map<any, any>, max: number) {
  while (map.size > max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
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
    flags: msg.flags || 0,
    deletedAt: msg.deletedAt || moment().format("HH:mm:ss"),
  };
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

      // 1. Cache incoming messages to preserve embeds/attachments
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (!event?.type) return;

          if (event.type === "MESSAGE_CREATE") {
            const msg = event.message;
            if (!msg?.id) return;
            deletedCache.set(msg.id, cloneSnapshot(msg));
            enforceCacheLimit(deletedCache, MAX_CACHE_SIZE);
          }

          if (event.type === "MESSAGE_DELETE") {
            const { channelId, id } = event;
            if (!id || !channelId) return;
            const existing = MessageStore?.getMessage(channelId, id);
            if (existing && !deletedCache.has(id)) {
              deletedCache.set(id, cloneSnapshot(existing));
              enforceCacheLimit(deletedCache, MAX_CACHE_SIZE);
            }
          }
        })
      );

      // 2. Intercept Deletions safely without dispatching auto-mod error blocks
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          if (!event?.id || !event?.channelId) return;

          const currentUserId = getCurrentUserId();
          const cachedMsg = MessageStore?.getMessage(event.channelId, event.id) || deletedCache.get(event.id);

          if (!cachedMsg) return;
          if (storage.ignore?.users?.includes(cachedMsg.author?.id)) return;
          if (storage.ignore?.bots && (cachedMsg.author?.bot || cachedMsg.author?.isNonUserBot?.())) return;
          if (storage.ignore?.ownMessages && cachedMsg.author?.id === currentUserId) return;

          if (!deletedCache.has(event.id)) {
            deletedCache.set(event.id, cloneSnapshot(cachedMsg));
          }

          // Prevent Discord from removing the message row entirely
          args[0] = { type: "NOOP" };
        })
      );

      // 3. Intercept Bulk Deletes safely
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          if (!event?.ids?.length || !event?.channelId) return;

          const currentUserId = getCurrentUserId();
          const time = moment().format("HH:mm:ss");

          for (const id of event.ids) {
            const cachedMsg = MessageStore?.getMessage(event.channelId, id) || deletedCache.get(id);
            if (!cachedMsg) continue;
            if (storage.ignore?.users?.includes(cachedMsg.author?.id)) continue;
            if (storage.ignore?.bots && (cachedMsg.author?.bot || cachedMsg.author?.isNonUserBot?.())) continue;
            if (storage.ignore?.ownMessages && cachedMsg.author?.id === currentUserId) continue;

            if (!deletedCache.has(id)) {
              deletedCache.set(id, cloneSnapshot({ ...cachedMsg, deletedAt: time }));
            }
          }

          args[0] = { type: "NOOP" };
        })
      );

      // 4. Preserve Embeds on Edit Updates
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE") return;
          if (!event?.message) return;

          const newMsg = event.message;
          if (!newMsg.id || !newMsg.channel_id) return;

          const currentUserId = getCurrentUserId();
          if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
          if (storage.ignore?.bots && (newMsg.author?.bot || newMsg.author?.isNonUserBot?.())) return;
          if (storage.ignore?.ownMessages && newMsg.author?.id === currentUserId) return;

          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id) || deletedCache.get(newMsg.id);

          if (oldMsg) {
            if (oldMsg.embeds?.length && !newMsg.embeds?.length) {
              newMsg.embeds = JSON.parse(JSON.stringify(oldMsg.embeds));
            }
            if (oldMsg.attachments?.length && !newMsg.attachments?.length) {
              newMsg.attachments = JSON.parse(JSON.stringify(oldMsg.attachments));
            }
          }

          if (!newMsg.content || newMsg.content.trim() === "") return;
          if (!oldMsg || !oldMsg.content || oldMsg.content === newMsg.content) return;

          let history = editMap.get(newMsg.id) || [];
          if (history.length === 0 || history[history.length - 1] !== oldMsg.content) {
            history.push(oldMsg.content);
          }
          if (history.length > 5) history = history.slice(-5);
          editMap.set(newMsg.id, history);
          enforceCacheLimit(editMap, MAX_CACHE_SIZE);
        })
      );

      patches.push(patchRowStyling(deletedCache, editMap));
      patches.push(patchEditStyling(editMap));
      patches.push(patchContextMenu());

      showToast("Message Logger loaded", getAssetIDByName("Check"));
    } catch (e) {
      console.error("[MessageLogger] Load error:", e);
      showToast("Failed to load Message Logger", getAssetIDByName("Small"));
    }
  },

  onUnload() {
    for (const unpatch of patches) {
      try {
        unpatch();
      } catch (_) {}
    }
    patches.length = 0;
    deletedCache.clear();
    editMap.clear();
    showToast("Message Logger unloaded", getAssetIDByName("Check"));
  },

  settings: Settings,
};
