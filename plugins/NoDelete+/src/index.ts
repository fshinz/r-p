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

// Helper: Color normalization for HSL/Hex to integer format
function hslaStringToInt(hsla: string): number {
  const match = hsla.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (!match) return 1974050;

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return (gray << 16) | (gray << 8) | gray;
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, h) * 255);
  const b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);

  return (r << 16) | (g << 8) | b;
}

function normalizeEmbedColor(color: string | number | null | undefined): number {
  if (color === undefined || color === null) return 1974050;
  if (typeof color === "number") return color;
  if (typeof color === "string" && color.startsWith("hsl")) {
    return hslaStringToInt(color);
  }
  return 1974050;
}

// Converts Discord's internal parsed embed model back into a valid raw embed structure
function toRawEmbed(embed: any): any {
  if (!embed) return embed;

  const raw: any = {
    type: embed.type,
    url: embed.url,
    color: normalizeEmbedColor(embed.color),
    timestamp: embed.timestamp,
    title: embed.rawTitle ?? (typeof embed.title === "string" ? embed.title : undefined),
    description: embed.rawDescription ?? (typeof embed.description === "string" ? embed.description : undefined),
    author: embed.author ? {
      name: embed.author.name,
      url: embed.author.url,
      icon_url: embed.author.iconURL,
      proxy_icon_url: embed.author.iconProxyURL
    } : undefined,
    image: embed.image ? {
      url: embed.image.url,
      proxy_url: embed.image.proxyURL,
      width: embed.image.width,
      height: embed.image.height,
    } : undefined,
    thumbnail: embed.thumbnail ? {
      url: embed.thumbnail.url,
      proxy_url: embed.thumbnail.proxyURL,
      width: embed.thumbnail.width,
      height: embed.thumbnail.height,
    } : undefined,
    video: embed.video,
    provider: embed.provider,
    footer: embed.footer ? {
      icon_url: embed.footer.iconURL,
      proxy_icon_url: embed.footer.iconProxyURL,
      ...embed.footer
    } : undefined,
  };

  if (Array.isArray(embed.fields)) {
    raw.fields = embed.fields.map((field: any) => ({
      name: field.rawName ?? (typeof field.name === "string" ? field.name : ""),
      value: field.rawValue ?? (typeof field.value === "string" ? field.value : ""),
      inline: field.inline,
    }));
  }

  return raw;
}

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

            const message = MessageStore.getMessage(event.channelId, event.id);
            if (!message) return; // Not cached in memory, allow delete event

            if (storage.ignore.users.includes(message?.author?.id)) return;
            if (storage.ignore.bots && message?.author?.bot) return;

            if (deleteable.includes(event.id)) {
              deleteable.splice(deleteable.indexOf(event.id), 1);
              return args;
            }
            deleteable.push(event.id);

            // Construct timestamp text indicator
            let deletedNotice = " `[deleted]`";
            if (storage.timestamps) {
              deletedNotice = ` \`[deleted at ${moment().format(storage.ew ? "hh:mm:ss.SS a" : "HH:mm:ss.SS")}]\``;
            }

            // Convert embeds back to raw format so Discord renders them properly
            const rawEmbeds = message.embeds?.length ? message.embeds.map(toRawEmbed) : [];

            // Dispatch an in-place update to mark the message as deleted without removing its data
            FluxDispatcher.dispatch({
              type: "MESSAGE_UPDATE",
              message: {
                id: event.id,
                channel_id: event.channelId,
                content: (message.content || "") + deletedNotice,
                embeds: rawEmbeds,
                attachments: message.attachments || [],
                components: message.components || [],
                edited_timestamp: message.editedTimestamp || new Date().toISOString(),
              },
            });

            // Neutralize the delete event so MessageStore doesn't purge it from UI
            args[0] = { type: "NODELETE_PREVENT_DELETE" };
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
