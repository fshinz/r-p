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

// Persistent cache for deleted messages, embeds, and attachments
const deletedCache = new Map<string, any>();
const editMap = new Map<string, string[]>();

storage.ignore ??= { users: [], bots: false, ownMessages: false };

const DELETED_TEXT = "This message was deleted";

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

      // ── 1. CATCH NONCE REPLACEMENTS, DELETIONS & FULL SNAPSHOTS ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (!event?.type) return;

          // Catch incoming messages attempting nonce overwrites
          if (event.type === "MESSAGE_CREATE") {
            const msg = event.message;
            if (!msg?.nonce || !msg?.channel_id) return;

            const currentUserId = getCurrentUserId();
            const isOwnMessage = msg.author?.id === currentUserId;

            if (isOwnMessage) return;

            const existing = MessageStore?.getMessage(msg.channel_id, msg.nonce);
            if (existing && existing.id !== msg.id) {
              if (!deletedCache.has(existing.id)) {
                deletedCache.set(existing.id, {
                  ...existing,
                  content: existing.content,
                  embeds: existing.embeds ? [...existing.embeds] : [],
                  attachments: existing.attachments ? [...existing.attachments] : [],
                  deletedAt: moment().format("HH:mm:ss"),
                });
              }
              delete msg.nonce;
            }
          }

          // Catch local delete events and snapshot full content, embeds & attachments
          if (event.type === "MESSAGE_DELETE") {
            const { channelId, id, mlDeleted } = event;
            if (!id || !channelId) return;

            const existing = MessageStore?.getMessage(channelId, id);
            if (existing && !deletedCache.has(id)) {
              deletedCache.set(id, {
                ...existing,
                content: existing.content,
                embeds: existing.embeds ? [...existing.embeds] : [],
                attachments: existing.attachments ? [...existing.attachments] : [],
                deletedAt: moment().format("HH:mm:ss"),
              });
            }

            if (mlDeleted) delete event.mlDeleted;
          }
        })
      );

      // ── 2. SINGLE MESSAGE DELETE HANDLER (FIXED FOR MANUAL DELETES) ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE") return;
          if (!event?.id || !event?.channelId) return;

          const currentUserId = getCurrentUserId();
          const cachedMsg = deletedCache.get(event.id) || MessageStore?.getMessage(event.channelId, event.id);

          if (!cachedMsg) return;
          if (storage.ignore?.users?.includes(cachedMsg.author?.id)) return;
          if (storage.ignore?.bots && cachedMsg.author?.bot) return;
          if (storage.ignore?.ownMessages && cachedMsg.author?.id === currentUserId) return;

          if (!deletedCache.has(event.id)) {
            deletedCache.set(event.id, {
              ...cachedMsg,
              content: cachedMsg.content,
              embeds: cachedMsg.embeds ? [...cachedMsg.embeds] : [],
              attachments: cachedMsg.attachments ? [...cachedMsg.attachments] : [],
              deletedAt: moment().format("HH:mm:ss"),
            });
          }

          const snapshot = deletedCache.get(event.id);
          const time = snapshot?.deletedAt || moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(DELETED_TEXT, time);

          // Inject full preserved message properties back into the Automod store update
          args[0] = {
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                ...snapshot,
                channelId: event.channelId,
                messageId: event.id,
                content: snapshot?.content || "",
                embeds: snapshot?.embeds || [],
                attachments: snapshot?.attachments || [],
              },
            },
            errorResponseBody: {
              code: 200000,
              message: automodMessage,
            },
          };
        })
      );

      // ── 3. BULK DELETE HANDLER (WITH FULL RE-HYDRATION) ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_DELETE_BULK") return;
          if (!event?.ids?.length || !event?.channelId) return;

          const currentUserId = getCurrentUserId();
          const time = moment().format("HH:mm:ss");
          const automodMessage = buildAutomodMessage(DELETED_TEXT, time);

          let validCount = 0;

          for (const id of event.ids) {
            const cachedMsg = deletedCache.get(id) || MessageStore?.getMessage(event.channelId, id);
            if (!cachedMsg) continue;
            if (storage.ignore?.users?.includes(cachedMsg.author?.id)) continue;
            if (storage.ignore?.bots && cachedMsg.author?.bot) continue;
            if (storage.ignore?.ownMessages && cachedMsg.author?.id === currentUserId) continue;

            if (!deletedCache.has(id)) {
              deletedCache.set(id, {
                ...cachedMsg,
                content: cachedMsg.content,
                embeds: cachedMsg.embeds ? [...cachedMsg.embeds] : [],
                attachments: cachedMsg.attachments ? [...cachedMsg.attachments] : [],
                deletedAt: time,
              });
            }

            const snapshot = deletedCache.get(id);
            validCount++;

            FluxDispatcher.dispatch({
              type: "MESSAGE_EDIT_FAILED_AUTOMOD",
              messageData: {
                type: 1,
                message: {
                  ...snapshot,
                  channelId: event.channelId,
                  messageId: id,
                  content: snapshot?.content || "",
                  embeds: snapshot?.embeds || [],
                  attachments: snapshot?.attachments || [],
                },
              },
              errorResponseBody: {
                code: 200000,
                message: automodMessage,
              },
            });
          }

          if (validCount > 0) {
            args[0] = { type: "NOOP" };
          }
        })
      );

      // ── 4. EDITS & EMBED UPDATES ──
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args) => {
          const event = args[0];
          if (event?.type !== "MESSAGE_UPDATE") return;
          if (!event?.message) return;

          const newMsg = event.message;
          if (!newMsg.id || !newMsg.channel_id) return;

          const currentUserId = getCurrentUserId();
          if (storage.ignore?.users?.includes(newMsg.author?.id)) return;
          if (storage.ignore?.bots && newMsg.author?.bot) return;
          if (storage.ignore?.ownMessages && newMsg.author?.id === currentUserId) return;

          const oldMsg = MessageStore?.getMessage(newMsg.channel_id, newMsg.id) || deletedCache.get(newMsg.id);

          // Restore embeds if suppressed or removed via edit
          if (oldMsg && oldMsg.embeds?.length && !newMsg.embeds?.length) {
            newMsg.embeds = [...oldMsg.embeds];
          }

          if (!newMsg.content || newMsg.content.trim() === "") return;
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
