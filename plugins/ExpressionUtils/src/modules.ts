import { findByProps } from "@metro";
import { findByPropsLazy, findByStoreName } from "@metro/wrappers";

export const Surrogates = findByPropsLazy("convertSurrogateToName")?.();
export const LazyActionSheet = findByPropsLazy("hideActionSheet")?.();
export const MediaModalUtils = findByPropsLazy("openMediaModal")?.();
export const Emojis = findByProps("uploadEmoji");

export const {
    BottomSheetFlatList
} = findByPropsLazy("BottomSheetScrollView")?.() || {};

export const EmojiStore = findByStoreName("EmojiStore");
export const GuildStore = findByStoreName("GuildStore");
export const PermissionsStore = findByStoreName("PermissionStore");

export const {
    default: GuildIcon,
    GuildIconSizes
} = findByPropsLazy("GuildIconSizes")?.() || {};

export const {
    downloadMediaAsset
} = findByProps("downloadMediaAsset") || {};