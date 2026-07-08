import { showToast } from "@vendetta/api/ui/toasts";
import { findByProps } from "@vendetta/metro";

import patchMessageEmojiActionSheet from "./patchMessageEmojiActionSheet";
import { patchStickerActionSheet } from "./stickerutils";

const unpatches: (() => void)[] = [];

export default {
    onLoad() {
        try {
            unpatches.push(patchMessageEmojiActionSheet());
            unpatches.push(patchStickerActionSheet());
        } catch (e) {
            console.error("[ExpressionUtils] Load error:", e);
            showToast("ExpressionUtils failed to load");
        }
    },

    onUnload() {
        for (const unpatch of unpatches) {
            try {
                unpatch();
            } catch {}
        }

        unpatches.length = 0;
    },
};