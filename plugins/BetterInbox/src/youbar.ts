import { findByTypeName, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { instead } from "@vendetta/patcher";
import NotificationCenterUI from "../components/NotificationCenterUI";

// Grab Discord's root navigation reference (same module as the example plugin)
const tabsNavigationRef = findByProps("getRootNavigationRef");

export function patchYouBar() {
  const YouBarNotificationsButton = findByTypeName("YouBarNotificationsButton");

  if (!YouBarNotificationsButton) {
    console.warn("[BetterInbox] YouBarNotificationsButton component not found");
    return () => {};
  }

  return instead("type", YouBarNotificationsButton, (args, OriginalRender) => {
    const res = OriginalRender(...args);

    // Target the inner button props where onPress is located
    const buttonProps = res?.props?.children?.props;
    if (!buttonProps) return res;

    // Override the button's click event
    buttonProps.onPress = () => {
      console.log("[BetterInbox] Intercepted YouBar bell click!");

      try {
        const navigation = tabsNavigationRef?.getRootNavigationRef?.();

        if (navigation?.navigate) {
          navigation.navigate("VendettaCustomPage", {
            title: "Better Inbox",
            render: () => React.createElement(NotificationCenterUI),
          });
          return;
        }
      } catch (err) {
        console.error("[BetterInbox] Navigation error:", err);
      }
    };

    return res;
  });
}
