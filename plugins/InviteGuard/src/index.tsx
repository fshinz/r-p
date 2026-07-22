import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { before, instead } from "@vendetta/patcher";
import Settings from "./Settings";

// --- Discord internals we need ---
const GuildActions = findByProps("joinGuild", "acceptInvite");
const { getInvite } = findByProps("getInvite", "resolveInvite");
const ChannelActions = findByProps("selectChannel", "openPrivateChannel");
const Navigation = findByProps("push", "pushLazy", "openURL");
const { showConfirmationAlert, showAlert } = findByProps("showAlert", "showConfirmationAlert");

// --- Persistent storage init ---
if (!storage.quickJoinGuilds) storage.quickJoinGuilds = [];
if (!storage.blockedInvites) storage.blockedInvites = [];

// ─── CORE ACTIONS ───

function joinGuild(inviteCode: string, lurker = false) {
  if (!GuildActions?.joinGuild) {
    return showToast("Could not find joinGuild function", "X");
  }

  GuildActions.joinGuild(inviteCode, { lurker })
    .then(() => {
      showToast(`Joined${lurker ? " (lurker mode)" : ""} ✓`, "Check");
      // Auto-navigate to the guild
      setTimeout(() => {
        const guildId = getInvite?.(inviteCode)?.guild?.id;
        if (guildId) Navigation.push({ screen: "Guild", params: { guildId } });
      }, 300);
    })
    .catch((e: any) => {
      if (e?.message?.includes("CAPTCHA")) {
        showToast("CAPTCHA required — open in browser", "X");
        GuildActions.acceptInvite?.(inviteCode);
      } else {
        showToast(`Failed: ${e?.message ?? "unknown"}`, "X");
      }
    });
}

function blockInvite(inviteCode: string) {
  if (!storage.blockedInvites) storage.blockedInvites = [];
  if (!storage.blockedInvites.includes(inviteCode)) {
    storage.blockedInvites = [...storage.blockedInvites, inviteCode];
    showToast(`Invite blocked: ${inviteCode}`, "Small");
  }
}

function showInviteInfo(inviteCode: string) {
  const invite = getInvite?.(inviteCode);
  if (!invite) return showToast("Invite data not loaded yet", "Small");

  const guild = invite.guild;
  const channel = invite.channel;
  const inviter = invite.inviter;

  const lines = [
    `**${guild?.name ?? "Unknown Server"}**`,
    guild?.memberCount ? `Members: ~${guild.memberCount.toLocaleString()}` : "",
    channel ? `Channel: #${channel.name}` : "",
    inviter ? `Inviter: ${inviter.username}${inviter.discriminator ? `#${inviter.discriminator}` : ""}` : "",
    `Code: ${inviteCode}`,
  ].filter(Boolean);

  showConfirmationAlert({
    title: "Invite Details",
    content: lines.join("\n"),
    confirmText: "Quick Join",
    cancelText: "Lurk",
    onConfirm: () => joinGuild(inviteCode, false),
    onCancel: () => joinGuild(inviteCode, true),
  });
}

// ─── COMPONENT PATCHING ───

let patches: (() => void)[] = [];

function patchInviteEmbed() {
  // Find the invite embed component by looking for its displayName or key props
  const InviteEmbed = findByProps("InviteEmbed", "renderInviteEmbed")
    ?? findByProps("inviteEmbed", "InviteEmbed");

  if (!InviteEmbed?.type) {
    // Try finding via React displayName
    const candidates = findByProps("renderEmbed", "renderInvite");
    if (!candidates) {
      console.log("[InviteGuard] Could not find InviteEmbed component");
      return;
    }
  }

  // Use `instead` to wrap the original render and inject our button row
  const unpatch = instead(
    InviteEmbed?.type ?? InviteEmbed?.default ?? InviteEmbed,
    "render",
    (args: any[], orig: Function) => {
      const props = args[0];
      const res = orig?.(...args);

      // res is a React element (React native virtual node)
      if (!res || !props?.invite) return res;

      const inviteCode = props.invite?.code ?? props.code;
      if (!inviteCode) return res;

      // Check if this invite is blocked
      if (storage.blockedInvites?.includes(inviteCode)) return null;

      // Clone the element tree and inject buttons
      const inviteData = getInvite?.(inviteCode);
      const isAlreadyMember = inviteData?.guild?.joined ?? false;

      return React.cloneElement(res, res.props, [
        ...(Array.isArray(res.props?.children) ? res.props.children : [res.props?.children]),
        // Inject button row
        createButtonRow(inviteCode, isAlreadyMember),
      ]);
    }
  );

  patches.push(unpatch);
}

function createButtonRow(inviteCode: string, isMember: boolean) {
  // Use Discord's native Button components if available
  const { Button, ButtonRow, View } = findByProps("Button", "ButtonRow") ?? {};
  const { styles } = findByProps("styles", "createStyles");

  const buttonStyle = {
    flexDirection: "row" as const,
    justifyContent: "space-evenly",
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  };

  const buttons = [];

  if (!isMember) {
    buttons.push(
      createButton("Join", "green", () => joinGuild(inviteCode, false)),
      createButton("Lurk", "grey", () => joinGuild(inviteCode, true)),
    );
  } else {
    buttons.push(createButton("Go to Server", "brand", () => {
      const guildId = getInvite?.(inviteCode)?.guild?.id;
      if (guildId) Navigation.push({ screen: "Guild", params: { guildId } });
    }));
  }

  buttons.push(
    createButton("Info", "grey", () => showInviteInfo(inviteCode)),
    createButton("✕", "red", () => blockInvite(inviteCode)),
  );

  // Use React Native View if Discord components not available
  const ViewComponent = View ?? require("react-native").View;
  return React.createElement(ViewComponent, { style: buttonStyle, key: `btn-row-${inviteCode}` }, ...buttons);
}

function createButton(label: string, color: string, onPress: () => void) {
  const { TouchableOpacity, Text } = require("react-native");
  const colorMap: Record<string, string> = {
    green: "#3BA55D",
    red: "#ED4245",
    grey: "#4E5058",
    brand: "#5865F2",
  };

  return React.createElement(
    TouchableOpacity,
    {
      key: `btn-${label}`,
      onPress,
      style: {
        backgroundColor: colorMap[color] ?? colorMap.grey,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flex: 1,
        alignItems: "center",
      },
      activeOpacity: 0.7,
    },
    React.createElement(Text, {
      style: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
    }, label)
  );
}

// ─── PLUGIN LIFECYCLE ───

export default {
  onLoad() {
    patches = [];

    // Give Discord time to mount components, then patch
    setTimeout(() => {
      try {
        patchInviteEmbed();
        showToast("InviteGuard active", "Check");
      } catch (e) {
        console.error("[InviteGuard] Patch failed:", e);
        showToast("InviteGuard: patch failed", "X");
      }
    }, 2000);

    // Auto-lurk stored guilds from previous sessions
    setTimeout(() => {
      for (const gid of storage.quickJoinGuilds ?? []) {
        if (gid && gid.trim()) joinGuild(gid.trim(), true);
      }
    }, 3000);
  },

  onUnload() {
    for (const fn of patches) fn();
    patches = [];
    showToast("InviteGuard unloaded");
  },

  settings: Settings,
};
