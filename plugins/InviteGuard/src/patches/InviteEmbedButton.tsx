import { findByProps, findByTypeName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

// React and React Native via require — works reliably in Hermes
const React = require("react");
const { View, TouchableOpacity, Text } = require("react-native");

// ─── Discord internals ───
const GuildActions = findByProps("joinGuild", "acceptInvite");
const Navigation = findByProps("push", "pushLazy", "openURL");
const { getInvite } = findByProps("getInvite", "resolveInvite") ?? {};
const { showConfirmationAlert } = findByProps("showConfirmationAlert", "showAlert") ?? {};

// ─── Action helpers ───

function joinGuild(inviteCode: string, lurker = false) {
  if (!GuildActions?.joinGuild) {
    return showToast("joinGuild not found", getAssetIDByName("Small"));
  }

  GuildActions.joinGuild(inviteCode, { lurker })
    .then(() => {
      showToast(
        lurker ? `Lurking in ${inviteCode}` : `Joined ${inviteCode}`,
        getAssetIDByName("Check"),
      );
      setTimeout(() => {
        const guildId = getInvite?.(inviteCode)?.guild?.id;
        if (guildId) Navigation?.push?.({ screen: "Guild", params: { guildId } });
      }, 300);
    })
    .catch((e: any) => {
      if (e?.message?.includes("CAPTCHA")) {
        showToast("CAPTCHA required", getAssetIDByName("Small"));
        GuildActions?.acceptInvite?.(inviteCode);
      } else {
        showToast(`Failed: ${e?.message ?? "unknown"}`, getAssetIDByName("Small"));
      }
    });
}

function blockInvite(inviteCode: string) {
  if (!storage.blockedInvites) storage.blockedInvites = [];
  if (!storage.blockedInvites.includes(inviteCode)) {
    storage.blockedInvites = [...storage.blockedInvites, inviteCode];
    showToast(`Blocked: ${inviteCode}`, getAssetIDByName("Small"));
  }
}

function showInviteInfo(inviteCode: string) {
  const invite = getInvite?.(inviteCode);
  if (!invite) return showToast("Invite info not loaded", getAssetIDByName("Small"));

  const guild = invite.guild;
  const channel = invite.channel;
  const inviter = invite.inviter;

  const lines = [
    `**${guild?.name ?? "Unknown Server"}**`,
    guild?.memberCount ? `Members: ~${guild.memberCount.toLocaleString()}` : "",
    channel ? `Channel: #${channel.name}` : "",
    inviter ? `Inviter: ${inviter.username}` : "",
    `Code: ${inviteCode}`,
  ].filter(Boolean);

  showConfirmationAlert?.({
    title: "Invite Details",
    content: lines.join("\n"),
    confirmText: "Quick Join",
    cancelText: "Lurk",
    onConfirm: () => joinGuild(inviteCode, false),
    onCancel: () => joinGuild(inviteCode, true),
  });
}

// ─── The patch ───

export default function patchInviteEmbed(): () => void {
  // Try multiple patterns to find Discord's invite embed component
  const InviteEmbed =
    findByTypeName("InviteEmbed") ??
    findByTypeName("GuildInviteEmbed") ??
    findByTypeName("ChannelInviteEmbed") ??
    findByProps("InviteEmbed", "renderInvite")?.InviteEmbed ??
    findByProps("inviteEmbed")?.inviteEmbed;

  if (!InviteEmbed?.type && !InviteEmbed?.render) {
    console.warn("[InviteGuard] Could not find InviteEmbed component");
    return () => {};
  }

  const target = InviteEmbed.type?.prototype ? InviteEmbed.type : InviteEmbed;
  const method = target.render ? "render" : "type";

  return instead(
    method,
    target,
    (args: any[], OriginalRender: Function) => {
      const props = args[0];
      const res = OriginalRender(...args);

      // Bail if no children to inject into
      if (!res?.props?.children) return res;

      const inviteCode = props?.invite?.code ?? props?.code;
      if (!inviteCode) return res;

      // Hidden if blocked
      if (storage.blockedInvites?.includes(inviteCode)) return null;

      const inviteData = getInvite?.(inviteCode);
      const isAlreadyMember = inviteData?.guild?.joined ?? false;

      // ── Build buttons ──
      const buttons: React.ReactElement[] = [];

      if (storage.showJoinButton && !isAlreadyMember) {
        buttons.push(
          React.createElement(TouchableOpacity, {
            key: "join",
            onPress: () => joinGuild(inviteCode, false),
            style: {
              backgroundColor: "#3BA55D",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              flex: 1,
              alignItems: "center",
            },
            activeOpacity: 0.7,
          }, React.createElement(Text, {
            style: { color: "#FFF", fontSize: 13, fontWeight: "600" },
          }, "Join")),
        );
      }

      if (storage.showLurkButton && !isAlreadyMember) {
        buttons.push(
          React.createElement(TouchableOpacity, {
            key: "lurk",
            onPress: () => joinGuild(inviteCode, true),
            style: {
              backgroundColor: "#4E5058",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              flex: 1,
              alignItems: "center",
            },
            activeOpacity: 0.7,
          }, React.createElement(Text, {
            style: { color: "#FFF", fontSize: 13, fontWeight: "600" },
          }, "Lurk")),
        );
      }

      if (isAlreadyMember) {
        buttons.push(
          React.createElement(TouchableOpacity, {
            key: "goto",
            onPress: () => {
              const guildId = inviteData?.guild?.id;
              if (guildId) Navigation?.push?.({ screen: "Guild", params: { guildId } });
            },
            style: {
              backgroundColor: "#5865F2",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              flex: 1,
              alignItems: "center",
            },
            activeOpacity: 0.7,
          }, React.createElement(Text, {
            style: { color: "#FFF", fontSize: 13, fontWeight: "600" },
          }, "Go to Server")),
        );
      }

      if (storage.showInfoButton) {
        buttons.push(
          React.createElement(TouchableOpacity, {
            key: "info",
            onPress: () => showInviteInfo(inviteCode),
            style: {
              backgroundColor: "#4E5058",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              flex: 1,
              alignItems: "center",
            },
            activeOpacity: 0.7,
          }, React.createElement(Text, {
            style: { color: "#FFF", fontSize: 13, fontWeight: "600" },
          }, "Info")),
        );
      }

      if (storage.showBlockButton) {
        buttons.push(
          React.createElement(TouchableOpacity, {
            key: "block",
            onPress: () => blockInvite(inviteCode),
            style: {
              backgroundColor: "#ED4245",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 4,
              flex: 0,
              alignItems: "center",
            },
            activeOpacity: 0.7,
          }, React.createElement(Text, {
            style: { color: "#FFF", fontSize: 13, fontWeight: "600" },
          }, "✕")),
        );
      }

      // Inject children: original embed + button row
      const existingChildren = Array.isArray(res.props.children)
        ? res.props.children
        : [res.props.children];

      return React.createElement(
        React.Fragment,
        null,
        ...existingChildren,
        buttons.length > 0 &&
          React.createElement(View, {
            style: {
              flexDirection: "row",
              justifyContent: "space-evenly",
              paddingVertical: 6,
              paddingHorizontal: 8,
              gap: 6,
            },
          }, ...buttons),
      );
    },
  );
}