import { patcher } from "@vendetta/patcher";
import { getModule } from "@vendetta/metro";

interface NavigationNativeModule {
  navigate(screen: string, params?: Record<string, unknown>): void;
}

interface YouBarModule {
  openNotificationInbox?: () => void;
  navigateToNotificationCenter?: () => void;
}

const NavigationNative = getModule((m: any) => m.navigate) as NavigationNativeModule;

export function patchYouBarAction(): (() => void) | undefined {
  const YouBarModule = getModule(
    (m: any) => m.openNotificationInbox || m.navigateToNotificationCenter
  ) as YouBarModule;

  if (YouBarModule && YouBarModule.openNotificationInbox) {
    return patcher.before("openNotificationInbox", YouBarModule, () => {
      NavigationNative.navigate("PluginSettingsScreen", {
        pluginId: "custom-notification-center",
      });
      return true;
    });
  }
}

