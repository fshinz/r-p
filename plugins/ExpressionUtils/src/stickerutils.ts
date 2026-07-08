import { after, instead } from "@vendetta/api/patcher";
import { showToast } from "@vendetta/api/ui/toasts";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { clipboard, ReactNative } from "@vendetta/metro/common";
import { Button } from "@vendetta/metro/common/components";
import React from "react";

const { hideActionSheet } = findByProps("hideActionSheet") || {};

const UserSettingsProtoStore =
    findByStoreName("UserSettingsProtoStore");

const GuildStore =
    findByStoreName("GuildStore");

const StickerUtils =
    findByProps(
        "favoriteSticker",
        "unfavoriteSticker"
    );

const { downloadMediaAsset } =
    findByProps("downloadMediaAsset") || {};

const LazyActionSheet =
    findByProps("openLazy", "hideActionSheet");


export function patchStickerActionSheet() {

    let patched = false;


    if (!LazyActionSheet)
        return () => {};


    const unpatch = after(
        "openLazy",
        LazyActionSheet,
        (args) => {


            const lazyRecord =
                args?.[0]?._j?.default;


            if (!lazyRecord)
                return;


            if (
                lazyRecord.type?.name !==
                "StickerDetailActionSheet"
            )
                return;


            if (patched)
                return;


            patched = true;



            instead(
                "type",
                lazyRecord,
                (componentArgs, original) => {


                    const res =
                        original(...componentArgs);


                    const view =
                        res?.props?.children;


                    if (
                        !view?.props?.children?.props?.sticker
                    )
                        return res;



                    const sticker =
                        view.props.children.props.sticker;


                    const children =
                        React.Children.toArray(
                            view.props.children
                        );


                    const url =
                        `https://discord.com/stickers/${sticker.id}.png`;



                    const favorites =
                        UserSettingsProtoStore
                        ?.frecencyWithoutFetchingLatest
                        ?.favoriteStickers
                        ?.stickerIds || [];


                    const isFavorited =
                        favorites.includes(
                            sticker.id
                        );


                    const inGuild =
                        sticker.guild_id
                            ? GuildStore?.getGuild(sticker.guild_id)
                            : true;



                    const buttons = [
                        inGuild && {
                            key: "favoriteSticker",
                            text: isFavorited
                                ? "Remove from Favorites"
                                : "Add to Favorites",

                            onPress() {

                                if (isFavorited)
                                    StickerUtils.unfavoriteSticker(sticker.id);
                                else
                                    StickerUtils.favoriteSticker(sticker.id);


                                showToast(
                                    isFavorited
                                        ? "Removed from favorites!"
                                        : "Added to favorites!"
                                );


                                hideActionSheet?.();

                            }
                        },


                        {
                            key: "saveSticker",

                            text:
                            `Save image to ${
                                ReactNative.Platform.select({
                                    android:"Downloads",
                                    default:"Camera Roll"
                                })
                            }`,

                            onPress() {

                                downloadMediaAsset(url,0);
                                hideActionSheet?.();

                            }
                        },


                        {
                            key:"copyStickerURL",

                            text:"Copy Sticker URL",

                            onPress(){

                                clipboard.setString(url);
                                showToast(
                                    "Copied sticker URL!"
                                );

                            }
                        },


                        {
                            key:"copyStickerMarkdown",

                            text:"Copy Markdown",

                            onPress(){

                                clipboard.setString(
                                    `<:sticker:${sticker.id}>`
                                );

                                showToast(
                                    "Copied sticker markdown!"
                                );

                            }
                        }

                    ].filter(Boolean);



                    buttons.forEach(
                        (btn:any)=>{

                            if(
                                !children.some(
                                    (c:any)=>
                                    React.isValidElement(c)
                                    &&
                                    c.key===btn.key
                                )
                            ){

                                children.push(
                                    React.createElement(
                                        Button,
                                        {
                                            key:btn.key,
                                            text:btn.text,
                                            onPress:btn.onPress,
                                            style:{
                                                marginTop:8
                                            }
                                        }
                                    )
                                );

                            }

                        }
                    );



                    return React.cloneElement(
                        res,
                        {
                            children:
                            React.cloneElement(
                                view,
                                {
                                    children
                                }
                            )
                        }
                    );

                }
            );

        }
    );


    return () => {
        unpatch();
    };
}