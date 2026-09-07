import { logger } from "@vendetta";
import { findByProps, findByName, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

let unpatchButton: (() => void) | null = null;

function applyTypePatch(YouBarNotificationsButton: any) {
    if (unpatchButton || !YouBarNotificationsButton?.type) return;

    logger.log("[BetterInbox] Hooked YouBarNotificationsButton.type");

    unpatchButton = after("type", YouBarNotificationsButton, (_, res) => {
        if (!res?.props?.children) return res;

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

        const IconButton = res.props.children.type;
        const originalProps = res.props.children.props;

        if (!IconButton) return res;

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
                    res
                )}
            </React.Fragment>
        );
    });
}

export function patchYouBar(): () => void {
    // 1. Try finding it immediately if Metro already evaluated it
    const existingComponent = findByTypeName("YouBarNotificationsButton");
    if (existingComponent) {
        applyTypePatch(existingComponent);
    }

    // 2. Intercept Metro's `findByTypeName` lookup so we catch it the exact millisecond Metro loads/requires it
    const metroModule = findByProps("findByTypeName");
    let unpatchMetroLookup: (() => void) | null = null;

    if (metroModule) {
        unpatchMetroLookup = after("findByTypeName", metroModule, ([name], result) => {
            if (name === "YouBarNotificationsButton" && result) {
                applyTypePatch(result);
            }
            return result;
        });
    }

    // Cleanup hook
    return () => {
        if (unpatchButton) {
            unpatchButton();
            unpatchButton = null;
        }
        if (unpatchMetroLookup) {
            unpatchMetroLookup();
            unpatchMetroLookup = null;
        }
    };
}
