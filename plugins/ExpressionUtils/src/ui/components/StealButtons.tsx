import { showToast } from "@vendetta/api/ui/toasts";
import { clipboard, ReactNative } from "@vendetta/metro/common";
import { Button } from "@vendetta/metro/common/components";

import {
    downloadMediaAsset,
    LazyActionSheet
} from "../../modules";

import {
    showAddToServerActionSheet
} from "../sheets/AddToServerActionSheet";


export default function StealButtons(
    {emoji}: {emoji:any}
){

    const emojiName =
        emoji.alt ??
        emoji.name ??
        "emoji";


    let emojiId =
        emoji.id;


    if(!emojiId && typeof emoji.src==="string"){

        const match =
            emoji.src.match(
                /emojis\/(\d+)/
            );

        if(match)
            emojiId = match[1];

    }



    async function saveImage(){

        await downloadMediaAsset(
            emoji.src,
            0
        );

        LazyActionSheet?.hideActionSheet?.();

    }



    const buttons = [

        {
            text:"Add to Server",

            callback(){

                showAddToServerActionSheet(
                    emoji
                );

            }
        },


        {
            text:
            `Save image to ${
                ReactNative.Platform.select({
                    android:"Downloads",
                    default:"Camera Roll"
                })
            }`,

            callback:saveImage
        },


        {
            text:"Copy Emoji URL",

            callback(){

                clipboard.setString(
                    emoji.src
                );

                showToast(
                    "Copied emoji URL!"
                );

            }
        },


        {
            text:"Copy Markdown",

            callback(){

                if(emojiId){

                    clipboard.setString(
                        `<${emoji.animated?"a":""}:${emojiName}:${emojiId}>`
                    );

                    showToast(
                        "Copied emoji markdown!"
                    );

                }

            }
        }

    ];


    return (
        <>
            {buttons.map(
                ({text,callback})=>(
                    <Button
                        key={text}
                        text={text}
                        onPress={callback}
                        style={{
                            marginTop:8
                        }}
                    />
                )
            )}
        </>
    );
}