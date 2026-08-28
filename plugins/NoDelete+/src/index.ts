import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";

let MessageStore: any;
let ChannelStore: any;
const patches: (() => void)[] = [];
const deletedMessages: string[] = [];

// Storage for ignored users
storage.ignore ??= { users: [], bots: false };

const formatEmbedContent = (embeds: any[]) => {
  if (!embeds || embeds.length === 0) return "";
  
  let content = "📎 **Embeds:**\n";
  embeds.forEach((embed, i) => {
    content += `\n**Embed ${i + 1}:**`;
    if (embed.title) content += `\n• Title: ${embed.title}`;
    if (embed.description) content += `\n• Description: ${embed.description}`;
    if (embed.url) content += `\n• URL: ${embed.url}`;
    if (embed.author?.name) content += `\n• Author: ${embed.author.name}`;
    if (embed.footer?.text) content += `\n• Footer: ${embed.footer.text}`;
    if (embed.fields?.length > 0) {
      content += `\n• Fields:`;
      embed.fields.forEach((field: any) => {
        content += `\n  - ${field.name}: ${field.value}`;
      });
    }
    if (embed.image?.url) content += `\n• Image: ${embed.image.url}`;
    if (embed.thumbnail?.url) content += `\n• Thumbnail: ${embed.thumbnail.url}`;
  });
  return content;
};

const formatAttachmentContent = (attachments: any[]) => {
  if (!attachments || attachments.length === 0) return "";
  
  let content = "📁 **Attachments:**\n";
  attachments.forEach((att) => {
    content += `• ${att.filename} (${Math.round(att.size / 1024)}KB)\n`;
    if (att.url) content += `  ${att.url}\n`;
  });
  return content;
};

const getMessageContent = (message: any) => {
  let content = "";
  
  if (message.content) content += message.content;
  
  if (message.embeds?.length > 0) {
    content += content ? "\n\n" : "";
    content += formatEmbedContent(message.embeds);
  }
  
  if (message.attachments?.length > 0) {
    content += content ? "\n\n" : "";
    content += formatAttachmentContent(message.attachments);
  }
  
  return content || "(empty message)";
};

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");
      ChannelStore = findByStoreName("ChannelStore");

      // Handle deleted messages
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          try {
            const event = args[0];
            if (!event || event?.type !== "MESSAGE_DELETE") return;
            if (!event?.id || !event?.channelId) return;

            const message = MessageStore?.getMessage(event.channelId, event.id);
            if (!message) return;

            // Check ignore settings
            if (storage.ignore?.users?.includes(message.author?.id)) return;
            if (storage.ignore?.bots && message.author?.bot) return;

            if (deletedMessages.includes(event.id)) {
              deletedMessages.splice(deletedMessages.indexOf(event.id), 1);
              return;
            }
            deletedMessages.push(event.id);

            const content = getMessageContent(message);
            const author = message.author?.username || "Unknown";
            const timestamp = moment().format("HH:mm:ss");

            // Create replacement message showing deleted content
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
                message: `🚫 **${author}** deleted a message:\n${content}\n\n_Deleted at ${timestamp}_`,
              },
            };
          } catch (e) {
            console.error("[MessageLogger] Delete error:", e);
          }
        })
      );

      // Handle edited messages
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          try {
            const event = args[0];
            if (!event || event?.type !== "MESSAGE_UPDATE") return;
            if (!event?.message) return;

            const msg = event.message;
            if (!msg.id || !msg.channel_id) return;

            // Check ignore settings
            if (storage.ignore?.users?.includes(msg.author?.id)) return;
            if (storage.ignore?.bots && msg.author?.bot) return;

            // Get original message
            const original = MessageStore?.getMessage(msg.channel_id, msg.id);
            if (!original) return;

            // Check if content actually changed
            if (original.content === msg.content && 
                JSON.stringify(original.embeds) === JSON.stringify(msg.embeds)) return;

            const oldContent = getMessageContent(original);
            const newContent = getMessageContent(msg);
            const author = msg.author?.username || "Unknown";
            const timestamp = moment().format("HH:mm:ss");

            // Create replacement message showing edit
            args[0] = {
              type: "MESSAGE_EDIT_FAILED_AUTOMOD",
              messageData: {
                type: 1,
                message: {
                  channelId: msg.channel_id,
                  messageId: msg.id,
                },
              },
              errorResponseBody: {
                code: 200000,
                message: `✏️ **${author}** edited a message:\n\n**Before:**\n${oldContent}\n\n**After:**\n${newContent}\n\n_Edited at ${timestamp}_`,
              },
            };
          } catch (e) {
            console.error("[MessageLogger] Edit error:", e);
          }
        })
      );

      // Add context menu patch
      patches.push(patchContextMenu());

      showToast("Message Logger loaded", getAssetIDByName("Check"));
    } catch (e) {
      console.error("[MessageLogger] Failed to load:", e);
      showToast("Failed to load Message Logger", getAssetIDByName("Small"));
    }
  },

  onUnload() {
    for (const unpatch of patches) {
      try { unpatch(); } catch(e) {}
    }
    patches.length = 0;
    deletedMessages.length = 0;
    showToast("Message Logger unloaded", getAssetIDByName("Check"));
  },

  settings: Settings,
};
