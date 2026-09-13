import { patcher, storage } from "@vendetta";
import { findByStoreName, findByProps } from "@vendetta/metro";
import Settings from "./Settings";

const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");

// Default initial state if storage is empty
storage.customBadges ??= [
    {
        id: "badge_godmode",
        description: "Supreme System Administrator",
        iconUrl: "https://i.imgur.com/6X2pY1B.png",
        link: "https://github.com"
    }
];

let unpatches: Function[] = [];

export default {
    onLoad: () => {
        // Patch UserProfileStore.getUserProfile to inject stored badges
        if (UserProfileStore) {
            const unpatchProfile = patcher.after(UserProfileStore, "getUserProfile", (_, profile) => {
                if (!profile) return profile;

                profile.badges = Array.isArray(profile.badges) ? [...profile.badges] : [];

                const badgesToInject = storage.customBadges || [];

                for (const customBadge of badgesToInject) {
                    if (!customBadge.id || !customBadge.iconUrl) continue;

                    // Prevent duplicate injection
                    const exists = profile.badges.some((b: any) => b.id === customBadge.id);
                    if (!exists) {
                        profile.badges.push({
                            id: customBadge.id,
                            description: customBadge.description || "Custom Badge",
                            // Pass the direct URL as the icon hash
                            icon: customBadge.iconUrl,
                            ...(customBadge.link ? { link: customBadge.link } : {})
                        });
                    }
                }

                return profile;
            });

            unpatches.push(unpatchProfile);
        }
    },

    onUnload: () => {
        for (const unpatch of unpatches) {
            unpatch?.();
        }
        unpatches = [];
    },

    settings: Settings
};
