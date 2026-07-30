import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { findByProps } from "@vendetta/metro";

const React = require("react");
const { ScrollView, View, Text, TouchableOpacity, TextInput, Switch } = require("react-native");

export default function Settings() {
  useProxy(storage);
  const [inviteInput, setInviteInput] = React.useState("");

  const addAutoLurk = () => {
    if (!inviteInput.trim()) return;
    if (!storage.autoLurkGuilds) storage.autoLurkGuilds = [];
    storage.autoLurkGuilds = [...new Set([...storage.autoLurkGuilds, inviteInput.trim()])];
    setInviteInput("");
    showToast("Added to auto-lurk", getAssetIDByName("Check"));
  };

  const removeAutoLurk = (id: string) => {
    storage.autoLurkGuilds = (storage.autoLurkGuilds ?? []).filter((g: string) => g !== id);
  };

  const unblockInvite = (code: string) => {
    storage.blockedInvites = (storage.blockedInvites ?? []).filter((c: string) => c !== code);
    showToast(`Unblocked: ${code}`, getAssetIDByName("Small"));
  };

  const clearAll = () => {
    storage.autoLurkGuilds = [];
    storage.blockedInvites = [];
    showToast("Cleared all data", getAssetIDByName("Check"));
  };

  const toggles: { label: string; key: string; color: string }[] = [
    { label: "Join Button", key: "showJoinButton", color: "#3BA55D" },
    { label: "Lurk Button", key: "showLurkButton", color: "#4E5058" },
    { label: "Info Button", key: "showInfoButton", color: "#5865F2" },
    { label: "Block Button", key: "showBlockButton", color: "#ED4245" },
  ];

  return React.createElement(
    ScrollView,
    { style: { flex: 1 } },
    React.createElement(
      View,
      { style: { padding: 12 } },

      // ─── SECTION: Button Toggles ───
      React.createElement(
        View,
        { style: { marginBottom: 24 } },
        React.createElement(
          Text,
          { style: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 } },
          "Button Visibility",
        ),
        ...toggles.map(({ label, key, color }) =>
          React.createElement(
            View,
            {
              key,
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: "#3a3a3a",
              },
            },
            React.createElement(
              View,
              { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
              React.createElement(View, {
                style: {
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: color,
                },
              }),
              React.createElement(Text, { style: { color: "#fff", fontSize: 15 } }, label),
            ),
            React.createElement(
              TouchableOpacity,
              {
                onPress: () => { storage[key] = !storage[key]; },
                style: {
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: storage[key] ? "#3BA55D" : "#4E5058",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                },
              },
              React.createElement(View, {
                style: {
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#fff",
                  alignSelf: storage[key] ? "flex-end" : "flex-start",
                },
              }),
            ),
          ),
        ),
      ),

      // ─── SECTION: Auto-Lurk ───
      React.createElement(
        View,
        { style: { marginBottom: 24 } },
        React.createElement(
          Text,
          { style: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 10 } },
          "Auto-Lurk Servers",
        ),
        React.createElement(
          View,
          { style: { flexDirection: "row", gap: 8, marginBottom: 8 } },
          React.createElement(TextInput, {
            style: {
              flex: 1,
              backgroundColor: "#1e1e1e",
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: "#fff",
            },
            placeholder: "Paste invite code...",
            placeholderTextColor: "#666",
            value: inviteInput,
            onChangeText: (v: string) => setInviteInput(v),
          }),
          React.createElement(
            TouchableOpacity,
            {
              onPress: addAutoLurk,
              style: {
                backgroundColor: "#5865F2",
                paddingHorizontal: 14,
                borderRadius: 6,
                justifyContent: "center",
              },
            },
            React.createElement(Text, { style: { color: "#FFF", fontWeight: "600" } }, "Add"),
          ),
        ),
        ...(storage.autoLurkGuilds ?? []).map((id: string) =>
          React.createElement(
            View,
            {
              key: id,
              style: {
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: "#3a3a3a",
              },
            },
            React.createElement(Text, { style: { flex: 1, fontSize: 14, color: "#ccc" } }, id),
            React.createElement(
              TouchableOpacity,
              {
                onPress: () => removeAutoLurk(id),
                style: {
                  backgroundColor: "#ED4245",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 4,
                },
              },
              React.createElement(Text, { style: { color: "#FFF", fontSize: 12 } }, "Remove"),
            ),
          ),
        ),
      ),

      // ─── SECTION: Blocked Invites ───
      React.createElement(
        View,
        { style: { marginBottom: 24 } },
        React.createElement(
          Text,
          { style: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 10 } },
          "Blocked Invites",
        ),
        ...((storage.blockedInvites ?? []).length === 0
          ? [React.createElement(
              Text,
              { key: "empty", style: { color: "#888", fontSize: 13 } },
              "No blocked invites",
            )]
          : (storage.blockedInvites ?? []).map((code: string) =>
              React.createElement(
                View,
                {
                  key: code,
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: "#3a3a3a",
                  },
                },
                React.createElement(
                  Text,
                  { style: { flex: 1, fontSize: 14, fontFamily: "monospace", color: "#ccc" } },
                  code,
                ),
                React.createElement(
                  TouchableOpacity,
                  {
                    onPress: () => unblockInvite(code),
                    style: {
                      backgroundColor: "#3BA55D",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 4,
                    },
                  },
                  React.createElement(Text, { style: { color: "#FFF", fontSize: 12 } }, "Unblock"),
                ),
              ),
            ),
        ),
      ),

      // ─── SECTION: Clear All ───
      React.createElement(
        View,
        { style: { alignItems: "center", marginTop: 8 } },
        React.createElement(
          TouchableOpacity,
          {
            onPress: clearAll,
            style: {
              backgroundColor: "#ED4245",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            },
          },
          React.createElement(Text, { style: { color: "#FFF", fontWeight: "700" } }, "Clear All Data"),
        ),
      ),
    ),
  );
}