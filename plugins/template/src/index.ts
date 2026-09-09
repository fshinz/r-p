import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";

const unpatches: Array<() => void> = [];

type Badge = {
    id: string;
    key: string;
    description: string;
    icon?: string;
    link?: string;
    flags?: number;
};

const BADGES: Record<string, Badge> = {
    discord_staff: {
        id: "staff",
        key: "staff",
        flags: 1,
        description: "Discord Staff",
        icon: "5e74e9b61934fc1f67c65515d1f7e60d",
        link: "https://discord.com/company",
    },

    partnered_server_owner: {
        id: "partner",
        key: "partner",
        flags: 2,
        description: "Partnered Server Owner",
        icon: "34306011e46e87f8ef25f3415d3b99ca",
        link: "https://discord.com/partners",
    },

    moderator_alumni: {
        id: "moderator_alumni",
        key: "moderator_alumni",
        flags: 262144,
        description: "Moderator Programs Alumni",
        icon: "c981e58b5ea4b7fedd3a643cf0c60564",
        link: "https://discord.com/safety",
    },

    early_supporter: {
        id: "early_supporter",
        key: "early_supporter",
        flags: 512,
        description: "Early Supporter",
        icon: "b802e9af134ff492276d94220e36ec5c",
        link: "https://discord.com/nitro",
    },

    discord_nitro: {
        id: "premium",
        key: "premium",
        description: "Discord Nitro",
        icon: "24d05f3b46a110e538674edbac0db4cd",
        link: "https://discord.com/nitro",
    },

    discord_nitro_basic: {
        id: "nitro_basic",
        key: "nitro_basic",
        description: "Discord Nitro Basic",
        icon: "24d05f3b46a110e538674edbac0db4cd",
        link: "https://discord.com/nitro",
    },

    originally_known_as: {
        id: "originally_known_as",
        key: "originally_known_as",
        description: "Originally Known As",
    },

    last_meadow_online: {
        id: "last_meadow_online",
        key: "last_meadow_online",
        description: "Last Meadow Online",
    },

    orbs_apprentice: {
        id: "orbs_apprentice",
        key: "orbs_apprentice",
        description: "Orbs Apprentice",
    },

    completed_a_quest: {
        id: "completed_a_quest",
        key: "completed_a_quest",
        description: "Completed a Quest",
    },

    april_fools: {
        id: "april_fools",
        key: "april_fools",
        description: "April Fools",
    },

    hypesquad_events: {
        id: "hypesquad_events",
        key: "hypesquad_events",
        flags: 4,
        description: "HypeSquad Events",
        icon: "e666a84a7a5ea2abbbfa73adf22e627b",
        link: "https://discord.com/hypesquad",
    },

    hypesquad_bravery: {
        id: "hypesquad_bravery",
        key: "hypesquad_bravery",
        flags: 64,
        description: "HypeSquad Bravery",
        icon: "efcc751513ec434ea4275ecda4f61136",
        link: "https://discord.com/hypesquad",
    },

    hypesquad_brilliance: {
        id: "hypesquad_brilliance",
        key: "hypesquad_brilliance",
        flags: 128,
        description: "HypeSquad Brilliance",
        icon: "ec8e92568a7c8f19a052ef42f862ff18",
        link: "https://discord.com/hypesquad",
    },

    hypesquad_balance: {
        id: "hypesquad_balance",
        key: "hypesquad_balance",
        flags: 256,
        description: "HypeSquad Balance",
        icon: "9f00b18e292e10fc0ae84ff5332e8b0b",
        link: "https://discord.com/hypesquad",
    },

    bug_hunter_1: {
        id: "bug_hunter_level_1",
        key: "bug_hunter_level_1",
        flags: 8,
        description: "Discord Bug Hunter Tier 1",
        icon: "8353d89b529e13365c415aef08d1d1f4",
        link: "https://support.discord.com",
    },

    bug_hunter_2: {
        id: "bug_hunter_level_2",
        key: "bug_hunter_level_2",
        flags: 16384,
        description: "Discord Bug Hunter Tier 2",
        icon: "f599063762165e0d23e8b11b684765a8",
        link: "https://support.discord.com",
    },

    verified_bot_developer: {
        id: "verified_bot_developer",
        key: "verified_bot_developer",
        flags: 131072,
        description: "Early Verified Bot Developer",
        icon: "4441e07fe0f46b3cb41b79366236fca6",
        link: "https://discord.com/developers",
    },

    active_developer: {
        id: "active_developer",
        key: "active_developer",
        flags: 4194304,
        description: "Active Developer",
        icon: "26c7a60fb1654315e0be26107bd47470",
        link: "https://discord.com/developers",
    },

    supports_commands: {
        id: "supports_commands",
        key: "supports_commands",
        flags: 524288,
        description: "Supports Commands",
        icon: "498591d63b352256a1bf18061eff9d57",
        link: "https://discord.com/developers",
    },

    uses_automod: {
        id: "uses_automod",
        key: "uses_automod",
        flags: 16777216,
        description: "Uses Automod",
        icon: "8599b8b3d7917b5e7180e898a835f780",
        link: "https://discord.com/developers",
    },

    premium_app: {
        id: "premium_app",
        key: "premium_app",
        description: "Premium App / Bot",
        icon: "24d05f3b46a110e538674edbac0db4cd",
        link: "https://discord.com/developers",
    },

    patron: {
        id: "patron",
        key: "patron",
        description: "Patron",
        icon: "ac305d1b9481f312ce4419e7f8296558",
        link: "https://discord.com/nitro",
    },

    champion: {
        id: "champion",
        key: "champion",
        description: "Champion",
        icon: "8b7792c4f65953d3ff564f23429cb79e",
        link: "https://discord.com/nitro",
    },

    luminary: {
        id: "luminary",
        key: "luminary",
        description: "Luminary",
        icon: "3119f5504b2cd09576a323908c7c3517",
        link: "https://discord.com/nitro",
    },

    icon: {
        id: "icon",
        key: "icon",
        description: "Icon",
        icon: "64f2413c9b9803661322aaad25826b62",
        link: "https://discord.com/nitro",
    },

    hero: {
        id: "hero",
        key: "hero",
        description: "Hero",
        icon: "77d65b1f210014a11eb1582ee06ab684",
        link: "https://discord.com/nitro",
    },

    legend: {
        id: "legend",
        key: "legend",
        description: "Legend",
        icon: "7fe346cfc5da1340087d8759a9e7a395",
        link: "https://discord.com/nitro",
    },
};

