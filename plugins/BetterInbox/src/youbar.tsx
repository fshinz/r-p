import { logger } from "@vendetta";
import { findByProps, findByName, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

let unpatchType: (() => void) | null = null;

function applyTypePatch(targetComponent: any) {
    if (unpatchType || !targetComponent?.type) return;

    logger.log("[BetterInbox] Successfully hooked YouBarNotificationsButton.type");

    unpatchType = after("type", targetComponent, (_, res) => {
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
    // 1. Check if the module was already evaluated by Metro before plugin load
    const existingComponent = findByTypeName("YouBarNotificationsButton");
    if (existingComponent) {
        applyTypePatch(existingComponent);
    }

    // 2. Intercept Metro's lookup so we trap the component the instant Discord loads it
    const metroModule = findByProps("findByTypeName");
    let unpatchMetro: (() => void) | null = null;

    if (metroModule) {
        unpatchMetro = after("findByTypeName", metroModule, ([typeName], result) => {
            if (typeName === "YouBarNotificationsButton" && result) {
                applyTypePatch(result);
            }
            return result;
        });
    }

    return () => {
        if (unpatchType) {
            unpatchType();
            unpatchType = null;
        }
        if (unpatchMetro) {
            unpatchMetro();
            unpatchMetro = null;
        }
    };
}
