import settings from "./settings";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

// Initialize default settings
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
      patches.push(
        patchBefore("dispatch", FluxDispatcher, (args: any[]) => {
          try {
            if (!MessageStore) MessageStore = findByStoreName("MessageStore");
            const event = args[0];

            if (!event || event.type !== "MESSAGE_DELETE" || !event?.id || !event?.channelId) return;

            // Fetch the actual cached Record object from MessageStore
            const message = MessageStore.getMessage(event.channelId, event.id);
            if (!message) return; // Allow deletion if not in local cache

            if (storage.ignore.users.includes(message?.author?.id)) return;
            if (storage.ignore.bots && message?.author?.bot) return;

            if (deleteable.includes(event.id)) {
              deleteable.splice(deleteable.indexOf(event.id), 1);
              return args;
            }
            deleteable.push(event.id);

            // Create timestamp notice string
            let deletedNotice = " `[deleted]`";
            if (storage.timestamps) {
              deletedNotice = ` \`[deleted at ${moment().format(storage.ew ? "hh:mm:ss.SS a" : "HH:mm:ss.SS")}]\``;
            }

            // Safely update the content without breaking the author's internal avatar properties
            if (message.content !== undefined && !message.content.includes("`[deleted`")) {
              message.content = (message.content || "") + deletedNotice;
            }

            // Flag the message internally so UI re-renders the row safely
            message.deleted = true;

            // Force Discord UI row to re-render without firing a cache-purging event
            FluxDispatcher.dispatch({
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
                message: "This message was deleted",
              },
            });

            // Prevent MESSAGE_DELETE from reaching MessageStore
            args[0] = { type: "NODELETE_PREVENT_DELETE" };
            return args;
          } catch (e) {
            console.error("[NoDelete+ -> Dispatcher error]", e);
          }
        })
      );

      // Add ignore option to User Profile overflow menu
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
          console.error("[NoDelete+ -> ContextMenu error]", e);
        }
      });

      patches.push(contextMenuUnpatch);
    } catch (e) {
      console.error("[NoDelete+ -> Setup error]", e);
    }
  },
};
