import { logger } from "@vendetta";
import { findByProps, findByName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

let isYouBarReady = false;

export function setYouBarReady(ready: boolean) {
    isYouBarReady = ready;
}

export function patchYouBar(): (() => void) | null {
    const YouBarModule = findByProps("YouBarButtonContainer", "YouBarButtonIcon");
    if (!YouBarModule?.YouBarButtonContainer || !YouBarModule?.YouBarButtonIcon) return null;

    const YouBarButtonIcon = YouBarModule.YouBarButtonIcon;

    return after("YouBarButtonContainer", YouBarModule, (_, res) => {
        // Safe Fallback: Don't modify initial cold-boot render pass at all
        if (!res || !isYouBarReady) return res;

        logger.log("[BetterInbox] YouBar ready - injecting custom buttons on animation frame");

        const BellIcon = getAssetIDByName("BellIcon") || getAssetIDByName("NotificationBellIcon");
        const SettingsIcon = getAssetIDByName("SettingsIcon");
        const ChatIcon = getAssetIDByName("ChatIcon");

        const openInbox = () => {
            const Navigation = findByProps("push", "pushLazy", "pop");
            const Navigator = findByName("Navigator") ?? findByProps("Navigator")?.Navigator;
            const modalCloseButton =
                findByProps("getRenderCloseButton")?.getRenderCloseButton ??
                findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

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

        const buttons: any[] = [];

        if (storage.showDMButton) {
            buttons.push(
                <YouBarButtonIcon
                    key="betterinbox-dm"
                    icon={ChatIcon}
                    onPress={() => {
                        const transitionModule = findByProps("transitionToGuild");
                        transitionModule?.transitionToGuild?.("@me");
                    }}
                />
            );
        }

        if (storage.showSettingsButton) {
            buttons.push(
                <YouBarButtonIcon
                    key="betterinbox-settings"
                    icon={SettingsIcon}
                    onPress={() => {
                        const userSettingsAction = findByProps("openUserSettings");
                        userSettingsAction?.openUserSettings?.();
                    }}
                />
            );
        }

        if (storage.showInboxButton) {
            buttons.push(
                <YouBarButtonIcon
                    key="betterinbox-inbox"
                    icon={BellIcon}
                    onPress={openInbox}
                />
            );
        }

        return React.cloneElement(res, { ...res.props }, buttons);
    });
}
