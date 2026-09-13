import { storage } from "@vendetta";
import { findByStoreName, findByProps } from "@vendetta/metro";
import Settings, { CustomBadge } from "./Settings";

const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");
const UserStore = findByStoreName("UserStore") || findByProps("getCurrentUser");

let unpatches: Array<() => void> = [];

export default {
  onLoad: () => {
    try {
      if (!UserProfileStore || !UserStore) return;

      const origGetProfile = UserProfileStore.getUserProfile;

      if (typeof origGetProfile === "function") {
        UserProfileStore.getUserProfile = function (userId: string) {
          const profile = origGetProfile.apply(this, arguments);

          try {
            const currentUser = UserStore.getCurrentUser?.();

            if (profile && currentUser?.id && userId === currentUser.id) {
              let existingBadges = Array.isArray(profile.badges) ? [...profile.badges] : [];
              const customBadges: CustomBadge[] = storage.customBadges || [];

              for (let i = 0; i < customBadges.length; i++) {
                const badge = customBadges[i];

                if (!badge || !badge.id || !badge.enabled) continue;

                // Strip duplicates
                existingBadges = existingBadges.filter((b: any) => b && b.id !== badge.id && b.key !== badge.id);

                existingBadges.unshift({
                  id: badge.id,
                  key: badge.id,
                  description: badge.description || "Custom Badge",
                  icon: badge.iconUrl,
                  ...(badge.link ? { link: badge.link } : {}),
                });
              }

              profile.badges = existingBadges;
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
    } catch (err) {
      console.log("[CustomBadges Load Error]:", err);
    }
  },

  onUnload: () => {
    unpatches.forEach((u) => {
      try {
        u();
      } catch (e) {}
    });
    unpatches = [];
  },

  settings: Settings,
};
