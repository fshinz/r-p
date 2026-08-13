import { findByProps, findByDisplayName } from "@vendetta/metro";
import { React, stylesheet } from "@vendetta/metro/common";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  getNotifications,
  clearAllNotifications,
  subscribeToNotifications,
} from "../notifications";
import type { NotificationCategory, MentionSubCategory, NotificationItem } from "../types";

const Router = findByProps("transitionToGuild");
const NavigationNative = findByProps("navigate", "push");
const AvatarUtils = findByProps("getUserAvatarURL");

// Native Discord Controls
const NativeTabs = findByDisplayName("Tabs") || findByProps("SegmentedControl")?.Tabs;
const NativeSegmentedControl =
  findByDisplayName("SegmentedControl") || findByProps("SegmentedControl")?.SegmentedControl;

const styles = stylesheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1f22",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f2f3f5",
  },
  clearText: {
    color: "#f23f43",
    fontSize: 14,
    fontWeight: "600",
  },
  segmentWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: "#2b2d31",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#35373c",
  },
  headerTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: "#f2f3f5",
    fontSize: 14,
    fontWeight: "bold",
  },
  location: {
    color: "#949ba4",
    fontSize: 12,
  },
  time: {
    color: "#949ba4",
    fontSize: 11,
  },
  content: {
    color: "#dbdee1",
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    padding: 32,
    textAlign: "center",
    color: "#949ba4",
    fontSize: 14,
  },
});

export default function NotificationCenterUI() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const [activeCategory, setActiveCategory] = React.useState<NotificationCategory>("all");
  const [mentionSubCategory, setMentionSubCategory] = React.useState<MentionSubCategory>("all");

  React.useEffect(() => {
    return subscribeToNotifications(() => forceUpdate());
  }, []);

  const jumpToMessage = (item: NotificationItem) => {
    if (!item.channelId) return;
    try {
      if (Router?.transitionToGuild) {
        Router.transitionToGuild(item.guildId || "@me", item.channelId, item.messageId);
      } else if (NavigationNative?.navigate) {
        NavigationNative.navigate("Channel", {
          guildId: item.guildId || "@me",
          channelId: item.channelId,
          messageId: item.messageId,
        });
      }
    } catch (err) {
      console.error("[BetterInbox] Deep-link error:", err);
    }
  };

  const allNotifications = getNotifications();

  const filteredNotifications = allNotifications.filter((item) => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    if (activeCategory === "mentions" && mentionSubCategory !== "all") {
      if (item.subCategory !== mentionSubCategory) return false;
    }
    return true;
  });

  const categoryTabs = [
    { id: "all", label: "All" },
    { id: "mentions", label: "Mentions" },
    { id: "replies", label: "Replies" },
    { id: "reactions", label: "Reactions" },
    { id: "friend_request", label: "Requests" },
    { id: "threads", label: "Threads" },
    { id: "other", label: "Status" },
  ];

  const subCategoryOptions = [
    { id: "all", label: "ALL" },
    { id: "people", label: "PEOPLE" },
    { id: "role", label: "ROLE" },
    { id: "bot", label: "BOT" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity onPress={clearAllNotifications}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Category Selector */}
      {NativeTabs ? (
        <NativeTabs
          activeTab={activeCategory}
          onTabChange={(id: NotificationCategory) => setActiveCategory(id)}
          tabs={categoryTabs}
        />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categoryTabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: activeCategory === item.id ? "#5865f2" : "#2b2d31",
                borderRadius: 16,
                marginHorizontal: 4,
                marginBottom: 8,
              }}
              onPress={() => setActiveCategory(item.id as NotificationCategory)}
            >
              <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 13 }}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Sub-Filter for Mentions */}
      {activeCategory === "mentions" && (
        <View style={styles.segmentWrapper}>
          {NativeSegmentedControl ? (
            <NativeSegmentedControl
              values={subCategoryOptions.map((o) => o.label)}
              selectedIndex={subCategoryOptions.findIndex((o) => o.id === mentionSubCategory)}
              onChange={(index: number) => setMentionSubCategory(subCategoryOptions[index].id as MentionSubCategory)}
            />
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              {subCategoryOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setMentionSubCategory(opt.id as MentionSubCategory)}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderBottomWidth: mentionSubCategory === opt.id ? 2 : 0,
                    borderBottomColor: "#5865f2",
                  }}
                >
                  <Text style={{ color: mentionSubCategory === opt.id ? "#ffffff" : "#949ba4", fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Notification List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No notifications found.</Text>}
        renderItem={({ item }) => {
          const avatarUrl = item.author?.id
            ? AvatarUtils?.getUserAvatarURL?.(item.author)
            : null;

          return (
            <TouchableOpacity style={styles.card} onPress={() => jumpToMessage(item)}>
              <View style={styles.cardHeader}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar} />
                )}
                <View style={styles.headerTextContainer}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.guildName ? (
                    <Text style={styles.location}>
                      {item.guildName} • {item.channelName}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.time}>{item.timestamp}</Text>
              </View>
              {item.content ? <Text style={styles.content}>{item.content}</Text> : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
