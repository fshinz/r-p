import { logger } from "@vendetta";
import { findByProps, findByName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

function YouBarCustomButtons({ originalProps, IconButton }: any) {
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
                <IconButton
                    variant={originalProps?.variant || "tertiary"}
                    size={originalProps?.size || "sm"}
                    icon={ChatIcon}
                    onPress={() => {
                        const transitionModule = findByProps("transitionToGuild");
                        transitionModule?.transitionToGuild?.("@me");
                    }}
                />
            )}

            {storage.showSettingsButton && (
                <IconButton
                    variant={originalProps?.variant || "tertiary"}
                    size={originalProps?.size || "sm"}
                    icon={SettingsIcon}
                    onPress={() => {
                        const userSettingsAction = findByProps("openUserSettings");
                        userSettingsAction?.openUserSettings?.();
                    }}
                />
            )}

            {storage.showInboxButton && (
                <IconButton
                    variant={originalProps?.variant || "tertiary"}
                    size={originalProps?.size || "sm"}
                    icon={BellIcon || originalProps?.icon}
                    onPress={openInbox}
                />
            )}
        </React.Fragment>
    );
}

export function patchYouBar(): (() => void) | null {
    const YouBarModule = findByProps("YouBarButtonContainer", "YouBarButtonIcon");
    if (!YouBarModule?.YouBarButtonContainer) return null;

    return after("YouBarButtonContainer", YouBarModule, (args, res) => {
        if (!res) return res;

        logger.log("[BetterInbox] YouBarButtonContainer rendered, injecting custom buttons");

        const IconButton = YouBarModule.YouBarButtonIcon;
        const passedProps = args[0] || {};

        // React Native cloneElement ensures existing style/layout props stay intact while swapping children
        return React.cloneElement(
            res,
            { ...res.props },
            <YouBarCustomButtons
                IconButton={IconButton}
                originalProps={passedProps}
            />
        );
    });
}
