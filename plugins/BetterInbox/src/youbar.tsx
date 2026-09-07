import { logger } from "@vendetta";
import { findByProps, findByName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

function YouBarCustomButtons({ YouBarButtonIcon }: any) {
    useProxy(storage);

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

    return (
        <React.Fragment>
            {storage.showDMButton && (
                <YouBarButtonIcon
                    icon={ChatIcon}
                    onPress={() => {
                        const transitionModule = findByProps("transitionToGuild");
                        transitionModule?.transitionToGuild?.("@me");
                    }}
                />
            )}

            {storage.showSettingsButton && (
                <YouBarButtonIcon
                    icon={SettingsIcon}
                    onPress={() => {
                        const userSettingsAction = findByProps("openUserSettings");
                        userSettingsAction?.openUserSettings?.();
                    }}
                />
            )}

            {storage.showInboxButton && (
                <YouBarButtonIcon
                    icon={BellIcon}
                    onPress={openInbox}
                />
            )}
        </React.Fragment>
    );
}

export function patchYouBar(): (() => void) | null {
    const YouBarModule = findByProps("YouBarButtonContainer", "YouBarButtonIcon");
    if (!YouBarModule?.YouBarButtonContainer || !YouBarModule?.YouBarButtonIcon) return null;

    return after("YouBarButtonContainer", YouBarModule, (_, res) => {
        if (!res) return res;

        logger.log("[BetterInbox] Rendering YouBarButtonIcon elements into container");

        return React.cloneElement(
            res,
            { ...res.props },
            <YouBarCustomButtons YouBarButtonIcon={YouBarModule.YouBarButtonIcon} />
        );
    });
}
