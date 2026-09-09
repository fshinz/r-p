import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { showToast } from "@vendetta/ui/toasts";
import { Forms } from "@vendetta/ui/components";

const { ScrollView } = findByProps("ScrollView");

const {
    TableRowGroup,
    TableSwitchRow,
    TableRow,
    Stack,
} = findByProps(
    "TableSwitchRow",
    "TableCheckboxRow",
    "TableRowGroup",
    "Stack",
    "TableRow",
);

const { FormText } = Forms;

/* ─────────────────────────────────────────────
 * Badge definitions
 * ───────────────────────────────────────────── */

type Badge = {
    key: string;
    name: string;
    description?: string;
    icon?: string;
};

type Category = {
    name: string;
    badges: Badge[];
};

const CDN = (hash: string) =>
    `https://cdn.discordapp.com/badge-icons/${hash}.png?size=32`;

const USER_BADGES: Category[] = [
    {
        name: "Discord",
        badges: [
            {
                key: "discord_staff",
                name: "Discord Staff",
                icon: CDN("5e74e9b61934fc1f67c65515d1f7e60d"),
            },
            {
                key: "partnered_server_owner",
                name: "Partnered Server Owner",
                icon: CDN("34306011e46e87f8ef25f3415d3b99ca"),
            },
            {
                key: "moderator_alumni",
                name: "Moderator Programs Alumni",
                icon: CDN("c981e58b5ea4b7fedd3a643cf0c60564"),
            },
            {
                key: "early_supporter",
                name: "Early Supporter",
                icon: CDN("b802e9af134ff492276d94220e36ec5c"),
            },
            {
                key: "discord_nitro",
                name: "Discord Nitro",
                icon: CDN("24d05f3b46a110e538674edbac0db4cd"),
            },
            {
                key: "discord_nitro_basic",
                name: "Discord Nitro Basic",
            },
            {
                key: "originally_known_as",
                name: "Originally Known As",
            },
            {
                key: "last_meadow_online",
                name: "Last Meadow Online",
            },
            {
                key: "orbs_apprentice",
                name: "Orbs Apprentice",
            },
            {
                key: "completed_a_quest",
                name: "Completed a Quest",
            },
            {
                key: "april_fools",
                name: "April Fools",
            },
        ],
    },

    {
        name: "HypeSquad",
        badges: [
            {
                key: "hypesquad_events",
                name: "HypeSquad Events",
                icon: CDN("e666a84a7a5ea2abbbfa73adf22e627b"),
            },
            {
                key: "hypesquad_bravery",
                name: "HypeSquad Bravery",
                icon: CDN("efcc751513ec434ea4275ecda4f61136"),
            },
            {
                key: "hypesquad_brilliance",
                name: "HypeSquad Brilliance",
                icon: CDN("ec8e92568a7c8f19a052ef42f862ff18"),
            },
            {
                key: "hypesquad_balance",
                name: "HypeSquad Balance",
                icon: CDN("9f00b18e292e10fc0ae84ff5332e8b0b"),
            },
        ],
    },

    {
        name: "Bug Hunter",
        badges: [
            {
                key: "bug_hunter_1",
                name: "Discord Bug Hunter Tier 1",
                icon: CDN("8353d89b529e13365c415aef08d1d1f4"),
            },
            {
                key: "bug_hunter_2",
                name: "Discord Bug Hunter Tier 2",
                icon: CDN("f599063762165e0d23e8b11b684765a8"),
            },
        ],
    },

    {
        name: "Developer",
        badges: [
            {
                key: "verified_bot_developer",
                name: "Early Verified Bot Developer",
                icon: CDN("4441e07fe0f46b3cb41b79366236fca6"),
            },
            {
                key: "active_developer",
                name: "Active Developer",
                icon: CDN("26c7a60fb1654315e0be26107bd47470"),
            },
            {
                key: "supports_commands",
                name: "Supports Commands",
                icon: CDN("498591d63b352256a1bf18061eff9d57"),
            },
            {
                key: "uses_automod",
                name: "Uses Automod",
                icon: CDN("8599b8b3d7917b5e7180e898a835f780"),
            },
            {
                key: "premium_app",
                name: "Premium App / Bot",
            },
        ],
    },

    {
        name: "Gifting",
        badges: [
            {
                key: "patron",
                name: "Patron",
                icon: "https://cdn.discordapp.com/badge-icons/ac305d1b9481f312ce4419e7f8296558.png",
            },
            {
                key: "champion",
                name: "Champion",
                icon: "https://cdn.discordapp.com/badge-icons/8b7792c4f65953d3ff564f23429cb79e.png",
            },
            {
                key: "luminary",
                name: "Luminary",
                icon: "https://cdn.discordapp.com/badge-icons/3119f5504b2cd09576a323908c7c3517.png",
            },
            {
                key: "icon",
                name: "Icon",
                icon: "https://cdn.discordapp.com/badge-icons/64f2413c9b9803661322aaad25826b62.png",
            },
            {
                key: "hero",
                name: "Hero",
                icon: "https://cdn.discordapp.com/badge-icons/77d65b1f210014a11eb1582ee06ab684.png",
            },
            {
                key: "legend",
                name: "Legend",
                icon: "https://cdn.discordapp.com/badge-icons/7fe346cfc5da1340087d8759a9e7a395.png",
            },
        ],
    },

    {
        name: "Account Age",
        badges: [
            {
                key: "account_seed",
                name: "Seed",
                icon: "https://cdn.discordapp.com/assets/content/dda73966211a0c16533f8fcd9f1f27c27a628ef562927270e79df9b9c5e6cb12.svg",
            },
            {
                key: "account_sprout",
                name: "Sprout",
                icon: "https://cdn.discordapp.com/assets/content/74e1884f930b0d69986f92aeea77d3ff3d3d00c540f386b63e6ebb382d5e927d.svg",
            },
            {
                key: "account_bud",
                name: "Bud",
                icon: "https://cdn.discordapp.com/assets/content/217dab12dcb72d4c95f2863e9dddd5c42003345a001684ea55a736172f32eea1.svg",
            },
            {
                key: "account_sapling",
                name: "Sapling",
                icon: "https://cdn.discordapp.com/assets/content/26b89419a4f562ab31a1a72eac04833aa1026af937f1d53c088ec258df3db84b.svg",
            },
            {
                key: "account_blossom",
                name: "Blossom",
                icon: "https://cdn.discordapp.com/assets/content/1db184b6d10a61a37dc30efdc74d587560fac5291c8bb329977e93bb5a312602.svg",
            },
            {
                key: "account_redwood",
                name: "Redwood",
                icon: "https://cdn.discordapp.com/assets/content/6b0f2ed5be272942eeabea3a0289027d164c7b1ce6a76166d1c928a57db762c5.svg",
            },
            {
                key: "account_sequoia",
                name: "Sequoia",
                icon: "https://cdn.discordapp.com/assets/content/c095e3e73591843a22dc979d1fcfe3d6cf6841d1f51387d208d19f8bed01deb7.svg",
            },
            {
                key: "account_bristlecone",
                name: "Bristlecone",
                icon: "https://cdn.discordapp.com/assets/content/867feeff5acd481c80bae557c586718fb5390bbaaa1cbde55fae296a7884e799.svg",
            },
            {
                key: "account_stromatolite",
                name: "Stromatolite",
                icon: "https://cdn.discordapp.com/assets/content/a6f4c487be2aa012f41f1fba40e664f914ede9251f4b967d890ab5c065a29fb7.svg",
            },
            {
                key: "account_primordial",
                name: "Primordial",
                icon: "https://cdn.discordapp.com/assets/content/1d8caace0299b12bcc469c35ce927e838abd9c645a22fe7c556f4394e57fa79b.svg",
            },
        ],
    },

    {
        name: "Streaming",
        badges: [
            { key: "streaming_newcomer", name: "Newcomer" },
            { key: "streaming_fledgling", name: "Fledgling" },
            { key: "streaming_breakout", name: "Breakout" },
            { key: "streaming_standout", name: "Standout" },
            { key: "streaming_trendsetter", name: "Trendsetter" },
            { key: "streaming_headliner", name: "Headliner" },
            { key: "streaming_star", name: "Star" },
            { key: "streaming_sensation", name: "Sensation" },
            { key: "streaming_visionary", name: "Visionary" },
            { key: "streaming_phenomenon", name: "Phenomenon" },
        ],
    },

    {
        name: "Game Time",
        badges: [
            { key: "game_time_casual", name: "Casual" },
            { key: "game_time_recreational", name: "Recreational" },
            { key: "game_time_dedicated", name: "Dedicated" },
            { key: "game_time_committed", name: "Committed" },
            { key: "game_time_serious", name: "Serious" },
            { key: "game_time_devoted", name: "Devoted" },
            { key: "game_time_seasoned", name: "Seasoned" },
            { key: "game_time_ironclad", name: "Ironclad" },
            { key: "game_time_unshakeable", name: "Unshakeable" },
            { key: "game_time_eternal", name: "Eternal" },
        ],
    },

    {
        name: "Game Variety",
        badges: [
            { key: "game_variety_sampler", name: "Sampler" },
            { key: "game_variety_dabbler", name: "Dabbler" },
            { key: "game_variety_enthusiast", name: "Enthusiast" },
            { key: "game_variety_ranger", name: "Ranger" },
            { key: "game_variety_explorer", name: "Explorer" },
            { key: "game_variety_adventurer", name: "Adventurer" },
            { key: "game_variety_voyager", name: "Voyager" },
            { key: "game_variety_maverick", name: "Maverick" },
            { key: "game_variety_polymath", name: "Polymath" },
            { key: "game_variety_universalist", name: "Universalist" },
        ],
    },

    {
        name: "Nitro Subscription",
        badges: [
            {
                key: "nitro_bronze",
                name: "Bronze",
                description: "1 month",
                icon: "https://discord.com/assets/0386191373eb17c272df.svg",
            },
            {
                key: "nitro_silver",
                name: "Silver",
                description: "3 months",
                icon: "https://discord.com/assets/9d4d362c62da3c985845.svg",
            },
            {
                key: "nitro_gold",
                name: "Gold",
                description: "6 months",
                icon: "https://discord.com/assets/8725fe12ada9afa51c1a.svg",
            },
            {
                key: "nitro_platinum",
                name: "Platinum",
                description: "12 months",
                icon: "https://discord.com/assets/746689c803e06be87705.svg",
            },
            {
                key: "nitro_diamond",
                name: "Diamond",
                description: "24 months",
                icon: "https://discord.com/assets/f3521e2861ff44a0384d.svg",
            },
            {
                key: "nitro_emerald",
                name: "Emerald",
                description: "36 months",
                icon: "https://discord.com/assets/f2b9b02fb22cc6459922.svg",
            },
            {
                key: "nitro_ruby",
                name: "Ruby",
                description: "60 months",
                icon: "https://discord.com/assets/ecf86e18838013c9d95a.svg",
            },
            {
                key: "nitro_opal",
                name: "Opal",
                description: "72+ months",
                icon: "https://discord.com/assets/b4fc7a9c37ec2fae36e3.svg",
            },
        ],
    },

    {
        name: "Nitro Boost",
        badges: [
            {
                key: "boost_1",
                name: "1 Month",
                icon: "https://discord.com/assets/ca18353be0e57a2b3b3132fa1c08d6b4.svg",
            },
            {
                key: "boost_2",
                name: "2 Months",
                icon: "https://discord.com/assets/22f99ed6e34eaca48950254c70f8fe8d.svg",
            },
            {
                key: "boost_3",
                name: "3 Months",
                icon: "https://discord.com/assets/4a2618502278029ce88adeea179ed435.svg",
            },
            {
                key: "boost_6",
                name: "6 Months",
                icon: "https://discord.com/assets/fbafa6adb7c49a6a2c3822521ff2af2f.svg",
            },
            {
                key: "boost_9",
                name: "9 Months",
                icon: "https://discord.com/assets/0599f90e32c15b532647163edd72f70a.svg",
            },
            {
                key: "boost_12",
                name: "12 Months",
                icon: "https://discord.com/assets/e07c08cdc72bcc78b69c76d2c7ceb344.svg",
            },
            {
                key: "boost_15",
                name: "15 Months",
                icon: "https://discord.com/assets/c7f26927db5e7806790f4e968038630a.svg",
            },
            {
                key: "boost_18",
                name: "18 Months",
                icon: "https://discord.com/assets/c6d88d1d12afe03bdc4ebb747f8d196b.svg",
            },
            {
                key: "boost_24",
                name: "24 Months",
                icon: "https://discord.com/assets/d96ed283b74de75692487b7499fb8d09.svg",
            },
        ],
    },
];

