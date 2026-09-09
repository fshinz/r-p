import { logger } from "@vendetta";
import { findByProps, findByName, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

let isPatched = false;

function renderCustomButtons(res: any) {
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
}

export function linkYouBarAnimation(cleanups: (() => void)[]): boolean {
    if (isPatched) return true;

    // 1. Primary: Target the YouBar layout animation hook module
    const animationModule = findByProps("useYouBarAnimation") ?? findByProps("useYouTabBarAnimation");
    
    if (animationModule) {
        const key = animationModule.useYouBarAnimation ? "useYouBarAnimation" : "useYouTabBarAnimation";
        const unpatchAnim = after(key, animationModule, (_, animRes) => {
            // When YouBar animation runs, hook the notifications component
            setupTargetButton(cleanups);
            return animRes;
        });
        cleanups.push(unpatchAnim);
    }

    // 2. Direct component patch fallback
    return setupTargetButton(cleanups);
}

function setupTargetButton(cleanups: (() => void)[]): boolean {
    const targetComp = findByTypeName("YouBarNotificationsButton") || findByName("YouBarNotificationsButton");

    if (targetComp) {
        if (targetComp.type) {
            const unpatch = after("type", targetComp, (_, res) => renderCustomButtons(res));
            cleanups.push(unpatch);
        } else if (typeof targetComp === "function") {
            const unpatch = after("render", targetComp.prototype ? targetComp.prototype : targetComp, (_, res) => renderCustomButtons(res));
            cleanups.push(unpatch);
        }
        isPatched = true;
        return true;
    }

    return false;
}

export function resetYouBarPatchState(): void {
    isPatched = false;
}
