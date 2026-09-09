import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

const unpatches: Array<() => void> = [];

// Working badge definitions matching Settings keys to native Discord structures
const BADGE_MAP: Record<string, any> = {
    // Discord
    discord_staff: { id: "staff", key: "staff", flags: 1, description: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
    partnered_server_owner: { id: "partner", key: "partner", flags: 2, description: "Partnered Server Owner", icon: "34306011e46e87f8ef25f3415d3b99ca", link: "https://discord.com/partners" },
    moderator_alumni: { id: "moderator_alumni", key: "moderator_alumni", description: "Moderator Programs Alumni", icon: "c981e58b5ea4b7fedd3a643cf0c60564", link: "https://discord.com/safety" },
    early_supporter: { id: "early_supporter", key: "early_supporter", flags: 512, description: "Early Supporter", icon: "b802e9af134ff492276d94220e36ec5c" },
    discord_nitro: { id: "premium", key: "premium", description: "Discord Nitro", icon: "24d05f3b46a110e538674edbac0db4cd", link: "https://discord.com/nitro" },

    // HypeSquad
    hypesquad_events: { id: "hypesquad_events", key: "hypesquad_events", flags: 4, description: "HypeSquad Events", icon: "e666a84a7a5ea2abbbfa73adf22e627b", link: "https://discord.com/hypesquad" },
    hypesquad_bravery: { id: "hypesquad_house_1", key: "hypesquad_house_1", flags: 64, description: "HypeSquad Bravery", icon: "efcc751513ec434ea4275ecda4f61136", link: "https://discord.com/hypesquad" },
    hypesquad_brilliance: { id: "hypesquad_house_2", key: "hypesquad_house_2", flags: 128, description: "HypeSquad Brilliance", icon: "ec8e92568a7c8f19a052ef42f862ff18", link: "https://discord.com/hypesquad" },
    hypesquad_balance: { id: "hypesquad_house_3", key: "hypesquad_house_3", flags: 256, description: "HypeSquad Balance", icon: "9f00b18e292e10fc0ae84ff5332e8b0b", link: "https://discord.com/hypesquad" },

    // Bug Hunter
    bug_hunter_1: { id: "bug_hunter_level_1", key: "bug_hunter_level_1", flags: 8, description: "Discord Bug Hunter Tier 1", icon: "8353d89b529e13365c415aef08d1d1f4", link: "https://support.discord.com" },
    bug_hunter_2: { id: "bug_hunter_level_2", key: "bug_hunter_level_2", flags: 16384, description: "Discord Bug Hunter Tier 2", icon: "f599063762165e0d23e8b11b684765a8", link: "https://support.discord.com" },

    // Developer
    verified_bot_developer: { id: "verified_developer", key: "verified_developer", flags: 131072, description: "Early Verified Bot Developer", icon: "4441e07fe0f46b3cb41b79366236fca6", link: "https://discord.com/developers" },
    active_developer: { id: "active_developer", key: "active_developer", flags: 4194304, description: "Active Developer", icon: "26c7a60fb1654315e0be26107bd47470", link: "https://discord.com/developers" },
    supports_commands: { id: "supports_commands", key: "supports_commands", description: "Supports Commands", icon: "498591d63b352256a1bf18061eff9d57", link: "https://discord.com/developers" },
    uses_automod: { id: "uses_automod", key: "uses_automod", description: "Uses Automod", icon: "8599b8b3d7917b5e7180e898a835f780", link: "https://discord.com/developers" },

    // Nitro Badges
    nitro_bronze: { id: "nitro_bronze", key: "nitro_bronze", description: "Nitro Bronze", icon: "4f33c4a9c64ce221936bd256c356f91f", link: "https://discord.com/nitro" },
    nitro_silver: { id: "nitro_silver", key: "nitro_silver", description: "Nitro Silver", icon: "4514fab914bdbfb4ad2fa23df76121a6", link: "https://discord.com/nitro" },
    nitro_gold: { id: "nitro_gold", key: "nitro_gold", description: "Nitro Gold", icon: "2895086c18d5531d499862e41d1155a6", link: "https://discord.com/nitro" },
    nitro_platinum: { id: "nitro_platinum", key: "nitro_platinum", description: "Nitro Platinum", icon: "0334688279c8359120922938dcb1d6f8", link: "https://discord.com/nitro" },

    // Boost Badges
    boost_1: { id: "guild_booster_lvl1", key: "guild_booster_lvl1", description: "Boost 1 Month", icon: "51040c70d4f20a921ad6674ff86fc95c" },
    boost_2: { id: "guild_booster_lvl2", key: "guild_booster_lvl2", description: "Boost 2 Months", icon: "0e4080d1d333bc7ad29ef6528b6f2fb7" },
    boost_3: { id: "guild_booster_lvl3", key: "guild_booster_lvl3", description: "Boost 3 Months", icon: "72bed924410c304dbe3d00a6e593ff59" },
    boost_6: { id: "guild_booster_lvl4", key: "guild_booster_lvl4", description: "Boost 6 Months", icon: "df199d2050d3ed4ebf84d64ae83989f8" },
};

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
    return 99;
};

const getEnabledBadges = () => {
    const settings = storage as any;
    if (settings?.enabled === false) return [];
    const badges = settings?.badges || {};

    return Object.keys(badges)
        .filter((key) => badges[key] === true && BADGE_MAP[key])
        .map((key) => ({ ...BADGE_MAP[key] }));
};

export default {
    onLoad: () => {
        try {
            const UserStore = findByProps("getCurrentUser", "getUser") || findByStoreName("UserStore");
            const UserProfileStore = findByStoreName("UserProfileStore") || findByProps("getUserProfile");

            if (!UserStore || !UserProfileStore) return;

            const origGetProfile = UserProfileStore.getUserProfile;
            if (typeof origGetProfile !== "function") return;

            UserProfileStore.getUserProfile = function (userId: string) {
                const profile = origGetProfile.apply(this, arguments as any);
                try {
                    const currentUser = UserStore.getCurrentUser?.();
                    if (profile && currentUser?.id && userId === currentUser.id) {
                        let badges = Array.isArray(profile.badges) ? [...profile.badges] : [];

                        const customBadges = getEnabledBadges();
                        const injectedIds = new Set(Object.values(BADGE_MAP).map((b) => b.id));

                        // Clear previously injected badges
                        badges = badges.filter((b: any) => b && !injectedIds.has(b.id));

                        // Merge and sort using native hierarchy
                        const updatedBadges = [...customBadges, ...badges];
                        updatedBadges.sort((a, b) => getPriority(a) - getPriority(b));

                        profile.badges = updatedBadges;
                    }
                } catch (e) {
                    console.error("[Badge Spoof] Injection error", e);
                }
                return profile;
            };

            unpatches.push(() => {
                UserProfileStore.getUserProfile = origGetProfile;
            });
        } catch (e) {
            console.error("[Badge Spoof] Load error", e);
        }
    },

    onUnload: () => {
        unpatches.forEach((u) => {
            try { u(); } catch (e) {}
        });
        unpatches.length = 0;
    },

    settings: Settings,
};
