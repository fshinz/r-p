import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { logger } from "@vendetta";
import { React } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";

const ActionSheet = findByProps(
    "openLazy",
    "hideActionSheet"
);

const { ActionSheetRow } =
    findByProps("ActionSheetRow");

const MentionIcon =
    getAssetIDByName("ic_mention_24px") ??
    getAssetIDByName("MentionIcon") ??
    getAssetIDByName("mention");

const sleep = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));

function extractIdsFromText(
    text: string
): string[] {
    if (!text) return [];

    return [
        ...text.matchAll(/<@!?(\d+)>/g)
    ].map(match => match[1]);
}

function extractAllMentionIds(
    message: any
): string[] {
    const ids = new Set<string>();

    function scan(value: any) {
        if (typeof value === "string") {
            for (const id of extractIdsFromText(value)) {
                ids.add(id);
            }

            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                scan(item);
            }

            return;
        }

        if (
            value &&
            typeof value === "object"
        ) {
            for (
                const child of Object.values(value)
            ) {
                scan(child);
            }
        }
    }

    scan(message.content);
    scan(message.embeds);

    return [...ids];
}

function isUserCached(
    userId: string
): boolean {
    const UserStore = findByProps(
        "getUser",
        "getCurrentUser"
    );

    return !!UserStore?.getUser?.(
        userId
    );
}

async function fetchUsersViaGateway(
    userIds: string[]
): Promise<boolean> {
    const GatewayConnection =
        findByProps(
            "getGateway",
            "send"
        );

    const SelectedGuildStore =
        findByProps(
            "getGuildId",
            "getChannelId"
        );

    const currentGuildId =
        SelectedGuildStore?.getGuildId?.();

    if (!currentGuildId) {
        return false;
    }

    const ws =
        GatewayConnection?.getGateway?.();

    if (!ws) {
        return false;
    }

    ws.send(8, {
        guild_id: currentGuildId,
        user_ids: userIds,
        presences: false,
    });

    await sleep(400);

    return true;
}

async function fetchUsersViaAPI(
    userId: string,
    token: string,
    API: any,
    Dispatcher: any
) {
    const cleanToken =
        typeof token === "string"
            ? token
            : token?.token || "";

    const res = await API.get({
        url: `/users/${userId}`,
        headers: {
            Authorization:
                cleanToken.trim(),
        },
    });

    if (!res.body) {
        throw new Error(
            "Empty API response body"
        );
    }

    Dispatcher.dispatch({
        type: "USER_UPDATE",
        user: res.body,
    });

    return res.body.username;
}

async function fixUnknownMentions(
    message: any
) {
    const ids =
        extractAllMentionIds(message);

    if (ids.length === 0) {
        return;
    }

    const uncachedIds =
        ids.filter(
            userId =>
                !isUserCached(userId)
        );

    if (uncachedIds.length === 0) {
        return;
    }

    const BULK_THRESHOLD = 5;

    let gatewaySuccess = false;

    const SelectedGuildStore =
        findByProps("getGuildId");

    if (
        uncachedIds.length >
            BULK_THRESHOLD &&
        SelectedGuildStore?.getGuildId?.()
    ) {
        gatewaySuccess =
            await fetchUsersViaGateway(
                uncachedIds
            );
    }

    if (gatewaySuccess) {
        return;
    }

    const API =
        findByProps("get", "post");

    const Dispatcher =
        findByProps(
            "dispatch",
            "subscribe"
        );

    const TokenStore =
        findByProps("getToken");

    const token =
        TokenStore?.getToken?.();

    if (!token) {
        return;
    }

    const safetyDelay =
        uncachedIds.length > 10
            ? 450
            : 250;

    for (
        let i = 0;
        i < uncachedIds.length;
        i++
    ) {
        const userId =
            uncachedIds[i];

        try {
            await fetchUsersViaAPI(
                userId,
                token,
                API,
                Dispatcher
            );
        } catch (err) {
            logger.error(
                `[ValidUser] Fetch failed for ${userId}:`,
                err
            );
        }

        if (
            i <
            uncachedIds.length - 1
        ) {
            await sleep(
                safetyDelay
            );
        }
    }
}

const processingMessages =
    new Set<string>();

async function processMessage(
    message: any
) {
    if (!message?.id) {
        return;
    }

    const ids =
        extractAllMentionIds(message);

    if (ids.length === 0) {
        return;
    }

    const uncachedIds =
        ids.filter(
            userId =>
                !isUserCached(userId)
        );

    if (uncachedIds.length === 0) {
        return;
    }

    const key =
        `${message.channel_id}:${message.id}`;

    if (
        processingMessages.has(key)
    ) {
        return;
    }

    processingMessages.add(key);

    try {
        await fixUnknownMentions(
            message
        );
    } catch (err) {
        logger.error(
            "[ValidUser] Automatic fix failed:",
            err
        );
    } finally {
        processingMessages.delete(key);
    }
}

