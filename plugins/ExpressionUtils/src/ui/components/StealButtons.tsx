import { showToast } from "@vendetta/api/ui/toasts";
import { clipboard, React, ReactNative } from "@vendetta/metro/common";
import { Button } from "@vendetta/metro/common/components";

import { downloadMediaAsset, LazyActionSheet } from "../../modules";
import { showAddToServerActionSheet } from "../sheets/AddToServerActionSheet";

export default function StealButtons({ emoji }: { emoji: any }) {
    const emojiName = emoji.alt ?? emoji.name ?? "emoji";

    let emojiId = emoji.id;

    if (!emojiId && typeof emoji.src === "string") {
        const match = emoji.src.match(
            /discordapp\.com\/emojis\/(\d+)\.(?:png|gif|webp)/
        );

        if (match) {
            emojiId = match[1];
        }
    }

    async function saveImage() {
        await downloadMediaAsset(emoji.src, 0);
        LazyActionSheet?.hideActionSheet?.();
    }

    async function copyImageToClipboard() {
        const response = await fetch(emoji.src);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.readAsDataURL(blob);

        reader.onloadend = () => {
            const base64data = reader.result as string;
            clipboard.setString(base64data);
            showToast(`Copied ${emojiName}'s image to clipboard`);
        };
    }

    const buttons = [
        {
            text: "Add to Server",
            callback: () => {
                showAddToServerActionSheet(emoji);
            },
        },

        {
            text: `Save image to ${ReactNative.Platform.select({
                android: "Downloads",
                default: "Camera Roll",
            })}`,
            callback: saveImage,
        },

        {
            text: "Copy Emoji URL",
            callback: () => {
                clipboard.setString(emoji.src);
                showToast("Copied emoji URL!");
            },
        },

        {
            text: "Copy Markdown",
            callback: () => {
                if (emojiId) {
                    const markdown = `<${emoji.animated ? "a" : ""}:${emojiName}:${emojiId}>`;
                    clipboard.setString(markdown);
                    showToast("Copied emoji markdown!");
                } else if (emoji.native) {
                    clipboard.setString(emoji.native);
                    showToast("Copied emoji character!");
                } else {
                    showToast("This emoji cannot be copied as markdown.");
                }
            },
        },

        ...ReactNative.Platform.select({
            ios: [
                {
                    text: "Copy image to clipboard",
                    callback: copyImageToClipboard,
                },
            ],
            default: [],
        }),
    ];

    return (
        <>
            {buttons.map(({ text, callback }) => (
                <Button
                    key={text}
                    text={text}
                    onPress={callback}
                    style={{
                        marginTop: ReactNative.Platform.select({
                            android: 8,
                            default: 12,
                        }),
                    }}
                />
            ))}
        </>
    );
}
