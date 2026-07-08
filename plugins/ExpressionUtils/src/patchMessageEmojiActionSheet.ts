import { after, before } from "@vendetta/api/patcher";
import { findInReactTree } from "@vendetta/lib/utils/findInReactTree";
import { findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";

import StealButtons from "./ui/components/StealButtons";

function patchSheet(sheetModule: any) {
    return after("default", sheetModule, (_args, res) => {
        const view = res?.props?.children?.props?.children;
        if (!view) return;

        const unpatchView = after("type", view, (_args, component) => {
            const isButton = (c: any) => c?.type?.name === "Button";

            const buttons = findInReactTree(
                component,
                (c: any) => Array.isArray(c) && c.some(isButton)
            );

            if (!buttons) return;

            buttons.push(
                React.createElement(StealButtons, {
                    emoji: _args?.[0]?.emoji
                })
            );

            unpatchView();
        });
    });
}

export default function patchMessageEmojiActionSheet() {
    const LazyActionSheet = findByProps(
        "openLazy",
        "hideActionSheet"
    );

    if (!LazyActionSheet) return () => {};

    const patches: (() => void)[] = [];

    const unpatch = before(
        "openLazy",
        LazyActionSheet,
        ([lazySheet, name]) => {
            if (
                ![
                    "MessageEmojiActionSheet",
                    "MessageCustomEmojiActionSheet"
                ].includes(name)
            ) return;

            lazySheet.then((module: any) => {
                patches.push(patchSheet(module));
            });
        }
    );

    return () => {
        unpatch();
        patches.forEach(p => p());
    };
}