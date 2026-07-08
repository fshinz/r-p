import { after, instead } from "@vendetta/api/patcher";
import { showToast } from "@vendetta/api/ui/toasts";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { clipboard, React, ReactNative } from "@vendetta/metro/common";
import { Button } from "@vendetta/metro/common/components";

const { hideActionSheet } = findByProps("hideActionSheet") ?? {};
const UserSettingsProtoStore = findByStoreName("UserSettingsProtoStore");
const GuildStore = findByStoreName("GuildStore");
const StickerUtils = findByProps("favoriteSticker", "unfavoriteSticker");
const { downloadMediaAsset } = findByProps("downloadMediaAsset") ?? {};
const ActionSheet = findByProps("hideActionSheet");

export function patchStickerActionSheet() {
    let patched = false;

    return after("openLazy", ActionSheet, (args) => {
        const lazyRecord = args?.[0]?._j?.default;

        if (!lazyRecord) return;
        if (lazyRecord.type?.name !== "StickerDetailActionSheet") return;
        if (patched) return;

        patched = true;

        instead("type", lazyRecord, (componentArgs, original) => {
            const res = original(...componentArgs);

            const view = res?.props?.children;
            const sticker = view?.props?.children?.props?.sticker;

            if (!sticker) return res;

            const children = React.Children.toArray(view.props.children);

            const url = `https://discord.com/stickers/${sticker.id}.png`;

            const favoritedStickers =
                UserSettingsProtoStore
                    ?.frecencyWithoutFetchingLatest
                    ?.favoriteStickers
                    ?.stickerIds as string[] | undefined;

            const isFavorited = !!favoritedStickers?.includes(sticker.id);

            const isInStickerGuild = sticker.guild_id
                ? GuildStore?.getGuild(sticker.guild_id) !== undefined
                : true;

            const buttons = [
                isInStickerGuild && {
                    key: "togglefavoritesticker",
                    text: isFavorited
                        ? "Remove from Favorites"
                        : "Add to Favorites",
                    onPress: () => {
                        if (isFavorited) {
                            StickerUtils?.unfavoriteSticker(sticker.id);
                            showToast("Removed from favorites!");
                        } else {
                            StickerUtils?.favoriteSticker(sticker.id);
                            showToast("Added to favorites!");
                        }

                        hideActionSheet?.();
                    },
                },

                {
                    key: "savesticker",
                    text: `Save image to ${ReactNative.Platform.select({
                        android: "Downloads",
                        default: "Camera Roll",
                    })}`,
                    onPress: () => {
                        downloadMediaAsset?.(url, 0);
                        hideActionSheet?.();
                    },
                },

                {
                    key: "copystickerurl",
                    text: "Copy Sticker URL",
                    onPress: () => {
                        clipboard.setString(url);
                        showToast("Copied sticker URL!");
                        hideActionSheet?.();
                    },
                },

                {
                    key: "copystickermarkdown",
                    text: "Copy Markdown",
                    onPress: () => {
                        clipboard.setString(`<:sticker:${sticker.id}>`);
                        showToast("Copied sticker markdown!");
                        hideActionSheet?.();
                    },
                },
            ].filter(Boolean);

            for (const btn of buttons) {
                if (
                    !children.some(
                        (c: any) =>
                            React.isValidElement(c) &&
                            c.key === btn.key
                    )
                ) {
                    children.push(
                        React.createElement(Button, {
                            key: btn.key,
                            text: btn.text,
                            onPress: btn.onPress,
                            style: { marginTop: 8 },
                        })
                    );
                }
            }

            const newView = React.cloneElement(view, { children });

            return React.cloneElement(res, {
                children: newView,
            });
        });
    });
}