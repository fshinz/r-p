import { findByStoreName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";
import { patchEditStyling } from "./patches/editStyling";

let MessageStore: any;
let AuthStore: any;
const patches: (() => void)[] = [];

// Local cache for messages targeted by SilentDelete nonce overrides
const deletedCache = new Map<string, any>();
const editMap = new Map<string, string[]>();

storage.ignore ??= { users: [], bots: false, ownMessages: false };

const DELETED_TEXT = "This message was deleted";
const BULK_DELETED_TEXT = (count: number) => `${count} messages were deleted`;

function buildAutomodMessage(text: string, timestamp: string): string {
  return `${text} (${timestamp})`;
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

      // ── 1. ANTI-SILENTDELETE: CATCH NONCE OVERWRITES IMMEDIATELY ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (!event?.type) return;

          // SilentDelete works by creating a new message whose nonce = target message ID
          if (event.type === "MESSAGE_CREATE") {
            const msg = event.message;
            if (!msg?.nonce || !msg?.channel_id) return;

            // Check if a message with this nonce/ID already exists in store
            const existing = MessageStore?.getMessage(msg.channel_id, msg.nonce);
            if (existing) {
              // Cache original contents BEFORE Discord replaces it
              if (!deletedCache.has(existing.id)) {
                deletedCache.set(existing.id, {
                  ...existing,
                  deletedAt: moment().format("HH:mm:ss"),
                });
              }

              // Purge duplicate rendering
              setTimeout(() => {
                FluxDispatcher.dispatch({
                  type: "MESSAGE_DELETE",
                  id: existing.id,
                  channelId: msg.channel_id,
                  isMlDuplicateCleanup: true,
                });
              }, 0);

              // Neutralize nonce to stop silent overwrite
              delete msg.nonce;
            }
          }
        })
      );

      // ── 2. HANDLE SINGLE DELETIONS ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          if (!event?.id || !event?.channelId) return;

          if (event.isMlDuplicateCleanup) return;

          const currentUserId = getCurrentUserId();
          // Read from store, or fallback to our pre-cached SilentDelete map
          const msg = MessageStore?.getMessage(event.channelId, event.id) || deletedCache.get(event.id);

          if (!msg) return;
          if (storage.ignore?.users?.includes(msg.author?.id)) return;
          if (storage.ignore?.bots && msg.author?.bot) return;
          if (storage.ignore?.ownMessages && msg.author?.id === currentUserId) return;

          const time = deletedCache.get(event.id)?.deletedAt || moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(DELETED_TEXT, time);

          // Construct Automod tombstone
          args[0] = {
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                channelId: event.channelId,
                messageId: event.id,
                content: msg.content, // Preserve original text
              },
            },
            errorResponseBody: {
              code: 200000,
              message: automodMessage,
            },
          };
        })
      );

      // ── 3. HANDLE BULK DELETIONS ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          if (!event?.ids?.length || !event?.channelId) return;

          const currentUserId = getCurrentUserId();
          let count = 0;

          for (const id of event.ids) {
            const msg = MessageStore?.getMessage(event.channelId, id) || deletedCache.get(id);
            if (!msg) continue;
            if (storage.ignore?.users?.includes(msg.author?.id)) continue;
            if (storage.ignore?.bots && msg.author?.bot) continue;
            if (storage.ignore?.ownMessages && msg.author?.id === currentUserId) continue;

            if (!deletedCache.has(id)) {
              deletedCache.set(id, { ...msg, deletedAt: moment().format("HH:mm:ss") });
            }
            count++;
          }
          if (count === 0) return;

          const time = moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(BULK_DELETED_TEXT(count), time);

          args[0] = {
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                channelId: event.channelId,
                messageId: event.ids[0],
              },
            },
            errorResponseBody: {
              code: 200000,
              message: automodMessage,
            },
          };
        })
      );

      // ── 4. HANDLE EDITS & FILTER OUT SILENT EDIT PLACEHOLDERS ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE") return;
          if (!event?.message) return;

          const newMsg = event.message;
          if (!newMsg.id || !newMsg.channel_id) return;

          // Ignore blank/space edits used by SilentEdit/SilentDelete placeholders
          if (!newMsg.content || newMsg.content.trim() === "" || newMsg.content === "** **") return;

          const currentUserId = getCurrentUserId();
          if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
          if (storage.ignore?.bots && newMsg.author?.bot) return;
          if (storage.ignore?.ownMessages && newMsg.author?.id === currentUserId) return;

          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id) || deletedCache.get(newMsg.id);
          if (!oldMsg || !oldMsg.content || oldMsg.content === newMsg.content) return;

          let history = editMap.get(newMsg.id) || [];
          if (history.length === 0 || history[history.length - 1] !== oldMsg.content) {
            history.push(oldMsg.content);
          }
          if (history.length > 5) history = history.slice(-5);
          editMap.set(newMsg.id, history);
        })
      );

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
