// index.ts — merged, embeds/edits only, no cloudSync, no inline-reinsertion, no per-row edit history overlay
import { findByStoreName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./settings";
import { patchContextMenu } from "./patches/contextMenu";

let MessageStore: any;
let AuthStore: any;
const cleanups: (() => void)[] = [];

// Only a shadow copy of recent messages, capped, so deletes/edits can be reconstructed.
// No cloud sync, no inline reinsertion into ChannelMessages, no persistent editMap growth.
const MAX_TRACKED = 500;
const shadow = new Map<string, any>();

storage.ignore ??= { users: [], bots: false, ownMessages: false };

const DELETED_TEXT = "This message was deleted";

function evictOldest(map: Map<string, any>, max: number) {
  while (map.size > max) {
    const k = map.keys().next().value;
    if (k === undefined) break;
    map.delete(k);
  }
}

function cloneSnapshot(msg: any) {
  if (!msg) return null;
  return {
    ...msg,
    content: msg.content || "",
    embeds: Array.isArray(msg.embeds) ? JSON.parse(JSON.stringify(msg.embeds)) : [],
    components: Array.isArray(msg.components) ? JSON.parse(JSON.stringify(msg.components)) : [],
    attachments: Array.isArray(msg.attachments) ? JSON.parse(JSON.stringify(msg.attachments)) : [],
    flags: msg.flags || 0,
    deletedAt: msg.deletedAt || moment().format("HH:mm:ss"),
  };
}

function buildAutomodMessage(text: string, timestamp: string) {
  return `${text} (${timestamp})`;
}

function isIgnored(author: any, currentUserId: string) {
  if (!author) return false;
  if (storage.ignore?.users?.includes(author.id)) return true;
  if (storage.ignore?.bots && author.bot) return true;
  if (storage.ignore?.ownMessages && author.id === currentUserId) return true;
  return false;
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

      // Cheap: Flux only calls us for these exact types, not every action in the app.
      const onCreate = (event: any) => {
        const msg = event?.message;
        if (!msg?.id) return;
        shadow.set(msg.id, msg);
        evictOldest(shadow, MAX_TRACKED);
      };

      const onDelete = (event: any) => {
        const { channelId, id } = event;
        if (!id || !channelId) return;

        const currentUserId = getCurrentUserId();
        const cached = MessageStore?.getMessage(channelId, id) || shadow.get(id);
        if (!cached) return;
        if (isIgnored(cached.author, currentUserId)) return;

        const snapshot = cloneSnapshot(cached);
        shadow.delete(id);

        const time = snapshot?.deletedAt || moment().format("HH:mm:ss");
        FluxDispatcher.dispatch({
          type: "MESSAGE_EDIT_FAILED_AUTOMOD",
          messageData: {
            type: 1,
            message: {
              ...snapshot,
              channelId,
              messageId: id,
              content: snapshot?.content || "",
              embeds: snapshot?.embeds || [],
              components: snapshot?.components || [],
              attachments: snapshot?.attachments || [],
              flags: snapshot?.flags || 0,
            },
          },
          errorResponseBody: { code: 200000, message: buildAutomodMessage(DELETED_TEXT, time) },
        });
      };

      const onBulkDelete = (event: any) => {
        const { channelId, ids } = event;
        if (!channelId || !Array.isArray(ids)) return;
        const currentUserId = getCurrentUserId();
        const time = moment().format("HH:mm:ss");

        for (const id of ids) {
          const cached = MessageStore?.getMessage(channelId, id) || shadow.get(id);
          if (!cached) continue;
          if (isIgnored(cached.author, currentUserId)) continue;

          const snapshot = cloneSnapshot({ ...cached, deletedAt: time });
          shadow.delete(id);

          FluxDispatcher.dispatch({
            type: "MESSAGE_EDIT_FAILED_AUTOMOD",
            messageData: {
              type: 1,
              message: {
                ...snapshot,
                channelId,
                messageId: id,
                content: snapshot?.content || "",
                embeds: snapshot?.embeds || [],
                components: snapshot?.components || [],
                attachments: snapshot?.attachments || [],
                flags: snapshot?.flags || 0,
              },
            },
            errorResponseBody: { code: 200000, message: buildAutomodMessage(DELETED_TEXT, time) },
          });
        }
      };

      // Edit handling: only restore stripped embeds/components. No history overlay, no row patching.
      const onUpdate = (event: any) => {
        const newMsg = event?.message;
        if (!newMsg?.id) return;

        const oldMsg = shadow.get(newMsg.id);
        shadow.set(newMsg.id, newMsg);
        evictOldest(shadow, MAX_TRACKED);
        if (!oldMsg) return;

        const currentUserId = getCurrentUserId();
        if (isIgnored(newMsg.author, currentUserId)) return;

        if (oldMsg.embeds?.length && !newMsg.embeds?.length) {
          newMsg.embeds = JSON.parse(JSON.stringify(oldMsg.embeds));
        }
        if (oldMsg.components?.length && !newMsg.components?.length) {
          newMsg.components = JSON.parse(JSON.stringify(oldMsg.components));
        }
      };

      FluxDispatcher.subscribe("MESSAGE_CREATE", onCreate);
      FluxDispatcher.subscribe("MESSAGE_DELETE", onDelete);
      FluxDispatcher.subscribe("MESSAGE_DELETE_BULK", onBulkDelete);
      FluxDispatcher.subscribe("MESSAGE_UPDATE", onUpdate);

      cleanups.push(
        () => FluxDispatcher.unsubscribe("MESSAGE_CREATE", onCreate),
        () => FluxDispatcher.unsubscribe("MESSAGE_DELETE", onDelete),
        () => FluxDispatcher.unsubscribe("MESSAGE_DELETE_BULK", onBulkDelete),
        () => FluxDispatcher.unsubscribe("MESSAGE_UPDATE", onUpdate),
      );

      cleanups.push(patchContextMenu());

      showToast("Message Logger loaded", getAssetIDByName("Check"));
    } catch (e) {
      console.error("[MessageLogger] Load error:", e);
      showToast("Failed to load Message Logger", getAssetIDByName("Small"));
    }
  },

  onUnload() {
    for (const fn of cleanups) {
      try { fn(); } catch (_) {}
    }
    cleanups.length = 0;
    shadow.clear();
    showToast("Message Logger unloaded", getAssetIDByName("Check"));
  },

  settings: Settings,
};