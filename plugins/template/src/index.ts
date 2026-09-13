import { storage } from "@vendetta";
import { findByProps, findByStoreName } from "@vendetta/metro";
import Settings, { CustomBadge } from "./Settings";

const unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      const UserStore = findByProps("getCurrentUser", "getUser") || findByStoreName("UserStore");
      const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");

      if (UserProfileStore && UserStore) {
        const origGetProfile = UserProfileStore.getUserProfile;

        if (typeof origGetProfile === "function") {
          UserProfileStore.getUserProfile = function (userId: string) {
            const profile = origGetProfile.apply(this, arguments);

            try {
              const currentUserId = UserStore.getCurrentUser?.()?.id;

              // If current user isn't loaded yet or matches target profile ID
              if (profile && (!currentUserId || userId === currentUserId)) {
                let existingBadges = Array.isArray(profile.badges) ? [...profile.badges] : [];
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
            } catch (e) {
              console.log("[CustomBadges Patch Error]:", e);
            }

            return profile;
          };

          unpatches.push(() => {
            UserProfileStore.getUserProfile = origGetProfile;
          });
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
