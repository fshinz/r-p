import { findByProps } from "@vendetta/metro";
import { findByPropsLazy, findByStoreName } from "@vendetta/metro/wrappers";

export const LazyActionSheet = findByPropsLazy("hideActionSheet")?.();
export const Emojis = findByPropsLazy("uploadEmoji")?.();

export const EmojiStore = findByStoreName("EmojiStore");
export const GuildStore = findByStoreName("GuildStore");
export const PermissionsStore = findByStoreName("PermissionStore");

export const {
    downloadMediaAsset
} = findByProps("downloadMediaAsset") || {};