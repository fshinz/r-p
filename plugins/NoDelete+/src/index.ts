import settings from "./settings";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

// Set default storage values directly without external helpers
storage.ignore ??= { users: [], channels: [], bots: false };
storage.ignore.users ??= [];
storage.ignore.channels ??= [];
storage.ignore.bots ??= false;
storage.timestamps ??= false;
storage.ew ??= false;
storage.onlyTimestamps ??= false;

let MessageStore: any;
let deleteable: string[] = [];
const patches: Array<() => void> = [];

export default {
  settings,
  onUnload() {
    for (const unpatch of patches) unpatch();
  },
  onLoad() {
    try {
      // 1. Dispatcher Patch: Intercept deletions and updates
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args: any[]) => {
          try {
            if (!MessageStore) MessageStore = findByStoreName("MessageStore");
            const event = args[0];

            if (!event) return;

            // Prevent loss of embeds when Discord sends an empty MESSAGE_UPDATE before deleting
            if (event.type === "MESSAGE_UPDATE" && event.message?.id) {
              const oldMsg = MessageStore.getMessage(event.message.channelId, event.message.id);
              if (oldMsg?.embeds?.length && !event.message.embeds?.length) {
                event.message.embeds = oldMsg.embeds;
              }
              return args;
            }

            // Intercept MESSAGE_DELETE
            if (event.type !== "MESSAGE_DELETE" || !event?.id || !event?.channelId) return;

            const message = MessageStore.getMessage(event.channelId, event.id);

            if (storage.ignore.users.includes(message?.author?.id)) return;
            if (storage.ignore.bots && message?.author?.bot) return;

            if (deleteable.includes(event.id)) {
              deleteable.splice(deleteable.indexOf(event.id), 1);
              return args;
            }
            deleteable.push(event.id);

            let automodMessage = "This message was deleted";
            if (storage.timestamps) {
              automodMessage += ` (${moment().format(storage.ew ? "hh:mm:ss.SS a" : "HH:mm:ss.SS")})`;
            }

            // Overwrite the event to prevent MessageStore from clearing content & embeds
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
            return args;
          } catch (e) {
            console.error("[NoDelete -> Dispatcher error]", e);
          }
        })
      );

      // 2. Context Menu Patch: Ignore/Unignore users from profile overflow menu
      const contextMenuUnpatch = patchBefore("render", findByProps("ScrollView").View, (args: any[]) => {
        try {
          const treeMatch = findInReactTree(args, (r) => r?.key === ".$UserProfileOverflow");
          if (!treeMatch || !treeMatch.props || treeMatch.props.sheetKey !== "UserProfileOverflow") return;

          const props = treeMatch.props.content.props;
          const optionLabels = ["Ignore User (NoDelete)", "Stop Ignoring User (NoDelete)"];

          if (props.options.some((option: any) => optionLabels.includes(option?.label))) return;

          const focusedUserId = Object.keys(treeMatch._owner.stateNode._keyChildMapping)
            .find((str) => treeMatch._owner.stateNode._keyChildMapping[str] && str.match(/(?<=\$UserProfile)\d+/))
            ?.slice?.(".$UserProfile".length);

          const optionPosition = props.options.findLastIndex((option: any) => option?.isDestructive);

          if (!storage.ignore.users.includes(focusedUserId)) {
            props.options.splice(optionPosition + 1, 0, {
              isDestructive: true,
              label: optionLabels[0],
              onPress: () => {
                storage.ignore.users.push(focusedUserId);
                showToast(`Ignoring deleted messages from ${props.header.title}`);
                props.hideActionSheet();
              },
            });
          } else {
            props.options.splice(optionPosition + 1, 0, {
              label: optionLabels[1],
              onPress: () => {
                const index = storage.ignore.users.indexOf(focusedUserId);
                if (index > -1) storage.ignore.users.splice(index, 1);
                showToast(`Stopped ignoring ${props.header.title}`);
                props.hideActionSheet();
              },
            });
          }
        } catch (e) {
          console.error("[NoDelete -> ContextMenu error]", e);
        }
      });

      patches.push(contextMenuUnpatch);
    } catch (e) {
      console.error("[NoDelete -> Setup error]", e);
    }
  },
};
