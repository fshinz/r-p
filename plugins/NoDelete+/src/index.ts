import { findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";
import { patchRowStyling } from "./patches/rowStyling";

let MessageStore: any;
const patches: (() => void)[] = [];

// In‑memory maps for the current session – no persistent storage, minimal overhead
export const deletedMessages = new Map<string, { content: string; author: string; timestamp: string }>();
export const editedMessages = new Map<string, { oldContent: string; newContent: string; timestamp: string }>();

storage.ignore ??= { users: [], bots: false };

function formatMessageContent(message: any): string {
  let content = message.content || "";
  if (message.embeds?.length) {
    for (const embed of message.embeds) {
      if (embed.title) content += `\n${embed.title}`;
      if (embed.description) content += `\n${embed.description}`;
      if (embed.fields?.length) {
        for (const field of embed.fields) {
          content += `\n${field.name}: ${field.value}`;
        }
      }
    }
  }
  if (message.attachments?.length) {
    for (const att of message.attachments) {
      content += `\n📎 ${att.filename} (${Math.round(att.size / 1024)}KB)`;
    }
  }
  return content || "[Empty Message]";
}

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");

      // 1. Intercept deletions
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type === "MESSAGE_DELETE") {
            if (!event?.id || !event?.channelId) return;
            const msg = MessageStore?.getMessage(event.channelId, event.id);
            if (!msg) return;
            if (storage.ignore?.users?.includes(msg.author?.id)) return;
            if (storage.ignore?.bots && msg.author?.bot) return;

            deletedMessages.set(event.id, {
              content: formatMessageContent(msg),
              author: msg.author?.username || "Unknown",
              timestamp: new Date().toLocaleTimeString(),
            });
            // Remove after a short delay to keep map small
            setTimeout(() => deletedMessages.delete(event.id), 60000);
            return;
          }

          if (event?.type === "MESSAGE_DELETE_BULK") {
            if (!event?.ids?.length || !event?.channelId) return;
            for (const id of event.ids) {
              const msg = MessageStore?.getMessage(event.channelId, id);
              if (!msg) continue;
              if (storage.ignore?.users?.includes(msg.author?.id)) continue;
              if (storage.ignore?.bots && msg.author?.bot) continue;
              deletedMessages.set(id, {
                content: formatMessageContent(msg),
                author: msg.author?.username || "Unknown",
                timestamp: new Date().toLocaleTimeString(),
              });
              setTimeout(() => deletedMessages.delete(id), 60000);
            }
            return;
          }

          if (event?.type === "MESSAGE_UPDATE") {
            const newMsg = event?.message;
            if (!newMsg?.id || !newMsg?.channel_id) return;
            if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
            if (storage.ignore?.bots && newMsg.author?.bot) return;

            const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id);
            if (!oldMsg) return;
            const oldContent = formatMessageContent(oldMsg);
            const newContent = formatMessageContent(newMsg);
            if (oldContent === newContent) return;

            editedMessages.set(newMsg.id, {
              oldContent,
              newContent,
              timestamp: new Date().toLocaleTimeString(),
            });
            setTimeout(() => editedMessages.delete(newMsg.id), 60000);
            return;
          }
        })
      );

      // 2. Patch row styling (red text & edit tags)
      patches.push(patchRowStyling(deletedMessages, editedMessages));

      // 3. Context menu for ignore
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
    deletedMessages.clear();
    editedMessages.clear();
    showToast("Message Logger unloaded", getAssetIDByName("Check"));
  },

  settings: Settings,
};