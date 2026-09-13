import { patcher, storage } from "@vendetta";
import { findByStoreName, findByProps } from "@vendetta/metro";
import Settings from "./Settings";

const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");
const UserStore = findByStoreName("UserStore") || findByProps("getCurrentUser");

// Initialize default storage safely
storage.customBadges ??= [
    {
        id: "badge_godmode",
        description: "Supreme System Administrator",
        iconUrl: "https://i.imgur.com/6X2pY1B.png",
        link: "https://github.com"
    }
];

let unpatches: Array<() => void> = [];

export default {
    onLoad: () => {
        try {
            if (!UserProfileStore) {
                console.log("[CustomBadges] Error: UserProfileStore not found.");
                return;
            }

            // Cleanly patch getUserProfile
            const unpatch = patcher.after(UserProfileStore, "getUserProfile", (args, profile) => {
                if (!profile) return profile;

                // Safely get target user ID from arguments
                const targetUserId = args[0];
                const meId = UserStore?.getCurrentUser?.()?.id;

                // Optional: Only inject badges on your own profile (or remove this check for all profiles)
                if (targetUserId && meId && targetUserId !== meId) {
                    return profile;
                }

                // Ensure badges array exists
                const existingBadges = Array.isArray(profile.badges) ? [...profile.badges] : [];
                const badgesToInject = storage.customBadges || [];

                for (let i = 0; i < badgesToInject.length; i++) {
                    const customBadge = badgesToInject[i];
                    if (!customBadge || !customBadge.id || !customBadge.iconUrl) continue;

                    // Prevent duplicate injections
                    const exists = existingBadges.some((b: any) => b && b.id === customBadge.id);
                    if (!exists) {
                        existingBadges.push({
                            id: customBadge.id,
                            description: customBadge.description || "Custom Badge",
                            icon: customBadge.iconUrl,
                            ...(customBadge.link ? { link: customBadge.link } : {})
                        });
                    }
                }

                profile.badges = existingBadges;
                return profile;
            });

            if (typeof unpatch === "function") {
                unpatches.push(unpatch);
            }
        } catch (err) {
            console.log("[CustomBadges Load Error]:", err);
        }
    },

    onUnload: () => {
        for (let i = 0; i < unpatches.length; i++) {
            try {
                if (typeof unpatches[i] === "function") {
                    unpatches[i]();
                }
            } catch (e) {
                console.log("[CustomBadges Unpatch Error]:", e);
            }
        }
        unpatches = [];
    },

    settings: Settings
};
