import { findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

// Wrapper component to subscribe to Vendetta storage updates dynamically across transitions
function YouBarCustomButtons({ originalButton }: { originalButton: any }) {
    useProxy(storage);

    const BellIcon = getAssetIDByName("BellIcon") || getAssetIDByName("NotificationBellIcon");
    const SettingsIcon = getAssetIDByName("SettingsIcon");
    const ChatIcon = getAssetIDByName("ChatIcon");

    const IconButton = originalButton.type;
    const originalProps = originalButton.props;

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

            {storage.showInboxButton ? (
                <IconButton
                    variant={originalProps?.variant || "tertiary"}
                    size={originalProps?.size || "sm"}
                    icon={BellIcon || originalProps?.icon}
                    onPress={() => {
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
                    }}
                />
            ) : (
                originalButton
            )}
        </React.Fragment>
    );
}

export function patchYouBar() {
    const YouBarNotificationsButton = findByTypeName("YouBarNotificationsButton");
    if (!YouBarNotificationsButton) return null;

    return after("type", YouBarNotificationsButton, (_, res) => {
        if (!res?.props?.children) return res;

        // Delegate UI rendering to standard React element tree so transition mounts stay intact
        return <YouBarCustomButtons originalButton={res.props.children} />;
    });
}