/* ─────────────────────────────────────────────
 * Defaults
 * ───────────────────────────────────────────── */

const DEFAULT_BADGES: Record<string, boolean> = {};

for (const category of USER_BADGES) {
    for (const badge of category.badges) {
        DEFAULT_BADGES[badge.key] = false;
    }
}

function ensureStorage() {
    if (!storage.badges) {
        storage.badges = {};
    }

    for (const key of Object.keys(DEFAULT_BADGES)) {
        if (typeof storage.badges[key] !== "boolean") {
            storage.badges[key] = false;
        }
    }

    if (typeof storage.enabled !== "boolean") {
        storage.enabled = true;
    }
}

function setAll(value: boolean) {
    for (const key of Object.keys(DEFAULT_BADGES)) {
        storage.badges[key] = value;
    }

    showToast(
        value
            ? "All badges enabled"
            : "All badges disabled",
    );
}

function getCategoryState(category: Category) {
    return category.badges.every(
        (badge) => storage.badges?.[badge.key] === true,
    );
}

/* ─────────────────────────────────────────────
 * Remote badge icon
 * ───────────────────────────────────────────── */

function BadgeIcon({ url }: { url?: string }) {
    if (!url) return null;

    return (
        <RN.Image
            source={{ uri: url }}
            style={{
                width: 24,
                height: 24,
                resizeMode: "contain",
            }}
        />
    );
}

