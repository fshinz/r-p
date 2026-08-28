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

export default {
  onLoad() {
    try {
      MessageStore = findByStoreName("MessageStore");

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

              // Get the original content with embeds as text
              let content = message.content || "";
              if (message.embeds?.length > 0) {
                message.embeds.forEach((embed: any) => {
                  if (embed.title) content += `\n${embed.title}`;
                  if (embed.description) content += `\n${embed.description}`;
                  if (embed.fields?.length > 0) {
                    embed.fields.forEach((field: any) => {
                      content += `\n${field.name}: ${field.value}`;
                    });
                  }
                });
              }

              const time = moment().format("HH:mm:ss");

              // Replace the message with a red version + deleted tag
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
                  message: `> ${content}\n\n-# (deleted) • ${time}`,
                },
              };
            }
          } catch (e) {
            console.error("[MessageLogger]", e);
          }
        })
      );

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