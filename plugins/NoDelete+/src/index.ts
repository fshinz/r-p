import { findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";

let MessageStore: any;
const patches: (() => void)[] = [];
const deletedIds: string[] = []; // prevent double‑logging

storage.ignore ??= { users: [], bots: false };

/** Extract plain text from message including embeds & attachments */
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
      if (embed.url) content += `\n${embed.url}`;
    }
  }

  if (message.attachments?.length) {
    for (const att of message.attachments) {
      content += `\n📎 ${att.filename} (${Math.round(att.size / 1024)}KB)`;
    }
  }

  return content || "[Empty Message]";
}

/** Build a red‑quote system message */
function buildSystemMessage(content: string): string {
  return `> ${content.replace(/\n/g, "\n> ")}`;
}

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");

      // ── Single delete ──
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

          const content = formatMessageContent(msg);
          const time = moment().format("HH:mm:ss");
          const finalMsg = `${buildSystemMessage(content)}\n\n-# ${time}`;

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
              message: finalMsg,
            },
          };
        })
      );

      // ── Bulk delete ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          if (!event?.ids?.length || !event?.channelId) return;

          const messages: any[] = [];
          for (const id of event.ids) {
            const msg = MessageStore?.getMessage(event.channelId, id);
            if (!msg) continue;
            if (storage.ignore?.users?.includes(msg.author?.id)) continue;
            if (storage.ignore?.bots && msg.author?.bot) continue;
            messages.push(msg);
          }
          if (messages.length === 0) return;

          let combined = `**${messages.length} messages deleted:**\n\n`;
          for (const msg of messages) {
            const author = msg.author?.username || "Unknown";
            const content = formatMessageContent(msg);
            combined += `**${author}**: ${content}\n`;
          }
          const time = moment().format("HH:mm:ss");
          const finalMsg = `${buildSystemMessage(combined.trim())}\n\n-# ${time}`;

          const firstId = messages[0]?.id || event.ids[0];
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
              message: finalMsg,
            },
          };
        })
      );

      // ── Edit ──
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

          const oldContent = formatMessageContent(oldMsg);
          const newContent = formatMessageContent(newMsg);
          if (oldContent === newContent) return;

          // No timestamp for edits
          const editText = `**Before:**\n${oldContent}\n\n**After:**\n${newContent}`;
          const finalMsg = buildSystemMessage(editText);

          args[0] = {
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                channelId: newMsg.channel_id,
                messageId: newMsg.id,
              },
            },
            errorResponseBody: {
              code: 200000,
              message: finalMsg,
            },
          };
        })
      );

      // Context menu
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