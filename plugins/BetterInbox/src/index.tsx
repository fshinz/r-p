import { logger } from "@vendetta";
import { findByProps, findByName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

export function patchYouBar(): (() => void) | null {
    const YouBarModule = findByProps("YouBarButtonContainer", "YouBarButtonIcon");
    if (!YouBarModule?.YouBarButtonContainer || !YouBarModule?.YouBarButtonIcon) return null;

    const YouBarButtonIcon = YouBarModule.YouBarButtonIcon;

    return after("YouBarButtonContainer", YouBarModule, (_, res) => {
        if (!res) return res;

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

        const originalChildren = Array.isArray(res.props.children)
            ? [...res.props.children]
            : res.props.children
            ? [res.props.children]
            : [];

        // 1. Check if we've already applied our custom patch to this array
        const alreadyPatched = originalChildren.some((c: any) => c?.key?.startsWith?.("betterinbox-"));
        if (alreadyPatched) return res;

        // 2. Filter out Discord's native notification button (typically child 1)
        // Keep only child 0 (Profile/Status button) to make space for our toggled buttons
        const filteredChildren = originalChildren.filter((child: any, index: number) => {
            // Keep the first button (Profile/Status), drop the native notification button
            if (index === 0) return true;
            
            // Explicit guard: if child has an icon matching the native bell or notifications, remove it
            const isNativeBell = child?.key?.includes("notification") || child?.props?.icon === BellIcon;
            return !isNativeBell;
        });

        // 3. Build custom buttons based on active storage settings
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

        // 4. Merge preserved base children with our custom toggled buttons
        return React.cloneElement(res, {
            ...res.props,
            children: [...filteredChildren, ...customButtons]
        });
    });
}
