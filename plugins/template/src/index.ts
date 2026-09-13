import { patcher, storage } from "@vendetta";
import { findByStoreName, findByProps } from "@vendetta/metro";
import Settings, { CustomBadge } from "./Settings";

const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");
const UserStore = findByStoreName("UserStore") || findByProps("getCurrentUser");

let unpatches: Array<() => void> = [];

export default {
    onLoad: () => {
        try {
            if (!UserProfileStore) return;

            const unpatch = patcher.after(UserProfileStore, "getUserProfile", (args, profile) => {
                if (!profile) return profile;

                const targetUserId = args[0];
                const meId = UserStore?.getCurrentUser?.()?.id;

                // Inject only on current user's profile
                if (targetUserId && meId && targetUserId !== meId) {
                    return profile;
                }

                const existingBadges = Array.isArray(profile.badges) ? [...profile.badges] : [];
                const badgesToInject: CustomBadge[] = storage.customBadges || [];

                for (let i = 0; i < badgesToInject.length; i++) {
                    const customBadge = badgesToInject[i];
                    
                    // Skip invalid or disabled badges
                    if (!customBadge || !customBadge.id || !customBadge.iconUrl || !customBadge.enabled) {
                        continue;
                    }

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

            if (typeof unpatch === "function") unpatches.push(unpatch);
        } catch (err) {
            console.log("[CustomBadges Load Error]:", err);
        }
    },

    onUnload: () => {
        for (let i = 0; i < unpatches.length; i++) {
            if (typeof unpatches[i] === "function") unpatches[i]();
        }
        unpatches = [];
    },

    settings: Settings
};
