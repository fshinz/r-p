import patchMessageEmojiActionSheet from "./patchMessageEmojiActionSheet";
import { patchStickerActionSheet } from "./stickerutils";

const unpatches: (() => void)[] = [];

export default {
    onLoad() {
        unpatches.push(patchMessageEmojiActionSheet());
        unpatches.push(patchStickerActionSheet());
    },

    onUnload() {
        for (const unpatch of unpatches) unpatch();
        unpatches.length = 0;
    },
};