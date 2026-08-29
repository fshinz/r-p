import { findByStoreName } from "@vendetta/metro";
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
const deletedIds: string[] = [];

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

      const currentUserId = AuthStore?.getCurrentUser?.()?.id || MessageStore?.getCurrentUser?.()?.id;

      // ── DETECT NONCE‑BASED REPLACEMENT (Silent Delete bypass) ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_CREATE") return;
          const msg = event.message;
          if (!msg?.nonce) return;

          // Check if this nonce matches an existing message ID in the same channel
          const existing = MessageStore?.getMessage(msg.channel_id, msg.nonce);
          if (existing && existing.id !== msg.id) {
            // This is a replacement attempt – log the original as deleted
            if (!deletedIds.includes(existing.id)) {
              deletedIds.push(existing.id);
              // Dispatch a synthetic delete so our delete handler processes it
              FluxDispatcher.dispatch({
                type: "MESSAGE_DELETE",
                id: existing.id,
                channelId: msg.channel_id,
                mlReplacement: true,
              });
            }
            // Remove nonce to prevent further replacement attempts
            delete msg.nonce;
          }
        })
      );

      // ── SINGLE DELETE ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          if (!event?.id || !event?.channelId) return;

          // Skip if this was already handled by our replacement detection
          if (event.mlReplacement) return;

          const msg = MessageStore?.getMessage(event.channelId, event.id);
          if (!msg) return;
          if (storage.ignore?.users?.includes(msg.author?.id)) return;
          if (storage.ignore?.bots && msg.author?.bot) return;
          if (storage.ignore?.ownMessages && msg.author?.id === currentUserId) return;

          if (deletedIds.includes(event.id)) {
            deletedIds.splice(deletedIds.indexOf(event.id), 1);
            return;
          }
          deletedIds.push(event.id);

          const time = moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(DELETED_TEXT, time);

          args[0] = {
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                channelId: event.channelId,
                messageId: event.id,
              },
            },
            errorResponseBody: {
              code: 200000,
              message: automodMessage,
            },
          };
        })
      );

      // ── BULK DELETE ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          if (!event?.ids?.length || !event?.channelId) return;

          let count = 0;
          for (const id of event.ids) {
            const msg = MessageStore?.getMessage(event.channelId, id);
            if (!msg) continue;
            if (storage.ignore?.users?.includes(msg.author?.id)) continue;
            if (storage.ignore?.bots && msg.author?.bot) continue;
            if (storage.ignore?.ownMessages && msg.author?.id === currentUserId) continue;
            count++;
          }
          if (count === 0) return;

          const time = moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(BULK_DELETED_TEXT(count), time);

          const firstId = event.ids[0];
          args[0] = {
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                channelId: event.channelId,
                messageId: firstId,
              },
            },
            errorResponseBody: {
              code: 200000,
              message: automodMessage,
            },
          };
        })
      );

      // ── EDITS: store history (up to 5 previous versions) ──
      const editMap = new Map<string, string[]>();
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE") return;
          if (!event?.message) return;

          const newMsg = event.message;
          if (!newMsg.id || !newMsg.channel_id) return;
          if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
          if (storage.ignore?.bots && newMsg.author?.bot) return;
          if (storage.ignore?.ownMessages && newMsg.author?.id === currentUserId) return;

          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id);
          if (!oldMsg) return;

          if (oldMsg.content === newMsg.content) return;

          let history = editMap.get(newMsg.id) || [];
          if (history.length === 0 || history[history.length - 1] !== oldMsg.content) {
            history.push(oldMsg.content || "");
          }
          if (history.length > 5) history = history.slice(-5);
          editMap.set(newMsg.id, history);
          setTimeout(() => editMap.delete(newMsg.id), 60000);
        })
      );

      // ── Row styling for edits ──
      patches.push(patchEditStyling(editMap));

      // ── Context menu ──
      patches.push(patchContextMenu());

      showToast("Message Logger loaded", getAssetIDByName("Check"));
    } catch (e) {
      console.error("[MessageLogger] Load error:", e);
      showToast("Failed to load Message Logger", getAssetIDByName("Small"));
    }
  },

  onUnload() {
    for (const unpatch of patches) {
      try { unpatch(); } catch (_) {}
    }
    patches.length = 0;
    deletedIds.length = 0;
    showToast("Message Logger unloaded", getAssetIDByName("Check"));
  },

  settings: Settings,
};