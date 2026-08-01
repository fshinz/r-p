import settings from "./settings";
import { FluxDispatcher, moment } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { before as patchBefore } from "@vendetta/patcher";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";

// Initialize default storage values
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

            // Retrieve cached message instance from MessageStore
            const message = MessageStore.getMessage(event.channelId, event.id);
            if (!message) return; // Allow delete if not cached in memory

            // User & Bot filters
            if (storage.ignore.users.includes(message?.author?.id)) return;
            if (storage.ignore.bots && message?.author?.bot) return;

            if (deleteable.includes(event.id)) {
              deleteable.splice(deleteable.indexOf(event.id), 1);
              return args;
            }
            deleteable.push(event.id);

            // Construct deletion timestamp notice
            let deletedNotice = " `[deleted]`";
            if (storage.timestamps) {
              deletedNotice = ` \`[deleted at ${moment().format(storage.ew ? "hh:mm:ss.SS a" : "HH:mm:ss.SS")}]\``;
            }

            // Preserve full original message content & append notice
            const originalText = message.content || message.rawContent || "";
            if (!originalText.includes("`[deleted")) {
              message.content = originalText + deletedNotice;
            }

            // Flag message as deleted internally
            message.deleted = true;

            // Preserve existing embeds and attachments in memory so they don't get stripped
            if (message.embeds && Array.isArray(message.embeds)) {
              message.embeds = [...message.embeds];
            }
            if (message.attachments && Array.isArray(message.attachments)) {
              message.attachments = [...message.attachments];
            }

            // Mute the deletion event type so MessageStore and UI stores ignore the deletion
            event.type = "NODELETE_PREVENT_DELETE";
            return args;
          } catch (e) {
            console.error("[NoDelete+ -> Dispatcher error]", e);
          }
        })
      );

      // Context menu patch for user ignore list
      const contextMenuUnpatch = patchBefore("render", findByProps("ScrollView").View, (args: any[]) => {
        try {
          const treeMatch = findInReactTree(args, (r) => r?.key === ".$UserProfileOverflow");
          if (!treeMatch || !treeMatch.props || treeMatch.props.sheetKey !== "UserProfileOverflow") return;

          const props = treeMatch.props.content.props;
          const optionLabels = ["Ignore User (NoDelete)", "Stop Ignoring User (NoDelete)"];

          if (props.options.some((option: any) => option?.label && optionLabels.includes(option.label))) return;

          const focusedUserId = Object.keys(treeMatch._owner.stateNode._keyChildMapping)
            .find((str) => treeMatch._owner.stateNode._keyChildMapping[str] && str.match(/(?<=\$UserProfile)\d+/))
            ?.slice?.(".$UserProfile".length);

          if (!focusedUserId) return;

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