function getPriority(badge: any): number {
    const id = String(
        badge?.id ||
        badge?.key ||
        "",
    ).toLowerCase();

    if (id.includes("staff")) return 1;
    if (id.includes("partner")) return 2;

    if (
        id.includes("moderator") ||
        id.includes("certified_moderator")
    ) return 3;

    if (id.includes("hypesquad")) return 4;
    if (id.includes("bug_hunter")) return 5;

    if (
        id.includes("developer") ||
        id.includes("dev")
    ) return 6;

    if (id.includes("early")) return 7;

    if (
        id.includes("nitro") ||
        id.includes("premium")
    ) return 8;

    if (
        id.includes("booster") ||
        id.includes("guild")
    ) return 9;

    return 99;
}

function getEnabledBadges(): Badge[] {
    if (storage.enabled === false) {
        return [];
    }

    const settings = storage.badges || {};

    return Object.keys(BADGES)
        .filter((key) => settings[key] === true)
        .map((key) => ({
            ...BADGES[key],
        }));
}

function removeInjectedBadges(badges: any[]): any[] {
    const injectedIds = new Set(
        Object.values(BADGES).map(
            (badge) => badge.id,
        ),
    );

    const injectedKeys = new Set(
        Object.values(BADGES).map(
            (badge) => badge.key,
        ),
    );

    return badges.filter((badge) => {
        if (!badge) return false;

        return (
            !injectedIds.has(badge.id) &&
            !injectedKeys.has(badge.key)
        );
    });
}

export default {
    onLoad: () => {
        try {
            const UserStore =
                findByProps(
                    "getCurrentUser",
                    "getUser",
                ) ||
                findByStoreName("UserStore");

            const UserProfileStore =
                findByStoreName(
                    "UserProfileStore",
                ) ||
                findByProps(
                    "getUserProfile",
                );

            if (
                !UserStore ||
                !UserProfileStore
            ) {
                console.error(
                    "[BadgeSpoofer] Required stores not found",
                );
                return;
            }

            const originalGetUserProfile =
                UserProfileStore.getUserProfile;

            if (
                typeof originalGetUserProfile !==
                "function"
            ) {
                console.error(
                    "[BadgeSpoofer] getUserProfile not found",
                );
                return;
            }

            UserProfileStore.getUserProfile =
                function (userId: string) {
                    const profile =
                        originalGetUserProfile.apply(
                            this,
                            arguments,
                        );

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

                        let badges =
                            Array.isArray(
                                profile.badges,
                            )
                                ? [
                                    ...profile.badges,
                                ]
                                : [];

                        badges =
                            removeInjectedBadges(
                                badges,
                            );

                        const enabledBadges =
                            getEnabledBadges();

                        const updatedBadges = [
                            ...enabledBadges,
                            ...badges,
                        ];

                        updatedBadges.sort(
                            (a, b) =>
                                getPriority(a) -
                                getPriority(b),
                        );

                        profile.badges =
                            updatedBadges;
                    } catch (error) {
                        console.error(
                            "[BadgeSpoofer] Badge patch error:",
                            error,
                        );
                    }

                    return profile;
                };

            unpatches.push(() => {
                try {
                    UserProfileStore.getUserProfile =
                        originalGetUserProfile;
                } catch {}
            });

            console.log(
                "[BadgeSpoofer] Loaded successfully",
            );
        } catch (error) {
            console.error(
                "[BadgeSpoofer] Failed to load:",
                error,
            );
        }
    },

    onUnload: () => {
        for (const unpatch of unpatches) {
            try {
                unpatch();
            } catch {}
        }

        unpatches.length = 0;

        console.log(
            "[BadgeSpoofer] Unloaded",
        );
    },
};