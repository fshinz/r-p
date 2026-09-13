import { storage } from "@vendetta";
import { findByProps, findByStoreName } from "@vendetta/metro";
import Settings, { CustomBadge } from "./Settings";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const UserStore = findByProps("getCurrentUser") || findByStoreName("UserStore");
      const UserProfileStore = findByProps("getUserProfile") || findByStoreName("UserProfileStore");
      const FluxDispatcher = findByProps("dispatch", "subscribe");

      if (UserProfileStore && UserStore) {
        const origGetProfile = UserProfileStore.getUserProfile;

        if (typeof origGetProfile === "function") {
          UserProfileStore.getUserProfile = function (userId: string) {
            const profile = origGetProfile.apply(this, arguments);

            try {
              const currentUser = UserStore.getCurrentUser?.();

              // Ensure we only touch valid snowflake IDs and target the logged-in user
              if (currentUser?.id && userId === currentUser.id) {
                let existingBadges = Array.isArray(profile?.badges) ? [...profile.badges] : [];
                const customBadges: CustomBadge[] = storage.customBadges || [];

                const formattedCustomBadges = customBadges
                  .filter((b) => b && b.id && b.enabled)
                  .map((b) => {
                    const rawIcon = (b.iconUrl || "").trim().replace(/\.(png|jpg|jpeg|webp)$/i, "");
                    return {
                      id: b.id,
                      key: b.id,
                      description: b.description || "Custom Badge",
                      icon: rawIcon,
                      flags: 0,
                      ...(b.link ? { link: b.link } : {}),
                    };
                  });

                const customIds = new Set(formattedCustomBadges.map((b) => b.id));
                existingBadges = existingBadges.filter(
                  (b: any) => b && !customIds.has(b.id) && !customIds.has(b.key)
                );

                const updatedBadges = [...formattedCustomBadges, ...existingBadges];

                if (profile) {
                  Object.defineProperty(profile, "badges", {
                    value: updatedBadges,
                    writable: true,
                    configurable: true,
                    enumerable: true,
                  });

                  if (typeof profile.getBadges === "function") {
                    profile.getBadges = () => updatedBadges;
                  }
                }
              }
            } catch (e) {
              console.log("[CustomBadges Patch Error]:", e);
            }

            return profile;
          };

          unpatches.push(() => {
            UserProfileStore.getUserProfile = origGetProfile;
          });

          // Trigger a local Flux event so the client re-renders profile views instantly
          const currentUser = UserStore.getCurrentUser?.();
          if (currentUser?.id && FluxDispatcher?.dispatch) {
            FluxDispatcher.dispatch({
              type: "USER_PROFILE_UPDATE",
              userId: currentUser.id,
            });
          }
        }
      }
    } catch (e) {
      console.log("[CustomBadges Load Error]:", e);
    }
  },

  onUnload: () => {
    unpatches.forEach((u) => {
      try {
        u();
      } catch (e) {}
    });
    unpatches.length = 0;
  },

  settings: Settings,
};
