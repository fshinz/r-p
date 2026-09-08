import { logger } from "@vendetta";
import { findByProps, findByName, findByTypeName } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { getAssetIDByName } from "@vendetta/ui/assets";
import NotificationCenterUI from "./components/NotificationCenterUI";

let isPatched = false;

const FluxDispatcher = findByProps("dispatch", "subscribe", "_actionHandlers");

export function forceNavigationRerender(): void {
    if (!FluxDispatcher) return;

    try {
        FluxDispatcher.dispatch({
            type: "OVERLAY_SET_FLUX_STORES_DESERIALIZED",
        });
        FluxDispatcher.dispatch({
            type: "USER_SETTINGS_PROTO_UPDATE",
            settings: { type: 0, proto: {} },
            partial: true,
        });
    } catch (err) {
        logger.log(`[BetterInbox] Flux dispatch re-render failed: ${err}`);
    }
}

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

export function setupYouBarHooks(cleanups: (() => void)[]): boolean {
    if (isPatched) return true;

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
        forceNavigationRerender();
        return true;
    }

    const metroSearch = findByProps("findByTypeName", "findByName");
    if (metroSearch) {
        const unpatchType = after("findByTypeName", metroSearch, ([name], result) => {
            if (name === "YouBarNotificationsButton" && result?.type && !isPatched) {
                const unpatch = after("type", result, (_, res) => renderCustomButtons(res));
                cleanups.push(unpatch);
                isPatched = true;
                forceNavigationRerender();
            }
            return result;
        });
        cleanups.push(unpatchType);
    }

    return false;
}

export function rescanAndPatchYouBar(cleanups: (() => void)[]): boolean {
    return setupYouBarHooks(cleanups);
}

export function resetYouBarPatchState(): void {
    isPatched = false;
    forceNavigationRerender();
}
