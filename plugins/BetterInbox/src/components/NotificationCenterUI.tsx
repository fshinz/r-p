import React, { useState } from "react";
import { getModule, findByProps } from "@vendetta/metro";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from "react-native";
import {
  NotificationCategory,
  MentionSubCategory,
  NotificationItem,
  LocalStorage,
} from "../types";

interface NavigationNativeModule {
  navigate(screen: string, params?: object): void;
}

interface RouterModule {
  transitionToGuild(guildId: string, channelId: string, messageId: string): void;
}

const NavigationNative = getModule((m: any) => m.navigate && m.push) as NavigationNativeModule;
const Router = findByProps("transitionToGuild", "transitionTo") as RouterModule;

export default function NotificationCenterUI(): JSX.Element {
  const pluginStorage = storage as LocalStorage;
  useProxy(storage);

  const [activeTab, setActiveTab] = useState<NotificationCategory>("mentions");
  const [mentionFilter, setMentionFilter] = useState<"all" | MentionSubCategory>("all");

  const notifications: NotificationItem[] = pluginStorage.notifications || [];

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "mentions") {
      if (n.category !== "mentions") return false;
      if (mentionFilter === "people") return n.subCategory === "people";
      if (mentionFilter === "bot") return n.subCategory === "bot";
      return true;
    }
    return n.category === activeTab;
  });

  const jumpToMessage = (guildId?: string, channelId?: string, messageId?: string): void => {
    if (!channelId || !messageId) return;

    if (Router?.transitionToGuild) {
      Router.transitionToGuild(guildId || "@me", channelId, messageId);
    } else if (NavigationNative?.navigate) {
      NavigationNative.navigate("Channel", { guildId, channelId, messageId });
    }
  };

  const tabs: NotificationCategory[] = ["mentions", "replies", "reactions", "other"];
  const subFilters: Array<"all" | MentionSubCategory> = ["all", "people", "bot"];

  return (
    <View style={styles.container}>
      {/* Tab Navigation Header */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sub-Filter for Mentions */}
      {activeTab === "mentions" && (
        <View style={styles.subFilterBar}>
          {subFilters.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={[styles.subFilterButton, mentionFilter === sub && styles.activeSubFilter]}
              onPress={() => setMentionFilter(sub)}
            >
              <Text style={styles.subFilterText}>{sub.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Notification Stream */}
      <ScrollView style={styles.feed}>
        {filteredNotifications.length === 0 ? (
          <Text style={styles.emptyText}>No notifications found for this category.</Text>
        ) : (
          filteredNotifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => jumpToMessage(item.guildId, item.channelId, item.messageId)}
            >
              <Image
                source={{
                  uri: item.author?.avatar
                    ? `https://cdn.discordapp.com/avatars/${item.author.id}/${item.author.avatar}.png`
                    : "https://cdn.discordapp.com/embed/avatars/0.png",
                }}
                style={styles.avatar}
              />

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.authorTitle}>{item.title}</Text>
                  <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>

                <Text style={styles.location}>
                  {item.guildName} — {item.channelName}
                </Text>

                <Text style={styles.messageContent} numberOfLines={2}>
                  {item.content}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#313338" },
  tabBar: { flexDirection: "row", backgroundColor: "#2b2d31", paddingVertical: 6 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center" },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: "#5865F2" },
  tabText: { color: "#949ba4", fontWeight: "600", fontSize: 13 },
  activeTabText: { color: "#ffffff" },
  subFilterBar: { flexDirection: "row", backgroundColor: "#1e1f22", padding: 6, justifyContent: "center" },
  subFilterButton: { marginHorizontal: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  activeSubFilter: { backgroundColor: "#404249" },
  subFilterText: { color: "#dbdee1", fontSize: 11, fontWeight: "bold" },
  feed: { flex: 1, padding: 12 },
  emptyText: { color: "#949ba4", textAlign: "center", marginTop: 40, fontSize: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: "#2b2d31",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  authorTitle: { color: "#f2f3f5", fontWeight: "bold", fontSize: 14 },
  timestamp: { color: "#949ba4", fontSize: 11 },
  location: { color: "#5865F2", fontSize: 12, marginVertical: 2, fontWeight: "500" },
  messageContent: { color: "#dbdee1", fontSize: 13 },
});
