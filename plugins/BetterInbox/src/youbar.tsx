import { logger } from "@vendetta";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { findByProps, findByName } from "@vendetta/metro";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

let unpatchCreateElement: (() => void) | null = null;

export function patchYouBar(): () => void {
    if (unpatchCreateElement) return () => {};

    logger.log("[BetterInbox] Hooking React.createElement directly (No Metro lookups)");

    // Hook React's rendering pipeline directly
    unpatchCreateElement = after("createElement", React, ([type, props], res) => {
        // Inspect every rendered element on the fly without Metro searching
        if (type?.displayName !== "YouBarNotificationsButton" && type?.typeName !== "YouBarNotificationsButton") {
            return res;
        }

        // If it's YouBarNotificationsButton, intercept its children
        const targetType = res?.type;
        if (!targetType) return res;

        return React.cloneElement(res, {
            ...res.props,
            children: (...args: any[]) => {
                const childRes = typeof res.props?.children === "function" 
                    ? res.props.children(...args) 
                    : res.props?.children;

                if (!childRes?.props?.children) return childRes;

                const Navigation = findByProps("push", "pushLazy", "pop");
                const Navigator = findByName("Navigator") ?? findByProps("Navigator")?.Navigator;
                const modalCloseButton =
                    findByProps("getRenderCloseButton")?.getRenderCloseButton ??
                    findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

                const userSettingsAction = findByProps("openUserSettings");
                const transitionModule = findByProps("transitionToGuild");

                const BellIcon = getAssetIDByName("BellIcon") || getAssetIDByName("NotificationBellIcon");
                const SettingsIcon = getAssetIDByName("SettingsIcon");
                const ChatIcon = getAssetIDByName("ChatIcon");

                const openInbox = () => {
                    if (!Navigator || !Navigation?.push) return;
                    Navigation.push(() => (
                        <Navigator
                            initialRouteName="YouBarInbox"
                            goBackOnBackPress
                            screens={{
                                YouBarInbox: {
                                    title: "Inbox",
                                    headerLeft: modalCloseButton?.(() => Navigation.pop()),
                                    render: () => <NotificationCenterUI />,
                                },
                            }}
                        />
                    ));
                };

                const IconButton = childRes.props.children.type;
                const originalProps = childRes.props.children.props;

                if (!IconButton) return childRes;

                return (
                    <React.Fragment>
                        {storage.showDMButton && (
                            <IconButton
                                key="betterinbox-dm"
                                variant={originalProps?.variant || "tertiary"}
                                size={originalProps?.size || "sm"}
                                icon={ChatIcon}
                                onPress={() => transitionModule?.transitionToGuild?.("@me")}
                            />
                        )}

                        {storage.showSettingsButton && (
                            <IconButton
                                key="betterinbox-settings"
                                variant={originalProps?.variant || "tertiary"}
                                size={originalProps?.size || "sm"}
                                icon={SettingsIcon}
                                onPress={() => userSettingsAction?.openUserSettings?.()}
                            />
                        )}

                        {storage.showInboxButton ? (
                            <IconButton
                                key="betterinbox-inbox"
                                variant={originalProps?.variant || "tertiary"}
                                size={originalProps?.size || "sm"}
                                icon={BellIcon || originalProps?.icon}
                                onPress={openInbox}
                            />
                        ) : (
                            childRes
                        )}
                    </React.Fragment>
                );
            }
        });
    });

    return () => {
        if (unpatchCreateElement) {
            unpatchCreateElement();
            unpatchCreateElement = null;
        }
    };
}
