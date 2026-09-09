import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

const unpatches: Array<() => void> = [];

const BADGES: Record<string, any> = {
    staff: {
        id: "staff",
        key: "staff",
        flags: 1,
        description: "Discord Staff",
        icon: "5e74e9b61934fc1f67c65515d1f7e60d",
        link: "https://discord.com/company",
    },

    partner: {
        id: "partner",
        key: "partner",
        flags: 2,
        description: "Discord Partner",
        icon: "34306011e46e87f8ef25f3415d3b99ca",
        link: "https://discord.com/partners",
    },

    certified_moderator: {
        id: "certified_moderator",
        key: "certified_moderator",
        description: "Discord Certified Moderator",
        icon: "c981e58b5ea4b7fedd3a643cf0c60564",
        link: "https://discord.com/safety",
    },

    moderator_alumni: {
        id: "moderator_alumni",
        key: "moderator_alumni",
        description: "Moderator Alumni",
        icon: "c981e58b5ea4b7fedd3a643cf0c60564",
        link: "https://discord.com/safety",
    },

    hypesquad_events: {
        id: "hypesquad_events",
        key: "hypesquad_events",
        description: "HypeSquad Events",
        icon: "e666a84a7a5ea2abbbfa73adf22e627b",
        link: "https://discord.com/hypesquad",
    },

    hypesquad_bravery: {
        id: "hypesquad_bravery",
        key: "hypesquad_bravery",
        description: "HypeSquad Bravery",
        icon: "efcc751513ec434ea4275ecda4f61136",
        link: "https://discord.com/hypesquad",
    },

    hypesquad_brilliance: {
        id: "hypesquad_brilliance",
        key: "hypesquad_brilliance",
        description: "HypeSquad Brilliance",
        icon: "ec8e92568a7c8f19a052ef42f862ff18",
        link: "https://discord.com/hypesquad",
    },

    hypesquad_balance: {
        id: "hypesquad_balance",
        key: "hypesquad_balance",
        description: "HypeSquad Balance",
        icon: "9f00b18e292e10fc0ae84ff5332e8b0b",
        link: "https://discord.com/hypesquad",
    },

    bug_hunter_level_1: {
        id: "bug_hunter_level_1",
        key: "bug_hunter_level_1",
        flags: 4,
        description: "Discord Bug Hunter",
        icon: "8353d89b529e13365c415aef08d1d1f4",
        link: "https://support.discord.com",
    },

    bug_hunter_level_2: {
        id: "bug_hunter_level_2",
        key: "bug_hunter_level_2",
        flags: 4,
        description: "Discord Bug Hunter Level 2",
        icon: "f599063762165e0d23e8b11b684765a8",
        link: "https://support.discord.com",
    },

    verified_bot_developer: {
        id: "verified_bot_developer",
        key: "verified_bot_developer",
        description: "Verified Bot Developer",
        icon: "4441e07fe0f46b3cb41b79366236fca6",
        link: "https://discord.com/developers",
    },

    active_developer: {
        id: "active_developer",
        key: "active_developer",
        description: "Active Developer",
        icon: "26c7a60fb1654315e0be26107bd47470",
        link: "https://discord.com/developers",
    },

    supports_commands: {
        id: "supports_commands",
        key: "supports_commands",
        description: "Supports Commands",
        icon: "498591d63b352256a1bf18061eff9d57",
        link: "https://discord.com/developers",
    },

    uses_automod: {
        id: "uses_automod",
        key: "uses_automod",
        description: "Uses Automod",
        icon: "8599b8b3d7917b5e7180e898a835f780",
        link: "https://discord.com/developers",
    },

    premium: {
        id: "premium",
        key: "premium",
        description: "Nitro",
        icon: "24d05f3b46a110e538674edbac0db4cd",
        link: "https://discord.com/nitro",
    },

    nitro_fire: {
        id: "nitro_fire",
        key: "nitro_fire",
        description: "Nitro Fire",
        icon: "cff7119d4417261c3f52fde8a94ba8e5",
        link: "https://discord.com/nitro",
    },

    patron: {
        id: "patron",
        key: "patron",
        description: "Patron",
        icon: "ac305d1b9481f312ce4419e7f8296558",
    },

    champion: {
        id: "champion",
        key: "champion",
        description: "Champion",
        icon: "8b7792c4f65953d3ff564f23429cb79e",
    },

    luminary: {
        id: "luminary",
        key: "luminary",
        description: "Luminary",
        icon: "3119f5504b2cd09576a323908c7c3517",
    },

    icon: {
        id: "icon",
        key: "icon",
        description: "Icon",
        icon: "64f2413c9b9803661322aaad25826b62",
    },

    hero: {
        id: "hero",
        key: "hero",
        description: "Hero",
        icon: "77d65b1f210014a11eb1582ee06ab684",
    },

    legend: {
        id: "legend",
        key: "legend",
        description: "Legend",
        icon: "7fe346cfc5da1340087d8759a9e7a395",
    },
};

const getPriority = (badge: any) => {
    const id = (badge?.id || badge?.key || "").toLowerCase();

    if (id.includes("staff")) return 1;
    if (id.includes("partner")) return 2;
    if (id.includes("certified_moderator") || id.includes("moderator")) return 3;
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
        .filter((key) => badges[key] === true && BADGES[key])
        .map((key) => BADGES[key]);
};

const removeInjectedBadges = (badges: any[]) => {
    const injectedIds = new Set(
        Object.values(BADGES).map((badge: any) => badge.id),
    );

    return badges.filter(
        (badge) => badge && !injectedIds.has(badge.id),
    );
};

export default {
    onLoad: () => {
        try {
            const UserStore =
                findByProps("getCurrentUser", "getUser") ||
                findByStoreName("UserStore");

            const UserProfileStore =
                findByStoreName("UserProfileStore") ||
                findByProps("getUserProfile");

            if (!UserStore || !UserProfileStore) {
                console.error("[Badge Spoof] Required stores not found");
                return;
            }

            const origGetProfile =
                UserProfileStore.getUserProfile;

            if (typeof origGetProfile !== "function") {
                console.error("[Badge Spoof] getUserProfile not found");
                return;
            }

            UserProfileStore.getUserProfile = function (
                userId: string,
                ...args: any[]
            ) {
                const profile = origGetProfile.apply(this, [
                    userId,
                    ...args,
                ]);

                try {
                    const currentUser =
                        UserStore.getCurrentUser?.();

                    if (
                        !profile ||
                        !currentUser?.id ||
                        userId !== currentUser.id
                    ) {
                        return profile;
                    }

                    let badges = Array.isArray(profile.badges)
                        ? [...profile.badges]
                        : [];

                    badges = removeInjectedBadges(badges);

                    const enabledBadges =
                        getEnabledBadges();

                    badges = [
                        ...enabledBadges,
                        ...badges,
                    ];

                    badges.sort(
                        (a, b) =>
                            getPriority(a) -
                            getPriority(b),
                    );

                    profile.badges = badges;
                } catch (e) {
                    console.error(
                        "[Badge Spoof] Failed to modify profile",
                        e,
                    );
                }

                return profile;
            };

            unpatches.push(() => {
                try {
                    UserProfileStore.getUserProfile =
                        origGetProfile;
                } catch {}
            });
        } catch (e) {
            console.error(
                "[Badge Spoof] Failed to load",
                e,
            );
        }
    },

    onUnload: () => {
        unpatches.forEach((unpatch) => {
            try {
                unpatch();
            } catch {}
        });

        unpatches.length = 0;
    },

    settings: Settings,
};