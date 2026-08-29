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
const patches: (() => void)[] = [];
const deletedIds: string[] = [];

storage.ignore ??= { users: [], bots: false };

// ── NoDelete style: generic message ──
const DELETED_TEXT = "This message was deleted";
const BULK_DELETED_TEXT = (count: number) => `${count} messages were deleted`;

function buildAutomodMessage(text: string, timestamp: string): string {
  return `${text} (${timestamp})`;
}

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");

      // ── SINGLE DELETE ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          if (!event?.id || !event?.channelId) return;

          const msg = MessageStore?.getMessage(event.channelId, event.id);
          if (!msg) return;
          if (storage.ignore?.users?.includes(msg.author?.id)) return;
          if (storage.ignore?.bots && msg.author?.bot) return;

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
            count++;
          }
          if (count === 0) return;

          const time = moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(BULK_DELETED_TEXT(count), time);

          // Use the first ID as placeholder
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

      // ── EDITS: store for row styling ──
      const editMap = new Map<string, { oldContent: string; newContent: string }>();
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE") return;
          if (!event?.message) return;

          const newMsg = event.message;
          if (!newMsg.id || !newMsg.channel_id) return;
          if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
          if (storage.ignore?.bots && newMsg.author?.bot) return;

          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id);
          if (!oldMsg) return;

          // Simple content comparison (embeds/attachments not supported here, just text)
          if (oldMsg.content === newMsg.content) return;

          editMap.set(newMsg.id, { oldContent: oldMsg.content || "", newContent: newMsg.content || "" });
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