let unsubMessageCreate:
    (() => void) | null = null;

let unsubMessageUpdate:
    (() => void) | null = null;

let unpatchOpenLazy:
    (() => void) | null = null;

export default {
    onLoad() {
        const Dispatcher =
            findByProps(
                "dispatch",
                "subscribe"
            );

        /*
         * Automatically detect
         * mentions in messages
         * and embeds.
         */
        const onMessageCreate =
            (payload: any) => {
                const message =
                    payload?.message;

                if (!message) {
                    return;
                }

                processMessage(
                    message
                );
            };

        const onMessageUpdate =
            (payload: any) => {
                const message =
                    payload?.message;

                if (!message) {
                    return;
                }

                processMessage(
                    message
                );
            };

        Dispatcher.subscribe(
            "MESSAGE_CREATE",
            onMessageCreate
        );

        Dispatcher.subscribe(
            "MESSAGE_UPDATE",
            onMessageUpdate
        );

        unsubMessageCreate =
            () =>
                Dispatcher.unsubscribe(
                    "MESSAGE_CREATE",
                    onMessageCreate
                );

        unsubMessageUpdate =
            () =>
                Dispatcher.unsubscribe(
                    "MESSAGE_UPDATE",
                    onMessageUpdate
                );

        /*
         * Add manual action-sheet
         * button.
         */
        unpatchOpenLazy =
            before(
                "openLazy",
                ActionSheet,
                ([comp, args, msg]) => {
                    if (
                        args !==
                            "MessageLongPressActionSheet" ||
                        !msg?.message
                    ) {
                        return;
                    }

                    const message =
                        msg.message;

                    const ids =
                        extractAllMentionIds(
                            message
                        );

                    if (
                        ids.length === 0
                    ) {
                        return;
                    }

                    comp.then(
                        (instance: any) => {
                            const unpatch =
                                after(
                                    "default",
                                    instance,
                                    (
                                        _args,
                                        component
                                    ) => {
                                        React.useEffect(
                                            () =>
                                                () =>
                                                    unpatch(),
                                            []
                                        );

                                        const groups =
                                            findInReactTree(
                                                component,
                                                (c: any) =>
                                                    Array.isArray(
                                                        c
                                                    ) &&
                                                    c[0]
                                                        ?.type
                                                        ?.name ===
                                                        "ActionSheetRowGroup"
                                            );

                                        if (
                                            !groups?.length
                                        ) {
                                            return;
                                        }

                                        const fixButton =
                                            React.createElement(
                                                ActionSheetRow,
                                                {
                                                    label:
                                                        ids.length ===
                                                        1
                                                            ? "Fix Unknown Mention"
                                                            : `Fix ${ids.length} Unknown Mentions`,

                                                    icon:
                                                        React.createElement(
                                                            ActionSheetRow.Icon,
                                                            {
                                                                source:
                                                                    MentionIcon,
                                                            }
                                                        ),

                                                    onPress:
                                                        () => {
                                                            ActionSheet.hideActionSheet();

                                                            fixUnknownMentions(
                                                                message
                                                            );
                                                        },
                                                }
                                            );

                                        let inserted =
                                            false;

                                        for (
                                            let gi = 0;
                                            gi <
                                            groups.length;
                                            gi++
                                        ) {
                                            const groupChildren =
                                                findInReactTree(
                                                    groups[gi],
                                                    (c: any) =>
                                                        Array.isArray(
                                                            c
                                                        ) &&
                                                        c.some(
                                                            (
                                                                child: any
                                                            ) =>
                                                                child
                                                                    ?.type
                                                                    ?.name ===
                                                                "ActionSheetRow"
                                                        )
                                                );

                                            if (
                                                !groupChildren
                                            ) {
                                                continue;
                                            }

                                            groupChildren.unshift(
                                                fixButton
                                            );

                                            inserted =
                                                true;

                                            break;
                                        }

                                        if (
                                            !inserted
                                        ) {
                                            groups.unshift(
                                                React.createElement(
                                                    ActionSheetRow.Group,
                                                    null,
                                                    fixButton
                                                )
                                            );
                                        }
                                    }
                                );
                        }
                    );
                }
            );
    },

    onUnload() {
        unsubMessageCreate?.();
        unsubMessageCreate =
            null;

        unsubMessageUpdate?.();
        unsubMessageUpdate =
            null;

        unpatchOpenLazy?.();
        unpatchOpenLazy =
            null;

        processingMessages.clear();
    },
};