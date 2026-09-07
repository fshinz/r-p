import { logger } from "@vendetta";
import { findByProps, findByName, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

export function patchYouBar(): () => void {
    const YouBarNotificationsButton = findByTypeName("YouBarNotificationsButton");
    if (!YouBarNotificationsButton) {
        logger.error("[BetterInbox] YouBarNotificationsButton component not found!");
        return () => {};
    }

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

    logger.log("[BetterInbox] Patching YouBarNotificationsButton.type...");

    return instead("type", YouBarNotificationsButton, (args, OriginalRender) => {
        const res = OriginalRender(...args);
        if (!res?.props?.children) return res;

        // Extract internal IconButton component and native layout props
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

