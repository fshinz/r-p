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
const deletedMessages: string[] = [];

storage.ignore ??= { users: [], bots: false };

const formatMessageContent = (message: any) => {
  let content = "";
  
  if (message.content) {
    content += message.content;
  }
  
  if (message.embeds?.length > 0) {
    message.embeds.forEach((embed: any) => {
      if (embed.title) content += `\n${embed.title}`;
      if (embed.description) content += `\n${embed.description}`;
      if (embed.fields?.length > 0) {
        embed.fields.forEach((field: any) => {
          content += `\n\n${field.name}\n${field.value}`;
        });
      }
      if (embed.url) content += `\n${embed.url}`;
    });
  }
  
  if (message.attachments?.length > 0) {
    message.attachments.forEach((att: any) => {
      content += `\n${att.filename} (${Math.round(att.size / 1024)}KB)`;
    });
  }
  
  return content || "[Empty Message]";
};

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");

      // Handle deleted messages (including bulk)
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          try {
            const event = args[0];
            
            if (event?.type === "MESSAGE_DELETE") {
              if (!event?.id || !event?.channelId) return;
              
              const message = MessageStore?.getMessage(event.channelId, event.id);
              if (!message) return;

              if (storage.ignore?.users?.includes(message.author?.id)) return;
              if (storage.ignore?.bots && message.author?.bot) return;

              if (deletedMessages.includes(event.id)) {
                deletedMessages.splice(deletedMessages.indexOf(event.id), 1);
                return;
              }
              deletedMessages.push(event.id);

              const content = formatMessageContent(message);
              const time = moment().format("HH:mm:ss");

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
                  message: `${content}\n\n*${time}*`,
                },
              };
              return;
            }
            
            if (event?.type === "MESSAGE_DELETE_BULK") {
              if (!event?.ids || !event?.channelId) return;
              
              const messages: any[] = [];
              event.ids.forEach((id: string) => {
                const msg = MessageStore?.getMessage(event.channelId, id);
                if (msg) {
                  if (storage.ignore?.users?.includes(msg.author?.id)) return;
                  if (storage.ignore?.bots && msg.author?.bot) return;
                  messages.push(msg);
                }
              });
              
              if (messages.length === 0) return;
              
              let combinedContent = `**${messages.length} messages deleted:**\n\n`;
              messages.forEach((msg, i) => {
                const content = formatMessageContent(msg);
                const author = msg.author?.username || "Unknown";
                combinedContent += `**${author}**: ${content}`;
                if (i < messages.length - 1) combinedContent += "\n\n";
              });
              
              const time = moment().format("HH:mm:ss");
              combinedContent += `\n\n*${time}*`;
              
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
                  message: combinedContent,
                },
              };
              return;
            }
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

            if (storage.ignore?.users?.includes(msg.author?.id)) return;
            if (storage.ignore?.bots && msg.author?.bot) return;

            const original = MessageStore?.getMessage(msg.channel_id, msg.id);
            if (!original) return;

            if (original.content === msg.content && 
                JSON.stringify(original.embeds) === JSON.stringify(msg.embeds)) return;

            const oldContent = formatMessageContent(original);
            const newContent = formatMessageContent(msg);
            const time = moment().format("HH:mm:ss");

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
                message: `${oldContent}\n\n⬇️\n\n${newContent}\n\n*${time}*`,
              },
            };
          } catch (e) {
            console.error("[MessageLogger] Edit error:", e);
          }
        })
      );

      // Patch context menu
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