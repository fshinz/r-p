import React from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView } from "react-native";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

// Fetch theme colors dynamically from Discord's token system
const { rawColors, ThemeStore } = findByProps("rawColors", "ThemeStore") || {};
const theme = ThemeStore?.theme || "dark";
const isDark = theme.includes("dark");

const backgroundColor = isDark ? "#2f3136" : "#f2f3f5";
const cardBg = isDark ? "#202225" : "#ffffff";
const textColor = isDark ? "#ffffff" : "#060607";
const subTextColor = isDark ? "#b9bbbe" : "#4f545c";
const borderColor = isDark ? "#36393f" : "#e3e5e8";

let UserStore: any;

export default function Settings() {
  UserStore ??= findByStoreName("UserStore");
  useProxy(storage);

  storage.ignore ??= { users: [], bots: false, ownMessages: false };
  const [users, setUsers] = React.useState<string[]>(storage.ignore.users || []);

  const handleRemoveUser = (userId: string) => {
    const newArr = users.filter((id: string) => id !== userId);
    storage.ignore.users = newArr;
    setUsers(newArr);
    showToast("User removed from ignore list", getAssetIDByName("Check"));
  };

  const handleClearUsers = () => {
    if (users.length === 0) return;
    showConfirmationAlert({
      title: "Clear Ignored Users",
      content: `Remove all ${users.length} users from ignore list?`,
      confirmText: "Clear",
      cancelText: "Cancel",
      onConfirm: () => {
        storage.ignore.users = [];
        setUsers([]);
        showToast("Cleared all ignored users", getAssetIDByName("Check"));
      },
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor }} contentContainerStyle={{ padding: 16 }}>
      {/* FILTERS SECTION */}
      <Text style={{ fontSize: 12, fontWeight: "bold", color: subTextColor, marginBottom: 8, textTransform: "uppercase" }}>
        Filters
      </Text>
      <View style={{ backgroundColor: cardBg, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: borderColor }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 16, color: textColor, fontWeight: "500" }}>Ignore Bots</Text>
            <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>Don't log messages sent by bot accounts</Text>
          </View>
          <Switch
            value={!!storage.ignore.bots}
            onValueChange={(v: boolean) => {
              storage.ignore.bots = v;
            }}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 16, color: textColor, fontWeight: "500" }}>Ignore My Own Messages</Text>
            <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>Don't log deletions or edits of your own messages</Text>
          </View>
          <Switch
            value={!!storage.ignore.ownMessages}
            onValueChange={(v: boolean) => {
              storage.ignore.ownMessages = v;
            }}
          />
        </View>
      </View>

      {/* IGNORED USERS SECTION */}
      <Text style={{ fontSize: 12, fontWeight: "bold", color: subTextColor, marginBottom: 8, textTransform: "uppercase" }}>
        Ignored Users
      </Text>
      <View style={{ backgroundColor: cardBg, borderRadius: 10, overflow: "hidden" }}>
        <TouchableOpacity
          onPress={handleClearUsers}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: users.length > 0 ? 1 : 0, borderBottomColor: borderColor }}
        >
          <View>
            <Text style={{ fontSize: 16, color: "#ed4245", fontWeight: "500" }}>Clear All Ignored Users</Text>
            <Text style={{ fontSize: 12, color: subTextColor, marginTop: 2 }}>
              {users.length} user{users.length === 1 ? "" : "s"} ignored
            </Text>
          </View>
        </TouchableOpacity>

        {users.map((id: string) => {
          const user = UserStore?.getUser(id);
          const name = user?.username ? `@${user.username}` : `User ID: ${id}`;
          return (
            <View
              key={id}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderTopWidth: 1, borderTopColor: borderColor }}
            >
              <Text style={{ fontSize: 15, color: textColor }}>{name}</Text>
              <TouchableOpacity onPress={() => handleRemoveUser(id)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 14, color: "#ed4245", fontWeight: "bold" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