/* ─────────────────────────────────────────────
 * Settings
 * ───────────────────────────────────────────── */

export default function Settings() {
    ensureStorage();

    const proxy = useProxy(storage);

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                paddingBottom: 32,
            }}
        >
            {/* General */}

            <TableRowGroup title="General">
                <TableSwitchRow
                    label="Enable Badge Spoofing"
                    subLabel="Show selected badges on your profile locally"
                    value={proxy.enabled}
                    onValueChange={(value: boolean) => {
                        proxy.enabled = value;
                    }}
                />

                <TableRow
                    label="Enable All Badges"
                    onPress={() => setAll(true)}
                    trailing={
                        <FormText>
                            ENABLE
                        </FormText>
                    }
                />

                <TableRow
                    label="Disable All Badges"
                    onPress={() => setAll(false)}
                    trailing={
                        <FormText>
                            DISABLE
                        </FormText>
                    }
                />
            </TableRowGroup>

            {/* Categories */}

            {USER_BADGES.map((category) => (
                <TableRowGroup
                    key={category.name}
                    title={category.name}
                >
                    <TableSwitchRow
                        label={`Enable All ${category.name}`}
                        value={getCategoryState(category)}
                        onValueChange={(value: boolean) => {
                            for (const badge of category.badges) {
                                proxy.badges[badge.key] = value;
                            }
                        }}
                    />

                    {category.badges.map((badge) => (
                        <TableSwitchRow
                            key={badge.key}
                            label={badge.name}
                            subLabel={badge.description}
                            value={
                                proxy.badges?.[badge.key] === true
                            }
                            icon={
                                badge.icon
                                    ? <BadgeIcon url={badge.icon} />
                                    : undefined
                            }
                            onValueChange={(value: boolean) => {
                                proxy.badges[badge.key] = value;
                            }}
                        />
                    ))}
                </TableRowGroup>
            ))}

            <Stack
                style={{
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 20,
                }}
            >
                <FormText
                    style={{
                        textAlign: "center",
                    }}
                >
                    Badge changes are local to your client.
                </FormText>
            </Stack>
        </ScrollView>
    );
}