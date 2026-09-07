import { logger } from "@vendetta";
import { findByProps, findByName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

export function patchYouBar(): (() => void) | null {
    const YouBarModule = findByProps("YouBarButtonContainer", "YouBarButtonIcon");
    if (!YouBarModule?.YouBarButtonContainer || !YouBarModule?.YouBarButtonIcon) {
        logger.error("[BetterInbox] YouBarModule or YouBarButtonIcon missing.");
        return null;
    }

    const { YouBarButtonIcon } = YouBarModule;

    logger.log("[BetterInbox] Attaching YouBarButtonContainer patch...");

    return after("YouBarButtonContainer", YouBarModule, (_, res) => {
        if (!res?.props?.children) return res;

        const originalChildren = Array.isArray(res.props.children)
            ? [...res.props.children]
            : [res.props.children];

        // Guard against duplicate injection passes on re-renders/swipes
        const isPatched = originalChildren.some((child: any) =>
            child?.key?.startsWith?.("betterinbox-")
        );
        if (isPatched) return res;

        // Preserve profile/status icon (child 0) and filter out native notification button
        const profileIcon = originalChildren[0];

        // Resolve icon asset IDs
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

        const customButtons: any[] = [];

        if (storage.showDMButton) {
            customButtons.push(
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
            customButtons.push(
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
            customButtons.push(
                <YouBarButtonIcon
                    key="betterinbox-inbox"
                    icon={BellIcon}
                    onPress={openInbox}
                />
            );
        }

        // Keep profile/status icon intact, replace native notification icon with toggled custom buttons
        const finalChildren = profileIcon
            ? [profileIcon, ...customButtons]
            : customButtons;

        return React.cloneElement(res, {
            ...res.props,
            children: finalChildren,
        });
    });
}
