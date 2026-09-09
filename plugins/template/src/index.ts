import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

const unpatches: Array<() => void> = [];

const CDN = (hash: string) =>
    `https://cdn.discordapp.com/badge-icons/${hash}.png`;

// Dictionary matching keys used in Settings.tsx
const BADGES: Record<string, any> = {
    // Discord & Staff
    discord_staff: { id: "staff", description: "Discord Staff", icon: CDN("5e74e9b61934fc1f67c65515d1f7e60d") },
    partnered_server_owner: { id: "partner", description: "Partnered Server Owner", icon: CDN("34306011e46e87f8ef25f3415d3b99ca") },
    moderator_alumni: { id: "moderator_alumni", description: "Moderator Programs Alumni", icon: CDN("c981e58b5ea4b7fedd3a643cf0c60564") },
    early_supporter: { id: "early_supporter", description: "Early Supporter", icon: CDN("b802e9af134ff492276d94220e36ec5c") },
    discord_nitro: { id: "premium", description: "Discord Nitro", icon: CDN("24d05f3b46a110e538674edbac0db4cd") },

    // HypeSquad
    hypesquad_events: { id: "hypesquad_events", description: "HypeSquad Events", icon: CDN("e666a84a7a5ea2abbbfa73adf22e627b") },
    hypesquad_bravery: { id: "hypesquad_house_1", description: "HypeSquad Bravery", icon: CDN("efcc751513ec434ea4275ecda4f61136") },
    hypesquad_brilliance: { id: "hypesquad_house_2", description: "HypeSquad Brilliance", icon: CDN("ec8e92568a7c8f19a052ef42f862ff18") },
    hypesquad_balance: { id: "hypesquad_house_3", description: "HypeSquad Balance", icon: CDN("9f00b18e292e10fc0ae84ff5332e8b0b") },

    // Bug Hunter
    bug_hunter_1: { id: "bug_hunter_level_1", description: "Discord Bug Hunter Tier 1", icon: CDN("8353d89b529e13365c415aef08d1d1f4") },
    bug_hunter_2: { id: "bug_hunter_level_2", description: "Discord Bug Hunter Tier 2", icon: CDN("f599063762165e0d23e8b11b684765a8") },

    // Developer
    verified_bot_developer: { id: "verified_developer", description: "Early Verified Bot Developer", icon: CDN("4441e07fe0f46b3cb41b79366236fca6") },
    active_developer: { id: "active_developer", description: "Active Developer", icon: CDN("26c7a60fb1654315e0be26107bd47470") },
    supports_commands: { id: "supports_commands", description: "Supports Commands", icon: CDN("498591d63b352256a1bf18061eff9d57") },
    uses_automod: { id: "uses_automod", description: "Uses Automod", icon: CDN("8599b8b3d7917b5e7180e898a835f780") },

    // Nitro Subscriptions
    nitro_bronze: { id: "nitro_bronze", description: "Nitro Bronze", icon: CDN("4f33c4a9c64ce221936bd256c356f91f") },
    nitro_silver: { id: "nitro_silver", description: "Nitro Silver", icon: CDN("4514fab914bdbfb4ad2fa23df76121a6") },
    nitro_gold: { id: "nitro_gold", description: "Nitro Gold", icon: CDN("2895086c18d5531d499862e41d1155a6") },
    nitro_platinum: { id: "nitro_platinum", description: "Nitro Platinum", icon: CDN("0334688279c8359120922938dcb1d6f8") },
    nitro_diamond: { id: "nitro_diamond", description: "Nitro Diamond", icon: CDN("0d61871f72bb9a33a7ae568c1fb4f20a") },

    // Nitro Boosts
    boost_1: { id: "guild_booster_lvl1", description: "Boost 1 Month", icon: CDN("51040c70d4f20a921ad6674ff86fc95c") },
    boost_2: { id: "guild_booster_lvl2", description: "Boost 2 Months", icon: CDN("0e4080d1d333bc7ad29ef6528b6f2fb7") },
    boost_3: { id: "guild_booster_lvl3", description: "Boost 3 Months", icon: CDN("72bed924410c304dbe3d00a6e593ff59") },
    boost_6: { id: "guild_booster_lvl4", description: "Boost 6 Months", icon: CDN("df199d2050d3ed4ebf84d64ae83989f8") },
};

const getEnabledBadges = () => {
    const settings = storage as any;
    if (settings?.enabled === false) return [];
    const badges = settings?.badges || {};

    return Object.keys(badges)
        .filter((key) => badges[key] === true && BADGES[key])
        .map((key) => ({
            ...BADGES[key],
            link: BADGES[key].link || "https://discord.com",
        }));
};

export default {
    onLoad: () => {
        try {
            const UserStore = findByProps("getCurrentUser") || findByStoreName("UserStore");
            const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");

            if (!UserStore || !UserProfileStore) return;

            const origGetProfile = UserProfileStore.getUserProfile;

            UserProfileStore.getUserProfile = function (userId: string, ...args: any[]) {
                const profile = origGetProfile.apply(this, [userId, ...args]);
                const currentUser = UserStore.getCurrentUser?.();

                if (!profile || !currentUser?.id || userId !== currentUser.id) {
                    return profile;
                }

                // Return a modified shallow copy to force UI refresh
                const customBadges = getEnabledBadges();
                const existingBadges = Array.isArray(profile.badges) ? profile.badges : [];
                
                // Filter existing badges to avoid duplicates with injected ones
                const injectedIds = new Set(customBadges.map((b) => b.id));
                const filteredExisting = existingBadges.filter((b) => !injectedIds.has(b?.id));

                return {
                    ...profile,
                    badges: [...customBadges, ...filteredExisting],
                };
            };

            unpatches.push(() => {
                UserProfileStore.getUserProfile = origGetProfile;
            });
        } catch (e) {
            console.error("[Badge Spoof] Load error:", e);
        }
    },

    onUnload: () => {
        unpatches.forEach((unpatch) => unpatch());
        unpatches.length = 0;
    },

    settings: Settings,
};
