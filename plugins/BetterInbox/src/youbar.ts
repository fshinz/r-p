import { findByTypeName, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { instead } from "@vendetta/patcher";
import NotificationCenterUI from "../components/NotificationCenterUI";

const showCustomScreen = findByProps("showCustomScreen")?.showCustomScreen;
const NavigationNative = findByProps("navigate", "push");

export function patchYouBar() {
  const YouBarNotificationsButton = findByTypeName("YouBarNotificationsButton");

  if (!YouBarNotificationsButton) {
    console.warn("[BetterInbox] YouBarNotificationsButton component not found");
    return () => {};
  }

  return instead("type", YouBarNotificationsButton, (args, OriginalRender) => {
    const res = OriginalRender(...args);

    // Target the actual IconButton child rendered by YouBarNotificationsButton
    const buttonProps = res?.props?.children?.props;
    if (!buttonProps) return res;

    // Override the onPress handler on the inner button component
    buttonProps.onPress = () => {
      console.log("[BetterInbox] Redirecting YouBar bell to NotificationCenterUI");

      if (typeof showCustomScreen === "function") {
        showCustomScreen(() => <NotificationCenterUI />, {
          title: "Better Inbox",
        });
      } else if (NavigationNative?.push || NavigationNative?.navigate) {
        const nav = NavigationNative.push || NavigationNative.navigate;
        nav("VendettaCustomPage", {
          title: "Better Inbox",
          render: () => <NotificationCenterUI />,
        });
      }
    };

    return res;
  });
}
