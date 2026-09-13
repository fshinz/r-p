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
              const currentUser = UserStore.getCurrentUser?.();

              // Apply custom badges specifically to the current user profile
              if (profile && currentUser?.id && userId === currentUser.id) {
                let badges = Array.isArray(profile.badges) ? [...profile.badges] : [];
                const customBadges: CustomBadge[] = storage.customBadges || [];

                // Format enabled custom badges for injection
                const formattedCustomBadges = customBadges
                  .filter((b) => b && b.id && b.enabled)
                  .map((b) => ({
                    id: b.id,
                    key: b.id,
                    description: b.description || "Custom Badge",
                    icon: b.iconUrl,
                    flags: 0,
                    ...(b.link ? { link: b.link } : {}),
                  }));

                // Filter out any existing badge matching custom badge IDs to avoid duplicates
                const customIds = new Set(formattedCustomBadges.map((b) => b.id));
                badges = badges.filter((b: any) => b && !customIds.has(b.id) && !customIds.has(b.key));

                // Priority sorting function matching Discord UI order
                const getPriority = (badge: any) => {
                  const id = (badge?.id || badge?.key || "").toLowerCase();
                  if (id.includes("staff")) return 1;
                  if (id.includes("partner")) return 2;
                  if (id.includes("certified_moderator") || id.includes("mod")) return 3;
                  if (id.includes("hypesquad")) return 4;
                  if (id.includes("bug_hunter")) return 5;
                  if (id.includes("developer") || id.includes("dev")) return 6;
                  if (id.includes("early")) return 7;
                  if (id.includes("nitro") || id.includes("premium")) return 8;
                  if (id.includes("booster") || id.includes("guild")) return 9;
                  return 50; // Custom badges sit before standard fallback badges
                };

                const updatedBadges = [...formattedCustomBadges, ...badges];
                updatedBadges.sort((a, b) => getPriority(a) - getPriority(b));

                profile.badges = updatedBadges;
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
