import { React } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import NotificationCenterUI from "./components/NotificationCenterUI";

const router = findByProps("push", "pushLazy");

let unpatch: (() => void) | null = null;

export function patchYouBar() {
  if (!router?.push) return;

  unpatch = instead("push", router, (args, orig) => {
    const route = args[0];
    if (route === "NotificationCenter" || route?.name === "NotificationCenter") {
      const navigation = args[1]?.navigation || args[1];
      if (navigation?.push) {
        navigation.push("VendettaCustomPage", {
          title: "Inbox",
          render: () => <NotificationCenterUI />,
        });
        return;
      }
    }
    return orig.apply(router, args);
  });
}

export function unpatchYouBar() {
  if (unpatch) {
    unpatch();
    unpatch = null;
  }
}
